/**
 * Branded email templates for Watson Mattheus
 * All emails use consistent styling and branding
 * 
 * IMPORTANT: These templates use 100% inline styles and table-based layouts
 * for maximum compatibility with all email clients including Outlook, Gmail, and Apple Mail.
 */

// Brand colors
const BRAND_NAVY = "#1e3a5f";
const BRAND_BLUE = "#2563eb";
const BRAND_DARK_BLUE = "#1d4ed8";
const TEXT_PRIMARY = "#1f2937";
const TEXT_SECONDARY = "#475569";
const TEXT_MUTED = "#64748b";
const BG_LIGHT = "#f8fafc";
const BG_GRAY = "#f3f4f6";
const BORDER_COLOR = "#e2e8f0";

/**
 * Base email wrapper with header and footer
 * Uses 100% inline styles for cross-client compatibility
 */
export const emailWrapper = (content: string, title: string, subtitle?: string) => `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <style>
    table {border-collapse: collapse;}
    td,th,div,p,a,h1,h2,h3,h4,h5,h6 {font-family: "Segoe UI", sans-serif; mso-line-height-rule: exactly;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: ${BG_GRAY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  
  <!-- Outer wrapper table -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${BG_GRAY};">
    <tr>
      <td style="padding: 24px 16px;">
        
        <!-- Email container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="margin: 0 auto; max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          
          <!-- Header with solid background (gradient fallback) -->
          <tr>
            <td align="center" style="background-color: ${BRAND_NAVY}; padding: 32px 24px;">
              <!--[if gte mso 9]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:120px;">
                <v:fill type="gradient" color="${BRAND_BLUE}" color2="${BRAND_NAVY}" angle="135"/>
                <v:textbox inset="0,0,0,0">
              <![endif]-->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 0;">
                    <p style="margin: 0; font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Watson Mattheus</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 12px;">
                    <p style="margin: 0; font-size: 16px; font-weight: 500; color: #ffffff; opacity: 0.95; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">📋 ${title}</p>
                  </td>
                </tr>
                ${subtitle ? `
                <tr>
                  <td align="center" style="padding-top: 4px;">
                    <p style="margin: 0; font-size: 13px; color: #ffffff; opacity: 0.8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${subtitle}</p>
                  </td>
                </tr>
                ` : ''}
              </table>
              <!--[if gte mso 9]>
                </v:textbox>
              </v:rect>
              <![endif]-->
            </td>
          </tr>
          
          <!-- Content area -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px 24px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: ${BG_LIGHT}; padding: 24px; border-top: 1px solid ${BORDER_COLOR};">
              <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: ${TEXT_SECONDARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Watson Mattheus Engineering</p>
              <p style="margin: 0 0 16px 0; font-size: 12px; color: ${TEXT_MUTED}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">This is an automated message. Please do not reply directly to this email.</p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">© ${new Date().getFullYear()} Watson Mattheus. All rights reserved.</p>
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
 * Creates a bulletproof button that works in all email clients including Outlook
 */
const createButton = (href: string, text: string, isPrimary: boolean = true) => `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto;">
  <tr>
    <td align="center" style="border-radius: 8px; background-color: ${isPrimary ? BRAND_BLUE : BG_LIGHT};">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:44px;v-text-anchor:middle;width:180px;" arcsize="18%" stroke="f" fillcolor="${isPrimary ? BRAND_BLUE : BG_LIGHT}">
        <w:anchorlock/>
        <center style="color:${isPrimary ? '#ffffff' : TEXT_SECONDARY};font-family:sans-serif;font-size:14px;font-weight:bold;">${text}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${href}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: ${isPrimary ? '#ffffff' : TEXT_SECONDARY}; text-decoration: none; border-radius: 8px; background-color: ${isPrimary ? BRAND_BLUE : BG_LIGHT}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${text}</a>
      <!--<![endif]-->
    </td>
  </tr>
</table>
`;

/**
 * Creates a card/box element with consistent styling
 */
const createCard = (content: string) => `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 16px 0;">
  <tr>
    <td style="background-color: ${BG_LIGHT}; border: 1px solid ${BORDER_COLOR}; border-radius: 8px; padding: 16px;">
      ${content}
    </td>
  </tr>
</table>
`;

/**
 * Creates a highlight/callout box
 */
const createHighlight = (content: string, borderColor: string = BRAND_BLUE, bgColor: string = BG_LIGHT) => `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
  <tr>
    <td style="background-color: ${bgColor}; border-left: 4px solid ${borderColor}; border-radius: 0 8px 8px 0; padding: 16px 20px;">
      ${content}
    </td>
  </tr>
