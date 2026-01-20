import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PDFShiftRequest {
  html: string;
  filename?: string;
  storagePath?: string;
  options?: {
    landscape?: boolean;
    format?: 'A4' | 'Letter' | 'Legal' | 'A3' | 'A5';
    margin?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
    printBackground?: boolean;
    displayHeaderFooter?: boolean;
    headerTemplate?: string;
    footerTemplate?: string;
    scale?: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[PDFShift] Starting PDF generation...');
    
    const apiKey = Deno.env.get('PDFSHIFT_API_KEY');
    if (!apiKey) {
      console.error('[PDFShift] API key not configured');
      return new Response(
        JSON.stringify({ error: 'PDFShift API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { html, filename, storagePath, options = {} }: PDFShiftRequest = await req.json();

    if (!html) {
      return new Response(
        JSON.stringify({ error: 'HTML content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[PDFShift] Sending request to PDFShift API...');

    // Build PDFShift request
    const pdfShiftPayload: Record<string, unknown> = {
      source: html,
      sandbox: false, // Set to true for testing
    };

    // Apply options
    if (options.landscape) pdfShiftPayload.landscape = true;
    if (options.format) pdfShiftPayload.format = options.format;
    if (options.printBackground !== false) pdfShiftPayload.printBackground = true;
    if (options.scale) pdfShiftPayload.scale = options.scale;

    // Margins
    if (options.margin) {
      pdfShiftPayload.margin = {
        top: options.margin.top || '20mm',
        right: options.margin.right || '15mm',
        bottom: options.margin.bottom || '20mm',
        left: options.margin.left || '15mm',
      };
    }

    // Header/Footer
    if (options.displayHeaderFooter) {
      pdfShiftPayload.displayHeaderFooter = true;
      if (options.headerTemplate) pdfShiftPayload.headerTemplate = options.headerTemplate;
      if (options.footerTemplate) pdfShiftPayload.footerTemplate = options.footerTemplate;
    }

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
      console.error('[PDFShift] API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `PDFShift API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pdfBuffer = await response.arrayBuffer();
    console.log('[PDFShift] PDF generated:', pdfBuffer.byteLength, 'bytes');

    // If storagePath provided, upload to Supabase Storage
    if (storagePath) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const finalFilename = filename || `pdfshift-${Date.now()}.pdf`;
      const fullPath = `${storagePath}/${finalFilename}`;

      console.log('[PDFShift] Uploading to storage:', fullPath);

      const { error: uploadError } = await supabase.storage
        .from('cost-report-pdfs')
        .upload(fullPath, new Uint8Array(pdfBuffer), {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        console.error('[PDFShift] Upload error:', uploadError);
        return new Response(
          JSON.stringify({ error: `Storage upload failed: ${uploadError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[PDFShift] Upload complete!');

      return new Response(
        JSON.stringify({
          success: true,
          filePath: fullPath,
          fileName: finalFilename,
          fileSize: pdfBuffer.byteLength,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return PDF directly as base64
    const base64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
    
    return new Response(
      JSON.stringify({
        success: true,
        pdf: base64,
        fileSize: pdfBuffer.byteLength,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'PDF generation failed';
    console.error('[PDFShift] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
