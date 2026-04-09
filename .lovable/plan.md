

# Create `tenant_evaluations` Table

## Problem
The tenant evaluation form is broken because the `tenant_evaluations` table doesn't exist in the database. The frontend and native iOS/macOS app are already coded against exact column names.

## Plan

### 1. Run a single database migration
Create the table exactly as the user specified, with:
- All columns with their exact names, types, and CHECK constraints
- Two indexes on `project_id` and `tenant_id`
- RLS enabled with 4 policies (SELECT, INSERT, UPDATE, DELETE) using the existing `user_has_project_access(project_id)` function (confirmed present in the codebase)
- An `updated_at` trigger using the existing `handle_updated_at()` function

### Technical Details

The migration SQL will be the user's exact CREATE TABLE statement plus:

```sql
-- RLS policies (mirrors project-scoped pattern)
CREATE POLICY "Users can view evaluations for their projects"
  ON tenant_evaluations FOR SELECT TO authenticated
  USING (public.user_has_project_access(project_id));

CREATE POLICY "Users can insert evaluations for their projects"
  ON tenant_evaluations FOR INSERT TO authenticated
  WITH CHECK (public.user_has_project_access(project_id));

CREATE POLICY "Users can update evaluations for their projects"
  ON tenant_evaluations FOR UPDATE TO authenticated
  USING (public.user_has_project_access(project_id));

CREATE POLICY "Users can delete evaluations for their projects"
  ON tenant_evaluations FOR DELETE TO authenticated
  USING (public.user_has_project_access(project_id));

-- Auto-update updated_at
CREATE TRIGGER set_tenant_evaluations_updated_at
  BEFORE UPDATE ON tenant_evaluations
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
```

No frontend changes — table and column names match exactly what the existing code expects.

