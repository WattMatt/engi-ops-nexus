-- =====================================================
-- CRITICAL RLS FIX: Drop auth_full_access overrides
-- =====================================================

-- Drop auth_full_access from critical tables
DROP POLICY IF EXISTS "auth_full_access" ON tenant_floor_plan_zones;
DROP POLICY IF EXISTS "auth_full_access" ON tenant_tracker_reports;
DROP POLICY IF EXISTS "auth_full_access" ON employees;
DROP POLICY IF EXISTS "auth_full_access" ON payroll_records;
DROP POLICY IF EXISTS "auth_full_access" ON invoices;
DROP POLICY IF EXISTS "auth_full_access" ON invoice_projects;
DROP POLICY IF EXISTS "auth_full_access" ON client_requests;
DROP POLICY IF EXISTS "auth_full_access" ON project_members;
DROP POLICY IF EXISTS "auth_full_access" ON conversations;
DROP POLICY IF EXISTS "auth_full_access" ON messages;
DROP POLICY IF EXISTS "auth_full_access" ON user_activity_logs;
DROP POLICY IF EXISTS "auth_full_access" ON tenant_change_audit_log;
DROP POLICY IF EXISTS "auth_full_access" ON cost_variation_history;
DROP POLICY IF EXISTS "auth_full_access" ON tenant_kw_override_audit;
DROP POLICY IF EXISTS "auth_full_access" ON performance_reviews;
DROP POLICY IF EXISTS "auth_full_access" ON performance_goals;

-- Policies for tenant_floor_plan_zones
DROP POLICY IF EXISTS "Project members can insert tenant floor plan zones" ON tenant_floor_plan_zones;
DROP POLICY IF EXISTS "Project members can update tenant floor plan zones" ON tenant_floor_plan_zones;
DROP POLICY IF EXISTS "Project members can delete tenant floor plan zones" ON tenant_floor_plan_zones;

CREATE POLICY "Project members can insert tenant floor plan zones"
ON tenant_floor_plan_zones FOR INSERT
WITH CHECK (public.user_has_project_access(project_id));

CREATE POLICY "Project members can update tenant floor plan zones"
ON tenant_floor_plan_zones FOR UPDATE
USING (public.user_has_project_access(project_id));

CREATE POLICY "Project members can delete tenant floor plan zones"
ON tenant_floor_plan_zones FOR DELETE
USING (public.user_has_project_access(project_id));

-- Policies for tenant_tracker_reports
DROP POLICY IF EXISTS "Project members can insert tenant tracker reports" ON tenant_tracker_reports;
DROP POLICY IF EXISTS "Project members can update tenant tracker reports" ON tenant_tracker_reports;
DROP POLICY IF EXISTS "Project members can delete tenant tracker reports" ON tenant_tracker_reports;

CREATE POLICY "Project members can insert tenant tracker reports"
ON tenant_tracker_reports FOR INSERT
WITH CHECK (public.user_has_project_access(project_id));

CREATE POLICY "Project members can update tenant tracker reports"
ON tenant_tracker_reports FOR UPDATE
USING (public.user_has_project_access(project_id));

CREATE POLICY "Project members can delete tenant tracker reports"
ON tenant_tracker_reports FOR DELETE
USING (public.user_has_project_access(project_id));

-- Policies for employees
DROP POLICY IF EXISTS "Admins can insert employees" ON employees;
DROP POLICY IF EXISTS "Admins can update employees" ON employees;
DROP POLICY IF EXISTS "Admins can delete employees" ON employees;

CREATE POLICY "Admins can insert employees"
ON employees FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update employees"
ON employees FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete employees"
ON employees FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Policies for invoices (admin-managed)
DROP POLICY IF EXISTS "Admins can manage invoices" ON invoices;

CREATE POLICY "Admins can manage invoices"
ON invoices FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Policies for invoice_projects (admin or created_by)
DROP POLICY IF EXISTS "Users can manage invoice projects" ON invoice_projects;

