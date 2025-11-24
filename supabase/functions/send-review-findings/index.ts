import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReviewFinding {
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
  location?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting AI application review...');

    // Perform AI review
    const reviewResponse = await fetch(`${supabaseUrl}/functions/v1/ai-review-application`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        focusAreas: ['ui', 'performance', 'security', 'architecture'],
        projectContext: 'Full electrical engineering project management application',
        includeDatabase: true,
      }),
    });

    if (!reviewResponse.ok) {
      const errorText = await reviewResponse.text();
      throw new Error(`Review failed: ${errorText}`);
    }

    const reviewData = await reviewResponse.json();
    console.log('Review completed, processing findings...');

    // Extract all findings from the review
    const findings: ReviewFinding[] = [];

    if (reviewData.sections) {
      for (const section of reviewData.sections) {
        if (section.findings && Array.isArray(section.findings)) {
          for (const finding of section.findings) {
            findings.push({
              category: section.category || 'General',
              severity: finding.severity || 'medium',
              title: finding.title || 'Untitled Finding',
              description: finding.description || '',
              recommendation: finding.recommendation || '',
              location: finding.location,
            });
          }
        }
      }
    }

    console.log(`Found ${findings.length} findings to report`);

    // Send email for each finding
    const emailPromises = findings.map(async (finding, index) => {
      const severityEmoji = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢',
      };

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; border-bottom: 3px solid #4F46E5; padding-bottom: 10px;">
            ${severityEmoji[finding.severity]} Application Review Finding #${index + 1}
          </h1>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #666;">
              <strong>Category:</strong> ${finding.category}
            </p>
            <p style="margin: 10px 0 0 0; color: #666;">
              <strong>Severity:</strong> <span style="color: ${
                finding.severity === 'critical' ? '#DC2626' :
                finding.severity === 'high' ? '#EA580C' :
                finding.severity === 'medium' ? '#CA8A04' : '#16A34A'
              }; font-weight: bold;">${finding.severity.toUpperCase()}</span>
            </p>
            ${finding.location ? `
              <p style="margin: 10px 0 0 0; color: #666;">
                <strong>Location:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 3px;">${finding.location}</code>
              </p>
            ` : ''}
          </div>

          <h2 style="color: #4F46E5; margin-top: 30px;">Issue</h2>
          <div style="background-color: #FEF2F2; border-left: 4px solid #DC2626; padding: 15px; margin: 10px 0;">
            <h3 style="margin: 0 0 10px 0; color: #991B1B;">${finding.title}</h3>
            <p style="margin: 0; color: #444; line-height: 1.6;">${finding.description}</p>
          </div>

          <h2 style="color: #4F46E5; margin-top: 30px;">Recommendation</h2>
          <div style="background-color: #F0FDF4; border-left: 4px solid #16A34A; padding: 15px; margin: 10px 0;">
            <p style="margin: 0; color: #444; line-height: 1.6;">${finding.recommendation}</p>
          </div>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
            <p>This is finding ${index + 1} of ${findings.length} from the automated application review.</p>
            <p>Review Date: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `;

      // Send email using Resend
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Application Review <onboarding@resend.dev>',
          to: ['arno@wmeng.co.za'],
          subject: `${severityEmoji[finding.severity]} ${finding.severity.toUpperCase()}: ${finding.title}`,
          html: emailHtml,
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error(`Failed to send email for finding #${index + 1}:`, errorText);
        return { success: false, finding: finding.title, error: errorText };
      }

      console.log(`Email sent for finding #${index + 1}: ${finding.title}`);
      return { success: true, finding: finding.title };
    });

    const emailResults = await Promise.all(emailPromises);
    const successCount = emailResults.filter(r => r.success).length;

    console.log(`Sent ${successCount}/${findings.length} emails successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        totalFindings: findings.length,
        emailsSent: successCount,
        emailsFailed: findings.length - successCount,
        reviewData: reviewData,
        emailResults: emailResults,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in send-review-findings:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
