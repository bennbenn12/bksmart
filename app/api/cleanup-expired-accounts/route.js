import { NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

// Database connection
async function getConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'booksmart_db',
    port: parseInt(process.env.DB_PORT || '3306'),
  })
}

/**
 * DELETE /api/cleanup-expired-accounts
 * 
 * Cleans up user accounts that:
 * 1. Were created more than 24 hours ago (first_login_expires_at has passed)
 * 2. Have never logged in (last_login_at IS NULL)
 * 3. Are not bookstore managers (safety measure)
 * 
 * Can be called via cron job every hour:
 * 0 * * * * curl -X DELETE https://your-app.com/api/cleanup-expired-accounts
 */
export async function DELETE(request) {
  try {
    // Optional: Add a secret key check for cron job security
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    const expectedSecret = process.env.CLEANUP_SECRET || 'internal-cleanup-job'
    
    // In production, require secret key
    if (process.env.NODE_ENV === 'production' && secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid or missing secret' },
        { status: 401 }
      )
    }

    const connection = await getConnection()

    try {
      // Find expired accounts that never logged in
      // Exclude bookstore managers as a safety measure
      const [expiredAccounts] = await connection.execute(
        `SELECT user_id, id_number, email, first_name, last_name, first_login_expires_at, created_at
         FROM users 
         WHERE first_login_expires_at IS NOT NULL 
         AND first_login_expires_at < NOW()
         AND last_login_at IS NULL
         AND role_type != 'bookstore_manager'`,
      )

      if (expiredAccounts.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No expired accounts found',
          deleted: 0
        })
      }

      // Get list of user IDs to delete
      const userIds = expiredAccounts.map(u => u.user_id)
      const idNumbers = expiredAccounts.map(u => u.id_number)

      // Delete expired accounts
      // Note: This assumes proper foreign key constraints with ON DELETE CASCADE
      // or that these users have no related records yet (they never logged in)
      const [result] = await connection.execute(
        `DELETE FROM users 
         WHERE user_id IN (${userIds.map(() => '?').join(',')})`,
        userIds
      )

      const deletedCount = result.affectedRows

      console.log(`🗑️ Cleanup completed: ${deletedCount} expired accounts deleted`)
      console.log('Deleted accounts:', expiredAccounts.map(u => `${u.email} (created: ${u.created_at})`))

      return NextResponse.json({
        success: true,
        message: `${deletedCount} expired account(s) deleted successfully`,
        deleted: deletedCount,
        accounts: expiredAccounts.map(u => ({
          email: u.email,
          first_name: u.first_name,
          last_name: u.last_name,
          created_at: u.created_at,
          expired_at: u.first_login_expires_at
        }))
      })

    } finally {
      await connection.end()
    }

  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { error: error.message || 'Cleanup failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cleanup-expired-accounts
 * 
 * Preview which accounts would be deleted (dry run)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    const expectedSecret = process.env.CLEANUP_SECRET || 'internal-cleanup-job'
    
    if (process.env.NODE_ENV === 'production' && secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid or missing secret' },
        { status: 401 }
      )
    }

    const connection = await getConnection()

    try {
      const [expiredAccounts] = await connection.execute(
        `SELECT user_id, email, first_name, last_name, role_type, 
                first_login_expires_at, created_at,
                TIMESTAMPDIFF(HOUR, created_at, NOW()) as hours_since_created,
                TIMESTAMPDIFF(MINUTE, first_login_expires_at, NOW()) as minutes_overdue
         FROM users 
         WHERE first_login_expires_at IS NOT NULL 
         AND first_login_expires_at < NOW()
         AND last_login_at IS NULL
         AND role_type != 'bookstore_manager'
         ORDER BY first_login_expires_at ASC`,
      )

      // Also get accounts that will expire soon (within next 6 hours)
      const [expiringSoon] = await connection.execute(
        `SELECT user_id, email, first_name, last_name, role_type,
                first_login_expires_at, created_at,
                TIMESTAMPDIFF(MINUTE, NOW(), first_login_expires_at) as minutes_remaining
         FROM users 
         WHERE first_login_expires_at IS NOT NULL 
         AND first_login_expires_at > NOW()
         AND first_login_expires_at < DATE_ADD(NOW(), INTERVAL 6 HOUR)
         AND last_login_at IS NULL
         AND role_type != 'bookstore_manager'
         ORDER BY first_login_expires_at ASC`,
      )

      return NextResponse.json({
        expired: {
          count: expiredAccounts.length,
          accounts: expiredAccounts,
          wouldBeDeleted: true
        },
        expiringSoon: {
          count: expiringSoon.length,
          accounts: expiringSoon,
          wouldBeDeleted: false
        },
        totalPending: expiredAccounts.length + expiringSoon.length
      })

    } finally {
      await connection.end()
    }

  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json(
      { error: error.message || 'Preview failed' },
      { status: 500 }
    )
  }
}
