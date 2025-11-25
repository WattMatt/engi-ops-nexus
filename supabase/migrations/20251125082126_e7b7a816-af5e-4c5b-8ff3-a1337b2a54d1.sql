
-- ================================================================================
-- PRIORITY 1: RLS SECURITY AUDIT & COMPREHENSIVE FIX
-- Cross-tenant isolation via project membership
-- ================================================================================

-- Fix search_path security on functions
ALTER FUNCTION public.notify_task_assignment() SET search_path = public;
ALTER FUNCTION public.notify_user_of_response() SET search_path = public;
ALTER FUNCTION public.sync_tenant_document_status() SET search_path = public;
ALTER FUNCTION public.update_pdf_template_updated_at() SET search_path = public;
ALTER FUNCTION public.ensure_single_default_cover() SET search_path = public;
ALTER FUNCTION public.update_global_contacts_updated_at() SET search_path = public;
ALTER FUNCTION public.update_project_floor_plans_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- Helper: Check project access
CREATE OR REPLACE FUNCTION public.user_has_project_access(_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM project_members WHERE project_id = _project_id AND user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
$$;

-- Helper: Check floor plan access
CREATE OR REPLACE FUNCTION public.user_has_floor_plan_access(_floor_plan_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM floor_plan_projects fp WHERE fp.id = _floor_plan_id 
    AND (fp.user_id = auth.uid() OR public.user_has_project_access(fp.project_id))
  ) OR public.has_role(auth.uid(), 'admin')
$$;

-- TASK MANAGEMENT RLS
CREATE POLICY "task_select" ON tasks FOR SELECT TO authenticated
  USING (public.user_has_project_access(project_id));
CREATE POLICY "task_insert" ON tasks FOR INSERT TO authenticated
  WITH CHECK (public.user_has_project_access(project_id));
CREATE POLICY "task_update" ON tasks FOR UPDATE TO authenticated
  USING (public.user_has_project_access(project_id));
CREATE POLICY "task_delete" ON tasks FOR DELETE TO authenticated
  USING (public.user_has_project_access(project_id));

CREATE POLICY "task_comments_all" ON task_comments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tasks WHERE id = task_comments.task_id AND public.user_has_project_access(project_id)));
CREATE POLICY "task_attachments_all" ON task_attachments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tasks WHERE id = task_attachments.task_id AND public.user_has_project_access(project_id)));
CREATE POLICY "task_subtasks_all" ON task_subtasks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tasks WHERE id = task_subtasks.parent_task_id AND public.user_has_project_access(project_id)));
CREATE POLICY "task_dependencies_all" ON task_dependencies FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tasks WHERE id = task_dependencies.task_id AND public.user_has_project_access(project_id)));
CREATE POLICY "task_groups_all" ON task_groups FOR ALL TO authenticated
  USING (public.user_has_project_access(project_id));
CREATE POLICY "task_labels_all" ON task_labels FOR ALL TO authenticated
  USING (public.user_has_project_access(project_id));
CREATE POLICY "task_label_assignments_all" ON task_label_assignments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tasks WHERE id = task_label_assignments.task_id AND public.user_has_project_access(project_id)));
CREATE POLICY "task_assignments_all" ON task_assignments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tasks WHERE id = task_assignments.task_id AND public.user_has_project_access(project_id)));
CREATE POLICY "task_reminders_own" ON task_reminders FOR ALL TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "task_activity_select" ON task_activity_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tasks WHERE id = task_activity_logs.task_id AND public.user_has_project_access(project_id)));
CREATE POLICY "task_activity_insert" ON task_activity_logs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM tasks WHERE id = task_activity_logs.task_id AND public.user_has_project_access(project_id)));

-- FLOOR PLAN & ZONE RLS
CREATE POLICY "zones_all" ON zones FOR ALL TO authenticated
  USING (public.user_has_floor_plan_access(floor_plan_id));
CREATE POLICY "zone_generators_all" ON zone_generators FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM zones WHERE id = zone_generators.zone_id AND public.user_has_floor_plan_access(floor_plan_id)));

-- TENANT CONFIGURATION RLS
CREATE POLICY "tenant_field_config_all" ON tenant_field_config FOR ALL TO authenticated
  USING (public.user_has_project_access(project_id));
CREATE POLICY "tenant_floor_plan_masks_all" ON tenant_floor_plan_masks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tenants WHERE id = tenant_floor_plan_masks.tenant_id AND public.user_has_project_access(project_id)));
CREATE POLICY "tenant_report_templates_all" ON tenant_report_templates FOR ALL TO authenticated
  USING (public.user_has_project_access(project_id));

-- USER MANAGEMENT RLS
CREATE POLICY "user_activity_select" ON user_activity FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_activity_insert" ON user_activity FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_invitations_admin" ON user_invitations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_reminders_all" ON user_reminders FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- SPECIFICATIONS & REPORTING RLS
CREATE POLICY "specification_terms_all" ON specification_terms FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM project_specifications ps WHERE ps.id = specification_terms.spec_id AND public.user_has_project_access(ps.project_id)));
CREATE POLICY "weekly_reports_all" ON weekly_reports FOR ALL TO authenticated
  USING (public.user_has_project_access(project_id));
CREATE POLICY "template_test_runs_admin" ON template_test_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "storage_providers_admin" ON storage_providers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "storage_providers_select" ON storage_providers FOR SELECT TO authenticated
  USING (true);

-- GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION public.user_has_project_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_floor_plan_access(uuid) TO authenticated;
