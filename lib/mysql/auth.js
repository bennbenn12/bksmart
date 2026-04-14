import bcrypt from 'bcryptjs'
import { dbQuery } from '@/lib/mysql/db'

export async function findUserByEmail(email) {
  const rows = await dbQuery(
    'SELECT id_number, auth_id, email, password_hash, role_type, first_name, last_name, status FROM users WHERE email = ? LIMIT 1',
    [email]
  )
  return rows[0] || null
}

export async function findUserByAuthId(authId) {
  const rows = await dbQuery(
    'SELECT id_number, auth_id, email, role_type, first_name, last_name, status FROM users WHERE auth_id = ? LIMIT 1',
    [authId]
  )
  return rows[0] || null
}

export async function validateCredentials(email, password) {
  const user = await findUserByEmail(email)
  if (!user || user.status !== 'Active') return null
  const ok = await bcrypt.compare(password, user.password_hash || '')
  if (!ok) return null
  return user
}

export async function registerUser({
  first_name,
  last_name,
  email,
  password,
  role_type = 'student',
  id_number = null,
  id_type = 'Student ID',
  contact_number = null,
  department = null,
}) {
  const hash = await bcrypt.hash(password, 10)
  const username = email.split('@')[0]
  
  // Set 24-hour expiration for first login
  const firstLoginExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const user_id = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  await dbQuery(
    `INSERT INTO users
      (user_id, auth_id, role_type, username, password_hash, first_name, last_name, email, contact_number, id_number, id_type, department, status, first_login_expires_at)
     VALUES (?, UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?)`,
    [user_id, role_type, username, hash, first_name, last_name, email, contact_number, id_number, id_type, department, firstLoginExpiresAt]
  )

  return findUserByEmail(email)
}

export async function resetUserPassword(idNumber, newPassword) {
  const hash = await bcrypt.hash(newPassword, 10)
  await dbQuery(
    'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id_number = ?',
    [hash, idNumber]
  )
}

export async function updateFirstLoginExpiry(idNumber, newExpiryDate) {
  await dbQuery(
    'UPDATE users SET first_login_expires_at = ?, updated_at = NOW() WHERE id_number = ?',
    [newExpiryDate, idNumber]
  )
}

export async function updatePasswordByAuthId(authId, password) {
  const hash = await bcrypt.hash(password, 10)
  await dbQuery('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE auth_id = ?', [hash, authId])
}

export async function recordLogin(idNumber) {
  // Record the login timestamp to prevent account cleanup
  await dbQuery(
    'UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id_number = ?',
    [idNumber]
  )
}
