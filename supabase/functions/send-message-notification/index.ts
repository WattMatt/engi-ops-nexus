import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, DEFAULT_FROM_ADDRESSES } from "../_shared/email.ts";
import { messageNotificationTemplate } from "../_shared/email-templates.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  userId: string;
  messageId: string;
  senderName: string;
  messagePreview: string;
  conversationId: string;
  mentionType?: "direct" | "channel";
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      userId, 
      messageId, 
      senderName, 
      messagePreview, 
      conversationId,
      mentionType = "direct"
    }: NotificationRequest = await req.json();

    console.log("Processing message notification:", {
      userId,
      messageId,
      senderName,
      conversationId,
      mentionType,
    });

    // Validate required fields
    if (!userId || !messageId || !senderName || !conversationId || !messagePreview) {
      throw new Error("Missing required fields");
    }

    // Get recipient profile with email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    if (profileError || !profile?.email) {
      console.error("Error fetching recipient profile:", profileError);
      throw new Error("Could not find recipient email");
    }

    const recipientName = profile.full_name || "there";
    const recipientEmail = profile.email;

    // Create notification record in database
    const { data: notification, error: notificationError } = await supabase
      .from("message_notifications")
      .insert({
        user_id: userId,
        message_id: messageId,
        type: mentionType === "direct" ? "mention" : "channel_mention",
        is_read: false,
        email_sent: false,
      })
      .select()
      .single();

    if (notificationError) {
      console.error("Error creating notification record:", notificationError);
      // Continue anyway - email is more important
    }

    // Always use the production URL for email links
    const appUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://engi-ops-nexus.lovable.app";
    const conversationLink = `${appUrl}/messaging?conversation=${conversationId}`;

    // Prepare message preview (truncate if needed)
    const truncatedPreview = messagePreview.length > 150 
      ? messagePreview.substring(0, 150) + "..." 
      : messagePreview;

    // Generate email HTML using template
    const emailHtml = messageNotificationTemplate(
      recipientName,
      senderName,
      truncatedPreview,
      conversationLink
    );

    // Send email via Resend
    const emailResult = await sendEmail({
      to: recipientEmail,
      subject: `${senderName} mentioned you in a message`,
      html: emailHtml,
      from: DEFAULT_FROM_ADDRESSES.noreply,
      tags: [
        { name: "type", value: "message_notification" },
        { name: "mention_type", value: mentionType },
      ],
    });

    console.log("Email sent successfully via Resend:", emailResult.id);

    // Update notification record with email status
    if (notification?.id) {
      await supabase
        .from("message_notifications")
        .update({
          email_sent: true,
        })
        .eq("id", notification.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification sent successfully",
        emailId: emailResult.id,
        notificationId: notification?.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-message-notification:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
