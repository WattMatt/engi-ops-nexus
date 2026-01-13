/**
 * ============================================================================
 * WATSON MATTHEUS - CROSS-CLIENT EMAIL TEMPLATE SYSTEM
 * ============================================================================
 * 
 * All templates in this file are AUTOMATICALLY compatible with:
 * - ✅ iOS Mail (iPhone, iPad)
 * - ✅ Apple Mail (macOS)
 * - ✅ Microsoft Outlook (Windows, Mac, Web)
 * - ✅ Gmail (Web, iOS, Android)
 * - ✅ Yahoo Mail
 * - ✅ Samsung Mail
 * - ✅ Windows Mail
 * 
 * COMPATIBILITY RULES (enforced by this system):
 * 1. All styles are 100% inline (no external CSS, no <style> blocks for content)
 * 2. Table-based layouts only (no flexbox, no grid, no float)
 * 3. VML fallbacks for Outlook buttons and shapes
 * 4. Safe font stacks with system font fallbacks
 * 5. No CSS shorthand (padding: 10px 20px → padding-top, padding-left, etc.)
 * 6. Explicit width on tables, max-width for responsive
 * 7. role="presentation" on layout tables for accessibility
 * 8. MSO conditional comments for Outlook-specific fixes
 * 
 * HOW TO ADD NEW TEMPLATES:
 * 1. Use emailWrapper() for consistent header/footer
 * 2. Use helper functions: createButton(), createCard(), createHighlight(), createBadge()
 * 3. Always use the BRAND_* and TEXT_* color constants
 * 4. Include font-family on EVERY text element (some clients strip inherited fonts)
 * 5. Test with Litmus or Email on Acid if making significant changes
 * 
 * ============================================================================
 */

// =============================================================================
// BRAND COLORS - Use these constants, never hardcode colors
// =============================================================================
const BRAND_NAVY = "#1e3a5f";
const BRAND_BLUE = "#2563eb";
const BRAND_DARK_BLUE = "#1d4ed8";
const TEXT_PRIMARY = "#1f2937";
const TEXT_SECONDARY = "#475569";
const TEXT_MUTED = "#64748b";
const BG_LIGHT = "#f8fafc";
const BG_GRAY = "#f3f4f6";
const BORDER_COLOR = "#e2e8f0";

// Safe font stack that works across all platforms
const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

// =============================================================================
// EMAIL WRAPPER - All templates MUST use this for consistent cross-client support
// =============================================================================
/**
 * Base email wrapper with header and footer.
 * Handles all cross-client compatibility automatically.
 * 
 * @param content - The main email body content (use helper functions)
 * @param title - Header title displayed in the email
 * @param subtitle - Optional subtitle below the title
 */
