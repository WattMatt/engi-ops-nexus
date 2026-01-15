-- =====================================================
-- RLS POLICY STANDARDIZATION - Part 1
-- Pattern: All authenticated users have full access
-- =====================================================

-- 1. Tables with NO policies (critical)
ALTER TABLE IF EXISTS public.cost_variation_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_full_access" ON public.cost_variation_history;
CREATE POLICY "auth_full_access" ON public.cost_variation_history
FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.procurement_quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_full_access" ON public.procurement_quotes;
CREATE POLICY "auth_full_access" ON public.procurement_quotes
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. BOQ tables
DROP POLICY IF EXISTS "Users can view bills for their BOQs" ON public.boq_bills;
DROP POLICY IF EXISTS "Users can create bills for their BOQs" ON public.boq_bills;
DROP POLICY IF EXISTS "Users can update bills for their BOQs" ON public.boq_bills;
DROP POLICY IF EXISTS "Users can delete bills for their BOQs" ON public.boq_bills;
DROP POLICY IF EXISTS "auth_full_access" ON public.boq_bills;
CREATE POLICY "auth_full_access" ON public.boq_bills
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view items for their sections" ON public.boq_items;
DROP POLICY IF EXISTS "Users can create items for their sections" ON public.boq_items;
DROP POLICY IF EXISTS "Users can update items for their sections" ON public.boq_items;
DROP POLICY IF EXISTS "Users can delete items for their sections" ON public.boq_items;
DROP POLICY IF EXISTS "auth_full_access" ON public.boq_items;
CREATE POLICY "auth_full_access" ON public.boq_items
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view sections for their bills" ON public.boq_project_sections;
DROP POLICY IF EXISTS "Users can create sections for their bills" ON public.boq_project_sections;
DROP POLICY IF EXISTS "Users can update sections for their bills" ON public.boq_project_sections;
DROP POLICY IF EXISTS "Users can delete sections for their bills" ON public.boq_project_sections;
DROP POLICY IF EXISTS "auth_full_access" ON public.boq_project_sections;
CREATE POLICY "auth_full_access" ON public.boq_project_sections
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view extracted items for their uploads" ON public.boq_extracted_items;
DROP POLICY IF EXISTS "Users can update their extracted items" ON public.boq_extracted_items;
DROP POLICY IF EXISTS "System can insert extracted items" ON public.boq_extracted_items;
DROP POLICY IF EXISTS "auth_full_access" ON public.boq_extracted_items;
CREATE POLICY "auth_full_access" ON public.boq_extracted_items
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their uploads and project uploads" ON public.boq_uploads;
DROP POLICY IF EXISTS "Users can update their uploads" ON public.boq_uploads;
DROP POLICY IF EXISTS "Users can upload BOQs" ON public.boq_uploads;
DROP POLICY IF EXISTS "Admins can delete uploads" ON public.boq_uploads;
DROP POLICY IF EXISTS "auth_full_access" ON public.boq_uploads;
CREATE POLICY "auth_full_access" ON public.boq_uploads
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Conversations/messages
DROP POLICY IF EXISTS "Users can view accessible conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "auth_full_access" ON public.conversations;
CREATE POLICY "auth_full_access" ON public.conversations
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view accessible messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to accessible conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "auth_full_access" ON public.messages;
CREATE POLICY "auth_full_access" ON public.messages
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Tasks
DROP POLICY IF EXISTS "Users can view accessible tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update accessible tasks" ON public.tasks;
DROP POLICY IF EXISTS "auth_full_access" ON public.tasks;
CREATE POLICY "auth_full_access" ON public.tasks
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Employees
DROP POLICY IF EXISTS "Users can view their own employee record" ON public.employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;
DROP POLICY IF EXISTS "auth_full_access" ON public.employees;
CREATE POLICY "auth_full_access" ON public.employees
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Distribution boards
DROP POLICY IF EXISTS "Users can manage circuits for their projects" ON public.db_circuits;
DROP POLICY IF EXISTS "Users can view circuits for their projects" ON public.db_circuits;
DROP POLICY IF EXISTS "auth_full_access" ON public.db_circuits;
CREATE POLICY "auth_full_access" ON public.db_circuits
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can create circuit materials" ON public.db_circuit_materials;
DROP POLICY IF EXISTS "Users can delete circuit materials for their projects" ON public.db_circuit_materials;
DROP POLICY IF EXISTS "Users can update circuit materials for their projects" ON public.db_circuit_materials;
DROP POLICY IF EXISTS "Users can view circuit materials for their projects" ON public.db_circuit_materials;
DROP POLICY IF EXISTS "auth_full_access" ON public.db_circuit_materials;
CREATE POLICY "auth_full_access" ON public.db_circuit_materials
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage distribution boards for their projects" ON public.distribution_boards;
DROP POLICY IF EXISTS "Users can view distribution boards for their projects" ON public.distribution_boards;
DROP POLICY IF EXISTS "auth_full_access" ON public.distribution_boards;
CREATE POLICY "auth_full_access" ON public.distribution_boards
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Floor plans
DROP POLICY IF EXISTS "Users can manage cables for their floor plans" ON public.floor_plan_cables;
DROP POLICY IF EXISTS "Users can view cables for their floor plans" ON public.floor_plan_cables;
DROP POLICY IF EXISTS "auth_full_access" ON public.floor_plan_cables;
CREATE POLICY "auth_full_access" ON public.floor_plan_cables
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage their floor plan projects" ON public.floor_plan_projects;
DROP POLICY IF EXISTS "Users can view their floor plan projects" ON public.floor_plan_projects;
DROP POLICY IF EXISTS "auth_full_access" ON public.floor_plan_projects;
CREATE POLICY "auth_full_access" ON public.floor_plan_projects
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. Invoices
DROP POLICY IF EXISTS "Users can view invoices for their projects" ON public.invoices;
DROP POLICY IF EXISTS "Users can manage their invoices" ON public.invoices;
DROP POLICY IF EXISTS "auth_full_access" ON public.invoices;
CREATE POLICY "auth_full_access" ON public.invoices
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 9. Final account related (confirming full standardization)
DROP POLICY IF EXISTS "Users can view subsections for their sections" ON public.final_account_shop_subsections;
DROP POLICY IF EXISTS "Users can create subsections for their sections" ON public.final_account_shop_subsections;
DROP POLICY IF EXISTS "Users can update subsections for their sections" ON public.final_account_shop_subsections;
DROP POLICY IF EXISTS "Users can delete subsections for their sections" ON public.final_account_shop_subsections;
DROP POLICY IF EXISTS "auth_full_access" ON public.final_account_shop_subsections;
CREATE POLICY "auth_full_access" ON public.final_account_shop_subsections
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view prime costs for their final accounts" ON public.final_account_prime_costs;
DROP POLICY IF EXISTS "Users can create prime costs for their final accounts" ON public.final_account_prime_costs;
DROP POLICY IF EXISTS "Users can update prime costs for their final accounts" ON public.final_account_prime_costs;
DROP POLICY IF EXISTS "Users can delete prime costs for their final accounts" ON public.final_account_prime_costs;
DROP POLICY IF EXISTS "auth_full_access" ON public.final_account_prime_costs;
CREATE POLICY "auth_full_access" ON public.final_account_prime_costs
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view drawings for their final accounts" ON public.final_account_reference_drawings;
DROP POLICY IF EXISTS "Users can create drawings for their final accounts" ON public.final_account_reference_drawings;
DROP POLICY IF EXISTS "Users can update drawings for their final accounts" ON public.final_account_reference_drawings;
DROP POLICY IF EXISTS "Users can delete drawings for their final accounts" ON public.final_account_reference_drawings;
DROP POLICY IF EXISTS "auth_full_access" ON public.final_account_reference_drawings;
CREATE POLICY "auth_full_access" ON public.final_account_reference_drawings
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view reviews for their sections" ON public.final_account_section_reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON public.final_account_section_reviews;
DROP POLICY IF EXISTS "Reviewers can update their assignments" ON public.final_account_section_reviews;
DROP POLICY IF EXISTS "auth_full_access" ON public.final_account_section_reviews;
CREATE POLICY "auth_full_access" ON public.final_account_section_reviews
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view section comments" ON public.final_account_section_comments;
DROP POLICY IF EXISTS "Users can create section comments" ON public.final_account_section_comments;
DROP POLICY IF EXISTS "auth_full_access" ON public.final_account_section_comments;
CREATE POLICY "auth_full_access" ON public.final_account_section_comments
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view item history" ON public.final_account_item_history;
DROP POLICY IF EXISTS "Users can create item history" ON public.final_account_item_history;
DROP POLICY IF EXISTS "auth_full_access" ON public.final_account_item_history;
CREATE POLICY "auth_full_access" ON public.final_account_item_history
FOR ALL TO authenticated USING (true) WITH CHECK (true);