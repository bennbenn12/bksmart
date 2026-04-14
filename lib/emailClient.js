// Client-side email helper - calls API route instead of using nodemailer directly

export async function sendEmailClient({ to, template, ...data }) {
  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, template, ...data })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to send email')
  }

  return response.json()
}

// Template helpers for convenience
export const EmailTemplates = {
  risoJobSubmitted: (job, user, items) => ({
    template: 'risoJobSubmitted',
    job,
    user,
    items
  }),
  
  risoJobApproved: (job, user, items) => ({
    template: 'risoJobApproved',
    job,
    user,
    items
  }),
  
  risoJobStarted: (job, user) => ({
    template: 'risoJobStarted',
    job,
    user
  }),
  
  risoJobCompleted: (job, user, costs) => ({
    template: 'risoJobCompleted',
    job,
    user,
    costs
  }),
  
  risoJobRejected: (job, user, reason) => ({
    template: 'risoJobRejected',
    job,
    user,
    reason
  }),
  
  welcomeEmail: (user, tempPassword, roleLabel) => ({
    template: 'welcomeEmail',
    user,
    tempPassword,
    roleLabel
  })
}
