import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// VAPID keys - in production, store these securely
const VAPID_PUBLIC_KEY = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "Wh0W4WKsJOHt0fC0_EG3xWaXQj0s6wkVr1hH3RCgUv0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushNotificationRequest {
  userIds: string[];
  title: string;
  body: string;
  conversationId?: string;
  url?: string;
}

// Web Push implementation using Web Crypto API
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string
): Promise<boolean> {
  try {
    // For now, we'll use a simple fetch approach
    // In production, you'd want to use proper VAPID signing
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "TTL": "86400",
      },
      body: payload,
    });

    if (!response.ok) {
      console.error("Push failed:", response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending push:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userIds, title, body, conversationId, url }: PushNotificationRequest = await req.json();

    console.log("Sending push notifications to users:", userIds);

    if (!userIds || userIds.length === 0) {
      throw new Error("No user IDs provided");
    }

    // Get all push subscriptions for the specified users
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", userIds);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found for users");
      return new Response(
        JSON.stringify({ success: true, message: "No subscriptions found", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions`);

    const payload = JSON.stringify({
      title,
      body,
      conversationId,
      url: url || `/dashboard/messages${conversationId ? `?conversation=${conversationId}` : ""}`,
    });

    let successCount = 0;
    const failedEndpoints: string[] = [];

    // Send to all subscriptions
    for (const sub of subscriptions) {
      const success = await sendWebPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload
      );

      if (success) {
        successCount++;
      } else {
        failedEndpoints.push(sub.endpoint);
      }
    }

    // Clean up failed subscriptions (they might be expired)
    if (failedEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", failedEndpoints);
      
      console.log(`Cleaned up ${failedEndpoints.length} expired subscriptions`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failedEndpoints.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
