import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import PizZip from "https://esm.sh/pizzip@3.1.6";
import Docxtemplater from "https://esm.sh/docxtemplater@3.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { blankTemplateUrl, placeholders } = await req.json();

    console.log('Inserting placeholders:', { blankTemplateUrl, placeholderCount: placeholders.length });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download the blank template
    const templateResponse = await fetch(blankTemplateUrl);
    const templateBuffer = await templateResponse.arrayBuffer();

    // Load the template with PizZip
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Create a data object with all placeholders
    const placeholderData: Record<string, string> = {};
    placeholders.forEach((p: any) => {
      // Remove curly braces from placeholder name if present
      const cleanName = p.placeholder.replace(/[{}]/g, '');
      placeholderData[cleanName] = p.exampleValue || `[${cleanName}]`;
    });

    console.log('Placeholder data:', placeholderData);

    // Render the document with placeholders
    doc.render(placeholderData);

    // Generate the output
    const outputBuffer = doc.getZip().generate({
      type: "arraybuffer",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    // Upload the modified template
    const fileName = `template-with-placeholders-${Date.now()}.docx`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('document_templates')
      .upload(fileName, outputBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('document_templates')
      .getPublicUrl(fileName);

    const docxUrl = urlData.publicUrl;

    console.log('Uploaded modified template:', docxUrl);

    // Convert to PDF using the existing function
    const { data: pdfData, error: pdfError } = await supabase.functions.invoke('convert-word-to-pdf', {
      body: { 
        wordFileUrl: docxUrl,
        outputPath: `template-with-placeholders-${Date.now()}.pdf`
      }
    });

    if (pdfError) {
      console.error('PDF conversion error:', pdfError);
      throw pdfError;
    }

    console.log('PDF generated:', pdfData.pdfUrl);

    return new Response(
      JSON.stringify({ 
        docxUrl,
        pdfUrl: pdfData.pdfUrl 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in insert-template-placeholders:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
