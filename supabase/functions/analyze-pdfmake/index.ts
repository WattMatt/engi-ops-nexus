/**
 * Abacus AI Analysis Edge Function for PDFMake Implementation
 * 
 * Uses Abacus AI RouteLLM to analyze our pdfmake code and provide
 * best-practice recommendations AND generate comprehensive developer prompts.
 */

import { createClient } from "npm:@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// TYPES
// ============================================================================

interface AnalysisRequest {
  analysisType: 'full' | 'best-practices' | 'performance' | 'structure' | 'tables' | 'styling' | 'generate-prompt';
  codeSnippet?: string;
  specificQuestion?: string;
  generateDeveloperPrompt?: boolean;
}

interface AnalysisResponse {
  success: boolean;
  analysis: string;
  recommendations: string[];
  codeExamples?: string[];
  references?: string[];
  developerPrompt?: string;
  error?: string;
}

// ============================================================================
// PDFMAKE CONTEXT - COMPREHENSIVE
// ============================================================================

const PDFMAKE_DOCUMENTATION_CONTEXT = `
# PDFMake Best Practices Reference (v0.3.x)
Based on official documentation: https://pdfmake.github.io/docs/0.3/

## Core Concepts

### Document Definition Structure
The document definition is a plain JavaScript object with key properties:
- content: Array of content elements (required)
- styles: Style dictionary for named styles
- defaultStyle: Base style applied to all elements
- pageSize: 'A4', 'LETTER', or custom {width, height}
- pageOrientation: 'portrait' | 'landscape'
- pageMargins: [left, top, right, bottom] or single number

### Content Elements
1. **Text**: { text: 'Hello', style: 'header' } or just 'Hello'
2. **Columns**: { columns: [...] } with width options ('*', 'auto', number, '%')
3. **Tables**: { table: { body: [[...]] } } with widths, headerRows
4. **Images**: { image: 'base64...', width: 100 }
5. **Stacks**: { stack: [...] } for vertical grouping
6. **Canvas**: { canvas: [...] } for lines, rectangles, etc.

### Table Best Practices
\`\`\`javascript
{
  table: {
    headerRows: 1,
    widths: ['*', 'auto', 100],
    body: [
      [{ text: 'Header', bold: true, fillColor: '#4472C4', color: 'white' }, ...],
      ['Row 1 Col 1', 'Row 1 Col 2', 'Row 1 Col 3'],
    ]
  },
  layout: {
    hLineWidth: (i, node) => (i === 0 || i === node.table.headerRows || i === node.table.body.length) ? 1 : 0.5,
    vLineWidth: () => 0.5,
    hLineColor: () => '#E5E7EB',
    vLineColor: () => '#E5E7EB',
    fillColor: (rowIndex) => rowIndex % 2 === 0 ? '#F3F4F6' : null,
    paddingLeft: () => 8,
    paddingRight: () => 8,
    paddingTop: () => 6,
    paddingBottom: () => 6,
  }
}
\`\`\`

### Styling Guidelines
1. Use named styles for consistency: styles: { header: { fontSize: 18, bold: true } }
2. Apply styles via style property: { text: 'Title', style: 'header' }
3. Inline styles override named styles
4. Colors should be hex (#1E40AF) or named ('white', 'black')

### Performance Optimizations
1. Avoid deeply nested content arrays
2. Use 'unbreakable: true' sparingly
3. Minimize image count and size (compress base64)
4. Use 'pageBreak: before/after' strategically
5. Pre-calculate table widths when possible

### Page Headers & Footers
\`\`\`javascript
{
  header: (currentPage, pageCount) => ({ 
    text: \`Page \${currentPage} of \${pageCount}\`,
    alignment: 'right',
    margin: [0, 20, 40, 0]
  }),
  footer: (currentPage, pageCount) => ({
    columns: [
      { text: 'Company Name', alignment: 'left' },
      { text: \`\${currentPage}/\${pageCount}\`, alignment: 'right' }
    ],
    margin: [40, 0]
  })
}
\`\`\`

### Common Issues & Fixes
1. **Tables breaking oddly**: Use dontBreakRows: true in layout
2. **Images not showing**: Ensure valid base64 with data URI prefix
3. **Text overflow**: Set width constraints or use fontSize adjustments
4. **Alignment issues**: Use explicit alignment: 'center' | 'left' | 'right' | 'justify'
5. **Margins not working**: Use array format [left, top, right, bottom]
`;

