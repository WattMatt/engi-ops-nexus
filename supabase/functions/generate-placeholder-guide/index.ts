import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { placeholders, templateType } = await req.json();
    
    console.log('Generating placeholder guide:', { placeholderCount: placeholders.length, templateType });

    // Generate comprehensive instruction document as HTML
    const html = generateInstructionHTML(placeholders, templateType);
    
    // Convert to PDF using CloudConvert
    const CLOUDCONVERT_API_KEY = Deno.env.get('CLOUDCONVERT_API_KEY');
    if (!CLOUDCONVERT_API_KEY) {
      throw new Error('CloudConvert API key not configured');
    }

    // Create conversion job
    const createJobResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: {
          'import-html': {
            operation: 'import/raw',
            data: html,
          },
          'convert-to-pdf': {
            operation: 'convert',
            input: 'import-html',
            output_format: 'pdf',
          },
          'export-pdf': {
            operation: 'export/url',
            input: 'convert-to-pdf',
          },
        },
      }),
    });

    if (!createJobResponse.ok) {
      const errorText = await createJobResponse.text();
      console.error('CloudConvert job creation failed:', errorText);
      throw new Error('Failed to create PDF conversion job');
    }

    const jobData = await createJobResponse.json();
    const jobId = jobData.data.id;
    console.log('CloudConvert job created:', jobId);

    // Poll for job completion
    let attempts = 0;
    const maxAttempts = 30;
    let pdfUrl = null;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}` },
      });

      const statusData = await statusResponse.json();
      const status = statusData.data.status;
      
      console.log(`Job status (attempt ${attempts + 1}):`, status);

      if (status === 'finished') {
        const exportTask = statusData.data.tasks.find((t: any) => t.name === 'export-pdf');
        if (exportTask?.result?.files?.[0]?.url) {
          pdfUrl = exportTask.result.files[0].url;
          break;
        }
      } else if (status === 'error') {
        throw new Error('PDF conversion failed');
      }
      
      attempts++;
    }

    if (!pdfUrl) {
      throw new Error('PDF generation timed out');
    }

    // Download the PDF
    const pdfResponse = await fetch(pdfUrl);
    const pdfBlob = await pdfResponse.arrayBuffer();
    console.log('PDF downloaded, size:', pdfBlob.byteLength);

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const fileName = `placeholder-guide-${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('document-templates')
      .upload(`guides/${fileName}`, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('document-templates')
      .getPublicUrl(`guides/${fileName}`);

    console.log('PDF guide uploaded:', publicUrl);

    // Generate Excel data
    const excelData = generateExcelData(placeholders);

    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl: publicUrl,
        excelData,
        placeholders,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating placeholder guide:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateInstructionHTML(placeholders: any[], templateType: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      color: #333;
    }
    h1 {
      color: #2563eb;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 10px;
    }
    h2 {
      color: #1e40af;
      margin-top: 30px;
    }
    .intro {
      background: #f0f9ff;
      padding: 20px;
      border-left: 4px solid #2563eb;
      margin: 20px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th {
      background: #2563eb;
      color: white;
      padding: 12px;
      text-align: left;
    }
    td {
      border: 1px solid #ddd;
      padding: 10px;
    }
    tr:nth-child(even) {
      background: #f9fafb;
    }
    .placeholder-name {
      font-family: monospace;
      background: #fef3c7;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: bold;
    }
    .confidence-high {
      color: #059669;
      font-weight: bold;
    }
    .confidence-medium {
      color: #d97706;
      font-weight: bold;
    }
    .steps {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .step {
      margin: 15px 0;
      padding-left: 30px;
    }
    .step-number {
      display: inline-block;
      background: #2563eb;
      color: white;
      width: 25px;
      height: 25px;
      border-radius: 50%;
      text-align: center;
      line-height: 25px;
      margin-left: -30px;
      margin-right: 5px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <h1>Template Placeholder Guide</h1>
  
  <div class="intro">
    <h3>📋 About This Guide</h3>
    <p>This document provides step-by-step instructions for adding placeholders to your blank template.</p>
    <p><strong>Template Type:</strong> ${templateType || 'Document Template'}</p>
    <p><strong>Total Placeholders:</strong> ${placeholders.length}</p>
  </div>

  <h2>🎯 Quick Start Instructions</h2>
  <div class="steps">
    <div class="step">
      <span class="step-number">1</span>
      <strong>Open your blank template in Microsoft Word</strong>
    </div>
    <div class="step">
      <span class="step-number">2</span>
      <strong>For each placeholder in the table below:</strong>
      <ul>
        <li>Find the location described in the "Position Context" column</li>
        <li>Delete the example value (if present)</li>
        <li>Type the exact placeholder name from the "Placeholder" column (including the curly braces)</li>
      </ul>
    </div>
    <div class="step">
      <span class="step-number">3</span>
      <strong>Save your template</strong> - It's now ready to use with dynamic data
    </div>
    <div class="step">
      <span class="step-number">4</span>
      <strong>Test it</strong> - Upload your template and generate a report to verify all placeholders work
    </div>
  </div>

  <h2>📊 Placeholder Reference Table</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 20%;">Placeholder</th>
        <th style="width: 25%;">Example Value</th>
        <th style="width: 30%;">Position Context</th>
        <th style="width: 15%;">Description</th>
        <th style="width: 10%;">Confidence</th>
      </tr>
    </thead>
    <tbody>
      ${placeholders.map(p => `
        <tr>
          <td><span class="placeholder-name">${p.placeholder}</span></td>
          <td>${p.exampleValue}</td>
          <td><em>${p.position}</em></td>
          <td>${p.description}</td>
          <td class="${p.confidence >= 90 ? 'confidence-high' : 'confidence-medium'}">${p.confidence}%</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>💡 Tips for Success</h2>
  <div class="intro">
    <ul>
      <li><strong>Copy-paste placeholder names</strong> from this document to avoid typos</li>
      <li><strong>Keep the curly braces</strong> - they're required for the placeholder to work</li>
      <li><strong>Match the exact spelling and capitalization</strong> - placeholders are case-sensitive</li>
      <li><strong>Don't add extra spaces</strong> inside the curly braces</li>
      <li><strong>Test with sample data</strong> before using in production</li>
    </ul>
  </div>

  <h2>🔍 What Each Placeholder Represents</h2>
  ${placeholders.map((p, i) => `
    <div style="margin: 15px 0; padding: 10px; background: ${i % 2 === 0 ? '#f9fafb' : 'white'};">
      <strong>${i + 1}. <span class="placeholder-name">${p.placeholder}</span></strong>
      <p style="margin: 5px 0;">${p.description}</p>
      <p style="margin: 5px 0; color: #6b7280;"><em>Example: "${p.exampleValue}"</em></p>
    </div>
  `).join('')}

</body>
</html>
  `;
}

function generateExcelData(placeholders: any[]) {
  return {
    headers: ['Placeholder', 'Example Value', 'Position Context', 'Description', 'Confidence'],
    rows: placeholders.map(p => [
      p.placeholder,
      p.exampleValue,
      p.position,
      p.description,
      `${p.confidence}%`,
    ]),
  };
}
