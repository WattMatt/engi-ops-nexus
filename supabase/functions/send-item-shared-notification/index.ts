import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, DEFAULT_FROM_ADDRESSES } from "../_shared/email.ts";
import { itemSharedTemplate } from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ItemSharedRequest {
  recipientId: string;
  senderId: string;
  itemType: "Document" | "Report" | "File" | "Project" | "BOQ" | "Cost Report" | "Final Account";
  itemId: string;
  itemName: string;
  message?: string;
  permissions?: "view" | "edit" | "admin";
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      recipientId,
      senderId,
      itemType,
      itemId,
      itemName,
      message,
      permissions = "view",
    }: ItemSharedRequest = await req.json();

    console.log("Processing item shared notification:", {
      recipientId,
      senderId,
      itemType,
      itemId,
      itemName,
      permissions,
    });

    // Validate required fields
    if (!recipientId || !senderId || !itemType || !itemId || !itemName) {
      throw new Error("Missing required fields");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get recipient profile
    const { data: recipient, error: recipientError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", recipientId)
      .single();

    if (recipientError || !recipient?.email) {
      console.error("Error fetching recipient:", recipientError);
      throw new Error("Could not find recipient email");
    }

    // Get sender profile
    const { data: sender, error: senderError } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", senderId)
      .single();

    if (senderError) {
      console.error("Error fetching sender:", senderError);
    }

    const recipientName = recipient.full_name || "there";
    const senderName = sender?.full_name || "Someone";

    // Always use the production URL for email links
    const appUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://engi-ops-nexus.lovable.app";
    let itemLink = appUrl;

    const itemTypeRoutes: Record<string, string> = {
      "Document": "documents",
      "Report": "reports",
      "File": "files",
      "Project": "projects",
      "BOQ": "boq",
      "Cost Report": "cost-reports",
      "Final Account": "final-accounts",
    };

    const route = itemTypeRoutes[itemType] || "shared";
    itemLink = `${appUrl}/${route}/${itemId}`;

    // Generate email HTML using template
    const emailHtml = itemSharedTemplate(
      recipientName,
      senderName,
      itemType,
      itemName,
      itemLink,
      message
    );

    // Send email via Resend
    const emailResult = await sendEmail({
      to: recipient.email,
      subject: `${senderName} shared a ${itemType.toLowerCase()} with you`,
      html: emailHtml,
      from: DEFAULT_FROM_ADDRESSES.noreply,
      tags: [
        { name: "type", value: "item_shared" },
        { name: "item_type", value: itemType.toLowerCase().replace(" ", "_") },
        { name: "permissions", value: permissions },
      ],
    });

    console.log("Item shared notification sent:", emailResult.id);

    // Optionally, create a notification record in the database
    // This can be used for in-app notifications
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: recipientId,
        type: "item_shared",
        title: `${senderName} shared a ${itemType.toLowerCase()}`,
        message: `${itemName}${message ? `: "${message}"` : ""}`,
        data: {
          item_type: itemType,
          item_id: itemId,
          item_name: itemName,
          sender_id: senderId,
          sender_name: senderName,
          permissions,
        },
        is_read: false,
      });

    if (notificationError) {
      // Log but don't fail - email was sent successfully
      console.warn("Could not create in-app notification:", notificationError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Item shared notification sent successfully",
        emailId: emailResult.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-item-shared-notification:", error);

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
