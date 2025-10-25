-- Make user_id nullable in employees table since not all employees need login access
ALTER TABLE employees ALTER COLUMN user_id DROP NOT NULL;

-- Add some default departments
INSERT INTO departments (name, code, description) VALUES
('Engineering', 'ENG', 'Engineering department'),
('Finance', 'FIN', 'Finance and accounting'),
('Operations', 'OPS', 'Operations and logistics'),
('Human Resources', 'HR', 'Human resources and talent management'),
('Sales', 'SALES', 'Sales and business development')
ON CONFLICT DO NOTHING;

-- Add some default positions
INSERT INTO positions (title, level, description) VALUES
('Junior Engineer', 'Junior', 'Entry level engineering position'),
('Senior Engineer', 'Senior', 'Senior engineering position'),
('Project Manager', 'Manager', 'Project management position'),
('Accountant', 'Mid', 'Accounting and finance position'),
('HR Manager', 'Manager', 'Human resources management'),
('Operations Manager', 'Manager', 'Operations management'),
('Sales Representative', 'Junior', 'Sales position')
ON CONFLICT DO NOTHING;