</table>
`;

/**
 * Creates a badge/tag element
 */
const createBadge = (text: string, bgColor: string = "#dbeafe", textColor: string = "#1e40af") => `
<span style="display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 600; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; background-color: ${bgColor}; color: ${textColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${text}</span>
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
  <p style="margin: 0 0 16px 0; font-size: 15px; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Hi ${recipientName},</p>
  
  <p style="margin: 0 0 20px 0; font-size: 15px; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <strong>${senderName}</strong> mentioned you in a message:
  </p>
  
  ${createHighlight(`<p style="margin: 0; font-style: italic; color: ${TEXT_SECONDARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">"${messagePreview}"</p>`)}
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0 16px 0;">
    <tr>
      <td align="center">
        ${createButton(conversationLink, 'View Conversation')}
      </td>
    </tr>
  </table>
  
  <p style="text-align: center; margin-top: 24px; font-size: 12px; color: ${TEXT_MUTED}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    You received this email because you were mentioned in a conversation.
  </p>
`, 'New Mention', 'You have a new mention');

/**
 * New message notification template
 */
export const newMessageTemplate = (
  recipientName: string,
  senderName: string,
  messagePreview: string,
  conversationLink: string
) => emailWrapper(`
  <p style="margin: 0 0 16px 0; font-size: 15px; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Hi ${recipientName},</p>
  
  <p style="margin: 0 0 20px 0; font-size: 15px; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    You have a new message from <strong>${senderName}</strong>:
  </p>
  
  ${createHighlight(`<p style="margin: 0; font-style: italic; color: ${TEXT_SECONDARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">"${messagePreview}"</p>`)}
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0 16px 0;">
    <tr>
      <td align="center">
        ${createButton(conversationLink, 'Reply Now')}
      </td>
    </tr>
  </table>
`, 'New Message', 'You have an unread message');

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
  <p style="margin: 0 0 16px 0; font-size: 15px; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Hi ${recipientName},</p>
  
  <p style="margin: 0 0 20px 0; font-size: 15px; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <strong>${senderName}</strong> has shared a ${itemType.toLowerCase()} with you:
  </p>
  
  ${createCard(`
    <p style="margin: 0 0 8px 0;">
      ${createBadge(itemType)}
    </p>
    <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${itemName}</p>
    ${message ? `<p style="margin: 12px 0 0 0; color: ${TEXT_MUTED}; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">"${message}"</p>` : ''}
  `)}
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0 16px 0;">
    <tr>
      <td align="center">
        ${createButton(itemLink, `View ${itemType}`)}
      </td>
    </tr>
  </table>
`, 'Item Shared', `${senderName} shared something with you`);

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
    approved: { badgeBg: '#dcfce7', badgeColor: '#166534', label: '✅ Approved', borderColor: '#10b981', bgColor: '#ecfdf5' },
    rejected: { badgeBg: '#fee2e2', badgeColor: '#991b1b', label: '❌ Rejected', borderColor: '#ef4444', bgColor: '#fef2f2' },
    pending: { badgeBg: '#ffedd5', badgeColor: '#9a3412', label: '⏳ Pending Review', borderColor: '#f59e0b', bgColor: '#fffbeb' },
    revision_requested: { badgeBg: '#ffedd5', badgeColor: '#9a3412', label: '📝 Revision Requested', borderColor: '#f59e0b', bgColor: '#fffbeb' },
  };
  
  const config = statusConfig[status];
  
  return emailWrapper(`
    <p style="margin: 0 0 16px 0; font-size: 15px; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Hi ${recipientName},</p>
    
    <p style="margin: 0 0 20px 0; font-size: 15px; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <strong>${reviewerName}</strong> has updated the status of your submission:
    </p>
    
    ${createCard(`
      <p style="margin: 0 0 12px 0;">
        ${createBadge(config.label, config.badgeBg, config.badgeColor)}
      </p>
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${documentTitle}</p>
    `)}
    
    ${comments ? createHighlight(`
      <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: ${TEXT_MUTED}; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Reviewer Comments</p>
      <p style="margin: 0; color: ${TEXT_SECONDARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${comments}</p>
    `, config.borderColor, config.bgColor) : ''}
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0 16px 0;">
      <tr>
        <td align="center">
          ${createButton(documentLink, 'View Document')}
        </td>
      </tr>
    </table>
  `, 'Review Update', `Your submission has been ${config.label.toLowerCase()}`);
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
    info: { borderColor: BRAND_BLUE, bgColor: BG_LIGHT, icon: 'ℹ️' },
    warning: { borderColor: '#f59e0b', bgColor: '#fffbeb', icon: '⚠️' },
    error: { borderColor: '#ef4444', bgColor: '#fef2f2', icon: '🚨' },
  };
  
  const config = severityConfig[severity];
  
  return emailWrapper(`
    <p style="margin: 0 0 16px 0; font-size: 15px; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Hi ${recipientName},</p>
    
    ${createHighlight(`
      <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${config.icon} ${alertTitle}</p>
      <p style="margin: 0; color: ${TEXT_SECONDARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${alertMessage}</p>
    `, config.borderColor, config.bgColor)}
    
    ${actionLink && actionLabel ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0 16px 0;">
      <tr>
        <td align="center">
          ${createButton(actionLink, actionLabel)}
        </td>
      </tr>
    </table>
    ` : ''}
  `, 'System Alert', alertTitle);
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
  <p style="margin: 0 0 16px 0; font-size: 15px; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Hi ${recipientName},</p>
  
  <p style="margin: 0 0 20px 0; font-size: 15px; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    There's been an update to a project you're involved with:
  </p>
  
  ${createCard(`
    <p style="margin: 0 0 8px 0;">
      ${createBadge(updateType)}
    </p>
    <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${projectName}</p>
    <p style="margin: 0; color: ${TEXT_MUTED}; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${updateDetails}</p>
    <p style="margin: 12px 0 0 0; font-size: 12px; color: ${TEXT_MUTED}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Updated by ${updatedBy}</p>
  `)}
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0 16px 0;">
    <tr>
      <td align="center">
        ${createButton(projectLink, 'View Project')}
      </td>
    </tr>
  </table>
`, 'Project Update', `Update on ${projectName}`);

