# Cover Page Template Placeholders

This document lists all available placeholders you can use in your Word (.docx) cover page templates.

## How to Use Placeholders

In your Word template, use double curly braces to create placeholders. For example: `{{project_name}}`

The system will automatically replace these placeholders with actual data when generating PDFs.

## Available Placeholders

### Project Information
- `{{project_name}}` - The name of the project
- `{{report_title}}` - The title of the report (e.g., "Cost Report")
- `{{subtitle}}` - The report subtitle (e.g., "Report #3")
- `{{revision}}` - The revision information
- `{{date}}` - The current date
- `{{report_date}}` - The report date (same as date)

### Prepared By Information (Your Company)
- `{{company_name}}` - Your company name
- `{{contact_name}}` - The name of the person preparing the report
- `{{contact_phone}}` - Your company phone number

### Prepared For Information (Selected Contact)
- `{{prepared_for_name}}` - Organization name of the selected contact
- `{{prepared_for_contact}}` - Contact person's name
- `{{prepared_for_address1}}` - First line of address
- `{{prepared_for_address2}}` - Second line of address
- `{{prepared_for_phone}}` - Contact phone number
- `{{prepared_for_email}}` - Contact email address

### Legacy Fields (for backward compatibility)
- `{{client_name}}` - Client name (fallback if no contact is selected)

## Example Word Template Structure

```
                    {{report_title}}
                    
            {{project_name}}
            
                    {{subtitle}}


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


Date: {{date}}
Revision: {{revision}}
```

## Adding Logos

To add logos to your Word template:
1. Insert placeholder images in your template where you want logos to appear
2. Right-click the image and add alternative text
3. Use these specific alt text values:
   - For your company logo: Use `company_logo` as alt text
   - For the client/contact logo: Use `client_logo` as alt text

The system will automatically replace these placeholder images with the actual logos from your settings.

## Tips

1. **Organization**: Use tables in Word to organize the layout neatly
2. **Formatting**: Apply the formatting you want to the placeholder text itself (bold, font size, color, etc.)
3. **Testing**: After updating your template, generate a test PDF to verify all placeholders are working
4. **Spacing**: Add extra line breaks between sections for better readability

## Uploading Your Template

1. Go to **Settings → PDF Templates**
2. Click **Upload New Template**
3. Select your Word (.docx) file
4. Set it as the default cover page template
5. Test by generating a PDF

## Current Issue Resolution

If you're seeing only the contact name (e.g., "Erasmus Meyer") but not the other details like address, phone, or logo:

**Your Word template is missing the prepared_for placeholders.**

To fix this:
1. Download your current Word template from Settings → PDF Templates
2. Open it in Microsoft Word
3. Add the missing placeholders from the list above (especially the "Prepared For" section)
4. Save and re-upload the template
5. Generate a new PDF to test

The system is already sending all the data correctly - your template just needs the placeholders to display it.
