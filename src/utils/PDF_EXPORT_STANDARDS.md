# PDF Export Standards

## Overview

All PDF exports in this application MUST use the standardized cover page format defined in `src/utils/pdfCoverPage.ts`. This ensures consistent branding, professional appearance, and a unified user experience across all reports.

## Mandatory Requirements

### ✅ Required for ALL PDF Exports

1. **Use the standardized cover page utility**
2. **Follow the implementation pattern below**
3. **Do not create custom cover pages**
4. **Maintain consistency in styling**

## Implementation Guide

### Step 1: Import the Utilities

```typescript
import jsPDF from "jspdf";
import { fetchCompanyDetails, generateCoverPage } from "@/utils/pdfCoverPage";
```

### Step 2: Create Your Export Function

```typescript
const handleExport = async () => {
  try {
    // 1. Create PDF document (portrait or landscape)
    const doc = new jsPDF("portrait");
    
    // 2. Fetch company details (does NOT change based on report type)
    const companyDetails = await fetchCompanyDetails();
    
    // 3. Generate standardized cover page
    await generateCoverPage(doc, {
      title: "Your Report Type",           // Main category (e.g., "Financial Evaluation")
      projectName: yourProject.name,        // Specific project/report name
      subtitle: "Your Subtitle",            // Additional context (e.g., "Schedule #123")
      revision: "Rev 1",                    // Revision/version information
    }, companyDetails);
    
    // 4. Add new page for your content
    doc.addPage();
    
    // 5. Add your report-specific content
    let yPos = 20;
    doc.setFontSize(14);
    doc.text("Your Report Content", 14, yPos);
    // ... your tables, charts, etc.
    
    // 6. Save the PDF
    doc.save(`YourReport_${Date.now()}.pdf`);
    
  } catch (error) {
    console.error("PDF export error:", error);
    // Handle error appropriately
  }
};
```

## Cover Page Features

The standardized cover page automatically includes:

### Visual Elements
- ✅ Gradient blue accent bar on left edge
- ✅ Centered titles in light blue (#85A3CF)
- ✅ Horizontal divider lines
- ✅ Professional spacing and typography

### Dynamic Content
- ✅ Company name from `company_settings` table
- ✅ Contact person name from logged-in user's `employees` record
- ✅ Contact phone number from employee or default
- ✅ Company logo (if configured in settings)
- ✅ Current date (formatted: "Tuesday, 04 November 2025")
- ✅ Revision information in cyan (#00BFFF)
- ✅ Page number "1" at bottom center

### Company Details Section
```
PREPARED BY:
WATSON MATTHEUS CONSULTING ELECTRICAL ENGINEERS (PTY) LTD
141 Which Hazel ave,
Highveld Techno Park
Building 1A
Tel: (012) 665 3487
Contact: [Logged-in User Name]
```

## Real-World Examples

### Example 1: Generator Report
```typescript
await generateCoverPage(doc, {
  title: "Financial Evaluation",
  projectName: "Segonyana Mall",
  subtitle: "Centre Standby Plant",
  revision: "Rev 3",
}, companyDetails);
```

### Example 2: Cable Schedule
```typescript
await generateCoverPage(doc, {
  title: "Cable Schedule",
  projectName: schedule.schedule_name,
  subtitle: `Schedule #${schedule.schedule_number}`,
  revision: schedule.revision,
}, companyDetails);
```

### Example 3: Cost Report
```typescript
await generateCoverPage(doc, {
  title: "Cost Report",
  projectName: report.project_name,
  subtitle: `Report #${report.report_number}`,
  revision: `Report ${report.report_number}`,
}, companyDetails);
```

### Example 4: Floor Plan Report
```typescript
await generateCoverPage(doc, {
  title: "Floor Plan Design",
  projectName: project.name,
  subtitle: design.purpose,
  revision: `Version ${design.version}`,
}, companyDetails);
```

### Example 5: Specification Document
```typescript
await generateCoverPage(doc, {
  title: "Technical Specification",
  projectName: specification.project_name,
  subtitle: specification.title,
  revision: specification.revision,
}, companyDetails);
```

## Complete Example: New Report Type

Here's a complete example for implementing a new report type:

```typescript
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { fetchCompanyDetails, generateCoverPage } from "@/utils/pdfCoverPage";

