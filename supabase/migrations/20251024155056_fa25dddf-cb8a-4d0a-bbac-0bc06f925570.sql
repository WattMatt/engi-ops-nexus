-- Create enums for HR system
CREATE TYPE employment_status AS ENUM ('active', 'inactive', 'on_leave', 'terminated');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE attendance_type AS ENUM ('clock_in', 'clock_out', 'break_start', 'break_end');
CREATE TYPE review_status AS ENUM ('draft', 'pending', 'completed');
CREATE TYPE onboarding_status AS ENUM ('not_started', 'in_progress', 'completed');

-- Departments table
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  manager_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Positions/Job titles table
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  description TEXT,
  level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Employees table
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  employee_number TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  date_of_birth DATE,
  hire_date DATE NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  employment_status employment_status NOT NULL DEFAULT 'active',
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add manager foreign key to departments after employees table exists
ALTER TABLE departments ADD CONSTRAINT departments_manager_id_fkey 
  FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;

-- Employee documents table
CREATE TABLE employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- Leave types table
CREATE TABLE leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  days_per_year NUMERIC DEFAULT 0,
  is_paid BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leave balances table
CREATE TABLE leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  leave_type_id UUID REFERENCES leave_types(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  total_days NUMERIC NOT NULL DEFAULT 0,
  used_days NUMERIC NOT NULL DEFAULT 0,
  remaining_days NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, leave_type_id, year)
);

-- Leave requests table
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  leave_type_id UUID REFERENCES leave_types(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested NUMERIC NOT NULL,
  reason TEXT,
  status leave_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Attendance records table
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  record_date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  break_start TIMESTAMPTZ,
  break_end TIMESTAMPTZ,
  total_hours NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payroll records table
CREATE TABLE payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  salary_amount NUMERIC NOT NULL,
  salary_currency TEXT NOT NULL DEFAULT 'USD',
  payment_frequency TEXT NOT NULL,
  effective_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pay slips table
CREATE TABLE pay_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  payroll_record_id UUID REFERENCES payroll_records(id) ON DELETE CASCADE,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  payment_date DATE NOT NULL,
  gross_pay NUMERIC NOT NULL,
  deductions JSONB DEFAULT '{}',
  net_pay NUMERIC NOT NULL,
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance reviews table
CREATE TABLE performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES employees(id) ON DELETE SET NULL NOT NULL,
  review_period_start DATE NOT NULL,
  review_period_end DATE NOT NULL,
  review_date DATE,
  status review_status NOT NULL DEFAULT 'draft',
  overall_rating NUMERIC,
  strengths TEXT,
  areas_for_improvement TEXT,
  goals TEXT,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance goals table
CREATE TABLE performance_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  status TEXT DEFAULT 'active',
  progress NUMERIC DEFAULT 0,
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Onboarding templates table
CREATE TABLE onboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  tasks JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Onboarding progress table
CREATE TABLE onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES onboarding_templates(id) ON DELETE CASCADE,
  status onboarding_status NOT NULL DEFAULT 'not_started',
  start_date DATE,
  completion_date DATE,
  tasks_completed JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Benefits table
CREATE TABLE benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  provider TEXT,
  cost_employee NUMERIC,
  cost_employer NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Employee benefits table
CREATE TABLE employee_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  benefit_id UUID REFERENCES benefits(id) ON DELETE CASCADE NOT NULL,
  enrollment_date DATE NOT NULL,
  coverage_start_date DATE NOT NULL,
  coverage_end_date DATE,
  status TEXT DEFAULT 'active',
  dependents JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_benefits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for departments
CREATE POLICY "Admins can manage departments" ON departments FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Employees can view departments" ON departments FOR SELECT USING (
  EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid())
);

-- RLS Policies for positions
CREATE POLICY "Admins can manage positions" ON positions FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Employees can view positions" ON positions FOR SELECT USING (
  EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid())
);

-- RLS Policies for employees
CREATE POLICY "Admins can manage all employees" ON employees FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Employees can view all employees" ON employees FOR SELECT USING (
  EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid())
);
CREATE POLICY "Employees can update their own record" ON employees FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for employee_documents
CREATE POLICY "Admins can manage documents" ON employee_documents FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Employees can view their own documents" ON employee_documents FOR SELECT USING (
  EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid() AND id = employee_documents.employee_id)
);

