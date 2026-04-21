import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { executePayload } from '@/lib/mysql/supabaseCompat'
import { verifySessionToken, getSessionCookieName } from '@/lib/mysql/session'

export async function POST(request) {
  let payload = null
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(getSessionCookieName())?.value
    const session = verifySessionToken(token)

    if (!session) {
      console.log('[Query API] No session - token:', token?.substring(0, 10) + '...')
      return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })
    }

    payload = await request.json()
    const { table, action } = payload
    const isAdmin = ['bookstore_manager', 'bookstore_staff', 'working_student', 'risographer'].includes(session.role)
    
    console.log('[Query API] Request:', { table, action, role: session.role, isAdmin, userId: session.user_id })

    if (!isAdmin) {
      if (action === 'delete') {
        return NextResponse.json({ data: null, error: { message: 'Forbidden' } }, { status: 403 })
      }
      
      const publicSelects = ['bookstore_items', 'appointment_slots', 'categories', 'payments']
      const userSelects = ['users', 'orders', 'order_items', 'appointments', 'feedback', 'queues', 'notifications', 'job_orders', 'riso_job_items']
      
      if (action === 'select' && !publicSelects.includes(table) && !userSelects.includes(table)) {
        return NextResponse.json({ data: null, error: { message: 'Forbidden' } }, { status: 403 })
      }

      if (action === 'select' && userSelects.includes(table)) {
        payload.filters = payload.filters || []
        console.log('[Query API] Before filter - session:', { sub: session.sub, user_id: session.user_id, role: session.role })
        console.log('[Query API] Existing filters:', payload.filters)
        if (table === 'users') {
          payload.filters.push({ op: 'eq', column: 'auth_id', value: session.sub })
        } else if (table === 'job_orders') {
          // Job orders use requester_id
          payload.filters.push({ op: 'eq', column: 'requester_id', value: session.user_id })
        } else {
          payload.filters.push({ op: 'eq', column: 'user_id', value: session.user_id })
        }
        console.log('[Query API] After adding filter:', payload.filters)
      }

      const allowedWrites = ['orders', 'order_items', 'appointments', 'feedback', 'queues', 'notifications', 'categories', 'job_orders', 'riso_job_items']
      if (action === 'insert' || action === 'update') {
        if (!allowedWrites.includes(table)) {
          return NextResponse.json({ data: null, error: { message: 'Forbidden' } }, { status: 403 })
        }
        
        // Tables that don't need user_id auto-assignment
        const noUserIdTables = ['categories', 'notifications', 'riso_job_items']
        // Tables that use requester_id instead of user_id
        const useRequesterIdTables = ['job_orders']
        
        if (action === 'insert') {
          const rows = Array.isArray(payload.values) ? payload.values : [payload.values]
          rows.forEach(r => {
             if (table !== 'users' && !noUserIdTables.includes(table)) {
               if (useRequesterIdTables.includes(table)) {
                 r.requester_id = session.user_id
               } else {
                 r.user_id = session.user_id
               }
             }
          })
          payload.values = Array.isArray(payload.values) ? rows : rows[0]
        }
        
        if (action === 'update') {
          payload.filters = payload.filters || []
          // Job orders filter by requester_id
          if (useRequesterIdTables.includes(table)) {
            payload.filters.push({ op: 'eq', column: 'requester_id', value: session.user_id })
            if (payload.values && payload.values.requester_id) delete payload.values.requester_id
          } else {
            payload.filters.push({ op: 'eq', column: 'user_id', value: session.user_id })
            if (payload.values && payload.values.user_id) delete payload.values.user_id
          }
        }
      }
    }

    const result = await executePayload(payload)
    if (payload.single) {
      const row = Array.isArray(result.data) ? (result.data[0] || null) : result.data
      return NextResponse.json({ ...result, data: row })
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('[API Query Error]', {
      table: payload?.table,
      action: payload?.action,
      error: error.message,
      stack: error.stack
    })
    return NextResponse.json({ data: null, error: { message: error.message || 'Query failed' } }, { status: 500 })
  }
}
