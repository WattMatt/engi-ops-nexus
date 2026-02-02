
# Cable Schedule Verification Portal for Site Electricians

## Overview

This plan outlines a complete system for sharing cable schedule reports with site electricians for verification and sign-off. The feature will allow project teams to generate secure access links, enabling electricians to review the cable schedule, verify each cable entry on-site, and provide formal sign-off with their credentials - creating an auditable trail of installation verification.

## User Journey

```text
+------------------+     +-------------------+     +--------------------+
|  PROJECT TEAM    |     |  SITE ELECTRICIAN |     |   PROJECT TEAM     |
+------------------+     +-------------------+     +--------------------+
        |                         |                         |
        v                         |                         |
  Generate Access Link            |                         |
  (Email + Credentials)           |                         |
        |                         |                         |
        +-------> Email Sent ---->|                         |
                                  v                         |
                           Access Portal                    |
                           View Cable Schedule              |
                                  |                         |
                                  v                         |
                           Verify Each Cable                |
                           (Check, Comment, Flag)           |
                                  |                         |
                                  v                         |
                           Submit Sign-off                  |
                           (Credentials + Signature)        |
                                  |                         |
                                  +-------> Notification -->|
                                                            v
                                                     Review Results
                                                     Download Certificate
```

## Core Components

### 1. Database Schema

**New Tables:**

1. `cable_schedule_verification_tokens` - Access tokens for electricians
   - `id` (uuid, PK)
   - `schedule_id` (uuid, FK to cable_schedules)
   - `project_id` (uuid, FK to projects)
   - `token` (text, unique, auto-generated)
   - `electrician_name` (text)
   - `electrician_email` (text)
   - `company_name` (text, nullable)
   - `registration_number` (text, nullable) - ECSA/SAIEE registration
   - `expires_at` (timestamptz)
   - `accessed_at` (timestamptz, nullable)
   - `access_count` (int, default 0)
   - `is_active` (boolean, default true)
   - `created_by` (uuid, FK to auth.users)
   - `created_at` (timestamptz)

2. `cable_schedule_verifications` - Main verification record
   - `id` (uuid, PK)
   - `token_id` (uuid, FK to verification_tokens)
   - `schedule_id` (uuid, FK to cable_schedules)
   - `status` (text: 'pending', 'in_progress', 'verified', 'issues_found', 'rejected')
   - `started_at` (timestamptz)
   - `completed_at` (timestamptz, nullable)
   - `overall_notes` (text, nullable)
   - Electrician sign-off credentials:
     - `signoff_name` (text)
     - `signoff_position` (text)
     - `signoff_company` (text)
     - `signoff_registration` (text, nullable)
     - `signoff_date` (date)
     - `authorization_confirmed` (boolean)
   - `signature_image_url` (text, nullable) - Digital signature
   - `created_at` (timestamptz)

3. `cable_verification_items` - Per-cable verification status
   - `id` (uuid, PK)
   - `verification_id` (uuid, FK to cable_schedule_verifications)
   - `cable_entry_id` (uuid, FK to cable_entries)
   - `status` (text: 'pending', 'verified', 'issue', 'not_installed')
   - `notes` (text, nullable)
   - `photo_urls` (text[], nullable) - Evidence photos
   - `verified_at` (timestamptz, nullable)
   - `measured_length_actual` (numeric, nullable) - Site-measured length
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

### 2. New Pages

**`/cable-verification/:token`** - Public verification portal page
- Token validation and electrician identification
- Password-optional protection (configurable per project)
- Mobile-optimized responsive design for tablet/phone use on-site

### 3. UI Components

**Admin/Dashboard Side:**

1. `CableScheduleVerificationSettings.tsx`
   - Generate verification access links
   - Set expiry duration (7/30/90 days)
   - Enter electrician details
   - Optional password protection
   - Copy link / Send email buttons

2. `CableScheduleVerificationHistory.tsx`
   - List all verification requests
   - Show status badges (Pending, In Progress, Verified, Issues Found)
   - View detailed verification results
   - Download verification certificate PDF

3. `CableVerificationStatusBadge.tsx`
   - Reusable status badge component
   - Visual indicators for verification progress

**Portal Side (Site Electrician View):**

4. `CableVerificationPortal.tsx` - Main portal page
   - Header with project/schedule branding
   - Progress tracker (verified/total cables)
   - Tab navigation: Overview | Cable List | Sign-off

5. `CableVerificationList.tsx`
   - Virtualized list of all cables
   - Filter: All / Pending / Verified / Issues
   - Search by cable tag
   - Batch verification actions

6. `CableVerificationItem.tsx`
   - Individual cable card for verification
   - Display: Cable Tag, From/To, Size, Length, Voltage
   - Status selector (Verified / Issue / Not Installed)
   - Notes field
   - Photo upload (multiple)
   - Optional: Actual measured length input

7. `ElectricianCredentialsForm.tsx`
   - Full name, Position, Company
   - ECSA/SAIEE Registration number (optional)
   - Authorization checkbox
   - Digital signature capture (canvas-based)

8. `VerificationCertificatePDF.tsx`
   - Professional PDF certificate generation
   - Lists verified cables with notes
   - Includes electrician credentials and signature
   - Branded cover page

