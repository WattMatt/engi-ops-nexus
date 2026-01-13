-- Create application_documentation table
CREATE TABLE public.application_documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE,
  section_name TEXT NOT NULL,
  parent_section TEXT,
  component_path TEXT,
  description TEXT,
  readme_content TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'documented')),
  display_order INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.application_documentation ENABLE ROW LEVEL SECURITY;

-- Create policy for all access
CREATE POLICY "Allow all access to application_documentation" 
ON public.application_documentation FOR ALL USING (true) WITH CHECK (true);

-- Create index for parent lookups
CREATE INDEX idx_app_docs_parent ON public.application_documentation(parent_section);

-- Seed initial data with all application sections
INSERT INTO public.application_documentation (section_key, section_name, parent_section, component_path, description, display_order) VALUES
-- Core sections
('core', 'Core', NULL, NULL, 'Core application modules', 1),
('projects', 'Projects', 'core', 'src/pages/ProjectSelect.tsx', 'Project selection and management', 1),
('dashboard', 'Dashboard', 'core', 'src/pages/Dashboard.tsx', 'Main project dashboard', 2),
('map-view', 'Map View', 'core', 'src/components/projects/ProjectsMap.tsx', 'Geographic project visualization', 3),

-- BOQ Management
('boq', 'BOQ Management', NULL, NULL, 'Bills of Quantities management', 2),
('boq-items', 'BOQ Items', 'boq', 'src/pages/BOQ.tsx', 'BOQ item management and pricing', 1),
('boq-templates', 'BOQ Templates', 'boq', 'src/components/boq/BOQTemplates.tsx', 'Reusable BOQ section templates', 2),
('boq-sections', 'BOQ Sections', 'boq', 'src/components/boq/BOQSections.tsx', 'BOQ section organization', 3),
('boq-uploads', 'BOQ Uploads', 'boq', 'src/components/boq/BOQUploadManager.tsx', 'Excel/PDF BOQ import', 4),

-- Cost Management
('costs', 'Cost Management', NULL, NULL, 'Project cost tracking and reporting', 3),
('cost-reports', 'Cost Reports', 'costs', 'src/pages/CostReport.tsx', 'Cost analysis and reporting', 1),
('cost-variations', 'Cost Variations', 'costs', 'src/components/costs/CostVariations.tsx', 'Variation order management', 2),
('master-materials', 'Master Materials', 'costs', 'src/pages/MasterMaterials.tsx', 'Central material database', 3),

-- Floor Plans
('floor-plans', 'Floor Plans', NULL, NULL, 'Floor plan management and editing', 4),
('floor-editor', 'Floor Plan Editor', 'floor-plans', 'src/components/floor-plans/FloorPlanEditor.tsx', 'Interactive floor plan editing', 1),
('floor-equipment', 'Equipment Manager', 'floor-plans', 'src/components/floor-plans/EquipmentManager.tsx', 'Equipment placement on plans', 2),
('floor-cables', 'Cable Routing', 'floor-plans', 'src/components/floor-plans/CableManager.tsx', 'Cable route visualization', 3),

-- Electrical
('electrical', 'Electrical', NULL, NULL, 'Electrical system management', 5),
('distribution-boards', 'Distribution Boards', 'electrical', 'src/pages/DistributionBoards.tsx', 'DB scheduling and management', 1),
('cable-schedules', 'Cable Schedules', 'electrical', 'src/pages/CableSchedule.tsx', 'Cable sizing and scheduling', 2),
('circuit-materials', 'Circuit Materials', 'electrical', 'src/components/cables/CircuitMaterials.tsx', 'Material takeoffs per circuit', 3),
('bulk-services', 'Bulk Services', 'electrical', 'src/pages/BulkServicesCalculator.tsx', 'Bulk electrical calculations', 4),

-- Invoicing
('invoicing', 'Invoicing', NULL, NULL, 'Invoice generation and tracking', 6),
('invoice-manager', 'Invoice Manager', 'invoicing', 'src/pages/Invoices.tsx', 'Invoice creation and management', 1),
('invoice-templates', 'Invoice Templates', 'invoicing', 'src/components/invoices/InvoiceTemplates.tsx', 'Customizable invoice templates', 2),

-- HR/Employees
('hr', 'HR & Employees', NULL, NULL, 'Human resources management', 7),
('employees', 'Employee Manager', 'hr', 'src/pages/Employees.tsx', 'Employee records and details', 1),
('leave-management', 'Leave Management', 'hr', 'src/components/employees/LeaveManager.tsx', 'Leave tracking and approvals', 2),
('payroll', 'Payroll', 'hr', 'src/components/employees/Payroll.tsx', 'Payroll processing', 3),
('attendance', 'Attendance', 'hr', 'src/components/employees/Attendance.tsx', 'Time and attendance tracking', 4),

-- Lighting
('lighting', 'Lighting', NULL, NULL, 'Lighting design and calculations', 8),
('lighting-fittings', 'Lighting Fittings', 'lighting', 'src/pages/LightingFittings.tsx', 'Fitting database and selection', 1),
('lighting-zones', 'Lighting Zones', 'lighting', 'src/components/lighting/LightingZones.tsx', 'Zone-based lighting design', 2),

-- Final Accounts
('final-accounts', 'Final Accounts', NULL, NULL, 'Project closeout and final accounting', 9),
('final-account-manager', 'Final Account Manager', 'final-accounts', 'src/pages/FinalAccount.tsx', 'Final account preparation', 1),

-- Development
('development', 'Development', NULL, NULL, 'Development and planning tools', 10),
('prd-manager', 'PRD Manager', 'development', 'src/pages/PRDManager.tsx', 'Product requirements management', 1),

-- Settings
('settings', 'Settings', NULL, NULL, 'Application configuration', 11),
('company-settings', 'Company Settings', 'settings', 'src/pages/Settings.tsx', 'Company information and branding', 1),
('client-portal', 'Client Portal', 'settings', 'src/pages/ClientPortal.tsx', 'Client access configuration', 2),
('backup', 'Backup & Restore', 'settings', 'src/pages/BackupManager.tsx', 'Data backup management', 3);

-- Add foreign key constraint after data is inserted
ALTER TABLE public.application_documentation 
ADD CONSTRAINT fk_parent_section 
FOREIGN KEY (parent_section) REFERENCES public.application_documentation(section_key) ON DELETE SET NULL;