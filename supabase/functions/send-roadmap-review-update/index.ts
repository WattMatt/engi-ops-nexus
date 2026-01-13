import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, DEFAULT_FROM_ADDRESSES } from "../_shared/email.ts";
import { roadmapReviewUpdateTemplate } from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ItemUpdate {
  itemId: string;
  title: string;
  wasCompleted: boolean;
  isNowCompleted: boolean;
  notes?: string;
}

interface EmailRecipient {
  email: string;
  name: string;
}

interface RoadmapReviewUpdateRequest {
  projectId: string;
  reviewSessionId: string;
  message?: string;
  itemUpdates: ItemUpdate[];
  recipients: EmailRecipient[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RoadmapReviewUpdateRequest = await req.json();
    const { projectId, reviewSessionId, message, itemUpdates, recipients } = body;

    if (!projectId || !reviewSessionId || !itemUpdates) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!recipients || recipients.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No recipients specified" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error("Project not found");
    }

    // Get reviewer's profile
    const { data: reviewerProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const reviewerName = reviewerProfile?.full_name || user.email || "Team Member";

    // Get the base URL from the request origin or environment
    const origin = req.headers.get("origin") || Deno.env.get("PUBLIC_SITE_URL") || "https://your-app.lovable.app";
    
    // Update the review session as completed
    const { error: sessionError } = await supabase
      .from("roadmap_review_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        summary_notes: message || null,
      })
      .eq("id", reviewSessionId);

    if (sessionError) {
      console.error("Failed to update review session:", sessionError);
    }

    // Send emails sequentially with delay to avoid Resend rate limits (2 req/sec)
    const results: { email: string; success: boolean; error?: string }[] = [];
    
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const recipientName = recipient.name || "Team Member";
      
      // Generate a view link to the project roadmap
      const reviewLink = `${origin}/projects/${projectId}/roadmap`;
      
      const html = roadmapReviewUpdateTemplate(
        recipientName,
        project.name,
        reviewerName,
        itemUpdates.map(u => ({
          title: u.title,
          isCompleted: u.isNowCompleted,
          notes: u.notes,
        })),
        message || null,
        reviewLink
      );

      try {
        await sendEmail({
          to: recipient.email,
          subject: `Roadmap Update: ${project.name}`,
          html,
          from: DEFAULT_FROM_ADDRESSES.notifications,
          tags: [
            { name: "type", value: "roadmap_review_update" },
            { name: "project_id", value: projectId },
          ],
        });
        results.push({ email: recipient.email, success: true });
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error(`Failed to send email to ${recipient.email}:`, err);
        results.push({ email: recipient.email, success: false, error: errorMessage });
      }
      
      // Add 600ms delay between emails to stay under Resend's 2 req/sec limit
      if (i < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    }
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return new Response(JSON.stringify({
      success: true,
      message: `Sent ${successCount} email(s)${failureCount > 0 ? `, ${failureCount} failed` : ""}`,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error in send-roadmap-review-update:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
