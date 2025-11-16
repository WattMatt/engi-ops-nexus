import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Docxtemplater from "https://esm.sh/docxtemplater@3.67.4";
import PizZip from "https://esm.sh/pizzip@3.2.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PreviewRequest {
  blankTemplateUrl: string;
  templateType: string;
}

// Generate sample data based on template type
function generateSampleData(templateType: string): Record<string, any> {
  const commonData = {
    project_name: "Sample Project Name",
    project_number: "PRJ-2024-001",
    client_name: "ABC Corporation",
    document_date: new Date().toLocaleDateString('en-GB'),
    prepared_by: "John Doe, P.Eng",
    revision: "Rev 01",
  };

  switch (templateType) {
    case 'cost_report':
      return {
        ...commonData,
        report_number: "CR-001",
        total_budget: "R 1,250,000.00",
        total_spent: "R 850,000.00",
        variance: "R 400,000.00",
        categories: [
          { code: "CAT-01", description: "Labour", budget: "R 500,000", actual: "R 350,000" },
          { code: "CAT-02", description: "Materials", budget: "R 750,000", actual: "R 500,000" }
        ]
      };
    
    case 'cover_page':
      return {
        ...commonData,
        document_title: "Electrical Installation Report",
        document_subtitle: "Comprehensive Analysis & Documentation",
        company_name: "Sample Engineering Consultants",
        company_address: "123 Engineering Boulevard, Cape Town, 8001",
        company_phone: "+27 21 123 4567",
        company_email: "info@sampleengineering.co.za",
      };
    
    case 'specification':
      return {
        ...commonData,
        specification_number: "SPEC-2024-001",
        specification_title: "Electrical Installation Specifications",
        sections: [
          { number: "1.0", title: "General Requirements", content: "Sample content..." },
          { number: "2.0", title: "Technical Specifications", content: "Sample content..." }
        ]
      };
    
    case 'budget':
      return {
        ...commonData,
        budget_number: "BUD-2024-001",
        total_amount: "R 2,500,000.00",
        line_items: [
          { item: "Electrical Panels", quantity: "5", unit_price: "R 50,000", total: "R 250,000" },
          { item: "Cable Installation", quantity: "500m", unit_price: "R 150", total: "R 75,000" }
        ]
      };
    
    default:
      return commonData;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { blankTemplateUrl, templateType } = await req.json() as PreviewRequest;

    console.log('Generating preview for template type:', templateType);
    console.log('Blank template URL:', blankTemplateUrl);

    // Download the blank template
    const templateResponse = await fetch(blankTemplateUrl);
    if (!templateResponse.ok) {
      throw new Error('Failed to download template');
    }
    
    const templateArrayBuffer = await templateResponse.arrayBuffer();
    const templateBuffer = new Uint8Array(templateArrayBuffer);

    console.log('Template downloaded, populating with sample data...');

    // Generate sample data
    const sampleData = generateSampleData(templateType);
    console.log('Sample data generated:', Object.keys(sampleData));

    // Populate template with docxtemplater
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.render(sampleData);

    const populatedBuffer = doc.getZip().generate({
      type: "uint8array",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    console.log('Template populated, uploading...');

    // Upload populated template temporarily
    const timestamp = Date.now();
    const populatedPath = `temp/populated_preview_${timestamp}.docx`;
    
    const { error: uploadError } = await supabase.storage
      .from('document-templates')
      .upload(populatedPath, populatedBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('document-templates')
      .getPublicUrl(populatedPath);

    const populatedUrl = urlData.publicUrl;
    console.log('Populated template uploaded, converting to PDF...');

    // Convert populated template to PDF
    const convertResponse = await fetch(
      `${supabaseUrl}/functions/v1/convert-word-to-pdf`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          templateUrl: populatedUrl,
        }),
      }
    );

    if (!convertResponse.ok) {
      const errorText = await convertResponse.text();
      console.error('Conversion error:', errorText);
      throw new Error(`Failed to convert template to PDF: ${errorText}`);
    }

    const convertData = await convertResponse.json();
    const pdfUrl = convertData?.pdfUrl;
    
    if (!pdfUrl) {
      throw new Error('No PDF URL returned from conversion');
    }

    console.log('PDF preview generated:', pdfUrl);

    // Clean up temporary file
    await supabase.storage.from('document-templates').remove([populatedPath]);

    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl,
        message: 'Preview generated with sample data',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating preview:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
