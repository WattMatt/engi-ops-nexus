-- Add is_system column to track system-managed templates
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false;

-- Mark the seeded templates as system templates
UPDATE email_templates SET is_system = true WHERE html_content LIKE '<!-- System template:%';

-- Update User Invitation template with the actual HTML content
UPDATE email_templates 
SET html_content = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>Account Created</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td style="padding: 32px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto; max-width: 600px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: white; padding: 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Watson Mattheus</h1>
              <p style="margin: 12px 0 0 0; opacity: 0.9; font-size: 14px;">You''ve been invited to Watson Mattheus</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #1f2937;">Hi {{recipientName}},</p>
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #1f2937;">
                Welcome! <strong>{{inviterName}}</strong> has created an account for you on the Watson Mattheus platform.
              </p>
              
              <!-- Credentials Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0;"><span style="display: inline-block; padding: 4px 10px; background: #2563eb; color: white; border-radius: 4px; font-size: 12px; font-weight: 600;">{{role}}</span></p>
                    <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">Your account is ready. Use the credentials below to log in.</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 8px 0;">
                          <p style="margin: 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Email</p>
                          <p style="margin: 4px 0 0 0; font-size: 14px; color: #1f2937;">{{recipientEmail}}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0 0 0;">
                          <p style="margin: 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Temporary Password</p>
                          <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; font-family: Courier New, monospace; color: #1f2937; background-color: #f3f4f6; padding: 8px 12px; border-radius: 6px; display: inline-block;">{{temporaryPassword}}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Getting Started Steps -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #1f2937;">📋 Getting Started</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr><td style="padding: 6px 0;"><p style="margin: 0; font-size: 13px; color: #475569;"><strong style="color: #2563eb;">Step 1:</strong> Click the "Log In Now" button below</p></td></tr>
                      <tr><td style="padding: 6px 0;"><p style="margin: 0; font-size: 13px; color: #475569;"><strong style="color: #2563eb;">Step 2:</strong> Enter your email and the temporary password above</p></td></tr>
                      <tr><td style="padding: 6px 0;"><p style="margin: 0; font-size: 13px; color: #475569;"><strong style="color: #2563eb;">Step 3:</strong> Create a new secure password when prompted</p></td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Security Notice -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0; background: #fffbeb; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 600; color: #9a3412;">🔐 Important Security Notice</p>
                    <p style="margin: 0; font-size: 13px; color: #475569;"><strong>You must change your password</strong> on your first login. This is a temporary password created for initial access only. Please keep your credentials secure and never share them with anyone.</p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0 16px 0;">
                <tr>
                  <td align="center">
                    <a href="{{loginLink}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Log In Now</a>
                  </td>
                </tr>
              </table>
              
              <p style="text-align: center; margin-top: 24px; font-size: 12px; color: #64748b;">
                If you weren''t expecting this email, please contact your administrator.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 24px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0;">Watson Mattheus Engineering</p>
              <p style="margin: 8px 0 0 0;">This is an automated message. Please do not reply directly.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>'
WHERE name = 'User Invitation';