const OUR_IMPLEMENTATION_SUMMARY = `
# Our Current PDFMake Implementation Summary

## Architecture Overview
We use a modular, fluent architecture for PDF generation with:
- **Client-side builders** in \`src/utils/pdfmake/\`
- **Server-side edge functions** in \`supabase/functions/\`
- **Shared styling system** for consistent branding

## Core Files:

### 1. src/utils/pdfmake/documentBuilder.ts - Fluent API
\`\`\`typescript
export class PDFDocumentBuilder {
  private content: Content[] = [];
  private options: DocumentBuilderOptions;
  private customStyles: StyleDictionary = {};
  
  add(content: Content | Content[]): this {
    if (Array.isArray(content)) {
      this.content.push(...content);
    } else {
      this.content.push(content);
    }
    return this;
  }
  
  withStandardHeader(documentTitle: string, projectName?: string): this {
    this.options.header = (currentPage, pageCount) => {
      if (currentPage === 1) return { text: '' };
      return { columns: [...] };
    };
    return this;
  }
  
  async toBlob(timeoutMs = 60000): Promise<Blob> {
    // Uses getBase64() internally for reliability
  }
}
\`\`\`

### 2. src/utils/pdfmake/styles.ts - Brand Colors & Styles
\`\`\`typescript
export const PDF_COLORS = {
  primary: '#1e3a8a',      // blue-900
  secondary: '#3b82f6',    // blue-500
  accent: '#6366f1',       // indigo-500
  text: '#0f172a',         // slate-900
  textMuted: '#475569',    // slate-600
  border: '#e2e8f0',       // slate-200
  white: '#ffffff',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
};

export const tableLayouts = {
  zebra: {
    hLineWidth: () => 0.5,
    vLineWidth: () => 0.5,
    hLineColor: () => PDF_COLORS.border,
    vLineColor: () => PDF_COLORS.border,
    fillColor: (rowIndex) => rowIndex > 0 && rowIndex % 2 === 0 ? '#f8fafc' : null,
    paddingLeft: () => 6,
    paddingRight: () => 6,
    paddingTop: () => 4,
    paddingBottom: () => 4,
  },
};
\`\`\`

### 3. Section Builder Pattern
Each report type has dedicated builders:
\`\`\`typescript
// Build cover page content
function buildCoverPage(config, metrics): Content[] {
  return [
    { text: config.reportTitle, style: 'title', alignment: 'center' },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: PDF_COLORS.primary }] },
    { text: '', pageBreak: 'after' },
  ];
}

// Build executive summary
function buildExecutiveSummary(metrics): Content[] {
  return [
    { text: 'Executive Summary', style: 'h1', pageBreak: 'before' },
    buildMetricsGrid(metrics),
    buildKeyInsights(metrics),
  ];
}
\`\`\`

### 4. Edge Function Pattern (supabase/functions/generate-*-pdf/)
\`\`\`typescript
import pdfMake from "https://esm.sh/pdfmake@0.2.10/build/pdfmake.min.js";
import pdfFonts from "https://esm.sh/pdfmake@0.2.10/build/vfs_fonts.js";

// Initialize fonts
pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts.vfs;

Deno.serve(async (req) => {
  const { data, config } = await req.json();
  
  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    content: [...buildContent(data, config)],
    styles: getStyles(),
    defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.35 },
    header: (currentPage, pageCount) => buildHeader(currentPage, pageCount),
    footer: (currentPage, pageCount) => buildFooter(currentPage, pageCount),
  };
  
  const pdfDoc = pdfMake.createPdf(docDefinition);
  const base64 = await new Promise(resolve => pdfDoc.getBase64(resolve));
  
  return new Response(JSON.stringify({ pdf: base64 }));
});
\`\`\`

## Current Patterns:
- ✅ PDFDocumentBuilder fluent API for document construction
- ✅ Separate section builders (buildCoverPage, buildExecutiveSummary, etc.)
- ✅ PDF_COLORS object for consistent colors
- ✅ Custom table layouts with zebra striping
- ✅ Chart embedding via base64 captured images
- ✅ Dynamic content based on export options
- ✅ getBase64() for reliable PDF generation

## Known Areas for Improvement:
- Image compression for large chart payloads (limit ~200KB per chart)
- Table layout consistency between client and server
- Dynamic page breaks for long content
- Better error handling and fallbacks
`;

