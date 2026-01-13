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

interface RoadmapReviewUpdateRequest {
  projectId: string;
  reviewSessionId: string;
  message?: string;
  itemUpdates: ItemUpdate[];
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
    const { projectId, reviewSessionId, message, itemUpdates } = body;

    if (!projectId || !reviewSessionId || !itemUpdates) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
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

    // Get all active share tokens for this project
    const { data: shareTokens, error: tokenError } = await supabase
      .from("roadmap_share_tokens")
      .select("reviewer_email, reviewer_name, expires_at")
      .eq("project_id", projectId);

    if (tokenError) {
      throw new Error("Failed to fetch share tokens");
    }

    // Filter out expired tokens
    const now = new Date();
    const validTokens = (shareTokens || []).filter(token => {
      if (!token.expires_at) return true;
      return new Date(token.expires_at) > now;
    });

    if (validTokens.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No recipients to send to - roadmap has not been shared with anyone" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Send emails to all recipients
    const emailPromises = validTokens.map(async (token) => {
      const recipientName = token.reviewer_name || "Team Member";
      
      // Generate a view link - for now, just link to the project
      const reviewLink = `${origin}/client-portal`;
      
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
          to: token.reviewer_email,
          subject: `Roadmap Update: ${project.name}`,
          html,
          from: DEFAULT_FROM_ADDRESSES.notifications,
          tags: [
            { name: "type", value: "roadmap_review_update" },
            { name: "project_id", value: projectId },
          ],
        });
        return { email: token.reviewer_email, success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error(`Failed to send email to ${token.reviewer_email}:`, err);
        return { email: token.reviewer_email, success: false, error: errorMessage };
      }
    });

    const results = await Promise.all(emailPromises);
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
