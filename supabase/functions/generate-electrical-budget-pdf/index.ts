import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildPDFShiftPayload, generateStandardCoverPage, getStandardCoverPageCSS, getStandardCSS } from "../_shared/pdfStandards.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ElectricalBudgetPdfRequest {
  budgetId: string;
  html: string;
  filename?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[ElectricalBudgetPDF] Starting PDF generation...');
    
    const apiKey = Deno.env.get('PDFSHIFT_API_KEY');
    if (!apiKey) {
      console.error('[ElectricalBudgetPDF] PDFShift API key not configured');
      return new Response(
        JSON.stringify({ error: 'PDFShift API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { budgetId, html, filename }: ElectricalBudgetPdfRequest = await req.json();

    if (!html) {
      return new Response(
        JSON.stringify({ error: 'HTML content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!budgetId) {
      return new Response(
        JSON.stringify({ error: 'Budget ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ElectricalBudgetPDF] Sending request to PDFShift API...');
    console.log('[ElectricalBudgetPDF] HTML length:', html.length, 'characters');

    // Build PDFShift request using shared standards
    const pdfShiftPayload = buildPDFShiftPayload(html, {
      reportTitle: 'Electrical Budget',
      projectName: filename || 'Budget',
    });

    // Call PDFShift API
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
      console.error('[ElectricalBudgetPDF] PDFShift API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `PDFShift API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pdfBuffer = await response.arrayBuffer();
    console.log('[ElectricalBudgetPDF] PDF generated:', pdfBuffer.byteLength, 'bytes');

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const finalFilename = filename || `electrical-budget-${budgetId}-${Date.now()}.pdf`;
    const storagePath = `electrical-budgets/${budgetId}`;
    const fullPath = `${storagePath}/${finalFilename}`;

    console.log('[ElectricalBudgetPDF] Uploading to storage:', fullPath);

    // Ensure the bucket exists
    const { error: bucketError } = await supabase.storage.getBucket('budget-reports');
    if (bucketError && bucketError.message.includes('not found')) {
      console.log('[ElectricalBudgetPDF] Creating budget-reports bucket...');
      await supabase.storage.createBucket('budget-reports', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
      });
    }

    const { error: uploadError } = await supabase.storage
      .from('budget-reports')
      .upload(fullPath, new Uint8Array(pdfBuffer), {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('[ElectricalBudgetPDF] Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: `Storage upload failed: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('budget-reports')
      .getPublicUrl(fullPath);

    console.log('[ElectricalBudgetPDF] Upload complete!');

    // Use Deno's built-in base64 encoding to avoid stack overflow
    const base64 = base64Encode(pdfBuffer);

    return new Response(
      JSON.stringify({
        success: true,
        filePath: fullPath,
        fileName: finalFilename,
        fileSize: pdfBuffer.byteLength,
        publicUrl: urlData.publicUrl,
        pdf: base64,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'PDF generation failed';
    console.error('[ElectricalBudgetPDF] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