const CURRENT_FILE_STRUCTURE = `
## File Structure

\`\`\`
src/utils/pdfmake/
├── index.ts              # Barrel exports
├── config.ts             # pdfMake initialization, font loading
├── styles.ts             # PDF_COLORS, FONT_SIZES, tableLayouts
├── documentBuilder.ts    # PDFDocumentBuilder class
├── helpers.ts            # Utility functions (spacers, lines, etc.)
├── imageUtils.ts         # Image capture and processing
├── chartUtils.ts         # Chart-specific capture utilities
├── coverPage.ts          # Cover page builder
├── validation.ts         # Document validation
├── testing.ts            # Test utilities
├── roadmapReviewBuilder.ts  # Roadmap report specific
├── costReportBuilder.ts     # Cost report specific
└── projectRoadmapBuilder.ts # Project roadmap specific

supabase/functions/
├── generate-roadmap-pdf/    # Server-side roadmap PDF
├── generate-tenant-evaluation-pdf/  # Tenant evaluation PDF
└── analyze-pdfmake/         # This analysis function
\`\`\`
`;

// ============================================================================
// DEVELOPER PROMPT GENERATOR
// ============================================================================

const generateDeveloperPromptTemplate = (analysisResult: string, recommendations: string[], codeExamples: string[]) => {
  return `
# PDFMake Implementation Task for Developer

## Context
You are working on a React + TypeScript application that uses pdfmake v0.3.x for PDF generation.
The project uses a fluent builder pattern with server-side edge functions for production-quality PDFs.

## Official Documentation
- Main docs: https://pdfmake.github.io/docs/0.3/
- Tables: https://pdfmake.github.io/docs/0.3/document-definition-object/tables/
- Styling: https://pdfmake.github.io/docs/0.3/document-definition-object/styling/
- Images: https://pdfmake.github.io/docs/0.3/document-definition-object/images/

---

## Current Architecture

${OUR_IMPLEMENTATION_SUMMARY}

${CURRENT_FILE_STRUCTURE}

---

## Analysis Summary

${analysisResult}

---

## Key Recommendations to Implement

${recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

---

## Code Examples

${codeExamples.length > 0 ? codeExamples.map((code, i) => `
### Example ${i + 1}
\`\`\`typescript
${code}
\`\`\`
`).join('\n') : 'No specific code examples generated.'}

---

## Implementation Guidelines

