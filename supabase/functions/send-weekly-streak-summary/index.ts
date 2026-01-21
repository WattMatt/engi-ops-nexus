import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface StreakData {
  user_id: string;
  project_id: string;
  current_streak: number;
  longest_streak: number;
  total_completions: number;
  last_completion_date: string | null;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

interface ProjectInfo {
  id: string;
  name: string;
  project_number: string | null;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
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
      from: "Watson Mattheus Notifications <notifications@watsonmattheus.com>",
      to: [to],
      subject: subject,
      html: html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Resend API error:", errorText);
    throw new Error(`Failed to send email: ${response.status} - ${errorText}`);
  }
}

function getStreakEmoji(streak: number): string {
  if (streak >= 30) return "🏆";
  if (streak >= 14) return "🔥";
  if (streak >= 7) return "⭐";
  if (streak >= 3) return "💪";
  return "🌱";
}

function getStreakLevel(streak: number): string {
  if (streak >= 30) return "Legendary";
  if (streak >= 14) return "On Fire";
  if (streak >= 7) return "Hot";
  if (streak >= 3) return "Warming Up";
  return "Getting Started";
}

function getMotivationalMessage(streak: number, isTopPerformer: boolean): string {
  if (isTopPerformer) return "You're leading the pack! Keep up the amazing work!";
  if (streak >= 30) return "Legendary status! You're an inspiration to the team!";
  if (streak >= 14) return "You're on fire! Two weeks of consistent progress!";
  if (streak >= 7) return "A full week streak! You're building great momentum!";
  if (streak >= 3) return "Great start! Keep the momentum going!";
  if (streak > 0) return "You've started your streak - now let's build on it!";
  return "Start completing tasks to build your streak!";
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting weekly streak summary job...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all streak data
    const { data: streaks, error: streaksError } = await supabase
      .from("roadmap_completion_streaks")
      .select("*")
      .order("current_streak", { ascending: false });

    if (streaksError) {
      throw new Error(`Failed to fetch streaks: ${streaksError.message}`);
    }

    if (!streaks || streaks.length === 0) {
      console.log("No streak data found");
      return new Response(JSON.stringify({ success: true, message: "No streaks to report" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get unique user IDs and project IDs
    const userIds = [...new Set(streaks.map(s => s.user_id))];
    const projectIds = [...new Set(streaks.map(s => s.project_id))];

    // Fetch user profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    // Fetch project info
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, project_number")
      .in("id", projectIds);

    const profileMap = new Map<string, UserProfile>(
      (profiles || []).map(p => [p.id, p])
    );
    const projectMap = new Map<string, ProjectInfo>(
      (projects || []).map(p => [p.id, p])
    );

    // Calculate global leaderboard
    const userTotalCompletions = new Map<string, number>();
    const userBestStreak = new Map<string, number>();
    
    streaks.forEach(s => {
      const current = userTotalCompletions.get(s.user_id) || 0;
      userTotalCompletions.set(s.user_id, current + s.total_completions);
      
      const best = userBestStreak.get(s.user_id) || 0;
      userBestStreak.set(s.user_id, Math.max(best, s.current_streak));
    });

    // Sort users by total completions for leaderboard
    const leaderboard = Array.from(userTotalCompletions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const topUserId = leaderboard[0]?.[0];

    // Group streaks by user
    const streaksByUser = new Map<string, StreakData[]>();
    streaks.forEach(s => {
      const existing = streaksByUser.get(s.user_id) || [];
      existing.push(s);
      streaksByUser.set(s.user_id, existing);
    });

    let emailsSent = 0;
    const errors: string[] = [];

    // Send personalized email to each user
    for (const [userId, userStreaks] of streaksByUser) {
      const profile = profileMap.get(userId);
      if (!profile?.email) continue;

      const isTopPerformer = userId === topUserId;
      const userRank = leaderboard.findIndex(([id]) => id === userId) + 1;
      const bestStreak = userBestStreak.get(userId) || 0;
      const totalCompletions = userTotalCompletions.get(userId) || 0;

      // Build project streak rows
      const projectRows = userStreaks.map(streak => {
        const project = projectMap.get(streak.project_id);
        const projectName = project?.name || "Unknown Project";
        const projectNumber = project?.project_number || "";
        
        return `
          <tr>
            <td style="padding:12px;border-bottom:1px solid #e2e8f0;">
              <strong>${projectNumber ? `${projectNumber} - ` : ""}${projectName}</strong>
            </td>
            <td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:center;">
              ${getStreakEmoji(streak.current_streak)} ${streak.current_streak} days
            </td>
            <td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:center;">
              ${streak.longest_streak} days
            </td>
            <td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:center;">
              ${streak.total_completions}
            </td>
          </tr>
        `;
      }).join("");

      // Build leaderboard rows
      const leaderboardRows = leaderboard.slice(0, 5).map(([id, completions], index) => {
        const p = profileMap.get(id);
        const isCurrentUser = id === userId;
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;
        
        return `
          <tr style="${isCurrentUser ? "background-color:#f0fdf4;font-weight:600;" : ""}">
            <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${medal}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">
              ${p?.full_name || "Unknown"} ${isCurrentUser ? "(You)" : ""}
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">
              ${completions}
            </td>
          </tr>
        `;
      }).join("");

      const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:24px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#8b5cf6,#6366f1);padding:32px 24px;text-align:center;">
              <p style="margin:0;font-size:48px;">${isTopPerformer ? "🏆" : getStreakEmoji(bestStreak)}</p>
              <p style="margin:12px 0 0;font-size:26px;font-weight:700;color:#ffffff;">Weekly Streak Summary</p>
              <p style="margin:8px 0 0;font-size:14px;color:#e0e7ff;">Hi ${profile.full_name || "there"}! Here's your progress this week.</p>
            </td>
          </tr>
          
          <!-- Stats Summary -->
          <tr>
            <td style="padding:24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:33%;text-align:center;padding:16px;">
                    <p style="margin:0;font-size:32px;font-weight:700;color:#8b5cf6;">${bestStreak}</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;">Best Streak</p>
                  </td>
                  <td style="width:33%;text-align:center;padding:16px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:32px;font-weight:700;color:#10b981;">${totalCompletions}</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;">Total Done</p>
                  </td>
                  <td style="width:33%;text-align:center;padding:16px;">
                    <p style="margin:0;font-size:32px;font-weight:700;color:#f59e0b;">#${userRank || "—"}</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;">Your Rank</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Motivational Message -->
          <tr>
            <td style="padding:0 24px 24px;">
              <div style="background-color:#f0fdf4;border-radius:8px;padding:16px;border-left:4px solid #10b981;">
                <p style="margin:0;font-size:14px;color:#166534;font-weight:500;">
                  ${getMotivationalMessage(bestStreak, isTopPerformer)}
                </p>
                <p style="margin:8px 0 0;font-size:12px;color:#15803d;">
                  Status: <strong>${getStreakLevel(bestStreak)}</strong>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Project Breakdown -->
          <tr>
            <td style="padding:0 24px 24px;">
              <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#1f2937;">Your Projects</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                <tr style="background-color:#f8fafc;">
                  <th style="padding:12px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;">Project</th>
                  <th style="padding:12px;text-align:center;font-size:12px;color:#6b7280;text-transform:uppercase;">Streak</th>
                  <th style="padding:12px;text-align:center;font-size:12px;color:#6b7280;text-transform:uppercase;">Best</th>
                  <th style="padding:12px;text-align:center;font-size:12px;color:#6b7280;text-transform:uppercase;">Total</th>
                </tr>
                ${projectRows}
              </table>
            </td>
          </tr>
          
          <!-- Leaderboard -->
          <tr>
            <td style="padding:0 24px 24px;">
              <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#1f2937;">🏅 Top Performers</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                <tr style="background-color:#f8fafc;">
                  <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;width:40px;">Rank</th>
                  <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;">Name</th>
                  <th style="padding:8px 12px;text-align:center;font-size:12px;color:#6b7280;">Completions</th>
                </tr>
                ${leaderboardRows}
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:24px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;color:#6b7280;font-size:13px;">Keep up the great work! Every task completed builds momentum.</p>
              <p style="margin:12px 0 0;color:#94a3b8;font-size:11px;">EngiOps Platform - Watson Mattheus</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      try {
        await sendEmail(
          profile.email,
          `${getStreakEmoji(bestStreak)} Your Weekly Streak Summary - ${getStreakLevel(bestStreak)}`,
          htmlBody
        );
        emailsSent++;
        console.log(`Sent weekly summary to ${profile.email}`);
      } catch (emailError: any) {
        errors.push(`Failed to send to ${profile.email}: ${emailError.message}`);
        console.error(`Failed to send to ${profile.email}:`, emailError);
      }
    }

    console.log(`Weekly streak summary complete. Sent ${emailsSent} emails.`);

    return new Response(JSON.stringify({ 
      success: true, 
      emailsSent,
      errors: errors.length > 0 ? errors : undefined
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-weekly-streak-summary:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
