-- Seed the email_templates table with existing system templates
-- Using the existing senders and categories

-- 1. User Invitation Template (User Onboarding category)
INSERT INTO email_templates (
  name,
  description,
  category_id,
  sender_id,
  subject_template,
  html_content,
  variables,
  is_active,
  is_default,
  version
) VALUES (
  'User Invitation',
  'Sent when an admin creates a new user account with temporary password and login instructions',
  '3b2efbf2-8829-4ad7-b313-d31a50c2e38a', -- User Onboarding
  'a72d17f6-cdc3-4648-97f7-649f7c9a52ac', -- No Reply
  'You''ve been invited to Watson Mattheus',
  '<!-- System template: userInviteTemplate -->',
  '[{"name": "recipientName", "description": "Recipient full name"}, {"name": "recipientEmail", "description": "Recipient email address"}, {"name": "temporaryPassword", "description": "Generated temporary password"}, {"name": "role", "description": "User role assignment"}, {"name": "inviterName", "description": "Name of admin who created account"}, {"name": "loginLink", "description": "Link to login page"}]'::jsonb,
  true,
  true,
  1
);

-- 2. Password Reset Template (Account category)
INSERT INTO email_templates (
  name,
  description,
  category_id,
  sender_id,
  subject_template,
  html_content,
  variables,
  is_active,
  is_default,
  version
) VALUES (
  'Password Reset',
  'Sent when a user requests to reset their password',
  '22fb1cad-169d-4fcc-be77-2b228e8b6a53', -- Account
  'aea7ad8d-b6f6-454f-852d-81acb6b6776d', -- System
  'Reset Your Password',
  '<!-- System template: passwordResetTemplate -->',
  '[{"name": "recipientName", "description": "Recipient full name"}, {"name": "resetLink", "description": "Password reset link"}]'::jsonb,
  true,
  true,
  1
);

-- 3. Approval Request Template (Review & Approval category)
INSERT INTO email_templates (
  name,
  description,
  category_id,
  sender_id,
  subject_template,
  html_content,
  variables,
  is_active,
  is_default,
  version
) VALUES (
  'Approval Request',
  'Sent to approvers when a document needs their review and approval',
  '634f4a46-defd-4e0e-bbf2-bcf7a47bd426', -- Review & Approval
  '873d4c93-46c6-4b48-b881-93fdc5e01203', -- Notifications
  'Approval Required: {{documentTitle}}',
  '<!-- System template: approvalRequestTemplate -->',
  '[{"name": "recipientName", "description": "Approver name"}, {"name": "requesterName", "description": "Person requesting approval"}, {"name": "documentTitle", "description": "Document/item title"}, {"name": "documentType", "description": "Type of document"}, {"name": "projectName", "description": "Related project name"}, {"name": "approvalLink", "description": "Link to approval page"}]'::jsonb,
  true,
  true,
  1
);

-- 4. Review Status Update Template (Review & Approval category)
INSERT INTO email_templates (
  name,
  description,
  category_id,
  sender_id,
  subject_template,
  html_content,
  variables,
  is_active,
  is_default,
  version
) VALUES (
  'Review Status Update',
  'Sent when a document review status changes (approved, rejected, revision requested)',
  '634f4a46-defd-4e0e-bbf2-bcf7a47bd426', -- Review & Approval
  '873d4c93-46c6-4b48-b881-93fdc5e01203', -- Notifications
  'Review Update: {{documentTitle}}',
  '<!-- System template: reviewStatusTemplate -->',
  '[{"name": "recipientName", "description": "Document owner name"}, {"name": "reviewerName", "description": "Reviewer name"}, {"name": "documentTitle", "description": "Document title"}, {"name": "status", "description": "New status (approved/rejected/revision_requested)"}, {"name": "comments", "description": "Reviewer comments"}, {"name": "documentLink", "description": "Link to document"}]'::jsonb,
  true,
  true,
  1
);

-- 5. System Alert Template (Account category)
INSERT INTO email_templates (
  name,
  description,
  category_id,
  sender_id,
  subject_template,
  html_content,
  variables,
  is_active,
  is_default,
  version
) VALUES (
  'System Alert',
  'Critical system notifications and alerts (info, warning, error severity levels)',
  '22fb1cad-169d-4fcc-be77-2b228e8b6a53', -- Account
  'aea7ad8d-b6f6-454f-852d-81acb6b6776d', -- System
  '{{alertTitle}}',
  '<!-- System template: systemAlertTemplate -->',
  '[{"name": "recipientName", "description": "Recipient name"}, {"name": "alertTitle", "description": "Alert title"}, {"name": "alertMessage", "description": "Alert message content"}, {"name": "severity", "description": "Severity level (info/warning/error)"}, {"name": "actionLink", "description": "Optional action link"}, {"name": "actionLabel", "description": "Optional action button label"}]'::jsonb,
  true,
  true,
  1
);

