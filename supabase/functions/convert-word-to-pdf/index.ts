import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConversionRequest {
  fileUrl: string;
  fileName: string;
  templateId?: string;
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { fileUrl, fileName, templateId }: ConversionRequest = await req.json();

    console.log('Starting Word to PDF conversion:', { fileName, templateId });

    // Step 1: Create a conversion job with CloudConvert
    const createJobResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cloudConvertApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: {
          'import-file': {
            operation: 'import/url',
            url: fileUrl,
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
        },
      }),
    });

    if (!createJobResponse.ok) {
      const errorText = await createJobResponse.text();
      console.error('CloudConvert job creation failed:', errorText);
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
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