### When Creating New PDF Reports:
1. **Create a new builder file** in \`src/utils/pdfmake/\` (e.g., \`myReportBuilder.ts\`)
2. **Use the PDFDocumentBuilder** fluent API:
   \`\`\`typescript
   import { createDocument, PDF_COLORS } from './index';
   
   const doc = createDocument({ orientation: 'portrait' });
   doc.add(buildCoverPage(...));
   doc.add(buildContent(...));
   doc.withStandardHeader('Report Title');
   doc.withStandardFooter(true);
   
   const blob = await doc.toBlob();
   \`\`\`

3. **For server-side generation**, create an edge function:
   \`\`\`typescript
   // supabase/functions/generate-my-pdf/index.ts
   import pdfMake from "https://esm.sh/pdfmake@0.2.10/build/pdfmake.min.js";
   import pdfFonts from "https://esm.sh/pdfmake@0.2.10/build/vfs_fonts.js";
   pdfMake.vfs = pdfFonts.pdfMake?.vfs || {};
   \`\`\`

### Table Best Practices:
\`\`\`typescript
{
  table: {
    headerRows: 1,
    widths: ['*', 'auto', 100],
    body: [
      [
        { text: 'Header 1', bold: true, fillColor: PDF_COLORS.textMuted, color: 'white' },
        { text: 'Header 2', bold: true, fillColor: PDF_COLORS.textMuted, color: 'white' },
        { text: 'Header 3', bold: true, fillColor: PDF_COLORS.textMuted, color: 'white' },
      ],
      ['Cell 1', 'Cell 2', 'Cell 3'],
    ],
  },
  layout: tableLayouts.zebra,
}
\`\`\`

### Image Handling:
\`\`\`typescript
// Capture chart as base64
import { captureChart } from './chartUtils';

const chart = await captureChart({
  elementId: 'my-chart',
  title: 'Sales Chart',
  width: 500,
  height: 300,
});

// Add to document
if (chart) {
  doc.add({
    image: chart.image.dataUrl,
    width: 500,
    alignment: 'center',
  });
}
\`\`\`

---

## Task Checklist

- [ ] Review existing implementation patterns in \`src/utils/pdfmake/\`
- [ ] Use \`PDF_COLORS\` for all colors (never hardcode)
- [ ] Use \`tableLayouts.zebra\` or \`tableLayouts.standard\` for tables
- [ ] Include proper error handling with try/catch
- [ ] Test with both small and large datasets
- [ ] Compress images before embedding (max ~200KB each)
- [ ] Use \`pageBreak: 'before'\` for new sections
- [ ] Add document metadata via \`setInfo()\`
- [ ] Test PDF opens correctly in multiple viewers

---

## Important Notes

⚠️ **Common Pitfalls to Avoid:**
- Don't use \`getBlob()\` directly - use \`getBase64()\` and convert
- Always initialize fonts in edge functions: \`pdfMake.vfs = pdfFonts.pdfMake?.vfs\`
- Images must be valid base64 with data URI prefix
- Use \`unbreakable: true\` sparingly (causes layout issues)
- Table widths should sum to page width minus margins

✅ **Use These Patterns:**
- Fluent builder: \`doc.add(...).add(...).withHeader(...)\`
- Section builders: \`buildCoverPage()\`, \`buildSummary()\`, etc.
- Named styles from \`defaultStyles\` in styles.ts
- Edge functions for production PDFs
`;
};

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ABACUS_API_KEY = Deno.env.get("ABACUS_AI_API_KEY");
    
    if (!ABACUS_API_KEY) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "ABACUS_AI_API_KEY not configured" 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const body: AnalysisRequest = await req.json();
    const { analysisType = 'full', codeSnippet, specificQuestion, generateDeveloperPrompt = false } = body;

    // Build the analysis prompt
    let systemPrompt = `You are an expert PDF generation consultant specializing in pdfmake library (v0.3.x).
Your role is to analyze code implementations and provide actionable recommendations.

${PDFMAKE_DOCUMENTATION_CONTEXT}

${OUR_IMPLEMENTATION_SUMMARY}

${CURRENT_FILE_STRUCTURE}

When analyzing code:
1. Compare against pdfmake best practices
2. Identify potential performance issues
3. Suggest improvements with code examples
4. Reference official documentation patterns
5. Focus on production-ready solutions

Output format:
- Start with a brief assessment summary
- List specific recommendations with priority (High/Medium/Low)
- Include code examples where helpful
- Reference documentation URLs when applicable`;

    let userPrompt = '';
    
    switch (analysisType) {
      case 'generate-prompt':
        userPrompt = `Generate a comprehensive analysis of our pdfmake implementation that can be used as a developer prompt.

Focus on:
1. Current implementation strengths
2. Areas for improvement with specific code fixes
3. Best practices from pdfmake 0.3 documentation
4. Common patterns we should follow
5. Code examples for typical use cases

${specificQuestion ? `\nSpecific focus area: ${specificQuestion}` : ''}
${codeSnippet ? `\nCode to include in analysis:\n\`\`\`typescript\n${codeSnippet}\n\`\`\`` : ''}

Provide detailed, actionable recommendations with code examples.`;
        break;

      case 'best-practices':
        userPrompt = `Analyze our pdfmake implementation for adherence to best practices.
Focus on:
- Style organization and reuse
- Content structure patterns
- Table layout efficiency
- Error handling
${specificQuestion ? `\nSpecific concern: ${specificQuestion}` : ''}`;
        break;

      case 'performance':
        userPrompt = `Analyze our pdfmake implementation for performance optimizations.
Focus on:
- Image handling and compression
- Document structure efficiency
- Memory usage patterns
- Large document handling
${codeSnippet ? `\nCode to analyze:\n\`\`\`typescript\n${codeSnippet}\n\`\`\`` : ''}`;
        break;

      case 'structure':
        userPrompt = `Review our document definition structure.
