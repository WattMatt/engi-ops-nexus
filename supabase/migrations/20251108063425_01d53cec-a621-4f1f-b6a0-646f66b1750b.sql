-- Add verification tracking columns to issue_reports
ALTER TABLE issue_reports
ADD COLUMN user_verified boolean DEFAULT false,
ADD COLUMN user_verification_response text,
ADD COLUMN user_verified_at timestamp with time zone,
ADD COLUMN needs_user_attention boolean DEFAULT false,
ADD COLUMN verification_requested_at timestamp with time zone;

-- Add verification tracking columns to suggestions
ALTER TABLE suggestions
ADD COLUMN user_verified boolean DEFAULT false,
ADD COLUMN user_verification_response text,
ADD COLUMN user_verified_at timestamp with time zone,
ADD COLUMN needs_user_attention boolean DEFAULT false,
ADD COLUMN verification_requested_at timestamp with time zone;

-- Create index for faster queries on needs_user_attention
CREATE INDEX idx_issue_reports_needs_attention ON issue_reports(reported_by, needs_user_attention) WHERE needs_user_attention = true;
CREATE INDEX idx_suggestions_needs_attention ON suggestions(reported_by, needs_user_attention) WHERE needs_user_attention = true;

-- Enable realtime for feedback notifications
ALTER PUBLICATION supabase_realtime ADD TABLE issue_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE suggestions;