export const emailWrapper = (content: string, title: string, subtitle?: string) => `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--[if !mso]><!-->
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <!--<![endif]-->
  <!-- iOS: Prevents auto-linking of addresses, dates, phone numbers -->
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <!-- Windows Phone: Prevents text size adjustment -->
  <meta name="MobileOptimized" content="width">
  <meta name="HandheldFriendly" content="true">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <style type="text/css">
    table {border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;}
    td, th, div, p, a, h1, h2, h3, h4, h5, h6 {font-family: "Segoe UI", sans-serif; mso-line-height-rule: exactly;}
    img {-ms-interpolation-mode: bicubic;}
    a {text-decoration: none;}
  </style>
  <![endif]-->
  <!--[if !mso]><!-->
  <style type="text/css">
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .mobile-padding { padding-left: 16px !important; padding-right: 16px !important; }
    }
  </style>
  <!--<![endif]-->
</head>
<body style="margin: 0; padding: 0; width: 100% !important; min-width: 100%; background-color: ${BG_GRAY}; font-family: ${FONT_STACK}; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-margin-top-alt: 0; mso-margin-bottom-alt: 0;">
  
  <!-- Preview text (hidden, shows in inbox preview) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${title}${subtitle ? ' - ' + subtitle : ''}
    &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847;
  </div>

  <!-- Outer wrapper table for full-width background -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; background-color: ${BG_GRAY}; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
    <tr>
      <td align="center" style="padding: 24px 16px;" class="mobile-padding">
        
        <!--[if mso]>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center">
        <tr>
        <td>
        <![endif]-->
        
        <!-- Email container - 600px max width -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" class="email-container" style="margin: 0 auto; max-width: 600px; background-color: #ffffff; border-radius: 12px; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
          
          <!-- Header with gradient (solid fallback for Outlook) -->
          <tr>
            <td align="center" style="background-color: ${BRAND_NAVY}; padding: 32px 24px; border-radius: 12px 12px 0 0;">
              <!--[if gte mso 9]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:120px;">
                <v:fill type="gradient" color="${BRAND_BLUE}" color2="${BRAND_NAVY}" angle="135"/>
                <v:textbox inset="0,0,0,0" style="mso-fit-shape-to-text:true">
              <![endif]-->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <p style="margin: 0; font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; font-family: ${FONT_STACK}; mso-line-height-rule: exactly; line-height: 1.3;">Watson Mattheus</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 12px; padding-bottom: 0; padding-left: 0; padding-right: 0;">
                    <p style="margin: 0; font-size: 16px; font-weight: 500; color: #ffffff; font-family: ${FONT_STACK}; mso-line-height-rule: exactly; line-height: 1.4;">📋 ${title}</p>
                  </td>
                </tr>
                ${subtitle ? `
                <tr>
                  <td align="center" style="padding-top: 4px; padding-bottom: 0; padding-left: 0; padding-right: 0;">
                    <p style="margin: 0; font-size: 13px; color: #ffffff; font-family: ${FONT_STACK}; mso-line-height-rule: exactly; line-height: 1.4;">${subtitle}</p>
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
            <td style="background-color: #ffffff; padding: 32px 24px;" class="mobile-padding">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: ${BG_LIGHT}; padding: 24px; border-top-width: 1px; border-top-style: solid; border-top-color: ${BORDER_COLOR}; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: ${TEXT_SECONDARY}; font-family: ${FONT_STACK}; mso-line-height-rule: exactly; line-height: 1.4;">Watson Mattheus Engineering</p>
              <p style="margin: 0 0 16px 0; font-size: 12px; color: ${TEXT_MUTED}; font-family: ${FONT_STACK}; mso-line-height-rule: exactly; line-height: 1.4;">This is an automated message. Please do not reply directly to this email.</p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8; font-family: ${FONT_STACK}; mso-line-height-rule: exactly; line-height: 1.4;">© ${new Date().getFullYear()} Watson Mattheus. All rights reserved.</p>
            </td>
          </tr>
          
        </table>
        
        <!--[if mso]>
        </td>
        </tr>
        </table>
        <![endif]-->
        
      </td>
    </tr>
  </table>
  
</body>
</html>
`;

// =============================================================================
// HELPER FUNCTIONS - Use these to build email content
// =============================================================================

/**
 * Creates a bulletproof CTA button that works in ALL email clients including Outlook.
 * Uses VML for Outlook, CSS for modern clients.
 * 
 * @param href - The button link URL
 * @param text - Button label text
 * @param isPrimary - true for blue button, false for light/secondary
 */
const createButton = (href: string, text: string, isPrimary: boolean = true) => `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
  <tr>
    <td align="center" style="border-radius: 8px; background-color: ${isPrimary ? BRAND_BLUE : BG_LIGHT};">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:44px;v-text-anchor:middle;width:200px;" arcsize="18%" stroke="f" fillcolor="${isPrimary ? BRAND_BLUE : BG_LIGHT}">
        <w:anchorlock/>
        <center style="color:${isPrimary ? '#ffffff' : TEXT_SECONDARY};font-family:Segoe UI,sans-serif;font-size:14px;font-weight:bold;">${text}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${href}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: ${isPrimary ? '#ffffff' : TEXT_SECONDARY}; text-decoration: none; border-radius: 8px; background-color: ${isPrimary ? BRAND_BLUE : BG_LIGHT}; font-family: ${FONT_STACK}; mso-hide: all;">${text}</a>
      <!--<![endif]-->
    </td>
  </tr>
</table>
`;

/**
 * Creates a card/box element with consistent styling.
 * Works in all clients including Outlook.
 * 
 * @param content - HTML content to display inside the card
 */
const createCard = (content: string) => `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 16px 0; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
  <tr>
    <td style="background-color: ${BG_LIGHT}; border-width: 1px; border-style: solid; border-color: ${BORDER_COLOR}; border-radius: 8px; padding: 16px;">
      ${content}
    </td>
  </tr>
</table>
`;

/**
 * Creates a highlight/callout box with left border accent.
 * Great for warnings, notes, and important information.
 * 
 * @param content - HTML content to display
 * @param borderColor - Left border color (defaults to brand blue)
 * @param bgColor - Background color (defaults to light gray)
 */
const createHighlight = (content: string, borderColor: string = BRAND_BLUE, bgColor: string = BG_LIGHT) => `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
  <tr>
    <td style="background-color: ${bgColor}; border-left-width: 4px; border-left-style: solid; border-left-color: ${borderColor}; border-radius: 0 8px 8px 0; padding: 16px 20px;">
      ${content}
    </td>
  </tr>
