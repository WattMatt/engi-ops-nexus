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

// Generate comprehensive sample data that covers most common placeholders
function generateComprehensiveSampleData(): Record<string, any> {
  return {
    // Project details
    project_name: "Sample Shopping Center Renovation",
    project_number: "PRJ-2024-001",
    project_description: "Electrical installation for retail development",
    
    // Client details
    client_name: "ABC Corporation (Pty) Ltd",
    client_address: "123 Business Park, Johannesburg, 2000",
    client_contact: "John Smith",
    client_email: "john.smith@abccorp.co.za",
    client_phone: "+27 11 123 4567",
    client_image: "[CLIENT LOGO]",
    
    // Document details
    document_title: "Electrical Installation Report",
    document_subtitle: "Load Schedule & Cost Analysis",
    document_date: new Date().toLocaleDateString('en-GB'),
    document_number: "DOC-2024-001",
    
    // Prepared by
    prepared_by: "John Doe, Pr. Eng",
    prepared_by_contact: "john.doe@engineering.co.za",
    company_name: "Watson Mattheus Consulting Engineers",
    company_address: "141 Witch Hazel Ave, Highveld Techno Park, Building 1A",
    company_phone: "(012) 665 3487",
    company_email: "info@wmeng.co.za",
    
    // Report details
    report_number: "CR-001",
    revision: "Rev 01",
    date: new Date().toLocaleDateString('en-GB'),
    
    // Cost report specific
    total_budget: "R 1,250,000.00",
    total_spent: "R 850,000.00",
    variance: "R 400,000.00",
    contingency: "R 125,000.00",
    
    // Dates
    practical_completion_date: "31 December 2024",
    site_handover_date: "15 January 2025",
    
    // Contractors
    electrical_contractor: "ABC Electrical Contractors",
    cctv_contractor: "SecureVision Systems",
    earthing_contractor: "Earth Pro Solutions",
    standby_plants_contractor: "Power Backup SA",
    
    // Categories (for loops)
    categories: [
      { code: "CAT-01", description: "Labour Costs", budget: "R 500,000", actual: "R 350,000", variance: "R 150,000" },
      { code: "CAT-02", description: "Materials", budget: "R 750,000", actual: "R 500,000", variance: "R 250,000" }
    ],
    
    // Line items (for loops)
    line_items: [
      { item: "Distribution Boards", quantity: "5", unit_price: "R 50,000", total: "R 250,000" },
      { item: "Cable Installation", quantity: "500m", unit_price: "R 150", total: "R 75,000" }
    ],
    
    // Specification sections
    sections: [
      { number: "1.0", title: "General Requirements", content: "Sample content for general requirements..." },
      { number: "2.0", title: "Technical Specifications", content: "Sample content for technical specs..." }
    ]
  };
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

    // Generate comprehensive sample data
    const sampleData = generateComprehensiveSampleData();
    console.log('Sample data generated with keys:', Object.keys(sampleData));

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