CREATE POLICY "Users can manage invoice projects"
ON invoice_projects FOR ALL
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Policies for client_requests
DROP POLICY IF EXISTS "Project members can view client requests" ON client_requests;
DROP POLICY IF EXISTS "Project members can insert client requests" ON client_requests;
DROP POLICY IF EXISTS "Assigned staff can update client requests" ON client_requests;

CREATE POLICY "Project members can view client requests"
ON client_requests FOR SELECT
USING (
  assigned_to = auth.uid()
  OR client_user_id = auth.uid()
  OR public.user_has_project_access(project_id)
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Project members can insert client requests"
ON client_requests FOR INSERT
WITH CHECK (public.user_has_project_access(project_id));

CREATE POLICY "Assigned staff can update client requests"
ON client_requests FOR UPDATE
USING (
  assigned_to = auth.uid()
  OR public.user_has_project_access(project_id)
  OR public.has_role(auth.uid(), 'admin')
);

-- Policies for project_members
DROP POLICY IF EXISTS "Users can view project memberships" ON project_members;
DROP POLICY IF EXISTS "Project owners can manage members" ON project_members;
DROP POLICY IF EXISTS "Project owners can update members" ON project_members;
DROP POLICY IF EXISTS "Project owners can delete members" ON project_members;

CREATE POLICY "Users can view project memberships"
ON project_members FOR SELECT
USING (user_id = auth.uid() OR public.user_has_project_access(project_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Project owners can manage members"
ON project_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_members.project_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'owner'
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Project owners can update members"
ON project_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_members.project_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'owner'
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Project owners can delete members"
ON project_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_members.project_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'owner'
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Policies for conversations
DROP POLICY IF EXISTS "Participants can view conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;

CREATE POLICY "Participants can view conversations"
ON conversations FOR SELECT
USING (
  created_by = auth.uid()
  OR participants::jsonb ? auth.uid()::text
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT
WITH CHECK (created_by = auth.uid());

-- Policies for messages
DROP POLICY IF EXISTS "Participants can view messages" ON messages;
DROP POLICY IF EXISTS "Participants can send messages" ON messages;

CREATE POLICY "Participants can view messages"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (c.created_by = auth.uid() OR c.participants::jsonb ? auth.uid()::text)
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Participants can send messages"
ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (c.created_by = auth.uid() OR c.participants::jsonb ? auth.uid()::text)
  )
);

-- Policies for audit logs (read-only for relevant users)
DROP POLICY IF EXISTS "Users can view own activity logs" ON user_activity_logs;
CREATE POLICY "Users can view own activity logs"
ON user_activity_logs FOR SELECT
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Project members can view tenant change audit" ON tenant_change_audit_log;
CREATE POLICY "Project members can view tenant change audit"
ON tenant_change_audit_log FOR SELECT
USING (public.user_has_project_access(project_id) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Project members can view kw override audit" ON tenant_kw_override_audit;
CREATE POLICY "Project members can view kw override audit"
ON tenant_kw_override_audit FOR SELECT
USING (public.user_has_project_access(project_id) OR public.has_role(auth.uid(), 'admin'));

-- Policies for performance reviews
DROP POLICY IF EXISTS "Users can view own performance reviews" ON performance_reviews;
DROP POLICY IF EXISTS "Managers can manage reviews" ON performance_reviews;

CREATE POLICY "Users can view own performance reviews"
ON performance_reviews FOR SELECT
USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  OR reviewer_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Managers can manage reviews"
ON performance_reviews FOR ALL
USING (reviewer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Policies for performance goals
DROP POLICY IF EXISTS "Users can view own performance goals" ON performance_goals;
DROP POLICY IF EXISTS "Admins can manage goals" ON performance_goals;

CREATE POLICY "Users can view own performance goals"
ON performance_goals FOR SELECT
USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can manage goals"
ON performance_goals FOR ALL
USING (public.has_role(auth.uid(), 'admin'));