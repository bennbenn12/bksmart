import { NextResponse } from 'next/server'
import { dbQuery } from '@/lib/mysql/db'
import { cookies } from 'next/headers'
import { verifySessionToken, getSessionCookieName } from '@/lib/mysql/session'

export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(getSessionCookieName())?.value
    const session = verifySessionToken(token)

    // Debug logging
    console.log('[Payments API] Auth check:', { 
      hasToken: !!token, 
      hasSession: !!session, 
      role: session?.role,
      userId: session?.user_id 
    })

    const allowedRoles = ['bookstore_manager', 'bookstore_staff', 'working_student', 'risographer']
    if (!session || !allowedRoles.includes(session.role)) {
      console.log('[Payments API] Unauthorized - role:', session?.role, 'not in', allowedRoles)
      return NextResponse.json({ error: 'Unauthorized', role: session?.role }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const source = searchParams.get('source') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const offset = (page - 1) * limit

    let countSql = `
      SELECT COUNT(DISTINCT p.payment_id) as total
      FROM payments p
      JOIN orders o ON p.order_id = o.order_id
      JOIN users u ON o.user_id = u.id_number
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      LEFT JOIN bookstore_items bi ON oi.item_id = bi.item_id
      WHERE 1=1
    `
    let dataSql = `
      SELECT 
        p.*,
        o.order_number, o.total_amount, o.user_id,
        u.first_name, u.last_name, u.id_number,
        GROUP_CONCAT(bi.name SEPARATOR ', ') as items_ordered
      FROM payments p
      JOIN orders o ON p.order_id = o.order_id
      JOIN users u ON o.user_id = u.id_number
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      LEFT JOIN bookstore_items bi ON oi.item_id = bi.item_id
      WHERE 1=1
    `
    const params = []

    if (source) {
      countSql += ` AND p.payment_source = ?`
      dataSql += ` AND p.payment_source = ?`
      params.push(source)
    }

    if (search) {
      const searchTerm = `%${search}%`
      const searchClause = ` AND (
        p.or_number LIKE ? OR 
        u.first_name LIKE ? OR 
        u.last_name LIKE ? OR 
        u.id_number LIKE ? OR
        bi.name LIKE ?
      )`
      countSql += searchClause
      dataSql += searchClause
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm)
    }

    dataSql += ` GROUP BY p.payment_id ORDER BY p.date_paid DESC LIMIT ? OFFSET ?`
    
    const countParams = [...params]
    const dataParams = [...params, limit, offset]

    const [countRows] = await dbQuery(countSql, countParams)
    const total = countRows?.total || 0

    // For dbQuery it returns an array of rows if we use pool.execute, but we changed dbQuery to return rows directly
    // Let's ensure dbQuery returns rows
    const countResult = await dbQuery(countSql, countParams)
    const dataResult = await dbQuery(dataSql, dataParams)

    // dbQuery in db.js returns rows directly
    const totalCount = countResult[0]?.total || 0
    const data = dataResult.map(row => ({
      ...row,
      order: {
        order_number: row.order_number,
        total_amount: row.total_amount,
        user_id: row.user_id,
        user: {
          first_name: row.first_name,
          last_name: row.last_name,
          id_number: row.id_number
        },
        items_ordered: row.items_ordered
      }
    }))

    return NextResponse.json({ data, count: totalCount })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
