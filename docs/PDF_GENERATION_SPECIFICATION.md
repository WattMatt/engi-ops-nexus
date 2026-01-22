# PDF Generation Specification

## PDFShift Integration Standard v1.0

This document defines the canonical pattern for all PDF generation in this application using PDFShift. All new PDF exports MUST follow this specification to ensure consistency, reliability, and maintainability.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Workflow Pattern](#workflow-pattern)
3. [Component Structure](#component-structure)
4. [HTML Template Guidelines](#html-template-guidelines)
5. [Edge Function Pattern](#edge-function-pattern)
6. [Database Schema Pattern](#database-schema-pattern)
7. [Preview Component Pattern](#preview-component-pattern)
8. [Error Handling](#error-handling)
9. [Styling Standards](#styling-standards)
10. [Checklist for New PDF Exports](#checklist-for-new-pdf-exports)

---

## Architecture Overview

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React + TypeScript | UI, data orchestration, preview |
| HTML Template | TypeScript function | Generate professional HTML |
| Edge Function | Deno (Supabase) | Call PDFShift API, upload to storage |
| PDF Engine | PDFShift API | HTML-to-PDF conversion |
| Storage | Supabase Storage | Store generated PDFs |
| Database | PostgreSQL | Track report history, revisions |

### Data Flow

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│   React     │───▶│  HTML        │───▶│  Edge       │───▶│  PDFShift    │
│   Button    │    │  Template    │    │  Function   │    │  API         │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
                                              │                   │
                                              ▼                   ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│   Preview   │◀───│  Database    │◀───│  Storage    │◀───│  PDF Buffer  │
│   Dialog    │    │  Record      │    │  Upload     │    │              │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
```

---

## Workflow Pattern

### The 4-Step Process: Generate → Save → Preview → Download

Every PDF export MUST follow this exact workflow:

#### Step 1: Generate
- Gather all required data from React Query hooks
- Build the HTML template with complete data
- Call the edge function with HTML + metadata

#### Step 2: Save
- Edge function calls PDFShift API
- Upload PDF buffer to Supabase Storage
- Save report record to database with revision tracking

#### Step 3: Preview
- Display generated PDF in modal dialog
- Show metadata (revision, date, file size)
- Load PDF from storage via signed URL or download

#### Step 4: Download
- User clicks download button in preview
- Download from Supabase Storage
- Use original filename from generation

---

## Component Structure

### Export Button Component

Location: `src/components/[feature]/[Feature]ExportPDFButton.tsx`

```typescript
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { generate[Feature]Html, type [Feature]PdfData } from "@/utils/pdf/[feature]HtmlTemplate";
import { [Feature]ReportPreview } from "./[Feature]ReportPreview";

interface [Feature]ExportPDFButtonProps {
  documentId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  onReportSaved?: () => void;
}

export const [Feature]ExportPDFButton = ({
  documentId,
  variant = "default",
  size = "default",
  onReportSaved,
}: [Feature]ExportPDFButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const [previewReport, setPreviewReport] = useState<SavedReport | null>(null);
  const { toast } = useToast();

  // Data fetching queries...

  // Get next revision number
  const getNextRevision = async (): Promise<string> => {
    const { data } = await supabase
      .from("[feature]_reports")
      .select("revision")
      .eq("document_id", documentId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data?.revision) return "R01";
    const match = data.revision.match(/R(\d+)/);
    if (!match) return "R01";
    const nextNum = parseInt(match[1], 10) + 1;
    return `R${nextNum.toString().padStart(2, "0")}`;
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      setCurrentStep("Preparing data...");
      const revision = await getNextRevision();
      
      setCurrentStep("Generating HTML...");
      const html = generate[Feature]Html(pdfData);
      const filename = `[Feature]_${document.number}_${revision}_${format(new Date(), "yyyyMMdd")}.pdf`;
      
      setCurrentStep("Generating PDF...");
      const { data: result, error } = await supabase.functions.invoke(
        "generate-[feature]-pdf",
        { body: { documentId, html, filename, storageBucket: "[feature]-reports" } }
      );
      
      if (error) throw error;
      if (!result?.success) throw new Error(result?.error || "PDF generation failed");
      
      setCurrentStep("Saving report...");
      const { data: savedReport, error: saveError } = await supabase
        .from("[feature]_reports")
        .insert({
          document_id: documentId,
          file_path: result.filePath,
          file_name: filename,
          file_size: result.fileSize,
          revision,
        })
        .select()
        .single();
      
      if (saveError) throw saveError;
      
      toast({ title: "Success", description: "PDF generated and saved" });
      setPreviewReport(savedReport);
      onReportSaved?.();
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setCurrentStep("");
    }
  };

  return (
    <>
      <Button onClick={handleExport} disabled={isExporting} variant={variant} size={size}>
        {isExporting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {currentStep || "Generating..."}
          </>
        ) : (
          <>
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
          </>
        )}
      </Button>

      <[Feature]ReportPreview
        report={previewReport}
        open={!!previewReport}
        onOpenChange={(open) => !open && setPreviewReport(null)}
        storageBucket="[feature]-reports"
      />
    </>
  );
};
```

---

## HTML Template Guidelines

### File Location
`src/utils/pdf/[feature]HtmlTemplate.ts`

### Structure

```typescript
/**
 * HTML Template Generator for [Feature] PDF
 * 
 * Generates a professional HTML document for use with PDFShift.
 * Structure: Cover Page → Index → [Content Sections] → Appendix
 */

// ============================================================================
// DATA TYPES
// ============================================================================

export interface [Feature]PdfData {
  document: { /* typed fields */ };
  sections: Array<{ /* typed fields */ }>;
  companySettings?: { /* typed fields */ } | null;
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

export function generate[Feature]Html(data: [Feature]PdfData): string {
  const sections: string[] = [];
  
  // 1. Cover Page (ALWAYS FIRST)
  sections.push(buildCoverPage(data));
  
  // 2. Index/Table of Contents
  sections.push(buildIndexPage(data));
  
  // 3. Content Sections
  sections.push(buildContentSections(data));
  
  // 4. Appendix/Notes (if applicable)
  if (data.document.notes) {
    sections.push(buildNotesPage(data));
  }
  
  return buildFullDocument(sections, data);
}
```

### CSS Standards for PDFShift

```css
/* Required base styles */
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Roboto', Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.5;
  color: #1a1a1a;
  background: white;
}

/* Page breaks - CRITICAL for PDFShift */
.page {
  page-break-after: always;
  page-break-inside: avoid;
  min-height: 100vh;
  padding: 20mm;
  position: relative;
}

.page:last-child {
  page-break-after: auto;
}

/* Prevent orphans/widows */
h1, h2, h3, h4, h5, h6 {
  page-break-after: avoid;
}

table, figure {
  page-break-inside: avoid;
}

/* Tables */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}

th, td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

th {
  background: #1e40af;
  color: white;
  font-weight: 500;
}

/* Zebra striping */
tr:nth-child(even) {
  background: #f9fafb;
}

/* Currency formatting */
.currency {
  text-align: right;
  font-family: 'Roboto Mono', monospace;
  white-space: nowrap;
}

/* Cover page */
.cover-page {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  height: 100vh;
}

.cover-logo {
  max-width: 200px;
  max-height: 80px;
  object-fit: contain;
}

.cover-title {
  font-size: 32pt;
  font-weight: 700;
  color: #1e40af;
  margin: 40px 0 20px;
}

.cover-subtitle {
  font-size: 16pt;
  color: #6b7280;
}
```

### Document Structure Rules

| Section | Purpose | Required |
|---------|---------|----------|
| Cover Page | Branding, title, metadata | YES |
| Index | Table of contents with page numbers | YES |
| Introduction | Scope, context, summary | RECOMMENDED |
| Content Sections | Main document body | YES |
| Exclusions/Notes | Disclaimers, conditions | OPTIONAL |
| Appendix | Supporting documents | OPTIONAL |

---

## Edge Function Pattern

### File Location
`supabase/functions/generate-[feature]-pdf/index.ts`

### Template

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PdfRequest {
  documentId: string;
  html: string;
  filename?: string;
  storageBucket?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[FeaturePDF] Starting PDF generation...');
    
    const apiKey = Deno.env.get('PDFSHIFT_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'PDFSHIFT_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { documentId, html, filename, storageBucket = 'reports' }: PdfRequest = await req.json();

    if (!html || !documentId) {
      return new Response(
        JSON.stringify({ error: 'HTML content and document ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[FeaturePDF] HTML length:', html.length, 'characters');

    // PDFShift payload - ONLY use supported fields
    const pdfShiftPayload = {
      source: html,
      format: 'A4',
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
      use_print: true,
      // landscape: false, // Add if needed
      // header: { source: '...' }, // Optional
      // footer: { source: '...' }, // Optional
    };

    // IMPORTANT: Do NOT include these fields (will cause 400 error):
    // - printBackground (not a valid PDFShift field)
    // - sandbox (not a valid PDFShift field)

    const response = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${apiKey}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pdfShiftPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[FeaturePDF] PDFShift API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `PDFShift API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pdfBuffer = await response.arrayBuffer();
    console.log('[FeaturePDF] PDF generated:', pdfBuffer.byteLength, 'bytes');

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const finalFilename = filename || `document-${documentId}-${Date.now()}.pdf`;
    const fullPath = `${documentId}/${finalFilename}`;

    // Ensure bucket exists
    const { error: bucketError } = await supabase.storage.getBucket(storageBucket);
    if (bucketError && bucketError.message.includes('not found')) {
      await supabase.storage.createBucket(storageBucket, {
        public: true,
        fileSizeLimit: 52428800, // 50MB
      });
    }

    const { error: uploadError } = await supabase.storage
      .from(storageBucket)
      .upload(fullPath, new Uint8Array(pdfBuffer), {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: `Storage upload failed: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Deno's base64 encoder (avoids stack overflow for large files)
    const base64 = base64Encode(pdfBuffer);

    return new Response(
      JSON.stringify({
        success: true,
        filePath: fullPath,
        fileName: finalFilename,
        fileSize: pdfBuffer.byteLength,
        pdf: base64, // Optional: for immediate download fallback
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'PDF generation failed';
    console.error('[FeaturePDF] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### PDFShift API Valid Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `source` | string | HTML content (required) |
| `format` | string | A4, Letter, etc. |
| `margin` | object | { top, right, bottom, left } in mm/in |
| `use_print` | boolean | Use print media queries |
| `landscape` | boolean | Landscape orientation |
| `header` | object | { source: 'HTML' } |
| `footer` | object | { source: 'HTML' } |
| `wait_for` | string | CSS selector to wait for |
| `delay` | number | Delay in ms before conversion |

**INVALID fields (will cause 400 error):**
- `printBackground`
- `sandbox`

---

## Database Schema Pattern

### Reports Table Migration

```sql
-- Create table for [feature] reports
CREATE TABLE public.[feature]_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.[feature]_documents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  revision TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generated_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.[feature]_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view [feature] reports"
  ON public.[feature]_reports FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create [feature] reports"
  ON public.[feature]_reports FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can delete [feature] reports"
  ON public.[feature]_reports FOR DELETE TO authenticated USING (true);

-- Indexes
CREATE INDEX idx_[feature]_reports_document_id ON public.[feature]_reports(document_id);
CREATE INDEX idx_[feature]_reports_generated_at ON public.[feature]_reports(generated_at DESC);
```

### Storage Bucket Migration

```sql
-- Create storage bucket for [feature] reports
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('[feature]-reports', '[feature]-reports', true, 52428800);

-- Storage policies
CREATE POLICY "[Feature] reports are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = '[feature]-reports');

CREATE POLICY "Authenticated users can upload [feature] reports"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = '[feature]-reports');

CREATE POLICY "Authenticated users can delete [feature] reports"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = '[feature]-reports');
```

---

## Preview Component Pattern

### File Location
`src/components/[feature]/[Feature]ReportPreview.tsx`

```typescript
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, X, FileText, Calendar, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Report {
  id: string;
  file_path: string;
  file_name: string;
  file_size?: number;
  revision: string;
  generated_at: string;
}

interface [Feature]ReportPreviewProps {
  report: Report | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storageBucket?: string;
}

export const [Feature]ReportPreview = ({
  report,
  open,
  onOpenChange,
  storageBucket = "[feature]-reports",
}: [Feature]ReportPreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && report?.file_path) {
      loadPreview();
    } else {
      setPreviewUrl(null);
    }
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [open, report?.file_path]);

  const loadPreview = async () => {
    if (!report?.file_path) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from(storageBucket)
        .download(report.file_path);
      if (error) throw error;
      setPreviewUrl(URL.createObjectURL(data));
    } catch (error) {
      toast({ title: "Preview Failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!report?.file_path) return;
    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from(storageBucket)
        .download(report.file_path);
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = report.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({ title: "Download Complete" });
    } catch (error) {
      toast({ title: "Download Failed", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Preview
          </DialogTitle>
        </DialogHeader>

        {report && (
          <div className="flex flex-wrap gap-2 py-2">
            <Badge variant="outline"><Hash className="h-3 w-3 mr-1" />Rev {report.revision}</Badge>
            <Badge variant="outline"><Calendar className="h-3 w-3 mr-1" />{format(new Date(report.generated_at), "dd MMM yyyy HH:mm")}</Badge>
          </div>
        )}

        <div className="flex-1 min-h-[500px] border rounded-lg bg-muted/30 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : previewUrl ? (
            <iframe src={previewUrl} className="w-full h-full" title="Report Preview" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />Close
          </Button>
          <Button onClick={handleDownload} disabled={!report || downloading}>
            {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

---

## Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `400: Rogue field` | Invalid PDFShift parameter | Remove `printBackground`, `sandbox` |
| `Maximum call stack exceeded` | Large buffer with `btoa()` | Use Deno's `base64Encode()` |
| `Storage upload failed` | Bucket doesn't exist | Create bucket in edge function |
| `PDFSHIFT_API_KEY not configured` | Missing secret | Add secret via Lovable secrets UI |

### Logging Best Practices

```typescript
console.log('[FeaturePDF] Starting PDF generation...');
console.log('[FeaturePDF] HTML length:', html.length, 'characters');
console.log('[FeaturePDF] PDF generated:', pdfBuffer.byteLength, 'bytes');
console.error('[FeaturePDF] PDFShift API error:', response.status, errorText);
```

---

## Styling Standards

### South African Currency Format

```typescript
const formatCurrency = (value: number | null): string => {
  if (value == null || isNaN(value)) return 'R0,00';
  const formatted = Math.abs(value).toLocaleString('en-ZA', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
  return `R${formatted.replace(/,/g, ' ')}`;
};
// Output: R48 256 650,00
```

### Date Format

```typescript
const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });
};
// Output: 22 January 2026
```

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Blue | `#1e40af` | Headers, titles |
| Text Primary | `#1a1a1a` | Body text |
| Text Secondary | `#6b7280` | Labels, captions |
| Border | `#e5e7eb` | Table borders |
| Zebra Stripe | `#f9fafb` | Alternating rows |
| Success | `#059669` | Positive values |
| Danger | `#dc2626` | Negative values |

---

## Checklist for New PDF Exports

### Before Starting

- [ ] Define document structure (cover, index, sections)
- [ ] Define data types/interfaces
- [ ] Identify required data sources
- [ ] Choose storage bucket name

### Implementation

- [ ] Create HTML template: `src/utils/pdf/[feature]HtmlTemplate.ts`
- [ ] Create export button: `src/components/[feature]/[Feature]ExportPDFButton.tsx`
- [ ] Create preview dialog: `src/components/[feature]/[Feature]ReportPreview.tsx`
- [ ] Create edge function: `supabase/functions/generate-[feature]-pdf/index.ts`
- [ ] Update config.toml with new function
- [ ] Create database migration for reports table
- [ ] Create storage bucket (via migration or edge function)

### Testing

- [ ] Test with minimal data
- [ ] Test with maximum data
- [ ] Test with missing optional fields
- [ ] Test currency formatting
- [ ] Test page breaks
- [ ] Verify preview loads correctly
- [ ] Verify download works

### Deployment

- [ ] Deploy edge function
- [ ] Run database migration
- [ ] Verify storage bucket exists
- [ ] Add PDFSHIFT_API_KEY secret (if not already added)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-22 | Initial specification |

---

*This specification is the canonical reference for all PDF generation in this application. All developers MUST follow these patterns to ensure consistency and maintainability.*
