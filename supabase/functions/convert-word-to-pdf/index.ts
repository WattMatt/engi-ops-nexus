import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

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

    // Extract fileName from URL
    const urlParts = templateUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];

    console.log('Starting Word to PDF conversion:', { fileName, templateId, hasPlaceholderData: !!placeholderData });
    console.log('Template URL:', templateUrl);

    // Build the CloudConvert job tasks using direct URL import (bucket is now public)
    const tasks: any = {
      'import-file': {
        operation: 'import/url',
        url: templateUrl,
        filename: fileName,
      },
    };

    // If placeholder data is provided, use merge operation
    if (placeholderData && Object.keys(placeholderData).length > 0) {
      console.log('Using merge operation with placeholder data');
      tasks['merge-file'] = {
        operation: 'merge',
        input: 'import-file',
        output_format: fileName.endsWith('.docx') || fileName.endsWith('.dotx') ? 'docx' : 'doc',
        engine: 'office',
        data: placeholderData,
      };
      tasks['convert-file'] = {
        operation: 'convert',
        input: 'merge-file',
        output_format: 'pdf',
        engine: 'office',
      };
    } else {
      console.log('Using direct conversion without merge');
      tasks['convert-file'] = {
        operation: 'convert',
        input: 'import-file',
        output_format: 'pdf',
        engine: 'office',
        input_format: fileName.endsWith('.docx') || fileName.endsWith('.dotx') ? 'docx' : 'doc',
      };
    }

    tasks['export-file'] = {
      operation: 'export/url',
      input: 'convert-file',
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

    // Step 5: Update database if templateId provided
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
