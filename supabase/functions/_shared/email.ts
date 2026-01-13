/**
 * Shared email utility for sending emails via Resend API
 * All emails are sent from the verified watsonmattheus.com domain
 */

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

export interface EmailResponse {
  id: string;
  from: string;
  to: string[];
  created_at: string;
}

export const DEFAULT_FROM_ADDRESSES = {
  noreply: "Watson Mattheus <noreply@watsonmattheus.com>",
  system: "Watson Mattheus System <system@watsonmattheus.com>",
  notifications: "Watson Mattheus Notifications <notifications@watsonmattheus.com>",
} as const;

/**
 * Send an email using the Resend API
 * @param options Email options including to, subject, html content
 * @returns The Resend API response with email ID
 * @throws Error if the API call fails
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResponse> {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: options.from || DEFAULT_FROM_ADDRESSES.noreply,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      reply_to: options.replyTo,
      tags: options.tags,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Resend API error:", errorText);
    throw new Error(`Failed to send email: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log("Email sent successfully:", result.id);
  return result;
}

/**
 * Send multiple emails in batch (up to 100 at a time)
 * @param emails Array of email options
 * @returns Array of results with success/failure status
 */
export async function sendBatchEmails(
  emails: EmailOptions[]
): Promise<{ email: EmailOptions; success: boolean; result?: EmailResponse; error?: string }[]> {
  const results = await Promise.allSettled(
    emails.map((email) => sendEmail(email))
  );

  return emails.map((email, index) => {
    const result = results[index];
    if (result.status === "fulfilled") {
      return { email, success: true, result: result.value };
    } else {
      return { email, success: false, error: result.reason?.message || "Unknown error" };
    }
  });
}
