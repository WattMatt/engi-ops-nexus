import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationSettings {
  id: string;
  project_id: string;
  bo_critical_days: number;
  bo_warning_days: number;
  bo_info_days: number;
  cost_entry_warning_days: number;
  cost_entry_critical_days: number;
  inactive_tenant_days: number;
  notifications_enabled: boolean;
  email_notifications_enabled: boolean;
  email_frequency: string;
  notification_email: string | null;
  notification_cooldown_hours: number;
}

interface Tenant {
  id: string;
  project_id: string;
  shop_number: string;
  tenant_name: string;
  opening_date: string | null;
  beneficial_occupation_days: number | null;
  db_ordered: boolean;
  lighting_ordered: boolean;
  db_cost: number | null;
  lighting_cost: number | null;
  db_by_tenant: boolean;
  lighting_by_tenant: boolean;
  sow_received: boolean;
  layout_received: boolean;
  db_order_date: string | null;
  lighting_order_date: string | null;
  last_modified_at: string;
  last_notification_sent: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all projects with notification settings enabled
    const { data: settingsList, error: settingsError } = await supabase
      .from("tenant_notification_settings")
      .select("*")
      .eq("notifications_enabled", true);

    if (settingsError) throw settingsError;

    if (!settingsList || settingsList.length === 0) {
      console.log("No projects with notifications enabled");
      return new Response(JSON.stringify({ message: "No notifications to process" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let totalNotifications = 0;

    for (const settings of settingsList as NotificationSettings[]) {
      const notifications = await processProjectNotifications(supabase, settings);
      totalNotifications += notifications;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        projectsProcessed: settingsList.length,
        notificationsCreated: totalNotifications 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in check-tenant-notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

async function processProjectNotifications(
  supabase: any,
  settings: NotificationSettings
): Promise<number> {
  let notificationCount = 0;

  // Get all tenants for this project with BO dates
  const { data: tenants, error: tenantsError } = await supabase
    .from("tenants")
    .select("*")
    .eq("project_id", settings.project_id)
    .not("opening_date", "is", null);

  if (tenantsError) {
    console.error("Error fetching tenants:", tenantsError);
    return 0;
  }

  if (!tenants || tenants.length === 0) {
    return 0;
  }

  const now = new Date();

  for (const tenant of tenants as Tenant[]) {
    // Check cooldown period
    if (tenant.last_notification_sent) {
      const lastSent = new Date(tenant.last_notification_sent);
      const hoursSinceLastNotification = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastNotification < settings.notification_cooldown_hours) {
        continue; // Skip if within cooldown period
      }
    }

    // Check BO deadline notifications
    if (tenant.opening_date && tenant.beneficial_occupation_days !== null) {
      const isIncomplete = !tenant.sow_received || !tenant.layout_received || 
                          !tenant.db_ordered || !tenant.lighting_ordered;

      if (isIncomplete) {
        let level = "info";
        let title = "";
        let description = "";

        if (tenant.beneficial_occupation_days <= settings.bo_critical_days) {
          level = "error";
          title = "🚨 CRITICAL: Tenant Incomplete";
          description = `Tenant ${tenant.shop_number} - ${tenant.tenant_name} has BO in ${tenant.beneficial_occupation_days} days but is incomplete!`;
        } else if (tenant.beneficial_occupation_days <= settings.bo_warning_days) {
          level = "warn";
          title = "⚠️ WARNING: Tenant Incomplete";
          description = `Tenant ${tenant.shop_number} - ${tenant.tenant_name} has BO in ${tenant.beneficial_occupation_days} days and needs attention.`;
        } else if (tenant.beneficial_occupation_days <= settings.bo_info_days) {
          level = "info";
          title = "📋 INFO: Tenant Requires Completion";
          description = `Tenant ${tenant.shop_number} - ${tenant.tenant_name} has BO in ${tenant.beneficial_occupation_days} days.`;
        }

        if (title) {
          await createNotification(supabase, settings, tenant, "tenant_incomplete", title, description);
          notificationCount++;
        }
      }
    }

    // Check cost entry reminders
    if (!tenant.db_by_tenant && tenant.db_ordered && tenant.db_cost === null && tenant.db_order_date) {
      const daysSinceOrder = Math.floor((now.getTime() - new Date(tenant.db_order_date).getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceOrder >= settings.cost_entry_critical_days) {
        await createNotification(
          supabase,
          settings,
          tenant,
          "cost_entry_required",
          "🚨 URGENT: DB Cost Entry Required",
          `Tenant ${tenant.shop_number} - ${tenant.tenant_name}: DB ordered ${daysSinceOrder} days ago but cost not entered!`
        );
        notificationCount++;
      } else if (daysSinceOrder >= settings.cost_entry_warning_days) {
        await createNotification(
          supabase,
          settings,
          tenant,
          "cost_entry_required",
          "⚠️ DB Cost Entry Needed",
          `Tenant ${tenant.shop_number} - ${tenant.tenant_name}: DB ordered ${daysSinceOrder} days ago. Please enter cost.`
        );
        notificationCount++;
      }
    }

    if (!tenant.lighting_by_tenant && tenant.lighting_ordered && tenant.lighting_cost === null && tenant.lighting_order_date) {
      const daysSinceOrder = Math.floor((now.getTime() - new Date(tenant.lighting_order_date).getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceOrder >= settings.cost_entry_critical_days) {
        await createNotification(
          supabase,
          settings,
          tenant,
          "cost_entry_required",
          "🚨 URGENT: Lighting Cost Entry Required",
          `Tenant ${tenant.shop_number} - ${tenant.tenant_name}: Lighting ordered ${daysSinceOrder} days ago but cost not entered!`
        );
        notificationCount++;
      } else if (daysSinceOrder >= settings.cost_entry_warning_days) {
        await createNotification(
          supabase,
          settings,
          tenant,
          "cost_entry_required",
          "⚠️ Lighting Cost Entry Needed",
          `Tenant ${tenant.shop_number} - ${tenant.tenant_name}: Lighting ordered ${daysSinceOrder} days ago. Please enter cost.`
        );
        notificationCount++;
      }
    }

    // Check for stale/inactive tenants
    const isIncomplete = !tenant.sow_received || !tenant.layout_received || 
                        !tenant.db_ordered || !tenant.lighting_ordered;
    if (isIncomplete && tenant.last_modified_at) {
      const daysSinceModified = Math.floor((now.getTime() - new Date(tenant.last_modified_at).getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceModified >= settings.inactive_tenant_days) {
        await createNotification(
          supabase,
          settings,
          tenant,
          "tenant_stale",
          "📌 Inactive Tenant",
          `Tenant ${tenant.shop_number} - ${tenant.tenant_name} hasn't been updated in ${daysSinceModified} days and is incomplete.`
        );
        notificationCount++;
      }
    }
  }

  return notificationCount;
}

async function createNotification(
  supabase: any,
  settings: NotificationSettings,
  tenant: Tenant,
  type: string,
  title: string,
  description: string
) {
  // Get project members to notify
  const { data: members } = await supabase
    .from("project_members")
    .select("user_id")
    .eq("project_id", tenant.project_id);

  if (!members || members.length === 0) return;

  // Create notifications for each project member
  for (const member of members) {
    await supabase
      .from("status_notifications")
      .insert({
        user_id: member.user_id,
        notification_type: "status_update",
        title,
        description,
        link: "/dashboard/tenant-tracker",
        metadata: {
          tenant_id: tenant.id,
          project_id: tenant.project_id,
          notification_type: type,
          shop_number: tenant.shop_number,
          tenant_name: tenant.tenant_name
        }
      });

    // Send email if enabled
    if (settings.email_notifications_enabled && settings.email_frequency === 'immediate') {
      try {
        await supabase.functions.invoke("send-status-update-notification", {
          body: {
            userId: member.user_id,
            notificationType: "status_update",
            title,
            description,
            link: "/dashboard/tenant-tracker",
            metadata: {
              tenant_id: tenant.id,
              project_id: tenant.project_id,
              shop_number: tenant.shop_number,
              tenant_name: tenant.tenant_name
            }
          }
        });
      } catch (emailError) {
        console.error("Error sending email notification:", emailError);
      }
    }
  }

  // Update last notification sent timestamp
  await supabase
    .from("tenants")
    .update({ last_notification_sent: new Date().toISOString() })
    .eq("id", tenant.id);
}
