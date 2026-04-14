import nodemailer from 'nodemailer'

// Create reusable transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  // For development/testing, use ethereal.email
  ...(process.env.NODE_ENV === 'development' && !process.env.EMAIL_USER ? {
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: process.env.ETHEREAL_USER,
      pass: process.env.ETHEREAL_PASS,
    }
  } : {})
})

// Verify transporter connection
export async function verifyEmailConfig() {
  try {
    await transporter.verify()
    console.log('✅ Email service is ready')
    return true
  } catch (error) {
    console.error('❌ Email configuration error:', error)
    return false
  }
}

// Send email helper
export async function sendEmail({ to, subject, html, text, from }) {
  try {
    const info = await transporter.sendMail({
      from: from || `"BookSmart" <${process.env.EMAIL_USER || 'noreply@booksmart.edu'}>`,
      to,
      subject,
      text,
      html,
    })
    
    console.log('📧 Email sent:', info.messageId)
    
    // For Ethereal emails, log the preview URL
    if (info.ethereal) {
      console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info))
    }
    
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('❌ Email send error:', error)
    return { success: false, error: error.message }
  }
}

// Email templates
export const EmailTemplates = {
  // Order notifications
  orderCreated(order, user) {
    return {
      subject: `Order #${order.order_number} Placed - BookSmart`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1e293b; padding: 20px; text-align: center;">
            <h1 style="color: #fbbf24; margin: 0;">BookSmart</h1>
          </div>
          <div style="padding: 20px; background: #f8fafc;">
            <h2 style="color: #1e293b;">Order Confirmation</h2>
            <p>Hi ${user.first_name},</p>
            <p>Your order has been placed successfully!</p>
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
              <p><strong>Order #:</strong> ${order.order_number}</p>
              <p><strong>Total:</strong> ₱${parseFloat(order.total_amount).toFixed(2)}</p>
              <p><strong>Status:</strong> Pending</p>
            </div>
            <p>We'll notify you when your order is ready for pickup.</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/shop/orders" 
               style="display: inline-block; background: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
              View Order
            </a>
          </div>
        </div>
      `,
      text: `Order #${order.order_number} Placed - BookSmart\n\nHi ${user.first_name},\n\nYour order has been placed successfully!\n\nOrder #: ${order.order_number}\nTotal: ₱${parseFloat(order.total_amount).toFixed(2)}\nStatus: Pending\n\nWe'll notify you when your order is ready for pickup.\n\nView Order: ${process.env.NEXT_PUBLIC_APP_URL}/shop/orders`
    }
  },

  orderReady(order, user) {
    return {
      subject: `🎉 Order #${order.order_number} Ready for Pickup!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #16a34a; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">✓ Your Order is Ready!</h1>
          </div>
          <div style="padding: 20px; background: #f0fdf4;">
            <h2 style="color: #166534;">Order #${order.order_number}</h2>
            <p>Hi ${user.first_name},</p>
            <p style="font-size: 18px; color: #16a34a;"><strong>Your order is ready for pickup!</strong></p>
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #86efac;">
              <p><strong>Pickup Options:</strong></p>
              <ul>
                <li>Join the queue at the Bookstore</li>
                <li>Book a pickup appointment</li>
              </ul>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/shop/queue?orderId=${order.order_id}" 
                 style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 5px;">
                Join Queue
              </a>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/shop/appointments?orderId=${order.order_id}" 
                 style="display: inline-block; background: white; color: #16a34a; border: 2px solid #16a34a; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 5px;">
                Book Appointment
              </a>
            </div>
          </div>
        </div>
      `,
      text: `Order #${order.order_number} Ready for Pickup!\n\nHi ${user.first_name},\n\nYour order is ready for pickup!\n\nPickup Options:\n- Join the queue at the Bookstore\n- Book a pickup appointment\n\nJoin Queue: ${process.env.NEXT_PUBLIC_APP_URL}/shop/queue?orderId=${order.order_id}\nBook Appointment: ${process.env.NEXT_PUBLIC_APP_URL}/shop/appointments?orderId=${order.order_id}`
    }
  },

  orderReleased(order, user) {
    return {
      subject: `✅ Order #${order.order_number} Completed - Thank You!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0d9488; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Thank You!</h1>
          </div>
          <div style="padding: 20px; background: #f0fdfa;">
            <h2 style="color: #115e59;">Order Completed</h2>
            <p>Hi ${user.first_name},</p>
            <p>Your order has been successfully released. We hope you enjoy your items!</p>
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #99f6e4;">
              <p><strong>Order #:</strong> ${order.order_number}</p>
              <p><strong>Status:</strong> Released</p>
            </div>
            <p style="margin-top: 30px;">We'd love to hear about your experience:</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/shop/feedback" 
               style="display: inline-block; background: #fbbf24; color: #1e293b; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">
              Give Feedback
            </a>
          </div>
        </div>
      `,
      text: `Order #${order.order_number} Completed - Thank You!\n\nHi ${user.first_name},\n\nYour order has been successfully released. We hope you enjoy your items!\n\nWe'd love to hear about your experience:\n${process.env.NEXT_PUBLIC_APP_URL}/shop/feedback`
    }
  },

  paymentVerified(order, amount, user) {
    return {
      subject: `💳 Payment Verified - Order #${order.order_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #ea580c; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Payment Confirmed</h1>
          </div>
          <div style="padding: 20px; background: #fff7ed;">
            <h2 style="color: #9a3412;">Payment Verified</h2>
            <p>Hi ${user.first_name},</p>
            <p>Your payment has been verified and we're preparing your order.</p>
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fdba74;">
              <p><strong>Order #:</strong> ${order.order_number}</p>
              <p><strong>Amount Paid:</strong> ₱${parseFloat(amount).toFixed(2)}</p>
              <p><strong>Status:</strong> Processing</p>
            </div>
            <p>We'll notify you when your order is ready for pickup.</p>
          </div>
        </div>
      `,
      text: `Payment Verified - Order #${order.order_number}\n\nHi ${user.first_name},\n\nYour payment has been verified and we're preparing your order.\n\nOrder #: ${order.order_number}\nAmount Paid: ₱${parseFloat(amount).toFixed(2)}\nStatus: Processing\n\nWe'll notify you when your order is ready for pickup.`
    }
  },

  queueCalled(queueEntry, user) {
    const queueNum = String(queueEntry.queue_number).padStart(3, '0')
    return {
      subject: `🎉 It's Your Turn! Queue #${queueNum}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #16a34a; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 32px;">🎉 It's Your Turn!</h1>
            <p style="color: #dcfce7; margin: 10px 0 0 0; font-size: 48px; font-weight: bold;">#${queueNum}</p>
          </div>
          <div style="padding: 20px; background: #f0fdf4;">
            <p style="font-size: 18px; text-align: center;">Hi ${user.first_name},</p>
            <p style="font-size: 20px; text-align: center; color: #16a34a;"><strong>Please proceed to the Bookstore counter now!</strong></p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #86efac; text-align: center;">
              <p style="font-size: 24px; margin: 0;">Your Queue Number</p>
              <p style="font-size: 72px; font-weight: bold; color: #16a34a; margin: 10px 0;">#${queueNum}</p>
            </div>
            <p style="text-align: center; color: #166534;">Don't forget to bring your ID!</p>
          </div>
        </div>
      `,
      text: `It's Your Turn! Queue #${queueNum}\n\nHi ${user.first_name},\n\nPlease proceed to the Bookstore counter now!\n\nYour Queue Number: #${queueNum}\n\nDon't forget to bring your ID!`
    }
  },

  appointmentReminder(appointment, user) {
    return {
      subject: `⏰ Reminder: Pickup Appointment Tomorrow`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #7c3aed; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Appointment Reminder</h1>
          </div>
          <div style="padding: 20px; background: #faf5ff;">
            <p>Hi ${user.first_name},</p>
            <p style="font-size: 18px;">This is a friendly reminder about your pickup appointment:</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #c4b5fd; text-align: center;">
              <p style="font-size: 24px; color: #7c3aed; margin: 0;"><strong>${appointment.schedule_date}</strong></p>
              <p style="font-size: 32px; color: #7c3aed; margin: 10px 0;">${appointment.time_slot?.slice(0, 5)}</p>
            </div>
            <p style="text-align: center; color: #6d28d9;">📍 BookSmart - HNU Bookstore</p>
            <p style="text-align: center; color: #6d28d9;">Don't forget to bring your ID!</p>
          </div>
        </div>
      `,
      text: `Reminder: Pickup Appointment Tomorrow\n\nHi ${user.first_name},\n\nThis is a friendly reminder about your pickup appointment:\n\nDate: ${appointment.schedule_date}\nTime: ${appointment.time_slot?.slice(0, 5)}\n\nLocation: BookSmart - HNU Bookstore\nDon't forget to bring your ID!`
    }
  },

  // RISO Job Order Workflow Emails
  risoJobSubmitted(job, user, items) {
    const itemsList = items?.map((item, i) => 
      `${i + 1}. ${item.subject} - ${item.num_masters} master(s) × ${item.copies_per_master} copies`
    ).join('\n') || 'No items'
    
    return {
      subject: `📄 RISO Job Order Submitted - ${job.job_number || job.job_id?.slice(0,8)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #7c3aed; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📄 RISO Job Order Submitted</h1>
            <p style="color: #ddd6fe; margin: 10px 0 0 0;">Job #${job.job_number || job.job_id?.slice(0,8)}</p>
          </div>
          <div style="padding: 30px; background: #faf5ff;">
            <p style="font-size: 16px;">Hi <strong>${user.first_name}</strong>,</p>
            <p>Your RISO printing request has been submitted successfully!</p>
            
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 25px 0; border: 2px solid #c4b5fd;">
              <p style="margin: 0 0 15px 0; color: #6d28d9; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Job Details</p>
              <p><strong>Department:</strong> ${job.department_account}</p>
              <p><strong>Exam Type:</strong> ${job.exam_type || 'N/A'}</p>
              <p><strong>Subjects:</strong> ${items?.length || 0}</p>
              <p><strong>Status:</strong> <span style="color: #f59e0b; font-weight: 600;">Pending Approval</span></p>
            </div>

            <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>📋 Next Steps:</strong><br>
                1. Bring your original documents to the Bookstore<br>
                2. Staff will review and approve your request<br>
                3. You'll receive an email when printing starts
              </p>
            </div>

            <div style="border-top: 1px solid #ddd6fe; padding-top: 20px; margin-top: 30px;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                Questions? Contact the Bookstore at <strong>bookstore@hnu.edu.ph</strong>
              </p>
            </div>
          </div>
        </div>
      `,
      text: `RISO Job Order Submitted - ${job.job_number || job.job_id?.slice(0,8)}\n\nHi ${user.first_name},\n\nYour RISO printing request has been submitted successfully!\n\nJob Details:\n- Department: ${job.department_account}\n- Exam Type: ${job.exam_type || 'N/A'}\n- Subjects: ${items?.length || 0}\n- Status: Pending Approval\n\nNext Steps:\n1. Bring your original documents to the Bookstore\n2. Staff will review and approve your request\n3. You'll receive an email when printing starts\n\nQuestions? Contact the Bookstore.`
    }
  },

  risoJobApproved(job, user, items) {
    const itemsList = items?.map((item, i) => 
      `${i + 1}. ${item.subject} - ${item.num_masters} master(s) × ${item.copies_per_master} copies`
    ).join('\n') || 'No items'
    
    return {
      subject: `✅ RISO Job Approved - Ready for Printing (#${job.job_number || job.job_id?.slice(0,8)})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #16a34a; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✅ RISO Job Approved!</h1>
            <p style="color: #dcfce7; margin: 10px 0 0 0;">Ready for Printing</p>
          </div>
          <div style="padding: 30px; background: #f0fdf4;">
            <p style="font-size: 16px;">Hi <strong>${user.first_name}</strong>,</p>
            <p>Your RISO printing request has been <strong>approved</strong> and is now queued for printing!</p>
            
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 25px 0; border: 2px solid #86efac;">
              <p style="margin: 0 0 15px 0; color: #166534; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Approved Job Details</p>
              <p><strong>Job Number:</strong> ${job.job_number || job.job_id?.slice(0,8)}</p>
              <p><strong>Department:</strong> ${job.department_account}</p>
              <p><strong>Subjects to Print:</strong> ${items?.length || 0}</p>
              <p><strong>Status:</strong> <span style="color: #16a34a; font-weight: 600;">Approved - In Queue</span></p>
            </div>

            <div style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #1e40af; font-size: 14px;">
                <strong>🖨️ What happens next?</strong><br>
                A risographer will start printing your documents soon. You'll receive another email when printing begins.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/shop/orders" 
                 style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Track Your Job
              </a>
            </div>
          </div>
        </div>
      `,
      text: `RISO Job Approved - ${job.job_number || job.job_id?.slice(0,8)}\n\nHi ${user.first_name},\n\nYour RISO printing request has been APPROVED and is now queued for printing!\n\nJob Details:\n- Job Number: ${job.job_number || job.job_id?.slice(0,8)}\n- Department: ${job.department_account}\n- Subjects: ${items?.length || 0}\n- Status: Approved - In Queue\n\nWhat happens next?\nA risographer will start printing your documents soon. You'll receive another email when printing begins.\n\nTrack your job: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/shop/orders`
    }
  },

  risoJobStarted(job, user) {
    return {
      subject: `🖨️ RISO Printing Started - ${job.job_number || job.job_id?.slice(0,8)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #9333ea; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🖨️ Printing in Progress!</h1>
            <p style="color: #f3e8ff; margin: 10px 0 0 0;">Your documents are being printed now</p>
          </div>
          <div style="padding: 30px; background: #faf5ff;">
            <p style="font-size: 16px;">Hi <strong>${user.first_name}</strong>,</p>
            <p>Great news! A risographer has <strong>started printing</strong> your RISO job order.</p>
            
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 25px 0; border: 2px solid #c4b5fd;">
              <p style="margin: 0 0 15px 0; color: #6d28d9; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Current Status</p>
              <p><strong>Job Number:</strong> ${job.job_number || job.job_id?.slice(0,8)}</p>
              <p><strong>Status:</strong> <span style="color: #9333ea; font-weight: 600;">🖨️ Currently Printing</span></p>
              <p><strong>Estimated Time:</strong> Depending on volume (30 mins - 2 hours)</p>
            </div>

            <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>⏰ Please Note:</strong> You'll receive an email as soon as your documents are ready for pickup.
              </p>
            </div>
          </div>
        </div>
      `,
      text: `RISO Printing Started - ${job.job_number || job.job_id?.slice(0,8)}\n\nHi ${user.first_name},\n\nGreat news! A risographer has STARTED PRINTING your RISO job order.\n\nCurrent Status:\n- Job Number: ${job.job_number || job.job_id?.slice(0,8)}\n- Status: Currently Printing\n- Estimated Time: 30 mins - 2 hours depending on volume\n\nYou'll receive an email as soon as your documents are ready for pickup.`
    }
  },

  risoJobCompleted(job, user, costs) {
    return {
      subject: `🎉 RISO Job Complete - Ready for Pickup! (#${job.job_number || job.job_id?.slice(0,8)})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #059669; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Printing Complete!</h1>
            <p style="color: #d1fae5; margin: 10px 0 0 0;">Your documents are ready for pickup</p>
          </div>
          <div style="padding: 30px; background: #ecfdf5;">
            <p style="font-size: 16px;">Hi <strong>${user.first_name}</strong>,</p>
            <p>Your RISO printing is <strong>complete</strong>! Please pick up your documents at the Bookstore.</p>
            
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 25px 0; border: 2px solid #6ee7b7;">
              <p style="margin: 0 0 15px 0; color: #047857; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Pickup Information</p>
              <p><strong>Job Number:</strong> ${job.job_number || job.job_id?.slice(0,8)}</p>
              <p><strong>Location:</strong> HNU Bookstore (Ground Floor, Admin Building)</p>
              <p><strong>Pickup Hours:</strong> Mon-Fri 8:00 AM - 5:00 PM</p>
              ${costs?.totalCost > 0 ? `<p><strong>Amount to Pay:</strong> <span style="color: #059669; font-size: 18px; font-weight: bold;">₱${costs.totalCost.toFixed(2)}</span></p>` : ''}
            </div>

            <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">
                <strong>📋 Please Bring:</strong><br>
                • Valid ID<br>
                • Job Number: <strong>${job.job_number || job.job_id?.slice(0,8)}</strong><br>
                ${costs?.totalCost > 0 ? '• Payment (Cash only at Bookstore)' : ''}
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/shop/orders" 
                 style="display: inline-block; background: #059669; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Job Details
              </a>
            </div>
          </div>
        </div>
      `,
      text: `RISO Job Complete - ${job.job_number || job.job_id?.slice(0,8)}\n\nHi ${user.first_name},\n\nYour RISO printing is COMPLETE! Please pick up your documents at the Bookstore.\n\nPickup Information:\n- Job Number: ${job.job_number || job.job_id?.slice(0,8)}\n- Location: HNU Bookstore (Ground Floor, Admin Building)\n- Pickup Hours: Mon-Fri 8:00 AM - 5:00 PM\n${costs?.totalCost > 0 ? `- Amount to Pay: ₱${costs.totalCost.toFixed(2)}` : ''}\n\nPlease Bring:\n• Valid ID\n• Job Number: ${job.job_number || job.job_id?.slice(0,8)}\n${costs?.totalCost > 0 ? '• Payment (Cash only)' : ''}\n\nView details: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/shop/orders`
    }
  },

  risoJobRejected(job, user, reason) {
    return {
      subject: `❌ RISO Job Rejected - Action Required (#${job.job_number || job.job_id?.slice(0,8)})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #dc2626; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">❌ RISO Job Rejected</h1>
            <p style="color: #fee2e2; margin: 10px 0 0 0;">Action Required</p>
          </div>
          <div style="padding: 30px; background: #fef2f2;">
            <p style="font-size: 16px;">Hi <strong>${user.first_name}</strong>,</p>
            <p>Unfortunately, your RISO job order could not be approved at this time.</p>
            
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 25px 0; border: 2px solid #fecaca;">
              <p style="margin: 0 0 15px 0; color: #dc2626; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Rejection Details</p>
              <p><strong>Job Number:</strong> ${job.job_number || job.job_id?.slice(0,8)}</p>
              <p><strong>Reason:</strong></p>
              <p style="background: #fef2f2; padding: 10px; border-radius: 6px; color: #991b1b;">${reason || 'No specific reason provided.'}</p>
            </div>

            <div style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #1e40af; font-size: 14px;">
                <strong>💡 What can you do?</strong><br>
                • Visit the Bookstore to discuss the issue<br>
                • Submit a new job order with corrections<br>
                • Contact the Bookstore Manager for clarification
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/shop/riso" 
                 style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Submit New RISO Job
              </a>
            </div>
          </div>
        </div>
      `,
      text: `RISO Job Rejected - ${job.job_number || job.job_id?.slice(0,8)}\n\nHi ${user.first_name},\n\nUnfortunately, your RISO job order could not be approved.\n\nReason: ${reason || 'No specific reason provided.'}\n\nWhat can you do?\n• Visit the Bookstore to discuss the issue\n• Submit a new job order with corrections\n• Contact the Bookstore Manager\n\nSubmit new job: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/shop/riso`
    }
  },

  welcomeEmail(user, tempPassword, roleLabel) {
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`
    return {
      subject: `Welcome to BookSmart - Your Account is Ready!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0d9488; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to BookSmart!</h1>
            <p style="color: #ccfbf1; margin: 10px 0 0 0;">HNU Bookstore Management System</p>
          </div>
          <div style="padding: 30px; background: #f0fdfa;">
            <p style="font-size: 16px;">Hi <strong>${user.first_name}</strong>,</p>
            <p>Your account has been created successfully! You can now access BookSmart as a <strong>${roleLabel}</strong>.</p>
            
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 25px 0; border: 2px solid #99f6e4;">
              <p style="margin: 0 0 15px 0; color: #0f766e; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Login Credentials</p>
              <table style="width: 100%; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; width: 100px;">Email:</td>
                  <td style="padding: 8px 0; font-weight: 600; color: #0f766e;">${user.email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Password:</td>
                  <td style="padding: 8px 0; font-family: monospace; background: #f1f5f9; padding: 8px 12px; border-radius: 6px; font-weight: 600; color: #dc2626;">${tempPassword}</td>
                </tr>
              </table>
            </div>

            <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0; color: #92400e; font-size: 14px;">
                <strong>⚠️ Important:</strong> This is a temporary password. Please change it immediately after your first login for security.
              </p>
              <p style="margin: 0; color: #dc2626; font-size: 13px; font-weight: 600;">
                ⏰ Account expires in 24 hours if not activated. Please sign in today!
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" 
                 style="display: inline-block; background: #0d9488; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Sign In to BookSmart
              </a>
            </div>

            <div style="border-top: 1px solid #ccfbf1; padding-top: 20px; margin-top: 30px;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                If you have any questions or need assistance, please contact the Bookstore Manager.<br>
                <strong>HNU Bookstore Team</strong>
              </p>
            </div>
          </div>
        </div>
      `,
      text: `Welcome to BookSmart - HNU Bookstore Management System\n\nHi ${user.first_name},\n\nYour account has been created successfully! You can now access BookSmart as a ${roleLabel}.\n\nYour Login Credentials:\nEmail: ${user.email}\nTemporary Password: ${tempPassword}\n\nIMPORTANT:\n- This is a temporary password. Change it immediately after your first login.\n- Account expires in 24 hours if not activated. Please sign in today!\n\nSign In: ${loginUrl}\n\nIf you have any questions, please contact the Bookstore Manager.\n\nHNU Bookstore Team`
    }
  }
}

// Helper to send notification emails
export async function sendNotificationEmail({ type, user, order, queueEntry, appointment, amount }) {
  if (!user?.email) {
    console.log('❌ No email address for user:', user?.id_number)
    return { success: false, error: 'No email address' }
  }

  let template
  switch (type) {
    case 'ORDER_CREATED':
      template = EmailTemplates.orderCreated(order, user)
      break
    case 'ORDER_READY':
      template = EmailTemplates.orderReady(order, user)
      break
    case 'ORDER_RELEASED':
      template = EmailTemplates.orderReleased(order, user)
      break
    case 'PAYMENT_VERIFIED':
      template = EmailTemplates.paymentVerified(order, amount, user)
      break
    case 'QUEUE_CALLED':
      template = EmailTemplates.queueCalled(queueEntry, user)
      break
    case 'APPOINTMENT_REMINDER':
      template = EmailTemplates.appointmentReminder(appointment, user)
      break
    default:
      return { success: false, error: 'Unknown template type' }
  }

  return sendEmail({
    to: user.email,
    ...template
  })
}

export default {
  sendEmail,
  sendNotificationEmail,
  verifyEmailConfig,
  EmailTemplates
}
