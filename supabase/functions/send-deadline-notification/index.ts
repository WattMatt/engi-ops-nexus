 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
 import { Resend } from "https://esm.sh/resend@2.0.0";
 
 const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
 };
 
 interface DeadlineItem {
   tenant_id: string;
   tenant_name: string;
   shop_number: string;
   project_name: string;
   project_id: string;
   deadline_type: 'db_last_order' | 'db_delivery' | 'lighting_last_order' | 'lighting_delivery';
   deadline_date: string;
   days_until: number;
 }
 
 interface PortalUser {
   user_name: string;
   user_email: string;
   project_id: string;
 }
 
 const handler = async (req: Request): Promise<Response> => {
   console.log("Deadline notification function triggered");
   
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
     const supabase = createClient(supabaseUrl, supabaseKey);
 
     // Parse request body for test mode
     let testEmail: string | null = null;
     let testOnly = false;
     try {
       const body = await req.json();
       testEmail = body.testEmail || null;
       testOnly = body.testOnly || false;
     } catch {
       // No body provided, run normally
     }
 
     const today = new Date();
     const twoWeeksFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
     
     console.log(`Checking deadlines between ${today.toISOString()} and ${twoWeeksFromNow.toISOString()}`);
 
     // Get all tenants with deadline dates within the next 2 weeks
     const { data: tenants, error: tenantsError } = await supabase
       .from('tenants')
       .select(`
         id,
         shop_name,
         shop_number,
         project_id,
         db_last_order_date,
         db_delivery_date,
         lighting_last_order_date,
         lighting_delivery_date,
         db_ordered,
         lighting_ordered,
         projects!inner(name)
       `)
       .or(`db_last_order_date.gte.${today.toISOString().split('T')[0]},lighting_last_order_date.gte.${today.toISOString().split('T')[0]}`);
 
     if (tenantsError) {
       console.error("Error fetching tenants:", tenantsError);
       throw tenantsError;
     }
 
     console.log(`Found ${tenants?.length || 0} tenants with upcoming deadlines`);
 
     // Build list of approaching deadlines
     const approachingDeadlines: DeadlineItem[] = [];
     
     tenants?.forEach((tenant: any) => {
       const checkDeadline = (dateStr: string | null, type: DeadlineItem['deadline_type'], isOrdered: boolean) => {
         if (!dateStr || isOrdered) return; // Skip if no date or already ordered
         
         const deadline = new Date(dateStr);
         const daysUntil = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
         
         // Only include if within 14 days and not yet passed
         if (daysUntil >= 0 && daysUntil <= 14) {
           approachingDeadlines.push({
             tenant_id: tenant.id,
             tenant_name: tenant.shop_name || tenant.shop_number,
             shop_number: tenant.shop_number,
             project_name: tenant.projects?.name || 'Unknown Project',
             project_id: tenant.project_id,
             deadline_type: type,
             deadline_date: dateStr,
             days_until: daysUntil,
           });
         }
       };
 
       checkDeadline(tenant.db_last_order_date, 'db_last_order', tenant.db_ordered);
       checkDeadline(tenant.db_delivery_date, 'db_delivery', tenant.db_ordered);
       checkDeadline(tenant.lighting_last_order_date, 'lighting_last_order', tenant.lighting_ordered);
       checkDeadline(tenant.lighting_delivery_date, 'lighting_delivery', tenant.lighting_ordered);
     });
 
     console.log(`${approachingDeadlines.length} deadlines within 2 weeks`);
 
     if (approachingDeadlines.length === 0 && !testOnly) {
       return new Response(JSON.stringify({ message: "No approaching deadlines found" }), {
         status: 200,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Group deadlines by project
     const deadlinesByProject = approachingDeadlines.reduce((acc, item) => {
       if (!acc[item.project_id]) {
         acc[item.project_id] = {
           project_name: item.project_name,
           deadlines: [],
         };
       }
       acc[item.project_id].deadlines.push(item);
       return acc;
     }, {} as Record<string, { project_name: string; deadlines: DeadlineItem[] }>);
 
     // Get portal users for each project
     const projectIds = Object.keys(deadlinesByProject);
     const { data: portalUsers, error: usersError } = await supabase
       .from('portal_user_sessions')
       .select('user_name, user_email, project_id')
       .in('project_id', projectIds);
 
     if (usersError) {
       console.error("Error fetching portal users:", usersError);
       throw usersError;
     }
 
     console.log(`Found ${portalUsers?.length || 0} portal users to notify`);
 
     // Check which notifications have already been sent
     const { data: sentLogs } = await supabase
       .from('deadline_notification_log')
       .select('tenant_id, notification_type, recipient_email, deadline_date');
 
     const sentSet = new Set(
       sentLogs?.map(l => `${l.tenant_id}|${l.notification_type}|${l.recipient_email}|${l.deadline_date}`) || []
     );
 
     let emailsSent = 0;
     const notificationsToLog: any[] = [];
 
     // If test mode, send to test email only
     if (testOnly && testEmail) {
       console.log(`Test mode: sending sample email to ${testEmail}`);
       
       const sampleDeadlines = approachingDeadlines.length > 0 ? approachingDeadlines.slice(0, 5) : [
         {
           tenant_id: 'test-tenant',
           tenant_name: 'Sample Store',
           shop_number: 'S001',
           project_name: 'Sample Project',
           project_id: 'test-project',
           deadline_type: 'db_last_order' as const,
           deadline_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
           days_until: 7,
         }
       ];
 
       const emailHtml = generateEmailHtml('Test User', 'Sample Project', sampleDeadlines);
       
        const { error: emailError } = await resend.emails.send({
          from: "WMENG Notifications <notifications@watsonmattheus.com>",
          to: [testEmail],
          subject: `⚠️ [TEST] Deadline Reminder: ${sampleDeadlines.length} items need attention`,
          html: emailHtml,
        });
 
       if (emailError) {
         console.error("Error sending test email:", emailError);
         throw emailError;
       }
 
       return new Response(JSON.stringify({ 
         message: `Test email sent to ${testEmail}`,
         deadlines_found: approachingDeadlines.length,
       }), {
         status: 200,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Send emails to each portal user for their project's deadlines
     for (const user of (portalUsers || [])) {
       const projectData = deadlinesByProject[user.project_id];
       if (!projectData || projectData.deadlines.length === 0) continue;
 
       // Filter out already-sent notifications
       const newDeadlines = projectData.deadlines.filter(d => {
         const key = `${d.tenant_id}|${d.deadline_type}|${user.user_email}|${d.deadline_date}`;
         return !sentSet.has(key);
       });
 
       if (newDeadlines.length === 0) {
         console.log(`Skipping ${user.user_email} - all notifications already sent`);
         continue;
       }
 
       const emailHtml = generateEmailHtml(user.user_name, projectData.project_name, newDeadlines);
 
       try {
          const { error: emailError } = await resend.emails.send({
            from: "WMENG Notifications <notifications@watsonmattheus.com>",
            to: [user.user_email],
            subject: `⚠️ Deadline Reminder: ${newDeadlines.length} items need attention - ${projectData.project_name}`,
            html: emailHtml,
          });
 
         if (emailError) {
           console.error(`Error sending to ${user.user_email}:`, emailError);
           continue;
         }
 
         emailsSent++;
         console.log(`Email sent to ${user.user_email}`);
 
         // Log sent notifications
         newDeadlines.forEach(d => {
           notificationsToLog.push({
             tenant_id: d.tenant_id,
             notification_type: d.deadline_type,
             recipient_email: user.user_email,
             deadline_date: d.deadline_date,
           });
         });
 
         // Rate limiting: 500ms between emails
         await new Promise(resolve => setTimeout(resolve, 500));
       } catch (e) {
         console.error(`Failed to send email to ${user.user_email}:`, e);
       }
     }
 
     // Log sent notifications to prevent duplicates
     if (notificationsToLog.length > 0) {
       const { error: logError } = await supabase
         .from('deadline_notification_log')
         .insert(notificationsToLog);
       
       if (logError) {
         console.error("Error logging notifications:", logError);
       }
     }
 
     return new Response(JSON.stringify({ 
       message: `Sent ${emailsSent} notification emails`,
       deadlines_found: approachingDeadlines.length,
       notifications_logged: notificationsToLog.length,
     }), {
       status: 200,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
 
   } catch (error: any) {
     console.error("Error in deadline notification:", error);
     return new Response(JSON.stringify({ error: error.message }), {
       status: 500,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   }
 };
 
 function generateEmailHtml(userName: string, projectName: string, deadlines: DeadlineItem[]): string {
   const deadlineRows = deadlines.map(d => {
     const typeLabel = {
       'db_last_order': 'DB Last Order',
       'db_delivery': 'DB Delivery',
       'lighting_last_order': 'Lighting Last Order',
       'lighting_delivery': 'Lighting Delivery',
     }[d.deadline_type];
 
     const urgencyColor = d.days_until <= 3 ? '#dc2626' : d.days_until <= 7 ? '#f59e0b' : '#6b7280';
     const urgencyBg = d.days_until <= 3 ? '#fef2f2' : d.days_until <= 7 ? '#fffbeb' : '#f9fafb';
 
     return `
       <tr style="background-color: ${urgencyBg};">
         <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${d.shop_number}</td>
         <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${d.tenant_name}</td>
         <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${typeLabel}</td>
         <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${formatDate(d.deadline_date)}</td>
         <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: ${urgencyColor}; font-weight: 600;">
           ${d.days_until === 0 ? 'TODAY!' : d.days_until === 1 ? 'Tomorrow' : `${d.days_until} days`}
         </td>
       </tr>
     `;
   }).join('');
 
   return `
     <!DOCTYPE html>
     <html>
     <head>
       <meta charset="utf-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
     </head>
     <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 700px; margin: 0 auto; padding: 20px;">
       <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 12px 12px 0 0;">
         <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Deadline Reminder</h1>
         <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">${projectName}</p>
       </div>
       
       <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
         <p style="margin-top: 0;">Hi ${userName},</p>
         
         <p>The following items require your attention within the next <strong>2 weeks</strong>:</p>
         
         <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
           <thead>
             <tr style="background-color: #f3f4f6;">
               <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Shop</th>
               <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Tenant</th>
               <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Deadline Type</th>
               <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Due Date</th>
               <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Time Left</th>
             </tr>
           </thead>
           <tbody>
             ${deadlineRows}
           </tbody>
         </table>
         
         <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
           <strong>Action Required:</strong> Please ensure all outstanding DB and Lighting orders are placed before their respective deadlines to avoid project delays.
         </div>
         
         <p style="color: #6b7280; font-size: 13px; margin-bottom: 0;">
           This is an automated reminder from the WMENG Contractor Portal. You are receiving this because you accessed the portal for ${projectName}.
         </p>
       </div>
       
       <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
         <p>© ${new Date().getFullYear()} WMENG Engineering. All rights reserved.</p>
       </div>
     </body>
     </html>
   `;
 }
 
 function formatDate(dateStr: string): string {
   const date = new Date(dateStr);
   return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
 }
 
 serve(handler);