# Cost Report Template Guide

## Overview

This guide explains how to create and use Word document templates for automated PDF generation in cost reports. The system uses `docxtemplater` to replace placeholders and populate tables dynamically.

## Quick Start

### Option 1: Generate Template (Recommended)

1. Go to **Settings → PDF Templates → Generate Template** tab
2. Click **"Generate Cost Report Template"**
3. Download the `.docx` file
4. (Optional) Customize the layout in Microsoft Word
5. Upload via **Settings → PDF Templates → Upload Template**
6. Set as default Cost Report template

### Option 2: Manual Creation

Follow the detailed instructions below to create a template from scratch.

---

## Template Structure

### 1. Simple Placeholders

Simple placeholders are replaced with single values:

```
Project Name: {{project_name}}
Report Date: {{report_date}}
Client: {{client_name}}
```

**Available Simple Placeholders:**

| Placeholder | Description |
|-------------|-------------|
| `{{project_name}}` | Project name |
| `{{project_number}}` | Project reference number |
| `{{client_name}}` | Client company name |
| `{{report_number}}` | Cost report number |
| `{{report_date}}` | Report date (formatted) |
| `{{site_handover_date}}` | Site handover date |
| `{{practical_completion_date}}` | Practical completion date |
| `{{electrical_contractor}}` | Electrical contractor name |
| `{{earthing_contractor}}` | Earthing contractor name |
| `{{standby_plants_contractor}}` | Standby plants contractor name |
| `{{cctv_contractor}}` | CCTV contractor name |
| `{{total_original_budget}}` | Total original budget (formatted) |
| `{{total_anticipated_final}}` | Total anticipated final (formatted) |
| `{{total_variance}}` | Total variance (formatted) |
| `{{total_variations}}` | Total variations (formatted) |
| `{{notes}}` | Report notes |

### 2. Loop Syntax (For Tables)

Loops allow you to iterate through arrays of data (categories, line items, variations).

#### Categories Loop

```
{#categories}
Code: {code}
Description: {description}
Original Budget: R {original_budget}
Anticipated Final: R {anticipated_final}
Variance: {variance}
{/categories}
```

**Available Fields:**
- `{code}` - Category code
- `{description}` - Category description
- `{original_budget}` - Original budget amount
- `{anticipated_final}` - Anticipated final amount
- `{variance}` - Variance amount

#### Nested Line Items Loop

Within the categories loop, you can add a nested loop for line items:

```
{#categories}
## {code} {description}

Line Items:
{#line_items}
- {code}: {description}
  Original: R {original_budget} → Anticipated: R {anticipated_final}
{/line_items}

{/categories}
```

#### Variations Loop

```
{#variations}
{code} | {description} | {type} | R {amount}
{/variations}
```

**Available Fields:**
- `{code}` - Variation code
- `{description}` - Variation description
- `{type}` - Type (Credit or Extra)
- `{amount}` - Variation amount

### 3. Table Example

Here's how to create a table with loops in Microsoft Word:

