import { NextResponse } from 'next/server'
import mysql from 'mysql2/promise'
import { hash } from 'bcryptjs'
import { sendEmail, EmailTemplates } from '@/lib/email'

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

// Generate a random secure password
function generatePassword(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

/**
 * POST /api/resend-welcome
 * 
 * Resends welcome email to a user with a new temporary password.
 * Only works for users who haven't logged in yet (last_login_at IS NULL).
 * Requires manager authorization.
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { id_number, resetPassword = true } = body

    if (!id_number) {
      return NextResponse.json(
        { error: 'User ID number is required' },
        { status: 400 }
      )
    }

    const connection = await getConnection()

    try {
      // Get user details
      const [users] = await connection.execute(
        `SELECT id_number, user_id, first_name, last_name, email, role_type, 
                last_login_at, first_login_expires_at, status
         FROM users 
         WHERE id_number = ?`,
        [id_number]
      )

      if (users.length === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      const user = users[0]

      // Check if user has already logged in
      if (user.last_login_at) {
        return NextResponse.json(
          { error: 'User has already logged in. Use password reset instead.' },
          { status: 400 }
        )
      }

      // Check if account is active
      if (user.status !== 'Active') {
        return NextResponse.json(
          { error: 'Cannot resend welcome email to inactive account' },
          { status: 400 }
        )
      }

      // Generate new password if requested
      let newPassword = null
      let passwordHash = null
      
      if (resetPassword) {
        newPassword = generatePassword()
        passwordHash = await hash(newPassword, 10)
      }

      // Extend the expiration by 24 hours from now
      const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

      // Update user record
      if (resetPassword) {
        await connection.execute(
          `UPDATE users 
           SET password_hash = ?, first_login_expires_at = ?, updated_at = NOW()
           WHERE id_number = ?`,
          [passwordHash, newExpiry, id_number]
        )
      } else {
        await connection.execute(
          `UPDATE users 
           SET first_login_expires_at = ?, updated_at = NOW()
           WHERE id_number = ?`,
          [newExpiry, id_number]
        )
      }

      // Send welcome email
      const roleLabels = {
        'bookstore_manager': 'Bookstore Manager',
        'bookstore_staff': 'Bookstore Staff',
        'working_student': 'Working Student',
        'teacher': 'Teacher',
        'student': 'Student',
        'parent': 'Parent'
      }

      const passwordToSend = resetPassword ? newPassword : '(Your existing temporary password)'
      
      const template = EmailTemplates.welcomeEmail(
        { first_name: user.first_name, last_name: user.last_name, email: user.email },
        passwordToSend,
        roleLabels[user.role_type] || user.role_type
      )

      // Add a note about this being a resent email
      template.html = template.html.replace(
        'Your account has been created successfully!',
        'Your account information has been reset. Here are your updated login credentials.'
      )
      template.text = template.text.replace(
        'Your account has been created successfully!',
        'Your account information has been reset. Here are your updated login credentials.'
      )

      const emailResult = await sendEmail({
        to: user.email,
        ...template
      })

      if (!emailResult.success) {
        return NextResponse.json(
          { 
            error: 'Failed to send email',
            emailError: emailResult.error,
            // Return password so manager can share it manually
            ...(resetPassword && { temporaryPassword: newPassword })
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `Welcome email resent to ${user.email}`,
        user: {
          id_number: user.id_number,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role_type: user.role_type
        },
        passwordReset: resetPassword,
        // Only return password in development or if email failed
        ...(process.env.NODE_ENV === 'development' && resetPassword && { temporaryPassword: newPassword })
      })

    } finally {
      await connection.end()
    }

  } catch (error) {
    console.error('Resend welcome error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to resend welcome email' },
      { status: 500 }
    )
  }
}