interface ExportButtonProps {
  report: any;
}

export const NewReportExportButton = ({ report }: ExportButtonProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      // Fetch your report data
      const { data: reportData, error } = await supabase
        .from("your_table")
        .select("*")
        .eq("report_id", report.id);

      if (error) throw error;

      // Create PDF
      const doc = new jsPDF("portrait");

      // Fetch company details for cover page
      const companyDetails = await fetchCompanyDetails();

      // ========== COVER PAGE (MANDATORY) ==========
      await generateCoverPage(doc, {
        title: "Your Report Type",
        projectName: report.project_name,
        subtitle: report.subtitle,
        revision: report.revision,
      }, companyDetails);

      // ========== YOUR CONTENT STARTS HERE ==========
      doc.addPage();
      let yPos = 20;

      // Add your report-specific content
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("REPORT CONTENT", 14, yPos);
      yPos += 10;

      // Add tables, charts, etc.
      autoTable(doc, {
        startY: yPos,
        head: [["Column 1", "Column 2", "Column 3"]],
        body: reportData?.map(item => [
          item.field1,
          item.field2,
          item.field3,
        ]) || [],
      });

      // Save PDF
      doc.save(`Your_Report_${report.id}_${Date.now()}.pdf`);

      toast({
        title: "Success",
        description: "Report exported successfully",
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "Error",
        description: "Failed to export PDF",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={loading}>
      <Download className="mr-2 h-4 w-4" />
      {loading ? "Generating..." : "Export PDF"}
    </Button>
  );
};
```

## Common Mistakes to Avoid

### ❌ DON'T: Create Custom Cover Pages
```typescript
// WRONG - Do not do this!
doc.text("My Custom Cover", 10, 10);
doc.text(project.name, 10, 20);
```

### ✅ DO: Use the Standard Utility
```typescript
// CORRECT
await generateCoverPage(doc, options, companyDetails);
```

### ❌ DON'T: Skip the Cover Page
```typescript
// WRONG - All reports need cover pages
doc.addPage();
doc.text("My Report Content", 14, 20);
```

### ✅ DO: Always Include Cover Page
```typescript
// CORRECT
await generateCoverPage(doc, options, companyDetails);
doc.addPage();
doc.text("My Report Content", 14, 20);
```

### ❌ DON'T: Hardcode Company Details
```typescript
// WRONG - Don't hardcode
doc.text("Contact: Mr Arno Mattheus", 20, yPos);
```

### ✅ DO: Use Dynamic Company Details
```typescript
// CORRECT - Automatically fetched
const companyDetails = await fetchCompanyDetails();
await generateCoverPage(doc, options, companyDetails);
```

## Customization

### Company Settings
Users can customize:
- Company name (via Settings → Company Settings)
- Company logo (via Settings → Company Settings)
- Contact person (automatically from logged-in user's employee record)

### What Cannot Be Customized
The following are standardized and should NOT be changed:
- Cover page layout and spacing
- Color scheme (light blue #85A3CF, cyan #00BFFF)
- Typography and font sizes
- Address format
- Page structure

## Testing Your Implementation

Before committing new PDF export features:

1. ✅ Verify cover page appears correctly
2. ✅ Check company name displays from settings
3. ✅ Confirm logo appears (if configured)
4. ✅ Test with different user accounts
5. ✅ Verify date format
6. ✅ Check revision information
7. ✅ Test with long project names
8. ✅ Verify page 2 content doesn't overlap

## Existing Implementations

Reference these files for working examples:

1. **Generator Reports**: `src/components/tenant/GeneratorReportExportPDFButton.tsx`
2. **Cable Schedules**: `src/components/cable-schedules/CableScheduleExportPDFButton.tsx`
3. **Cost Reports**: `src/components/cost-reports/ExportPDFButton.tsx`

## Questions?

If you have questions about implementing PDF exports:
1. Review this documentation
2. Check existing implementations
3. Refer to `src/utils/pdfCoverPage.ts` JSDoc comments

## Version History

- **v1.0** - Initial standardization (November 2025)
  - Created shared cover page utility
  - Migrated all existing reports
  - Established mandatory standards
