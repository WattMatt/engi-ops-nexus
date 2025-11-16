import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { costReportId } = await req.json();
    
    if (!costReportId) {
      throw new Error('Cost report ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const cloudConvertApiKey = Deno.env.get('CLOUDCONVERT_API_KEY');
    
    if (!cloudConvertApiKey) {
      throw new Error('CloudConvert API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching cost report data...');
    
    // Fetch cost report with all related data
    const { data: costReport, error: reportError } = await supabase
      .from('cost_reports')
      .select(`
        *,
        cost_categories (
          *,
          cost_line_items (*)
        ),
        cost_variations (*)
      `)
      .eq('id', costReportId)
      .single();

    if (reportError) throw reportError;
    if (!costReport) throw new Error('Cost report not found');

    console.log('Fetching default template...');
    
    // Get default cost report template
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('template_type', 'cost_report')
      .eq('is_default_cover', true)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      throw new Error('No default cost report template found. Please upload and set a default template in Settings → PDF Templates.');
    }

    console.log('Downloading template:', template.file_name);
    
    // Download the template file
    const templateResponse = await fetch(template.file_url);
    if (!templateResponse.ok) {
      throw new Error('Failed to download template');
    }
    
    const templateBuffer = await templateResponse.arrayBuffer();

    console.log('Processing template and replacing placeholders...');
    
    // Calculate totals
    const totalOriginalBudget = costReport.cost_categories?.reduce((sum: number, cat: any) => 
      sum + (cat.cost_line_items?.reduce((s: number, item: any) => s + Number(item.original_budget || 0), 0) || 0), 0) || 0;
    
    const totalAnticipatedFinal = costReport.cost_categories?.reduce((sum: number, cat: any) => 
      sum + (cat.cost_line_items?.reduce((s: number, item: any) => s + Number(item.anticipated_final || 0), 0) || 0), 0) || 0;
    
    const totalVariations = costReport.cost_variations?.reduce((sum: number, v: any) => 
      sum + (v.is_credit ? -Number(v.amount || 0) : Number(v.amount || 0)), 0) || 0;

    // Prepare replacement data
    const replacements: Record<string, string> = {
      '{project_name}': costReport.project_name || '',
      '{project_number}': costReport.project_number || '',
      '{client_name}': costReport.client_name || '',
      '{report_number}': String(costReport.report_number || ''),
      '{report_date}': costReport.report_date || '',
      '{practical_completion_date}': costReport.practical_completion_date || '',
      '{site_handover_date}': costReport.site_handover_date || '',
      '{electrical_contractor}': costReport.electrical_contractor || '',
      '{earthing_contractor}': costReport.earthing_contractor || '',
      '{cctv_contractor}': costReport.cctv_contractor || '',
      '{standby_plants_contractor}': costReport.standby_plants_contractor || '',
      '{total_original_budget}': `R ${totalOriginalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      '{total_anticipated_final}': `R ${totalAnticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      '{total_variations}': `R ${totalVariations.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      '{budget_variance}': `R ${(totalAnticipatedFinal - totalOriginalBudget).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      '{date}': new Date().toLocaleDateString('en-ZA'),
      '{report_title}': `Cost Report ${costReport.report_number}`,
    };

    // Fetch company settings for additional data
    const { data: companySettings } = await supabase
      .from('company_settings')
      .select('*')
      .single();

    if (companySettings) {
      replacements['{company_name}'] = companySettings.company_name || '';
      replacements['{company_tagline}'] = companySettings.company_tagline || '';
    }

    // Replace placeholders in the .docx file
    const zip = await JSZip.loadAsync(templateBuffer);
    
    // Process document.xml where the main content lives
    const documentXml = await zip.file('word/document.xml')?.async('string');
    if (!documentXml) {
      throw new Error('Invalid Word template: document.xml not found');
    }

    let processedXml = documentXml;
    for (const [placeholder, value] of Object.entries(replacements)) {
      // Replace all occurrences, handling potential XML splitting of placeholders
      processedXml = processedXml.replace(new RegExp(escapeRegex(placeholder), 'g'), value);
    }

    // Update the document.xml in the zip
    zip.file('word/document.xml', processedXml);

    // Generate the modified .docx as arraybuffer
    const modifiedDocxBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    console.log('Converting to PDF via CloudConvert...');
    
    // Step 1: Create CloudConvert job
    const createJobResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cloudConvertApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: {
          'upload-my-file': {
            operation: 'import/upload'
          },
          'convert-my-file': {
            operation: 'convert',
            input: 'upload-my-file',
            output_format: 'pdf',
            engine: 'office'
          },
          'export-my-file': {
            operation: 'export/url',
            input: 'convert-my-file'
          }
        }
      })
    });

    if (!createJobResponse.ok) {
      const errorText = await createJobResponse.text();
      console.error('CloudConvert job creation failed:', errorText);
      throw new Error('Failed to create CloudConvert job');
    }

    const jobData = await createJobResponse.json();
    console.log('CloudConvert job created:', jobData.data.id);

    const uploadTask = jobData.data.tasks.find((t: any) => t.name === 'upload-my-file');
    
    // Step 2: Upload the file
    const uploadForm = new FormData();
    uploadForm.append('file', new Blob([modifiedDocxBuffer]), 'document.docx');

    const uploadResponse = await fetch(uploadTask.result.form.url, {
      method: 'POST',
      body: uploadForm,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('File upload failed:', errorText);
      throw new Error('Failed to upload file to CloudConvert');
    }

    console.log('File uploaded, waiting for conversion...');

    // Step 3: Wait for job completion and get the result
    let jobStatus = jobData.data;
    let attempts = 0;
    const maxAttempts = 30;

    while (jobStatus.status !== 'finished' && jobStatus.status !== 'error' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobData.data.id}`, {
        headers: {
          'Authorization': `Bearer ${cloudConvertApiKey}`,
        }
      });

      if (!statusResponse.ok) {
        throw new Error('Failed to check job status');
      }

      jobStatus = (await statusResponse.json()).data;
      attempts++;
      console.log('Job status:', jobStatus.status);
    }

    if (jobStatus.status === 'error') {
      throw new Error('CloudConvert job failed');
    }

    if (jobStatus.status !== 'finished') {
      throw new Error('CloudConvert job timeout');
    }

    // Get the export task to download the PDF
    const exportTask = jobStatus.tasks.find((t: any) => t.name === 'export-my-file');
    const pdfUrl = exportTask.result.files[0].url;

    console.log('Downloading converted PDF...');
    
    // Download the PDF
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error('Failed to download converted PDF');
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();

    // Upload to Supabase storage
    const fileName = `cost-report-${costReportId}-${Date.now()}.pdf`;
    const filePath = `${fileName}`;

    console.log('Saving PDF to storage...');
    
    const { error: uploadError } = await supabase.storage
      .from('cost-report-pdfs')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('cost-report-pdfs')
      .getPublicUrl(filePath);

    // Save PDF record to database
    const { error: dbError } = await supabase
      .from('cost_report_pdfs')
      .insert({
        cost_report_id: costReportId,
        project_id: costReport.project_id,
        file_name: fileName,
        file_path: filePath,
        file_size: pdfBuffer.byteLength,
      });

    if (dbError) {
      console.error('Failed to save PDF record:', dbError);
    }

    console.log('PDF generated successfully:', publicUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: publicUrl,
        fileName: fileName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating cost report PDF:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