### 4. Edge Functions

1. `validate-cable-verification-token` - RPC function
   - Validates token, checks expiry
   - Increments access count
   - Returns schedule + project data

2. `send-cable-verification-email` - Send invitation email
   - HTML email template with access link
   - Schedule summary details
   - Electrician name personalization

3. `send-cable-verification-notification` - Notify team on completion
   - Email to project team when verification submitted
   - Include status summary (X verified, Y issues)
   - Link to view results

4. `generate-verification-certificate-pdf` - Generate PDF certificate
   - Professional branded document
   - All cables with verification status
   - Electrician sign-off details
   - Digital signature embedded

### 5. Storage

- Existing bucket: `cable-schedule-reports` (private)
- New bucket: `cable-verification-photos` (private, authenticated access)
  - For storing on-site evidence photos

### 6. RLS Policies

**cable_schedule_verification_tokens:**
- SELECT/INSERT/UPDATE/DELETE: Authenticated users for their projects
- Public SELECT: Via RPC function with token validation

**cable_schedule_verifications:**
- Authenticated users: Full access for their projects
- Anonymous: Insert/Update via verified token (RPC)

**cable_verification_items:**
- Same pattern as verifications

## Technical Implementation Details

### Token Generation

Following the existing pattern from `contractor_portal_tokens`:
```typescript
const token = crypto.randomUUID(); // Or use generate_review_access_token RPC
const expiresAt = addDays(new Date(), parseInt(expiryDays));
```

### Portal Access Flow

1. Electrician clicks link: `/cable-verification?token=xxx`
2. Token validated via RPC (checks expiry, increments access)
3. Load schedule data + cable entries
4. Progressive verification saves (auto-save on each item)
5. Final sign-off with credentials form
6. Notification sent to project team

### Mobile Optimization

The portal will be optimized for tablet/phone use on construction sites:
- Large touch targets for status buttons
- Swipe gestures for next/previous cable
- Camera integration for photo evidence
- Offline capability consideration (future enhancement)

### Signature Capture

Using HTML5 Canvas for digital signature:
- Draw signature with finger/stylus
- Save as base64 PNG
- Store in storage bucket
- Embed in certificate PDF

## Integration Points

### With Existing Systems

1. **Cable Schedule System** - Read cable entries from `cable_entries` table
2. **Contractor Portal Pattern** - Follow same token/validation architecture  
3. **PDF Generation** - Use PDFShift API (consistent with cable schedule reports)
4. **Email System** - Use Resend API via shared email utilities
5. **Notification System** - Follow send-review-status-notification pattern

### Dashboard Integration

Add verification tab to `CableScheduleReports.tsx`:
```text
[Generate Report] [Report History] [Verification] (NEW)
```

## File Structure

```text
src/
├── pages/
│   └── CableVerificationPortal.tsx (NEW)
├── components/
│   └── cable-schedules/
│       ├── verification/
│       │   ├── CableScheduleVerificationSettings.tsx
│       │   ├── CableScheduleVerificationHistory.tsx
│       │   ├── CableVerificationStatusBadge.tsx
│       │   └── index.ts
│       └── CableScheduleReports.tsx (UPDATED - add tab)
│   └── cable-verification/
│       ├── CableVerificationPortal.tsx
│       ├── CableVerificationList.tsx
│       ├── CableVerificationItem.tsx
│       ├── ElectricianCredentialsForm.tsx
│       ├── VerificationProgressBar.tsx
│       ├── SignatureCanvas.tsx
│       └── index.ts
supabase/
├── migrations/
│   └── YYYYMMDD_cable_verification_tables.sql
├── functions/
│   ├── validate-cable-verification-token/
│   ├── send-cable-verification-email/
│   ├── send-cable-verification-notification/
│   └── generate-verification-certificate-pdf/
```

## Implementation Phases

### Phase 1: Core Infrastructure
- Database tables and RLS policies
- Token generation and validation RPC
- Basic verification portal page
- Storage bucket setup

### Phase 2: Verification Workflow
- Cable verification list component
- Individual verification item with status/notes
- Photo upload functionality
- Progress tracking

### Phase 3: Sign-off System
- Electrician credentials form
- Digital signature capture
- Verification submission
- Email notifications

### Phase 4: Reporting & Certificates
- Verification certificate PDF generation
- History/results view for project team
- Dashboard integration

## Security Considerations

1. **Token Security**
   - UUID-based tokens (non-guessable)
   - Configurable expiration
   - Access logging with timestamps/IP

2. **Data Access**
   - RLS policies restrict to verified tokens
   - No modification of cable schedule data (read-only)
   - Photo uploads scoped to verification session

3. **Sign-off Integrity**
   - Credentials cannot be modified after submission
   - Timestamp and IP logged
   - Certificate includes verification hash

## Success Metrics

- Verification completion rate
- Average time to complete verification
- Issues flagged vs. verified ratio
- Photo evidence attachment rate

## Future Enhancements

1. **Offline Mode** - PWA support for areas with poor connectivity
2. **Barcode/QR Scanning** - Scan cable labels for quick lookup
3. **GPS Location** - Log verification location coordinates
4. **Bulk Import** - Import verification data from Excel
5. **API Integration** - Connect with field inspection apps
