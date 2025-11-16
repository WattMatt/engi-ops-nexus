# Corrected Cost Report Template Structure

This document shows the complete corrected structure for your cost report Word template with all proper placeholders.

## Cover Page Section

```
COST REPORT

{{project_name}}

Report Number: {{report_number}}
Report Date: {{report_date}}


PREPARED FOR:
{{prepared_for_name}}
Attn: {{prepared_for_contact}}
{{prepared_for_address1}}
{{prepared_for_address2}}
Tel: {{prepared_for_phone}}
Email: {{prepared_for_email}}


PREPARED BY:
{{company_name}}
Contact: {{contact_name}}
Tel: {{contact_phone}}
```

## Report Details Section

### 1. Project Information
```
PROJECT: {{project_name}}
PROJECT NUMBER: {{project_number}}
CLIENT: {{client_name}}
REPORT NUMBER: {{report_number}}
DATE: {{report_date}}
```

### 2. Construction Period
```
CONSTRUCTION PERIOD

Practical Completion Date: {{practical_completion_date}}
Site Handover Date: {{site_handover_date}}
```

### 3. Contractors Information
```
CONTRACTORS

Electrical Contractor: {{electrical_contractor}}
CCTV Contractor: {{cctv_contractor}}
Earthing Contractor: {{earthing_contractor}}
Standby Plants Contractor: {{standby_plants_contractor}}
```

## Cost Summary Tables

Your existing table structures can remain, but add headers:

```
COST SUMMARY - {{project_name}}
Report #{{report_number}} - {{report_date}}

[Your existing tables here - these will be populated from the database]
```

## Notes Section

```
NOTES

{{notes}}
```

---

## Key Changes from Original Template

### Fixed Placeholder Syntax
- ❌ Old: `{Statting_Date}` and `{End_Date}` (single braces)
- ✅ New: `{{practical_completion_date}}` and `{{site_handover_date}}` (double braces)

### Replaced Hardcoded Data

1. **Dates**
   - "1 SEPTEMBER 2023" → `{{practical_completion_date}}`
   - "1 SEPTEMBER 2024" → `{{site_handover_date}}`
   - Report date → `{{report_date}}`

2. **Contractors**
   - "Contractor 1" → `{{electrical_contractor}}`
   - "Contractor 2" → `{{cctv_contractor}}`
   - "Contractor 3" → `{{earthing_contractor}}`
   - "Contractor 4" → `{{standby_plants_contractor}}`

3. **Added Missing Fields**
   - `{{project_name}}` - Essential for report identification
   - `{{project_number}}` - For project tracking
   - `{{report_number}}` - For version control
   - `{{client_name}}` - Client identification
   - `{{company_name}}` - Your company name
   - `{{contact_name}}` - Your contact person
   - `{{contact_phone}}` - Your phone number
   - `{{prepared_for_*}}` - Full client contact details

### Complete Placeholder Reference

All available cost report placeholders:

**Project Information:**
- `{{project_name}}`
- `{{project_number}}`
- `{{client_name}}`
- `{{report_number}}`
- `{{report_date}}`

**Contractors:**
- `{{electrical_contractor}}`
- `{{cctv_contractor}}`
- `{{earthing_contractor}}`
- `{{standby_plants_contractor}}`

**Dates:**
- `{{practical_completion_date}}`
- `{{site_handover_date}}`

**Your Company (Prepared By):**
- `{{company_name}}`
- `{{contact_name}}`
- `{{contact_phone}}`

**Client Contact (Prepared For):**
- `{{prepared_for_name}}`
- `{{prepared_for_contact}}`
- `{{prepared_for_address1}}`
- `{{prepared_for_address2}}`
- `{{prepared_for_phone}}`
- `{{prepared_for_email}}`

**Additional:**
- `{{notes}}`
- `{{date}}` (current date)
- `{{revision}}`

## Logo Placeholders

In your Word template, insert placeholder images and set their alt text to:
- `company_logo` - For your company logo
- `client_logo` - For the client logo

The system will automatically replace these with actual logos when generating PDFs.

---

## Next Steps

1. Open your COST_REPORT.docx file in Microsoft Word
2. Replace all hardcoded text with the placeholders shown above
3. Use **double curly braces** `{{placeholder_name}}` for all placeholders
4. Add any missing sections (cover page, project info, etc.)
5. Insert placeholder images for logos with proper alt text
6. Save the updated template
7. Upload it to Settings → PDF Templates
8. Set it as the default template for cost reports
9. Test by generating a PDF from a cost report

## Important Notes

- Always use **double curly braces** `{{}}` not single braces `{}`
- Placeholder names are **case-sensitive** and must match exactly
- The cost summary tables will be auto-populated from your database
- Any text not in placeholders will appear exactly as typed in every report
- Format the placeholder text itself (bold, size, color) as you want it to appear
