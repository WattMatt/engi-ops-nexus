/**
 * Abacus AI Analysis Edge Function for PDFMake Implementation
 * 
 * Uses Abacus AI RouteLLM to analyze our pdfmake code and provide
 * best-practice recommendations based on pdfmake documentation.
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
  analysisType: 'full' | 'best-practices' | 'performance' | 'structure' | 'tables' | 'styling';
  codeSnippet?: string;
  specificQuestion?: string;
}

interface AnalysisResponse {
  success: boolean;
  analysis: string;
  recommendations: string[];
  codeExamples?: string[];
  references?: string[];
  error?: string;
}

// ============================================================================
// PDFMAKE CONTEXT
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

## Files Involved:
1. supabase/functions/generate-roadmap-pdf/index.ts - Server-side edge function
2. src/utils/pdfmake/roadmapReviewBuilder.ts - Client-side builder
3. src/utils/pdfmake/documentBuilder.ts - Core PDFDocumentBuilder class
4. src/utils/pdfmake/styles.ts - Shared styles and colors

## Key Patterns We Use:
- PDFDocumentBuilder fluent API for document construction
- Separate section builders (buildCoverPage, buildExecutiveSummary, etc.)
- PDF_COLORS_HEX object for consistent colors
- Custom table layouts with zebra striping
- Chart embedding via base64 captured images
- Dynamic content based on export options

## Current Architecture:
1. Client captures chart images as base64
2. Data is sent to edge function
3. Edge function builds PDF document definition
4. pdfmake generates buffer
5. Base64 PDF returned to client
6. Client converts to blob for download

## Known Issues to Address:
- Ensuring consistent data field usage (overdueCount vs overdueItems)
- Image compression for large chart payloads
- Table layout consistency between client and server
`;

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
    const { analysisType = 'full', codeSnippet, specificQuestion } = body;

    // Build the analysis prompt
    let systemPrompt = `You are an expert PDF generation consultant specializing in pdfmake library (v0.3.x).
Your role is to analyze code implementations and provide actionable recommendations.

${PDFMAKE_DOCUMENTATION_CONTEXT}

${OUR_IMPLEMENTATION_SUMMARY}

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
      // Extract recommendations (lines starting with - or *)
      if (line.match(/^[\-\*]\s+/) && !inCodeBlock) {
        recommendations.push(line.replace(/^[\-\*]\s+/, '').trim());
      }
      
      // Track code blocks
      if (line.includes('```')) {
        if (inCodeBlock) {
          codeExamples.push(currentCodeBlock.trim());
          currentCodeBlock = '';
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
      } else if (inCodeBlock) {
        currentCodeBlock += line + '\n';
      }
    }

    const response: AnalysisResponse = {
      success: true,
      analysis: analysisContent,
      recommendations: recommendations.slice(0, 10), // Top 10 recommendations
      codeExamples: codeExamples.slice(0, 5), // Top 5 code examples
      references: [
        "https://pdfmake.github.io/docs/0.3/",
        "https://pdfmake.github.io/docs/0.3/document-definition-object/tables/",
        "https://pdfmake.github.io/docs/0.3/document-definition-object/styling/",
        "https://pdfmake.github.io/docs/0.3/document-definition-object/images/",
      ],
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
