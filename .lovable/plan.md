

# Database API Gateway for External Agent Access

## Overview
Build a secure edge function that serves as an API gateway, giving an external AI agent full read/write access to your project data. The agent authenticates with an API key and can query any public table.

## Architecture

The gateway will be a single edge function (`agent-gateway`) that accepts:
- **GET** requests to read/list data from any table
- **POST** requests to insert data
- **PATCH** requests to update data
- **DELETE** requests to delete data

Authentication is via a secret API key you generate, passed as a Bearer token.

## Security Model

- A dedicated API key (stored as a secret) gates all access
- The edge function uses the **service role** internally to bypass RLS (since the agent is a trusted system, not a browser user)
- Optional: restrict which tables the agent can access via an allowlist
- All requests are logged to a new `agent_access_log` table for audit

## Implementation Steps

### Step 1: Generate and Store API Key
- Create a secure random API key
- Store it as a secret (`AGENT_API_KEY`) in the project
- Share this key (and the function URL) with the external agent

### Step 2: Create Audit Log Table
```text
agent_access_log
- id (uuid, PK)
- method (text) -- GET, POST, PATCH, DELETE
- table_name (text)
- query_params (jsonb)
- response_status (int)
- created_at (timestamptz)
```

### Step 3: Build the `agent-gateway` Edge Function
Single endpoint that handles:

**Reading data:**
```text
GET /agent-gateway?table=projects&select=id,name&limit=50
GET /agent-gateway?table=project_drawings&project_id=eq.xxx&select=*
```

**Inserting data:**
```text
POST /agent-gateway
Body: { "table": "project_drawings", "data": { ... } }
```

**Updating data:**
```text
PATCH /agent-gateway
Body: { "table": "project_drawings", "match": { "id": "xxx" }, "data": { ... } }
```

**Deleting data:**
```text
DELETE /agent-gateway
Body: { "table": "project_drawings", "match": { "id": "xxx" } }
```

### Step 4: Table Allowlist (Safety)
The function will include a configurable allowlist of tables the agent can access. Initially this includes all major operational tables (projects, tenants, drawings, generator data, cable schedules, etc.) but excludes sensitive tables like `user_roles`, `profiles`, `client_portal_tokens`, etc.

### Step 5: Share Credentials
Once deployed, you share two things with the agent:
1. **Endpoint URL**: `https://rsdisaisxdglmdmzmkyw.supabase.co/functions/v1/agent-gateway`
2. **API Key**: The generated `AGENT_API_KEY` value

## Technical Details

- The edge function uses `SUPABASE_SERVICE_ROLE_KEY` to perform queries (bypassing RLS)
- PostgREST-style filtering is supported (`eq`, `gt`, `lt`, `like`, `in`, `is`)
- Responses are JSON with standard pagination (`limit`, `offset`)
- The `verify_jwt` is set to `false` in config.toml since auth is handled via the custom API key
- Sensitive tables are excluded from the allowlist to prevent accidental exposure of credentials, tokens, or PII

## Excluded Tables (Security)
These tables will NOT be accessible via the gateway:
- `user_roles`, `profiles` (auth/identity)
- `client_portal_tokens`, `contractor_portal_tokens` (secrets)
- `client_portal_access_log`, `contractor_portal_access_log` (internal logs)
- `backup_files`, `backup_history` (infrastructure)

## Files to Create/Modify
1. **New**: `supabase/functions/agent-gateway/index.ts` -- the gateway function
2. **Modify**: `supabase/config.toml` -- add `[functions.agent-gateway]` with `verify_jwt = false`
3. **New migration**: Create `agent_access_log` table
4. **Secret**: `AGENT_API_KEY` -- you'll be prompted to set this
