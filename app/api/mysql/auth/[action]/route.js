import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  findUserByAuthId,
  registerUser,
  updatePasswordByAuthId,
  validateCredentials,
  recordLogin,
} from '@/lib/mysql/auth'
import { createSessionToken, getSessionCookieName, verifySessionToken } from '@/lib/mysql/session'

function json(body, status = 200) {
  return NextResponse.json(body, { status })
}

async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get(getSessionCookieName())?.value
  const payload = token ? verifySessionToken(token) : null
  if (!payload?.sub) return null
  return findUserByAuthId(payload.sub)
}

function setSessionCookie(response, token) {
  // Use response cookies for Next.js 15+ Route Handlers
  response.cookies.set(getSessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return response
}

export async function POST(request, { params }) {
  try {
    const body = await request.json().catch(() => ({}))
    const { action } = await params

    if (action === 'login') {
      const user = await validateCredentials(body.email, body.password)
      if (!user) return json({ data: { user: null }, error: { message: 'Invalid email or password' } }, 401)
      
      // Record login timestamp to prevent account cleanup
      await recordLogin(user.id_number)
      
      const token = createSessionToken(user)
      const response = json({ data: { user: { id: user.auth_id, email: user.email } }, error: null })
      return setSessionCookie(response, token)
    }

    if (action === 'register') {
      const user = await registerUser({
        first_name: body.first_name || '',
        last_name: body.last_name || '',
        email: body.email,
        password: body.password,
        role_type: body.role || 'student',
        id_number: body.id_number || null,
        id_type: body.id_type || 'Student ID',
        contact_number: body.contact_number || null,
        department: body.department || null,
      })
      const token = createSessionToken(user)
      const response = json({ data: { user: { id: user.auth_id, email: user.email } }, error: null })
      return setSessionCookie(response, token)
    }

    if (action === 'logout') {
      const response = json({ data: null, error: null })
      response.cookies.set(getSessionCookieName(), '', { httpOnly: true, maxAge: 0, path: '/' })
      return response
    }

    if (action === 'session') {
      const user = await getCurrentUser()
      return json({
        data: {
          session: user ? { user: { id: user.auth_id, email: user.email } } : null,
        },
        error: null,
      })
    }

    if (action === 'user') {
      const user = await getCurrentUser()
      return json({
        data: {
          user: user ? { id: user.auth_id, email: user.email } : null,
        },
        error: null,
      })
    }

    if (action === 'update-password') {
      const user = await getCurrentUser()
      if (!user) return json({ data: null, error: { message: 'Unauthorized' } }, 401)
      await updatePasswordByAuthId(user.auth_id, body.password)
      return json({ data: { user: { id: user.auth_id, email: user.email } }, error: null })
    }

    return json({ data: null, error: { message: 'Unsupported action' } }, 400)
  } catch (error) {
    return json({ data: null, error: { message: error.message || 'Auth request failed' } }, 500)
  }
}
