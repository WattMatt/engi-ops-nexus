## Integrations

Generated on 2026-01-07T04:31:56.432Z. Regenerate with `npm run docs:generate`.

### `@/integrations/supabase/client`

- **Source**: `src/integrations/supabase/client.ts`

#### `supabase`

- **Import**: `import { supabase } from "@/integrations/supabase/client";`
- **Kind**: Constant

**Example**:

```tsx
import { supabase } from "@/integrations/supabase/client";

console.log(supabase);
```

### `@/integrations/supabase/types`

- **Source**: `src/integrations/supabase/types.ts`

#### `CompositeTypes`

- **Import**: `import { CompositeTypes } from "@/integrations/supabase/types";`
- **Kind**: Type

**Definition**:

```ts
export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
```

**Example**:

```tsx
import { CompositeTypes } from "@/integrations/supabase/types";

// Use CompositeTypes in your code where appropriate.
```

#### `Constants`

- **Import**: `import { Constants } from "@/integrations/supabase/types";`
- **Kind**: Constant

**Example**:

```tsx
import { Constants } from "@/integrations/supabase/types";

console.log(Constants);
```

#### `Database`

- **Import**: `import { Database } from "@/integrations/supabase/types";`
- **Kind**: Type

**Definition**:

```ts
export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      application_reviews: {
        Row: {
          created_at: string
          focus_areas: string[]
          id: string
          overall_score: number
          review_data: Json
          review_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          focus_areas: string[]
          id?: string
          overall_score: number
          review_data: Json
          review_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          focus_areas?: string[]
          id?: string
          overall_score?: number
          review_data?: Json
          review_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      approval_workflows: {
        Row: {
          approver_id: string
          comments: string | null
          created_at: string
          document_id: string
          document_type: string
          id: string
          project_id: string
          reviewed_at: string | null
          status: string
          submitted_at: string
          submitted_by: string
          updated_at: string
        }
        Insert: {
          approver_id: string
          comments?: string | null
          created_at?: string
          document_id: string
          document_type: string
          id?: string
          project_id: string
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
          submitted_by: string
          updated_at?: string
        }
        Update: {
          approver_id?: string
          comments?: string | null
          created_at?: string
          document_id?: string
          document_type?: string
          id?: string
          project_id?: string
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflows_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          break_end: string | null
          break_start: string | null
          clock_in: string | null
          clock_out: string | null
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          record_date: string
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          record_date: string
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          record_date?: string
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_files: {
        Row: {
          backup_id: string | null
          bucket_name: string | null
          checksum: string | null
          compression_type: string | null
          created_at: string | null
          encryption_enabled: boolean | null
          expires_at: string | null
          file_path: string
          file_size_bytes: number | null
          file_type: string | null
          id: string
        }
        Insert: {
          backup_id?: string | null
          bucket_name?: string | null
          checksum?: string | null
          compression_type?: string | null
          created_at?: string | null
          encryption_enabled?: boolean | null
          expires_at?: string | null
          file_path: string
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
        }
        Update: {
          backup_id?: string | null
          bucket_name?: string | null
          checksum?: string | null
          compression_type?: string | null
          created_at?: string | null
          encryption_enabled?: boolean | null
          expires_at?: string | null
          file_path?: string
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_files_backup_id_fkey"
            columns: ["backup_id"]
            isOneToOne: false
            referencedRelation: "backup_history"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_health_checks: {
        Row: {
          backup_id: string | null
          check_type: string | null
          checked_at: string | null
          details: Json | null
          id: string
          status: string | null
        }
// ... truncated (10807 more lines) ...
```

**Example**:

```tsx
import { Database } from "@/integrations/supabase/types";

// Use Database in your code where appropriate.
```

#### `Enums`

- **Import**: `import { Enums } from "@/integrations/supabase/types";`
- **Kind**: Type

**Definition**:

```ts
export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never
```

**Example**:

```tsx
import { Enums } from "@/integrations/supabase/types";

// Use Enums in your code where appropriate.
```

#### `Json`

- **Import**: `import { Json } from "@/integrations/supabase/types";`
- **Kind**: Type

**Definition**:

```ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]
```

**Example**:

```tsx
import { Json } from "@/integrations/supabase/types";

// Use Json in your code where appropriate.
```

#### `Tables`

- **Import**: `import { Tables } from "@/integrations/supabase/types";`
- **Kind**: Type

**Definition**:

```ts
export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never
```

**Example**:

```tsx
import { Tables } from "@/integrations/supabase/types";

// Use Tables in your code where appropriate.
```

#### `TablesInsert`

- **Import**: `import { TablesInsert } from "@/integrations/supabase/types";`
- **Kind**: Type

**Definition**:

```ts
export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never
```

**Example**:

```tsx
import { TablesInsert } from "@/integrations/supabase/types";

// Use TablesInsert in your code where appropriate.
```

#### `TablesUpdate`

- **Import**: `import { TablesUpdate } from "@/integrations/supabase/types";`
- **Kind**: Type

**Definition**:

```ts
export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never
```

**Example**:

```tsx
import { TablesUpdate } from "@/integrations/supabase/types";

// Use TablesUpdate in your code where appropriate.
```