| Code | Description | Original Budget | Anticipated Final | Variance |
|------|-------------|-----------------|-------------------|----------|
| {#categories}{code} | {description} | R {original_budget} | R {anticipated_final} | {variance}{/categories} |
| **TOTAL** | | R {{total_original_budget}} | R {{total_anticipated_final}} | {{total_variance}} |

**Important:** The loop tags `{#categories}` and `{/categories}` must be in the same table cell.

---

## Best Practices

### ✅ DO:

1. **Use the template generator** for guaranteed correct syntax
2. **Type placeholders cleanly** - avoid auto-formatting by Word
3. **Keep loop tags intact** - don't split `{#categories}` across cells
4. **Test with sample data** before finalizing
5. **Use consistent formatting** for currency (e.g., "R {amount}")

### ❌ DON'T:

1. **Don't add spaces** inside braces: `{ {placeholder} }` ❌ should be `{{placeholder}}` ✅
2. **Don't split loop tags** across table rows or cells
3. **Don't use curly quotes** - use straight quotes only
4. **Don't manually format numbers** - let the system handle formatting
5. **Don't nest tables** inside loop tags (not supported)

---

## Common Issues & Solutions

### Issue: "Template syntax error"

**Cause:** Malformed placeholders or loop tags

**Solutions:**
- Check for spaces inside braces: `{{placeholder}}` not `{{ placeholder }}`
- Ensure loop tags are properly closed: `{#categories}...{/categories}`
- Delete and retype placeholders if Word auto-formatted them

### Issue: "Missing placeholder data"

**Cause:** Template expects data that wasn't provided

**Solutions:**
- Check spelling of placeholder names (case-sensitive)
- Ensure required placeholders are present
- Use validation tool before uploading

### Issue: "Table not populating"

**Cause:** Loop syntax incorrect or not recognized

**Solutions:**
- Ensure `{#categories}` and `{/categories}` are in the same cell
- Check that loop tags don't have extra spaces
- Verify field names match exactly (e.g., `{code}` not `{Code}`)

### Issue: "Numbers not formatting correctly"

**Cause:** Missing currency prefix or decimal formatting

**Solutions:**
- Use `R {original_budget}` format in template
- Data is pre-formatted with 2 decimal places
- Don't add extra number formatting in Word

---

## Validation

Before uploading, templates are automatically validated for:

✓ Required placeholders present  
✓ Loop syntax correct  
✓ No formatting errors  
✓ Proper delimiters used  

**Validation errors must be fixed before upload.**

---

## Advanced Features

### Conditional Content

Show/hide content based on data:

```
{#electrical_contractor}
Electrical Contractor: {electrical_contractor}
{/electrical_contractor}
```

If `electrical_contractor` is empty, the entire section won't appear.

### Nested Loops

Categories contain line items:

```
{#categories}
Category: {code} {description}
  {#line_items}
  - {description}: R {original_budget}
  {/line_items}
{/categories}
```

### Custom Formatting

Apply Word formatting (bold, colors, fonts) to placeholders:

- **Bold**: Make `{{project_name}}` bold in Word
- **Color**: Change text color of `{{total_variance}}`
- **Font Size**: Adjust heading sizes as needed

The formatting will be preserved when placeholders are replaced.

---

## Testing Your Template

1. **Upload template** via Settings → PDF Templates
2. **Generate a test PDF** from any cost report
3. **Check for**:
   - All placeholders replaced
   - Tables populated correctly
   - Formatting preserved
   - No errors in console
4. **Iterate** if needed

---

## Example Template Structure

```
COST REPORT
-----------

PROJECT INFORMATION
Project: {{project_name}}
Number: {{project_number}}
Client: {{client_name}}
Report #: {{report_number}}
Date: {{report_date}}

CONSTRUCTION PERIOD
Site Handover: {{site_handover_date}}
Practical Completion: {{practical_completion_date}}

CONTRACTORS
Electrical: {{electrical_contractor}}
Earthing: {{earthing_contractor}}
Standby Plants: {{standby_plants_contractor}}
CCTV: {{cctv_contractor}}

CATEGORY DISTRIBUTION
[Table with categories loop]

DETAILED BREAKDOWN
{#categories}
{code} {description}
Original: R {original_budget}
Anticipated: R {anticipated_final}
Variance: {variance}

Line Items:
{#line_items}
- {code}: {description} (R {original_budget} → R {anticipated_final})
{/line_items}

{/categories}

VARIATIONS
[Table with variations loop]

NOTES
{{notes}}
```

---

## Support

For additional help:

1. Use the **Placeholder Reference** tab to copy correct syntax
2. Check validation messages for specific errors
3. Review generated template for working example
4. Consult this guide for troubleshooting

---

## Changelog

**Version 1.0** (Current)
- Initial template system
- Auto-validation on upload
- Template generator tool
- Placeholder reference panel
- Enhanced error messages