Focus on:
- Content organization
- Section builders architecture
- Code reusability
- Maintainability
${codeSnippet ? `\nCode to analyze:\n\`\`\`typescript\n${codeSnippet}\n\`\`\`` : ''}`;
        break;

      case 'tables':
        userPrompt = `Analyze our table implementations in pdfmake.
Focus on:
- Table layout patterns
- Header row handling
- Cell styling consistency
- Width calculations
- Zebra striping and alternating colors
${codeSnippet ? `\nCode to analyze:\n\`\`\`typescript\n${codeSnippet}\n\`\`\`` : ''}`;
        break;

      case 'styling':
        userPrompt = `Review our styling approach in pdfmake.
Focus on:
- Color usage and consistency
- Font sizing hierarchy
- Margin and padding patterns
- Style inheritance
${codeSnippet ? `\nCode to analyze:\n\`\`\`typescript\n${codeSnippet}\n\`\`\`` : ''}`;
        break;

      default: // 'full'
        userPrompt = `Provide a comprehensive analysis of our pdfmake implementation.

Based on the pdfmake 0.3 documentation, analyze:
1. Overall architecture and patterns
2. Best practice adherence
3. Performance considerations
4. Code organization
5. Table and styling implementations
6. Image handling
7. Error handling and edge cases

${specificQuestion ? `\nSpecific question to address: ${specificQuestion}` : ''}
${codeSnippet ? `\nCode snippet to analyze:\n\`\`\`typescript\n${codeSnippet}\n\`\`\`` : ''}

Provide actionable recommendations with code examples.`;
    }

    // Call Abacus AI RouteLLM
    const abacusResponse = await fetch("https://routellm.abacus.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ABACUS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "route-llm",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!abacusResponse.ok) {
      const errorText = await abacusResponse.text();
      console.error("[analyze-pdfmake] Abacus AI error:", abacusResponse.status, errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Abacus AI error: ${abacusResponse.status}`,
          details: errorText
        }),
        { 
          status: abacusResponse.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const aiResult = await abacusResponse.json();
    const analysisContent = aiResult.choices?.[0]?.message?.content || "No analysis generated";

    // Parse recommendations from the response
    const recommendations: string[] = [];
    const codeExamples: string[] = [];
    const lines = analysisContent.split('\n');
    
    let inCodeBlock = false;
    let currentCodeBlock = '';
    
    for (const line of lines) {
      // Extract recommendations (lines starting with - or * or numbered)
      if ((line.match(/^[\-\*]\s+/) || line.match(/^\d+\.\s+/)) && !inCodeBlock) {
        const cleaned = line.replace(/^[\-\*]\s+/, '').replace(/^\d+\.\s+/, '').trim();
        if (cleaned.length > 10 && !cleaned.startsWith('```')) {
          recommendations.push(cleaned);
        }
      }
      
      // Track code blocks
      if (line.includes('```')) {
        if (inCodeBlock) {
          if (currentCodeBlock.trim().length > 20) {
            codeExamples.push(currentCodeBlock.trim());
          }
          currentCodeBlock = '';
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
      } else if (inCodeBlock) {
        currentCodeBlock += line + '\n';
      }
    }

    // Generate the developer prompt if requested
    let developerPrompt: string | undefined;
    if (generateDeveloperPrompt || analysisType === 'generate-prompt') {
      developerPrompt = generateDeveloperPromptTemplate(
        analysisContent,
        recommendations.slice(0, 15),
        codeExamples.slice(0, 8)
      );
    }

    const response: AnalysisResponse = {
      success: true,
      analysis: analysisContent,
      recommendations: recommendations.slice(0, 15), // Top 15 recommendations
      codeExamples: codeExamples.slice(0, 8), // Top 8 code examples
      references: [
        "https://pdfmake.github.io/docs/0.3/",
        "https://pdfmake.github.io/docs/0.3/document-definition-object/tables/",
        "https://pdfmake.github.io/docs/0.3/document-definition-object/styling/",
        "https://pdfmake.github.io/docs/0.3/document-definition-object/images/",
        "https://pdfmake.github.io/docs/0.3/document-definition-object/page/",
      ],
      developerPrompt,
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("[analyze-pdfmake] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});