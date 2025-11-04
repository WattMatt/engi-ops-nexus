# PDF Export Quick Start Guide

## 🚀 Quick Implementation (Copy & Paste)

### 1. Basic Template

```typescript
import jsPDF from "jspdf";
import { fetchCompanyDetails, generateCoverPage } from "@/utils/pdfCoverPage";

const handleExport = async () => {
  const doc = new jsPDF("portrait");
  const companyDetails = await fetchCompanyDetails();
  
  await generateCoverPage(doc, {
    title: "Report Type",
    projectName: "Project Name",
    subtitle: "Subtitle",
    revision: "Rev 1",
  }, companyDetails);
  
  doc.addPage();
  // Add your content here
  
  doc.save("report.pdf");
};
```

### 2. With Data Fetching

```typescript
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { fetchCompanyDetails, generateCoverPage } from "@/utils/pdfCoverPage";

const handleExport = async () => {
  // Fetch data
  const { data } = await supabase
    .from("your_table")
    .select("*");

  // Create PDF
  const doc = new jsPDF("portrait");
  const companyDetails = await fetchCompanyDetails();
  
  // Cover page (REQUIRED)
  await generateCoverPage(doc, {
    title: "Your Report",
    projectName: report.name,
    subtitle: report.subtitle,
    revision: report.revision,
  }, companyDetails);
  
  // Your content
  doc.addPage();
  autoTable(doc, {
    head: [["Column 1", "Column 2"]],
    body: data?.map(row => [row.field1, row.field2]) || [],
  });
  
  doc.save("report.pdf");
};
```

### 3. Complete Component

```typescript
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import jsPDF from "jspdf";
import { fetchCompanyDetails, generateCoverPage } from "@/utils/pdfCoverPage";

export const ExportButton = ({ report }: { report: any }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF("portrait");
      const companyDetails = await fetchCompanyDetails();
      
      await generateCoverPage(doc, {
        title: "Report Title",
        projectName: report.name,
        subtitle: report.subtitle,
        revision: report.revision,
      }, companyDetails);
      
      doc.addPage();
      // Add content
      
      doc.save(`Report_${Date.now()}.pdf`);
      
      toast({ title: "Success", description: "PDF exported" });
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to export", 
        variant: "destructive" 
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

## 📋 Common Report Types

```typescript
// Generator Report
{ title: "Financial Evaluation", projectName: "Mall Name", subtitle: "Centre Standby Plant" }

// Cable Schedule
{ title: "Cable Schedule", projectName: schedule.name, subtitle: `Schedule #${number}` }

// Cost Report
{ title: "Cost Report", projectName: project.name, subtitle: `Report #${number}` }

// Floor Plan
{ title: "Floor Plan Design", projectName: project.name, subtitle: design.purpose }

// Specification
{ title: "Technical Specification", projectName: spec.project, subtitle: spec.title }
```

## ✅ Checklist

- [ ] Import `fetchCompanyDetails` and `generateCoverPage`
- [ ] Call `fetchCompanyDetails()` once
- [ ] Call `generateCoverPage()` with proper options
- [ ] Add `doc.addPage()` before content
- [ ] Test with different users
- [ ] Verify logo displays

## 📚 Full Documentation

See `PDF_EXPORT_STANDARDS.md` for complete details.
