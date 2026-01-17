-- Create generator_report_shares table
CREATE TABLE public.generator_report_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  shared_by UUID NOT NULL REFERENCES auth.users(id),
  message TEXT,
  shared_sections TEXT[] NOT NULL DEFAULT ARRAY['overview', 'breakdown', 'charts']::TEXT[],
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  viewed_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_generator_report_shares_project ON public.generator_report_shares(project_id);
CREATE INDEX idx_generator_report_shares_token ON public.generator_report_shares(token);
CREATE INDEX idx_generator_report_shares_email ON public.generator_report_shares(recipient_email);

-- Enable RLS
ALTER TABLE public.generator_report_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Project members can view all shares for their projects
CREATE POLICY "Project members can view generator shares"
  ON public.generator_report_shares
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = generator_report_shares.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- Project members can insert shares
CREATE POLICY "Project members can create generator shares"
  ON public.generator_report_shares
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = generator_report_shares.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- Project members can update shares (for revoking)
CREATE POLICY "Project members can update generator shares"
  ON public.generator_report_shares
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = generator_report_shares.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- Allow public read access via token for the client-facing page
CREATE POLICY "Anyone can view by valid token"
  ON public.generator_report_shares
  FOR SELECT
  USING (
    token IS NOT NULL AND 
    status = 'active' AND 
    expires_at > now()
  );

-- Allow public update for view tracking
CREATE POLICY "Anyone can update view count with valid token"
  ON public.generator_report_shares
  FOR UPDATE
  USING (
    token IS NOT NULL AND 
    status = 'active' AND 
    expires_at > now()
  );

-- Add email template for Generator Report Shared
INSERT INTO public.email_templates (
  category_id,
  name,
  subject_template,
  html_content,
  description,
  variables,
  is_active
) VALUES (
  (SELECT id FROM public.email_template_categories WHERE name = 'Project Updates' LIMIT 1),
  'Generator Report Shared',
  'Generator Report Available for Review - {{project_name}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generator Report Available</title>
</head>
<body style="font-family: Segoe UI, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Generator Report</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Available for Your Review</p>
  </div>
  
  <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <p style="margin-bottom: 20px; font-size: 16px;">Dear {{recipient_name}},</p>
    
    <p style="margin-bottom: 20px;">A generator report for <strong>{{project_name}}</strong> has been shared with you by {{sender_name}}.</p>
    
    <div style="background: #f1f5f9; border-left: 4px solid #2563eb; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; font-style: italic; color: #475569;">{{message}}</p>
    </div>
    
    <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 20px; border-radius: 12px; margin: 25px 0;">
      <h3 style="margin: 0 0 15px 0; color: #1e3a5f; font-size: 16px;">📊 Report Summary</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Project:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right;">{{project_name}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Total kVA:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right;">{{total_kva}} kVA</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Generator Zones:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right;">{{zone_count}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Expires:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right;">{{expiry_date}}</td>
        </tr>
      </table>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{report_link}}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(37,99,235,0.4);">View Generator Report</a>
    </div>
    
    <p style="color: #64748b; font-size: 14px; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
      This link will expire on {{expiry_date}}. No login is required to view the report.
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p style="margin: 0;">Powered by <strong>WM Office</strong></p>
    <p style="margin: 5px 0 0 0;">Professional Project Management Solutions</p>
  </div>
</body>
</html>',
  'Email sent when a generator report is shared with external clients',
  '[
    {"name": "recipient_name", "description": "Name of the recipient", "required": true},
    {"name": "project_name", "description": "Name of the project", "required": true},
    {"name": "sender_name", "description": "Name of the person sharing", "required": true},
    {"name": "message", "description": "Optional message from sender", "required": false},
    {"name": "total_kva", "description": "Total kVA capacity", "required": true},
    {"name": "zone_count", "description": "Number of generator zones", "required": true},
    {"name": "report_link", "description": "Link to view the report", "required": true},
    {"name": "expiry_date", "description": "When the link expires", "required": true}
  ]'::jsonb,
  true
);