/**
 * Roadmap review update template - consolidated update sent after review
 * Uses 100% inline styles and table-based layout for cross-client compatibility
 */
export const roadmapReviewUpdateTemplate = (
  recipientName: string,
  projectName: string,
  reviewerName: string,
  updatedItems: Array<{
    title: string;
    isCompleted: boolean;
    notes?: string;
  }>,
  message: string | null,
  reviewLink: string
) => {
  const completedItems = updatedItems.filter(i => i.isCompleted);
  
  // Build items table with inline styles
  const itemRows = updatedItems.map(item => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid ${BORDER_COLOR}; width: 30px; vertical-align: top;">
        ${item.isCompleted 
          ? `<span style="color: #10b981; font-size: 16px;">✓</span>` 
          : `<span style="color: ${TEXT_MUTED}; font-size: 16px;">○</span>`}
      </td>
      <td style="padding: 8px 12px; border-bottom: 1px solid ${BORDER_COLOR}; font-size: 14px; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        ${item.title}
        ${item.notes ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: ${TEXT_MUTED}; font-style: italic; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${item.notes}</p>` : ''}
      </td>
    </tr>
  `).join('');

  return emailWrapper(`
    <p style="margin: 0 0 16px 0; font-size: 15px; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Hi ${recipientName},</p>
    
    <p style="margin: 0 0 20px 0; font-size: 15px; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <strong>${reviewerName}</strong> has completed a roadmap review for:
    </p>
    
    ${createCard(`
      <p style="margin: 0 0 8px 0;">
        ${createBadge('Project')}
      </p>
      <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${projectName}</p>
      <p style="margin: 0; font-size: 14px; color: ${TEXT_MUTED}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <strong style="color: #10b981;">${completedItems.length}</strong> of <strong>${updatedItems.length}</strong> reviewed items completed
      </p>
    `)}
    
    ${message ? createHighlight(`
      <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: ${TEXT_MUTED}; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Message from ${reviewerName}</p>
      <p style="margin: 0; color: ${TEXT_SECONDARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${message}</p>
    `) : ''}
    
    <p style="margin: 24px 0 12px 0; font-size: 14px; font-weight: 600; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Items Updated:</p>
    
    <!-- Items table with inline styles -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1px solid ${BORDER_COLOR}; border-radius: 8px; border-collapse: collapse;">
      <tbody>
        ${itemRows}
      </tbody>
    </table>
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0 16px 0;">
      <tr>
        <td align="center">
          ${createButton(reviewLink, 'View Roadmap')}
        </td>
      </tr>
    </table>
    
    <p style="text-align: center; margin-top: 24px; font-size: 12px; color: ${TEXT_MUTED}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      You're receiving this because you have access to this project's roadmap.
    </p>
  `, 'Roadmap Review Complete', `${reviewerName} has updated the roadmap`);
};