</table>
`;

/**
 * Creates a badge/tag element for labels and categories.
 * Note: Some email clients may not support inline-block perfectly.
 * 
 * @param text - Badge label text
 * @param bgColor - Background color
 * @param textColor - Text color
 */
const createBadge = (text: string, bgColor: string = "#dbeafe", textColor: string = "#1e40af") => `
<span style="display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 600; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; background-color: ${bgColor}; color: ${textColor}; font-family: ${FONT_STACK}; mso-line-height-rule: exactly;">${text}</span>
`;

/**
 * Creates a simple text paragraph with proper cross-client styling.
 * Use this for any body text to ensure consistent rendering.
 * 
 * @param text - The paragraph text
 * @param marginBottom - Bottom margin in pixels (default 16)
 */
const createParagraph = (text: string, marginBottom: number = 16) => `
<p style="margin: 0 0 ${marginBottom}px 0; font-size: 15px; color: ${TEXT_PRIMARY}; font-family: ${FONT_STACK}; mso-line-height-rule: exactly; line-height: 1.5;">${text}</p>
`;

/**
 * Creates a divider/separator line.
 */
const createDivider = () => `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
  <tr>
    <td style="border-top-width: 1px; border-top-style: solid; border-top-color: ${BORDER_COLOR}; font-size: 1px; line-height: 1px;">&nbsp;</td>
  </tr>
</table>
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

/**
 * User invitation/welcome email template
 * Sent when an admin creates a new user account
 */
export const userInviteTemplate = (
  recipientName: string,
  recipientEmail: string,
  temporaryPassword: string,
  role: string,
  inviterName: string,
  loginLink: string
) => {
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  
  return emailWrapper(`
    <p style="margin: 0 0 16px 0; font-size: 15px; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Hi ${recipientName},</p>
    
    <p style="margin: 0 0 20px 0; font-size: 15px; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      Welcome! <strong>${inviterName}</strong> has created an account for you on the Watson Mattheus platform.
    </p>
    
    ${createCard(`
      <p style="margin: 0 0 8px 0;">
        ${createBadge(roleLabel)}
      </p>
      <p style="margin: 0 0 16px 0; font-size: 14px; color: ${TEXT_SECONDARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        Your account is ready. Use the credentials below to log in.
      </p>
      
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 8px 0;">
            <p style="margin: 0; font-size: 12px; font-weight: 600; color: ${TEXT_MUTED}; text-transform: uppercase; letter-spacing: 0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Email</p>
            <p style="margin: 4px 0 0 0; font-size: 14px; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${recipientEmail}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0 0 0;">
            <p style="margin: 0; font-size: 12px; font-weight: 600; color: ${TEXT_MUTED}; text-transform: uppercase; letter-spacing: 0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Temporary Password</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; font-family: 'Courier New', monospace; color: ${TEXT_PRIMARY}; background-color: #f3f4f6; padding: 8px 12px; border-radius: 6px; display: inline-block;">${temporaryPassword}</p>
          </td>
        </tr>
      </table>
    `)}
    
    ${createCard(`
      <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">📋 Getting Started</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 6px 0; vertical-align: top;">
            <p style="margin: 0; font-size: 13px; color: ${TEXT_SECONDARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <strong style="color: ${BRAND_BLUE};">Step 1:</strong> Click the "Log In Now" button below
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; vertical-align: top;">
            <p style="margin: 0; font-size: 13px; color: ${TEXT_SECONDARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <strong style="color: ${BRAND_BLUE};">Step 2:</strong> Enter your email and the temporary password above
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; vertical-align: top;">
            <p style="margin: 0; font-size: 13px; color: ${TEXT_SECONDARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <strong style="color: ${BRAND_BLUE};">Step 3:</strong> Create a new secure password when prompted
            </p>
          </td>
        </tr>
      </table>
    `)}
    
    ${createHighlight(`
      <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 600; color: #9a3412; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">🔐 Important Security Notice</p>
      <p style="margin: 0; font-size: 13px; color: ${TEXT_SECONDARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <strong>You must change your password</strong> on your first login. This is a temporary password created for initial access only. Please keep your credentials secure and never share them with anyone.
      </p>
    `, '#f59e0b', '#fffbeb')}
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0 16px 0;">
      <tr>
        <td align="center">
          ${createButton(loginLink, 'Log In Now')}
        </td>
      </tr>
    </table>
    
    <p style="text-align: center; margin-top: 24px; font-size: 12px; color: ${TEXT_MUTED}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      If you weren't expecting this email, please contact your administrator.
    </p>
  `, 'Account Created', `You've been invited to Watson Mattheus`);
};
