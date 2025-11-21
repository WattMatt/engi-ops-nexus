-- ============================================
-- COMPREHENSIVE RLS POLICY UPDATE
-- Allow all authenticated users full access to all tables
-- except admin-only tables (user_roles, backups, feedback management)
-- ============================================

-- Drop all existing policies (will recreate them)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ============================================
-- PROJECTS AND RELATED TABLES
-- ============================================

CREATE POLICY "auth_full_access" ON public.projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.project_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.project_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.project_floor_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- TENANTS AND GENERATOR REPORTS
-- ============================================

CREATE POLICY "auth_full_access" ON public.tenants FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.tenant_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.tenant_change_audit_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.tenant_kw_override_audit FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.tenant_schedule_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.generator_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.generator_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.generator_sizing_data FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.generator_zones FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.db_sizing_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.running_recovery_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- FLOOR PLANS
-- ============================================

CREATE POLICY "auth_full_access" ON public.floor_plan_projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.floor_plan_equipment FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.floor_plan_zones FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.floor_plan_containment FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.floor_plan_pv_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.floor_plan_pv_roofs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.floor_plan_pv_arrays FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.floor_plan_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.floor_plan_cables FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.floor_plan_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.pv_arrays FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- CABLE SCHEDULES
-- ============================================

CREATE POLICY "auth_full_access" ON public.cable_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.cable_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.cable_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.cable_schedule_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.cable_calculation_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- COST REPORTS
-- ============================================

CREATE POLICY "auth_full_access" ON public.cost_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.cost_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.cost_line_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.cost_variations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.cost_variation_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.cost_report_details FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.cost_report_pdfs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- BUDGETS
-- ============================================

CREATE POLICY "auth_full_access" ON public.electrical_budgets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.budget_sections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.budget_line_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- FINAL ACCOUNTS
-- ============================================

CREATE POLICY "auth_full_access" ON public.final_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.final_account_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- SPECIFICATIONS
-- ============================================

CREATE POLICY "auth_full_access" ON public.project_specifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.specification_sections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.specification_tables FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- PROJECT OUTLINES
-- ============================================

CREATE POLICY "auth_full_access" ON public.project_outlines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.project_outline_sections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.project_outline_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.project_outline_template_sections FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- BULK SERVICES
-- ============================================

CREATE POLICY "auth_full_access" ON public.bulk_services_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.bulk_services_sections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.bulk_services_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.bulk_services_tutorial_progress FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- HANDOVER DOCUMENTS
-- ============================================

CREATE POLICY "auth_full_access" ON public.handover_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.handover_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.handover_document_exclusions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- SITE DIARY
-- ============================================

CREATE POLICY "auth_full_access" ON public.site_diary_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.site_diary_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.shared_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- MESSAGING
-- ============================================

CREATE POLICY "auth_full_access" ON public.conversations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.message_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- TEMPLATES AND DOCUMENTS
-- ============================================

CREATE POLICY "auth_full_access" ON public.document_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.pdf_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.pdf_style_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.report_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.report_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.report_drafts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- INVOICING
-- ============================================

CREATE POLICY "auth_full_access" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.invoice_uploads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.invoice_projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.monthly_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.invoice_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- HR MANAGEMENT
-- ============================================

CREATE POLICY "auth_full_access" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.employee_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.departments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.positions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.attendance_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.leave_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.leave_types FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.leave_balances FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.payroll_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.pay_slips FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.benefits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.employee_benefits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.performance_reviews FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.performance_goals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.onboarding_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.onboarding_progress FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- WORKFLOWS AND APPROVALS
-- ============================================

CREATE POLICY "auth_full_access" ON public.approval_workflows FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.client_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.inspection_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.recovery_operations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- MISCELLANEOUS
-- ============================================

CREATE POLICY "auth_full_access" ON public.company_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.user_activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.status_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.import_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- ADMIN-ONLY TABLES (Restricted Access)
-- ============================================

-- User Roles: Only admins can manage
CREATE POLICY "admins_full_access" ON public.user_roles 
FOR ALL TO authenticated 
USING (public.is_admin(auth.uid())) 
WITH CHECK (public.is_admin(auth.uid()));

-- Feedback/Issue Management: Admins full access, users can create/view own
CREATE POLICY "feedback_access" ON public.issue_reports 
FOR ALL TO authenticated 
USING (public.is_admin(auth.uid()) OR reported_by = auth.uid()) 
WITH CHECK (public.is_admin(auth.uid()) OR reported_by = auth.uid());

CREATE POLICY "feedback_access" ON public.suggestions 
FOR ALL TO authenticated 
USING (public.is_admin(auth.uid()) OR reported_by = auth.uid()) 
WITH CHECK (public.is_admin(auth.uid()) OR reported_by = auth.uid());

-- Backup Tables: Only admins can manage
CREATE POLICY "admins_full_access" ON public.backup_jobs 
FOR ALL TO authenticated 
USING (public.is_admin(auth.uid())) 
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admins_full_access" ON public.backup_history 
FOR ALL TO authenticated 
USING (public.is_admin(auth.uid())) 
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admins_full_access" ON public.backup_files 
FOR ALL TO authenticated 
USING (public.is_admin(auth.uid())) 
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admins_full_access" ON public.backup_health_checks 
FOR ALL TO authenticated 
USING (public.is_admin(auth.uid())) 
WITH CHECK (public.is_admin(auth.uid()));

-- Password Reset: Users can only see their own requests
CREATE POLICY "users_own_access" ON public.password_reset_requests 
FOR ALL TO authenticated 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());