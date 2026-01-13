/**
 * Branded email templates for Watson Mattheus
 * All emails use consistent styling and branding
 */

/**
 * Base email wrapper with header and footer
 */
export const emailWrapper = (content: string, title: string, subtitle?: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <style>
    /* Reset styles */
    body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    
    /* Base styles */
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6; 
      color: #1f2937; 
      margin: 0; 
      padding: 0; 
      background-color: #f3f4f6;
      width: 100% !important;
    }
    
    .email-container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: #ffffff;
    }
    
    .header { 
      background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); 
      color: white; 
      padding: 32px 24px; 
      text-align: center; 
    }
    
    .logo { 
      font-size: 26px; 
      font-weight: 700; 
      letter-spacing: -0.5px;
      margin: 0;
    }
    
    .header-title {
      margin: 12px 0 0 0; 
      opacity: 0.95;
      font-size: 16px;
      font-weight: 500;
    }
    
    .header-subtitle {
      margin: 4px 0 0 0; 
      opacity: 0.8;
      font-size: 13px;
    }
    
    .content { 
      background: #ffffff; 
      padding: 32px 24px; 
    }
    
    .footer { 
      background: #f8fafc; 
      padding: 24px; 
      text-align: center; 
      color: #64748b; 
      font-size: 12px;
      border-top: 1px solid #e2e8f0;
    }
    
    .footer p {
      margin: 8px 0;
    }
    
    .footer-logo {
      font-weight: 600;
      color: #475569;
      font-size: 14px;
    }
    
    .button { 
      display: inline-block; 
      padding: 14px 32px; 
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); 
      color: #ffffff !important; 
      text-decoration: none; 
      border-radius: 8px; 
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);
    }
    
    .button:hover {
      background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
    }
    
    .button-secondary {
      background: #f1f5f9;
      color: #475569 !important;
      box-shadow: none;
      border: 1px solid #e2e8f0;
    }
    
    .highlight { 
      background: #f8fafc; 
      padding: 16px 20px; 
      border-left: 4px solid #2563eb; 
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    
    .highlight-warning {
      border-left-color: #f59e0b;
      background: #fffbeb;
    }
    
    .highlight-success {
      border-left-color: #10b981;
      background: #ecfdf5;
    }
    
    .highlight-error {
      border-left-color: #ef4444;
      background: #fef2f2;
    }
    
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    
    .divider {
      height: 1px;
      background: #e2e8f0;
      margin: 24px 0;
    }
    
    .meta {
      font-size: 12px;
      color: #64748b;
    }
    
    .badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 600;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .badge-blue {
      background: #dbeafe;
      color: #1e40af;
    }
    
    .badge-green {
      background: #dcfce7;
      color: #166534;
    }
    
    .badge-orange {
      background: #ffedd5;
      color: #9a3412;
    }
    
    .badge-red {
      background: #fee2e2;
      color: #991b1b;
    }
    
    @media only screen and (max-width: 600px) {
      .content { padding: 24px 16px; }
      .header { padding: 24px 16px; }
      .button { padding: 12px 24px; }
    }
  </style>
</head>
<body>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td style="padding: 24px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="email-container" style="margin: 0 auto; max-width: 600px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <tr>
            <td class="header">
              <p class="logo">Watson Mattheus</p>
              <p class="header-title">${title}</p>
              ${subtitle ? `<p class="header-subtitle">${subtitle}</p>` : ''}
            </td>
          </tr>
          <tr>
            <td class="content">
              ${content}
            </td>
          </tr>
          <tr>
            <td class="footer">
              <p class="footer-logo">Watson Mattheus Engineering</p>
              <p>This is an automated message. Please do not reply directly to this email.</p>
              <p style="margin-top: 16px; color: #94a3b8;">© ${new Date().getFullYear()} Watson Mattheus. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Message notification template - when a user is mentioned
 */
export const messageNotificationTemplate = (
  recipientName: string,
  senderName: string,
  messagePreview: string,
  conversationLink: string
) => emailWrapper(`
  <p style="margin: 0 0 16px 0; font-size: 15px;">Hi ${recipientName},</p>
  
  <p style="margin: 0 0 20px 0; font-size: 15px;">
    <strong>${senderName}</strong> mentioned you in a message:
  </p>
  
  <div class="highlight">
    <p style="margin: 0; font-style: italic; color: #475569;">"${messagePreview}"</p>
  </div>
  
  <p style="text-align: center; margin: 32px 0 16px 0;">
    <a href="${conversationLink}" class="button">View Conversation</a>
  </p>
  
  <p class="meta" style="text-align: center; margin-top: 24px;">
    You received this email because you were mentioned in a conversation.
  </p>
`, '💬 New Mention', 'You have a new mention');

/**
 * New message notification template
 */
export const newMessageTemplate = (
  recipientName: string,
  senderName: string,
  messagePreview: string,
  conversationLink: string
) => emailWrapper(`
  <p style="margin: 0 0 16px 0; font-size: 15px;">Hi ${recipientName},</p>
  
  <p style="margin: 0 0 20px 0; font-size: 15px;">
    You have a new message from <strong>${senderName}</strong>:
  </p>
  
  <div class="highlight">
    <p style="margin: 0; font-style: italic; color: #475569;">"${messagePreview}"</p>
  </div>
  
  <p style="text-align: center; margin: 32px 0 16px 0;">
    <a href="${conversationLink}" class="button">Reply Now</a>
  </p>
`, '📩 New Message', 'You have an unread message');

/**
 * Item shared notification template
 */
export const itemSharedTemplate = (
  recipientName: string,
  senderName: string,
  itemType: string,
  itemName: string,
  itemLink: string,
  message?: string
) => emailWrapper(`
  <p style="margin: 0 0 16px 0; font-size: 15px;">Hi ${recipientName},</p>
  
  <p style="margin: 0 0 20px 0; font-size: 15px;">
    <strong>${senderName}</strong> has shared a ${itemType.toLowerCase()} with you:
  </p>
  
  <div class="card">
    <p style="margin: 0 0 8px 0;">
      <span class="badge badge-blue">${itemType}</span>
    </p>
    <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;">${itemName}</p>
    ${message ? `<p style="margin: 12px 0 0 0; color: #64748b; font-size: 14px;">"${message}"</p>` : ''}
  </div>
  
  <p style="text-align: center; margin: 32px 0 16px 0;">
    <a href="${itemLink}" class="button">View ${itemType}</a>
  </p>
`, '📎 Item Shared', `${senderName} shared something with you`);

/**
 * Review status notification template
 */
export const reviewStatusTemplate = (
  recipientName: string,
  reviewerName: string,
  documentTitle: string,
  status: 'approved' | 'rejected' | 'pending' | 'revision_requested',
  comments: string | null,
  documentLink: string
) => {
  const statusConfig = {
    approved: { badge: 'badge-green', label: 'Approved', icon: '✅', highlightClass: 'highlight-success' },
    rejected: { badge: 'badge-red', label: 'Rejected', icon: '❌', highlightClass: 'highlight-error' },
    pending: { badge: 'badge-orange', label: 'Pending Review', icon: '⏳', highlightClass: '' },
    revision_requested: { badge: 'badge-orange', label: 'Revision Requested', icon: '📝', highlightClass: 'highlight-warning' },
  };
  
  const config = statusConfig[status];
  
  return emailWrapper(`
    <p style="margin: 0 0 16px 0; font-size: 15px;">Hi ${recipientName},</p>
    
    <p style="margin: 0 0 20px 0; font-size: 15px;">
      <strong>${reviewerName}</strong> has updated the status of your submission:
    </p>
    
    <div class="card">
      <p style="margin: 0 0 12px 0;">
        <span class="badge ${config.badge}">${config.icon} ${config.label}</span>
      </p>
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;">${documentTitle}</p>
    </div>
    
    ${comments ? `
    <div class="highlight ${config.highlightClass}">
      <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Reviewer Comments</p>
      <p style="margin: 0; color: #475569;">${comments}</p>
    </div>
    ` : ''}
    
    <p style="text-align: center; margin: 32px 0 16px 0;">
      <a href="${documentLink}" class="button">View Document</a>
    </p>
  `, '📋 Review Update', `Your submission has been ${config.label.toLowerCase()}`);
};

/**
 * System alert template
 */
export const systemAlertTemplate = (
  recipientName: string,
  alertTitle: string,
  alertMessage: string,
  severity: 'info' | 'warning' | 'error',
  actionLink?: string,
  actionLabel?: string
) => {
  const severityConfig = {
    info: { highlightClass: '', icon: 'ℹ️' },
    warning: { highlightClass: 'highlight-warning', icon: '⚠️' },
    error: { highlightClass: 'highlight-error', icon: '🚨' },
  };
  
  const config = severityConfig[severity];
  
  return emailWrapper(`
    <p style="margin: 0 0 16px 0; font-size: 15px;">Hi ${recipientName},</p>
    
    <div class="highlight ${config.highlightClass}">
      <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${config.icon} ${alertTitle}</p>
      <p style="margin: 0; color: #475569;">${alertMessage}</p>
    </div>
    
    ${actionLink && actionLabel ? `
    <p style="text-align: center; margin: 32px 0 16px 0;">
      <a href="${actionLink}" class="button">${actionLabel}</a>
    </p>
    ` : ''}
  `, '🔔 System Alert', alertTitle);
};

/**
 * Project update notification template
 */
export const projectUpdateTemplate = (
  recipientName: string,
  projectName: string,
  updateType: string,
  updateDetails: string,
  updatedBy: string,
  projectLink: string
) => emailWrapper(`
  <p style="margin: 0 0 16px 0; font-size: 15px;">Hi ${recipientName},</p>
  
  <p style="margin: 0 0 20px 0; font-size: 15px;">
    There's been an update to a project you're involved with:
  </p>
  
  <div class="card">
    <p style="margin: 0 0 8px 0;">
      <span class="badge badge-blue">${updateType}</span>
    </p>
    <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">${projectName}</p>
    <p style="margin: 0; color: #64748b; font-size: 14px;">${updateDetails}</p>
    <p class="meta" style="margin: 12px 0 0 0;">Updated by ${updatedBy}</p>
  </div>
  
  <p style="text-align: center; margin: 32px 0 16px 0;">
    <a href="${projectLink}" class="button">View Project</a>
  </p>
`, '📊 Project Update', `Update on ${projectName}`);
