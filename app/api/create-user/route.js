import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import mysql from 'mysql2/promise'
import { sendEmail, EmailTemplates } from '@/lib/email'

// Database connection using environment variables
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

export async function POST(request) {
  try {
    const body = await request.json()
    const { 
      first_name, 
      last_name, 
      email, 
      role_type, 
      id_number, 
      id_type, 
      department, 
      contact_number,
      status = 'Active',
      sendWelcomeEmail = true 
    } = body

    // Validation
    if (!first_name || !last_name || !email || !role_type) {
      return NextResponse.json(
        { error: 'First name, last name, email, and role are required' },
        { status: 400 }
      )
    }

    if (!id_number && role_type !== 'parent') {
      return NextResponse.json(
        { error: 'ID number is required for this role' },
        { status: 400 }
      )
    }

    const connection = await getConnection()

    try {
      // Check if email already exists
      const [existingEmail] = await connection.execute(
        'SELECT id_number FROM users WHERE email = ?',
        [email]
      )
      if (existingEmail.length > 0) {
        return NextResponse.json(
          { error: 'Email address already in use' },
          { status: 400 }
        )
      }

      // Check if ID number already exists (if provided)
      if (id_number) {
        const [existingId] = await connection.execute(
          'SELECT id_number FROM users WHERE id_number = ?',
          [id_number]
        )
        if (existingId.length > 0) {
          return NextResponse.json(
            { error: 'ID number already exists' },
            { status: 400 }
          )
        }
      }

      // Generate password and hash it
      const plainPassword = generatePassword()
      const password_hash = await hash(plainPassword, 10)

      // Create username from email
      const username = email.split('@')[0].toLowerCase()

      // Generate user_id and auth_id
      const user_id = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const auth_id = `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Set expiration for first login (24 hours from now)
      const firstLoginExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

      // Insert user into database
      await connection.execute(
        `INSERT INTO users (
          user_id, auth_id, id_number, username, email, password_hash, 
          first_name, last_name, role_type, id_type, department, 
          contact_number, status, first_login_expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          user_id,
          auth_id,
          id_number || null,
          username,
          email,
          password_hash,
          first_name,
          last_name,
          role_type,
          id_type || null,
          department || null,
          contact_number || null,
          status,
          firstLoginExpiresAt
        ]
      )

      // Send welcome email with temporary password
      let emailSent = false
      let emailError = null
      
      if (sendWelcomeEmail) {
        try {
          // Role labels for the email
          const roleLabels = {
            'bookstore_manager': 'Bookstore Manager',
            'bookstore_staff': 'Bookstore Staff',
            'working_student': 'Working Student',
            'teacher': 'Teacher',
            'student': 'Student',
            'parent': 'Parent'
          }
          
          const template = EmailTemplates.welcomeEmail(
            { first_name, last_name, email },
            plainPassword,
            roleLabels[role_type] || role_type
          )
          
          const emailResult = await sendEmail({
            to: email,
            ...template
          })
          
          if (emailResult.success) {
            emailSent = true
            console.log(`Welcome email sent to: ${email}`)
          } else {
            emailError = emailResult.error
            console.error(`Failed to send welcome email: ${emailResult.error}`)
          }
        } catch (err) {
          emailError = err.message
          console.error('Error sending welcome email:', err)
        }
      }

      return NextResponse.json({
        success: true,
        message: 'User created successfully',
        user: {
          user_id,
          auth_id,
          id_number,
          email,
          first_name,
          last_name,
          role_type,
          status
        },
        // Only return password in development or if email failed to send
        ...((process.env.NODE_ENV === 'development' || !emailSent) && { temporaryPassword: plainPassword }),
        emailSent,
        ...(emailError && { emailError })
      })

    } finally {
      await connection.end()
    }

  } catch (error) {
    console.error('Create user error:', error)
    
    let errorMessage = error.message || 'Failed to create user'
    
    if (error.message?.includes('Duplicate entry') && error.message?.includes('id_number')) {
      const idNumberMatch = error.message.match(/Duplicate entry '(.*?)' for key/)
      const duplicateId = idNumberMatch ? idNumberMatch[1] : ''
      errorMessage = `ID number ${duplicateId} is already registered. Please use a different ID number.`
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
