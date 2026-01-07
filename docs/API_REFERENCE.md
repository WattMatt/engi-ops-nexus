# API Reference

This document provides comprehensive documentation for the Supabase Edge Functions used in the application. These functions serve as the backend API for various features, including AI analysis, user management, and document processing.

## Base URL

All functions are deployed to Supabase Edge Functions. The base URL format is:
`https://[project-ref].supabase.co/functions/v1/[function-name]`

## Authentication

Most functions require authentication. Include the Supabase Anon Key or Service Role Key (for admin functions) in the `Authorization` header.

```http
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
```

## Function Categories

### 1. AI & Analysis
Functions leveraging AI for data analysis, extraction, and insights.

- **ai-analyze-data**: Analyzes cost, budget, or project data to provide trends, risks, and recommendations.
  - **Input**: `{ "analysisType": "cost" | "budget" | "project", "data": Object }`
  - **Output**: `{ "analysis": "Markdown formatted analysis..." }`

- **ai-chat**: General AI chat interface for the application.
- **ai-generate-document**: Generates document content based on prompts.
- **ai-predict-costs**: Predicts future costs based on historical data.
- **ai-review-application**: Reviews applications (e.g., contractor applications) using AI.
- **analyze-repository**: Analyzes code repositories (likely for internal tools).
- **lighting-insights**: Provides insights on lighting configurations.
- **lighting-recommendations**: Suggests lighting improvements.

#### Data Extraction (AI/OCR)
- **extract-boq-rates**: Extracts rates from Bill of Quantities documents.
- **extract-budget**: Extracts budget data from uploaded documents.
- **extract-invoice-pdf**: Extracts data from invoice PDFs.
- **extract-lighting-specs**: Extracts specifications from lighting documents.
- **extract-payment-schedule**: Extracts payment schedules.
- **scan-circuit-layout**: Scans and analyzes circuit layouts.
- **scan-invoice**: Scans invoice documents.

### 2. User & Authentication
Functions for managing user accounts and access.

- **admin-reset-password**: Allows admins to trigger password resets.
- **invite-user**: Sends an invitation email to a new user.
- **reset-user-password**: Handles user-initiated password resets.
- **set-user-password**: Sets the password for a user (e.g., after invitation).

### 3. Generators
Functions that generate documents or data structures.

- **generate-boq**: Generates a Bill of Quantities.
- **generate-component**: Generates component data or code.
- **generate-infographic**: Creates infographics from data.
- **generate-template-pdf**: Generates PDFs from templates.
- **convert-word-to-pdf**: Converts Word documents to PDF format.

### 4. Notifications
Functions for sending emails and notifications.

- **check-tenant-notifications**: Checks and sends pending notifications to tenants.
- **notify-admin-feedback**: Notifies admins of new feedback.
- **send-approval-notification**: Sends approval status updates.
- **send-feedback-response**: Sends responses to user feedback.
- **send-invoice-reminder**: Sends reminders for unpaid invoices.
- **send-message-notification**: Notifies users of new messages.
- **send-review-findings**: Sends findings from a review process.
- **send-review-status-notification**: Updates on review status.
- **send-section-review-email**: Sends review details for specific sections.
- **send-status-update-notification**: General status update notifications.

### 5. Utilities & Integrations
General utility functions and external integrations.

- **backup-database**: Triggers a database backup.
- **restore-backup**: Restores the database from a backup.
- **fetch-greencalc-tariffs**: Fetches tariff data from GreenCalc.
- **fetch-tenant-schedule**: Retrieves tenant schedules.
- **get-mapbox-token**: Retrieves a temporary Mapbox token for the client.
- **google-sheets-sync**: Syncs data with Google Sheets.
- **match-boq-rates**: Matches rates in a BOQ against a master list.
- **query-municipality**: Queries municipality data.

## Example Usage (Client-Side)

```typescript
import { supabase } from "@/integrations/supabase/client";

async function analyzeData(data: any) {
  const { data: result, error } = await supabase.functions.invoke('ai-analyze-data', {
    body: {
      analysisType: 'cost',
      data: data
    }
  });

  if (error) {
    console.error('Analysis failed:', error);
    return;
  }

  console.log('Analysis:', result.analysis);
}
```
