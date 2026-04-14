import { sendEmail, EmailTemplates } from '@/lib/email'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const { to, template, job, user, items, costs, reason, tempPassword, roleLabel } = body

    let emailContent

    switch (template) {
      case 'risoJobSubmitted':
        emailContent = EmailTemplates.risoJobSubmitted(job, user, items)
        break
      case 'risoJobApproved':
        emailContent = EmailTemplates.risoJobApproved(job, user, items)
        break
      case 'risoJobStarted':
        emailContent = EmailTemplates.risoJobStarted(job, user)
        break
      case 'risoJobCompleted':
        emailContent = EmailTemplates.risoJobCompleted(job, user, costs)
        break
      case 'risoJobRejected':
        emailContent = EmailTemplates.risoJobRejected(job, user, reason)
        break
      case 'welcomeEmail':
        emailContent = EmailTemplates.welcomeEmail(user, tempPassword, roleLabel)
        break
      default:
        // Custom email content
        emailContent = { subject: body.subject, html: body.html, text: body.text }
    }

    const result = await sendEmail({ to, ...emailContent })
    
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
