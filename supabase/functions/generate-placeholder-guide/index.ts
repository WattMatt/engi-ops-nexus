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

    const html = generateInstructionHTML(placeholders, templateType);
    const htmlBlob = new TextEncoder().encode(html);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const fileName = `placeholder-guide-${Date.now()}.html`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('document-templates')
      .upload(`guides/${fileName}`, htmlBlob, {
        contentType: 'text/html',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('document-templates')
      .getPublicUrl(`guides/${fileName}`);

    console.log('HTML guide uploaded:', publicUrl);

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

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function generateInstructionHTML(placeholders: any[], templateType: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Template Placeholder Guide</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #ffffff;
      padding: 40px 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    @media print { body { padding: 20px; } }
    h1 {
      color: #1e40af;
      border-bottom: 4px solid #3b82f6;
      padding-bottom: 16px;
      margin-bottom: 24px;
      font-size: 32px;
    }
    h2 {
      color: #1e3a8a;
      margin-top: 40px;
      margin-bottom: 20px;
      font-size: 24px;
    }
    .intro {
      background: #eff6ff;
      padding: 24px;
      border-left: 6px solid #3b82f6;
      margin: 24px 0;
      border-radius: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    th {
      background: #3b82f6;
      color: white;
      padding: 16px;
      text-align: left;
      font-weight: 600;
    }
    td {
      border: 1px solid #e5e7eb;
      padding: 16px;
    }
    tr:nth-child(even) { background: #f9fafb; }
    tr:hover { background: #f3f4f6; }
    .placeholder-name {
      font-family: 'Courier New', monospace;
      background: #fef3c7;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: 600;
      color: #92400e;
      border: 1px solid #fbbf24;
    }
    .confidence-high { color: #059669; font-weight: 700; }
    .steps {
      background: #f9fafb;
      padding: 24px;
      border-radius: 12px;
      margin: 24px 0;
    }
    .step {
      margin: 20px 0;
      padding-left: 40px;
      position: relative;
    }
    .step-number {
      position: absolute;
      left: 0;
      top: 0;
      background: #3b82f6;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
    }
    .tips {
      background: #fef3c7;
      border: 2px solid #fbbf24;
      padding: 20px;
      border-radius: 8px;
      margin: 24px 0;
    }
  </style>
</head>
<body>
  <h1>📋 Template Placeholder Guide</h1>
  
  <div class="intro">
    <h3>About This Guide</h3>
    <p><strong>Template Type:</strong> ${templateType || 'Document Template'}</p>
    <p><strong>Total Placeholders:</strong> ${placeholders.length}</p>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  </div>

  <h2>🎯 Quick Start Instructions</h2>
  <div class="steps">
    <div class="step">
      <div class="step-number">1</div>
      <strong>Open your blank template in Microsoft Word</strong>
    </div>
    <div class="step">
      <div class="step-number">2</div>
      <strong>For each placeholder below, find its location and type the exact placeholder name (with curly braces)</strong>
    </div>
    <div class="step">
      <div class="step-number">3</div>
      <strong>Save and test your template</strong>
    </div>
  </div>

  <h2>📊 Placeholder Reference</h2>
  <table>
    <thead>
      <tr>
        <th>Placeholder</th>
        <th>Example</th>
        <th>Position</th>
        <th>Description</th>
        <th>Conf.</th>
      </tr>
    </thead>
    <tbody>
      ${placeholders.map(p => `
        <tr>
          <td><span class="placeholder-name">${escapeHtml(p.placeholder)}</span></td>
          <td>${escapeHtml(p.exampleValue)}</td>
          <td>${escapeHtml(p.position)}</td>
          <td>${escapeHtml(p.description)}</td>
          <td class="confidence-high">${p.confidence}%</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="tips">
    <h3>💡 Tips</h3>
    <ul>
      <li>Copy-paste placeholder names to avoid typos</li>
      <li>Keep the curly braces</li>
      <li>Match exact spelling and capitalization</li>
      <li>Test with sample data before production use</li>
    </ul>
  </div>

</body>
</html>`;
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
