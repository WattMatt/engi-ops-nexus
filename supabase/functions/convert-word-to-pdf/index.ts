import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import Docxtemplater from 'https://esm.sh/docxtemplater@3.50.0';
import PizZip from 'https://esm.sh/pizzip@3.1.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConversionRequest {
  templateUrl: string;
  templateId?: string;
  placeholderData?: Record<string, string>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const cloudConvertApiKey = Deno.env.get('CLOUDCONVERT_API_KEY');

    if (!cloudConvertApiKey) {
      throw new Error('CLOUDCONVERT_API_KEY environment variable is not set. Please add it in the Lovable Cloud secrets.');
    }

    console.log('CloudConvert API key found, length:', cloudConvertApiKey.length);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { templateUrl, templateId, placeholderData }: ConversionRequest = await req.json();

    // Extract fileName from URL and sanitize it (remove spaces and special chars)
    const urlParts = templateUrl.split('/');
    const originalFileName = decodeURIComponent(urlParts[urlParts.length - 1]);
    const fileName = originalFileName.replace(/\s+/g, '_'); // Replace spaces with underscores

    console.log('Starting Word to PDF conversion:', { 
      originalFileName, 
      sanitizedFileName: fileName, 
      templateId, 
      hasPlaceholderData: !!placeholderData 
    });
    console.log('Template URL:', templateUrl);
    console.log('Placeholder data:', placeholderData);

    let finalTemplateUrl = templateUrl;
    let tempFilePath: string | null = null;

    // If placeholderData is provided, use docxtemplater to fill the template
    if (placeholderData && Object.keys(placeholderData).length > 0) {
      console.log('Processing template with docxtemplater');
      
      // Step 1: Download the original template
      const templateResponse = await fetch(templateUrl);
      if (!templateResponse.ok) {
        throw new Error('Failed to download template');
      }
      const templateArrayBuffer = await templateResponse.arrayBuffer();
      
      // Step 2: Process with docxtemplater
      const zip = new PizZip(templateArrayBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: {
          start: '{',
          end: '}'
        }
      });
      
      // Set the data for replacement
      console.log('Setting placeholder data:', JSON.stringify(placeholderData, null, 2));
      doc.setData(placeholderData);
      
      try {
        doc.render();
        console.log('Template rendered successfully');
      } catch (error) {
        console.error('Error rendering template:', error);
        console.error('Available placeholders in document:', doc.getFullText());
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Template rendering failed: ${errorMessage}. Check that your Word template contains the correct placeholders: ${Object.keys(placeholderData).map(k => `{${k}}`).join(', ')}`);
      }
      
      // Step 3: Generate the filled document
      const filledDocBuffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });
      
      // Step 4: Upload the filled document to temporary storage with sanitized filename
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/\s+/g, '_');
      tempFilePath = `temp/${timestamp}-filled-${sanitizedFileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('document-templates')
        .upload(tempFilePath, filledDocBuffer, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: false,
        });
      
      if (uploadError) {
        console.error('Failed to upload filled template:', uploadError);
        throw new Error(`Failed to upload filled template: ${uploadError.message}`);
      }
      
      // Get public URL of the filled template
      const { data: { publicUrl } } = supabase.storage
        .from('document-templates')
        .getPublicUrl(tempFilePath);
      
      // Use the URL as-is (it's already properly encoded by Supabase)
      finalTemplateUrl = publicUrl;
      console.log('Filled template uploaded to:', finalTemplateUrl);
    }

    // Build the CloudConvert job tasks using the final template URL
    const tasks: any = {
      'import-file': {
        operation: 'import/url',
        url: finalTemplateUrl,
        filename: fileName,
      },
      'convert-file': {
        operation: 'convert',
        input: 'import-file',
        output_format: 'pdf',
        engine: 'office',
        input_format: fileName.endsWith('.docx') || fileName.endsWith('.dotx') ? 'docx' : 'doc',
      },
      'export-file': {
        operation: 'export/url',
        input: 'convert-file',
      },
    };

    // Step 1: Create a conversion job with CloudConvert
    const createJobResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cloudConvertApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tasks }),
    });

    if (!createJobResponse.ok) {
      const errorText = await createJobResponse.text();
      console.error('CloudConvert job creation failed:', errorText);
      console.error('Response status:', createJobResponse.status);
      console.error('API key (first 10 chars):', cloudConvertApiKey.substring(0, 10) + '...');
      throw new Error(`Failed to create conversion job: ${errorText}`);
    }

    const jobData = await createJobResponse.json();
    const jobId = jobData.data.id;
    
    console.log('CloudConvert job created:', jobId);

    console.log('Conversion job created:', jobId);

    // Step 2: Wait for the job to complete (poll status)
    let jobComplete = false;
    let exportTask = null;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout

    while (!jobComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      attempts++;

      const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${cloudConvertApiKey}`,
        },
      });

      if (!statusResponse.ok) {
        throw new Error('Failed to check job status');
      }

      const statusData = await statusResponse.json();
      const status = statusData.data.status;

      console.log(`Job status (attempt ${attempts}):`, status);

      if (status === 'finished') {
        jobComplete = true;
        // Find the export task
        exportTask = statusData.data.tasks.find((task: any) => task.name === 'export-file');
      } else if (status === 'error') {
        // Log detailed error information
        console.error('CloudConvert job failed. Full job data:', JSON.stringify(statusData, null, 2));
        const failedTask = statusData.data.tasks.find((task: any) => task.status === 'error');
        if (failedTask) {
          console.error('Failed task:', JSON.stringify(failedTask, null, 2));
          throw new Error(`Conversion failed: ${failedTask.message || 'Unknown error'}`);
        }
        throw new Error('Conversion job failed');
      }
    }

    if (!jobComplete || !exportTask) {
      throw new Error('Conversion job timed out or failed to complete');
    }

    // Step 3: Download the converted PDF
    const pdfUrl = exportTask.result.files[0].url;
    const pdfResponse = await fetch(pdfUrl);

    if (!pdfResponse.ok) {
      throw new Error('Failed to download converted PDF');
    }

    const pdfBlob = await pdfResponse.blob();
    const pdfArrayBuffer = await pdfBlob.arrayBuffer();

    console.log('PDF downloaded, size:', pdfArrayBuffer.byteLength);

    // Step 4: Upload the PDF to Supabase Storage
    const pdfFileName = fileName.replace(/\.(docx?|dotx?)$/i, '.pdf');
    const timestamp = Date.now();
    const storagePath = `converted/${timestamp}-${pdfFileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('document-templates')
      .upload(storagePath, pdfArrayBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('document-templates')
      .getPublicUrl(storagePath);

    console.log('PDF uploaded successfully:', publicUrl);

    // Step 5: Clean up temporary filled template if it exists
    if (tempFilePath) {
      const { error: deleteError } = await supabase.storage
        .from('document-templates')
        .remove([tempFilePath]);
      
      if (deleteError) {
        console.error('Failed to delete temporary file:', deleteError);
        // Don't throw - PDF was created successfully
      } else {
        console.log('Temporary file cleaned up:', tempFilePath);
      }
    }

    // Step 6: Update database if templateId provided
    if (templateId) {
      const { error: updateError } = await supabase
        .from('document_templates')
        .update({
          pdf_version_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId);

      if (updateError) {
        console.error('Database update error:', updateError);
        // Don't throw - PDF was created successfully
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl: publicUrl,
        fileName: pdfFileName,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in convert-word-to-pdf function:', error);
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