-- 6. Project Update Template (Project Updates category)
INSERT INTO email_templates (
  name,
  description,
  category_id,
  sender_id,
  subject_template,
  html_content,
  variables,
  is_active,
  is_default,
  version
) VALUES (
  'Project Update',
  'Sent when there are updates to a project (status changes, milestones, etc.)',
  '74cca6fb-2400-4fd2-9e26-4b567a6cff05', -- Project Updates
  '873d4c93-46c6-4b48-b881-93fdc5e01203', -- Notifications
  'Update on {{projectName}}',
  '<!-- System template: projectUpdateTemplate -->',
  '[{"name": "recipientName", "description": "Recipient name"}, {"name": "projectName", "description": "Project name"}, {"name": "updateType", "description": "Type of update"}, {"name": "updateDetails", "description": "Update details"}, {"name": "updatedBy", "description": "Person who made the update"}, {"name": "projectLink", "description": "Link to project"}]'::jsonb,
  true,
  true,
  1
);

-- 7. Roadmap Review Update Template (Project Updates category)
INSERT INTO email_templates (
  name,
  description,
  category_id,
  sender_id,
  subject_template,
  html_content,
  variables,
  is_active,
  is_default,
  version
) VALUES (
  'Roadmap Review Update',
  'Sent after a roadmap review is completed with item status updates',
  '74cca6fb-2400-4fd2-9e26-4b567a6cff05', -- Project Updates
  '873d4c93-46c6-4b48-b881-93fdc5e01203', -- Notifications
  '{{reviewerName}} has updated the roadmap',
  '<!-- System template: roadmapReviewUpdateTemplate -->',
  '[{"name": "recipientName", "description": "Recipient name"}, {"name": "projectName", "description": "Project name"}, {"name": "reviewerName", "description": "Reviewer name"}, {"name": "updatedItems", "description": "Array of updated items"}, {"name": "message", "description": "Optional reviewer message"}, {"name": "reviewLink", "description": "Link to roadmap"}]'::jsonb,
  true,
  true,
  1
);

-- 8. Item Sharing Template (Item Sharing category)
INSERT INTO email_templates (
  name,
  description,
  category_id,
  sender_id,
  subject_template,
  html_content,
  variables,
  is_active,
  is_default,
  version
) VALUES (
  'Item Shared',
  'Sent when a document, file, or project is shared with a user',
  'c2df673b-a6e0-4850-80f0-fe8e648acb19', -- Item Sharing
  '873d4c93-46c6-4b48-b881-93fdc5e01203', -- Notifications
  '{{sharerName}} shared {{itemTitle}} with you',
  '<!-- System template: itemSharedTemplate -->',
  '[{"name": "recipientName", "description": "Recipient name"}, {"name": "sharerName", "description": "Person sharing the item"}, {"name": "itemTitle", "description": "Title of shared item"}, {"name": "itemType", "description": "Type of item (document/file/project)"}, {"name": "message", "description": "Optional message from sharer"}, {"name": "itemLink", "description": "Link to shared item"}]'::jsonb,
  true,
  true,
  1
);

-- 9. Mention Notification Template (Notifications category)
INSERT INTO email_templates (
  name,
  description,
  category_id,
  sender_id,
  subject_template,
  html_content,
  variables,
  is_active,
  is_default,
  version
) VALUES (
  'Mention Notification',
  'Sent when a user is mentioned in a comment or discussion',
  'f764e092-e99d-4b64-8d0c-eec8869f1073', -- Notifications
  '873d4c93-46c6-4b48-b881-93fdc5e01203', -- Notifications
  '{{mentionerName}} mentioned you',
  '<!-- System template: mentionNotificationTemplate -->',
  '[{"name": "recipientName", "description": "Mentioned user name"}, {"name": "mentionerName", "description": "Person who mentioned"}, {"name": "context", "description": "Where the mention occurred"}, {"name": "mentionContent", "description": "Content of the mention"}, {"name": "contextLink", "description": "Link to the mention context"}]'::jsonb,
  true,
  true,
  1
);