-- RLS Policies for leave_types
CREATE POLICY "Admins can manage leave types" ON leave_types FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Employees can view leave types" ON leave_types FOR SELECT USING (
  EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid())
);

-- RLS Policies for leave_balances
CREATE POLICY "Admins can manage leave balances" ON leave_balances FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Employees can view their own leave balances" ON leave_balances FOR SELECT USING (
  EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid() AND id = leave_balances.employee_id)
);

-- RLS Policies for leave_requests
CREATE POLICY "Admins can manage all leave requests" ON leave_requests FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Employees can create their own leave requests" ON leave_requests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid() AND id = leave_requests.employee_id)
);
CREATE POLICY "Employees can view their own leave requests" ON leave_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid() AND id = leave_requests.employee_id)
);
CREATE POLICY "Managers can view team leave requests" ON leave_requests FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM employees e1
    JOIN employees e2 ON e2.manager_id = e1.id
    WHERE e1.user_id = auth.uid() AND e2.id = leave_requests.employee_id
  )
);

-- RLS Policies for attendance_records
CREATE POLICY "Admins can manage attendance" ON attendance_records FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Employees can manage their own attendance" ON attendance_records FOR ALL USING (
  EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid() AND id = attendance_records.employee_id)
);

-- RLS Policies for payroll_records
CREATE POLICY "Admins can manage payroll" ON payroll_records FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Employees can view their own payroll" ON payroll_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid() AND id = payroll_records.employee_id)
);

-- RLS Policies for pay_slips
CREATE POLICY "Admins can manage pay slips" ON pay_slips FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Employees can view their own pay slips" ON pay_slips FOR SELECT USING (
  EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid() AND id = pay_slips.employee_id)
);

-- RLS Policies for performance_reviews
CREATE POLICY "Admins can manage reviews" ON performance_reviews FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Employees can view their own reviews" ON performance_reviews FOR SELECT USING (
  EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid() AND id = performance_reviews.employee_id)
);
CREATE POLICY "Reviewers can manage reviews they created" ON performance_reviews FOR ALL USING (
  EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid() AND id = performance_reviews.reviewer_id)
);

-- RLS Policies for performance_goals
CREATE POLICY "Admins can manage goals" ON performance_goals FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Employees can manage their own goals" ON performance_goals FOR ALL USING (
  EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid() AND id = performance_goals.employee_id)
);

-- RLS Policies for onboarding_templates
CREATE POLICY "Admins can manage onboarding templates" ON onboarding_templates FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Employees can view templates" ON onboarding_templates FOR SELECT USING (
  EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid())
);

-- RLS Policies for onboarding_progress
CREATE POLICY "Admins can manage onboarding progress" ON onboarding_progress FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Employees can view their own onboarding" ON onboarding_progress FOR SELECT USING (
  EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid() AND id = onboarding_progress.employee_id)
);
CREATE POLICY "Employees can update their own onboarding" ON onboarding_progress FOR UPDATE USING (
  EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid() AND id = onboarding_progress.employee_id)
);

-- RLS Policies for benefits
CREATE POLICY "Admins can manage benefits" ON benefits FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Employees can view benefits" ON benefits FOR SELECT USING (
  EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid())
);

-- RLS Policies for employee_benefits
CREATE POLICY "Admins can manage employee benefits" ON employee_benefits FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Employees can view their own benefits" ON employee_benefits FOR SELECT USING (
  EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid() AND id = employee_benefits.employee_id)
);

-- Create updated_at triggers
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON leave_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_records_updated_at BEFORE UPDATE ON payroll_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_reviews_updated_at BEFORE UPDATE ON performance_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_goals_updated_at BEFORE UPDATE ON performance_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_templates_updated_at BEFORE UPDATE ON onboarding_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_progress_updated_at BEFORE UPDATE ON onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_benefits_updated_at BEFORE UPDATE ON benefits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_benefits_updated_at BEFORE UPDATE ON employee_benefits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some default leave types
INSERT INTO leave_types (name, code, days_per_year, is_paid) VALUES
  ('Annual Leave', 'ANNUAL', 20, true),
  ('Sick Leave', 'SICK', 10, true),
  ('Personal Leave', 'PERSONAL', 5, true),
  ('Maternity Leave', 'MATERNITY', 90, true),
  ('Paternity Leave', 'PATERNITY', 10, true),
  ('Unpaid Leave', 'UNPAID', 0, false);