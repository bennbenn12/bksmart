import jwt from 'jsonwebtoken'

const COOKIE_NAME = 'booksmart_session'

function getSecret() {
  return process.env.AUTH_JWT_SECRET || 'booksmart-dev-secret'
}

export function getSessionCookieName() {
  return COOKIE_NAME
}

export function createSessionToken(user) {
  return jwt.sign(
    {
      sub: user.auth_id,
      email: user.email,
      role: user.role_type,
      user_id: user.id_number,
    },
    getSecret(),
    { expiresIn: '7d' }
  )
}

export function verifySessionToken(token) {
  if (!token) return null
  try {
    return jwt.verify(token, getSecret())
  } catch (err) {
    console.log('[Session] Token verification failed:', err.message, '- Token prefix:', token.substring(0, 15) + '...')
    return null
  }
}
