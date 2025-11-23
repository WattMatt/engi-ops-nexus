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
  imagePlaceholders?: Record<string, string>; // Map of placeholder names to image URLs
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

    const { templateUrl, templateId, placeholderData, imagePlaceholders }: ConversionRequest = await req.json();

    // Extract fileName from URL and sanitize it (remove spaces and special chars)
    const urlParts = templateUrl.split('/');
    const originalFileName = decodeURIComponent(urlParts[urlParts.length - 1]);
    const fileName = originalFileName.replace(/\s+/g, '_'); // Replace spaces with underscores

    console.log('Starting Word to PDF conversion:', { 
      originalFileName, 
      sanitizedFileName: fileName, 
      templateId, 
      hasPlaceholderData: !!placeholderData,
      hasImagePlaceholders: !!imagePlaceholders 
    });
    console.log('Template URL:', templateUrl);
    console.log('Placeholder data:', placeholderData);
    console.log('Image placeholders:', imagePlaceholders);

    let finalTemplateUrl = templateUrl;
    let tempFilePath: string | null = null;

    // If placeholderData is provided, use docxtemplater to fill the template
    if ((placeholderData && Object.keys(placeholderData).length > 0) || (imagePlaceholders && Object.keys(imagePlaceholders).length > 0)) {
      console.log('Processing template with placeholders');
      
      // Step 1: Download the original template
      const templateResponse = await fetch(templateUrl);
      if (!templateResponse.ok) {
        throw new Error('Failed to download template');
      }
      const templateArrayBuffer = await templateResponse.arrayBuffer();
      
      // Step 2: Load ZIP and fix split placeholders BEFORE docxtemplater
      let zip = new PizZip(templateArrayBuffer);
      
      // Fix split placeholders in document.xml
      const docFile = zip.file('word/document.xml');
      if (!docFile) {
        throw new Error('document.xml not found in template');
      }
      let documentXml = docFile.asText();
      
      console.log('Original XML length:', documentXml.length);
      
      // Remove all formatting tags between placeholder parts to fix split tags
      // This regex finds patterns like: {</w:t></w:r><w:r><w:t>{  or  }</w:t></w:r><w:r><w:t>}
      // and collapses them back into proper {{  or  }} tags
      documentXml = documentXml.replace(
        /\{(<\/w:t><\/w:r><w:r[^>]*><w:t[^>]*>)*\{/g,
        '{{'
      );
      documentXml = documentXml.replace(
        /\}(<\/w:t><\/w:r><w:r[^>]*><w:t[^>]*>)*\}/g,
        '}}'
      );
      
      // Also handle cases where placeholder parts are split with formatting
      // Example: {<w:r>...</w:r>client<w:r>...</w:r>_<w:r>...</w:r>image}
      documentXml = documentXml.replace(
        /\{(<\/w:t><\/w:r><w:r[^>]*><w:t[^>]*>)+([a-zA-Z_]+)(<\/w:t><\/w:r><w:r[^>]*><w:t[^>]*>)+\}/g,
        '{$2}'
      );
      
      console.log('Fixed XML length:', documentXml.length);
      
      // Update the document.xml with fixed placeholders
      zip.file('word/document.xml', documentXml);
      
      // Step 3: Handle image placeholders by replacing with safe markers
      if (imagePlaceholders && Object.keys(imagePlaceholders).length > 0) {
        console.log('Pre-processing image placeholders to avoid docxtemplater errors');
        
        for (const placeholderKey of Object.keys(imagePlaceholders)) {
          // Replace image placeholders with safe markers
          const marker = `IMAGE_PLACEHOLDER_${placeholderKey}`;
          documentXml = documentXml.replace(new RegExp(`\\{\\{${placeholderKey}\\}\\}`, 'g'), marker);
          documentXml = documentXml.replace(new RegExp(`\\{${placeholderKey}\\}`, 'g'), marker);
        }
        
        zip.file('word/document.xml', documentXml);
        console.log('Image placeholders replaced with safe markers');
      }
      
      // Step 4: Now use docxtemplater for text placeholders only
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => '', // Return empty string for missing placeholders
      });
      
      // Set the text data for replacement
      console.log('Setting placeholder data:', JSON.stringify(placeholderData, null, 2));
      doc.setData(placeholderData || {});
      
      try {
        doc.render();
        console.log('Template text placeholders rendered successfully');
      } catch (error: any) {
        console.error('Docxtemplater rendering error:', error);
        
        // Enhanced error messages
        let errorMessage = 'Failed to process template';
        
        if (error.properties && error.properties.errors) {
          const errors = error.properties.errors;
          errorMessage = errors.map((e: any) => {
            if (e.name === 'TemplateError') {
              return `Template syntax error: ${e.message}`;
            } else if (e.name === 'ScopeParserError') {
              return `Missing placeholder data: ${e.message}`;
            } else {
              return e.message;
            }
          }).join('; ');
          
          console.error('Detailed errors:', JSON.stringify(errors, null, 2));
        } else if (error.message) {
          errorMessage = error.message;
        }

        throw new Error(`Template processing failed: ${errorMessage}. Please check your template syntax and ensure all required placeholders are present.`);
      }
      
      // Step 4: Replace safe markers with actual images
      if (imagePlaceholders && Object.keys(imagePlaceholders).length > 0) {
        console.log('Replacing safe markers with actual images...');
        
        // Get the modified zip from docxtemplater
        zip = doc.getZip();
        
        // Fetch images
        const imageBuffers: Record<string, Uint8Array> = {};
        for (const [key, imageUrl] of Object.entries(imagePlaceholders)) {
          if (imageUrl) {
            try {
              console.log(`Fetching image for ${key} from ${imageUrl}`);
              const imageResponse = await fetch(imageUrl);
              if (imageResponse.ok) {
                const imageBuffer = await imageResponse.arrayBuffer();
                imageBuffers[key] = new Uint8Array(imageBuffer);
                console.log(`Image ${key} fetched, size: ${imageBuffer.byteLength} bytes`);
              } else {
                console.warn(`Failed to fetch image for ${key}: ${imageResponse.statusText}`);
              }
            } catch (error) {
              console.error(`Error fetching image for ${key}:`, error);
            }
          }
        }
        
        // Process each image placeholder
        const docFile = zip.file('word/document.xml');
        if (!docFile) {
          throw new Error('document.xml not found in template');
        }
        let documentXml = docFile.asText();
        let relsXml = '';
        let hasRels = false;
        
        try {
          const relsFile = zip.file('word/_rels/document.xml.rels');
          if (relsFile) {
            relsXml = relsFile.asText();
            hasRels = true;
          }
        } catch (e) {
          console.log('No existing relationships file, will create one');
        }
        
        if (!hasRels) {
          relsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
          hasRels = true;
        }
        
        let imageCounter = 1;
        let relIdCounter = 100; // Start high to avoid conflicts
        
        for (const [placeholderKey, imageBuffer] of Object.entries(imageBuffers)) {
          const imageFileName = `image${imageCounter}.png`;
          const relId = `rId${relIdCounter}`;
          const marker = `IMAGE_PLACEHOLDER_${placeholderKey}`;
          
          // Add image to media folder
          zip.file(`word/media/${imageFileName}`, imageBuffer);
          console.log(`Added ${imageFileName} to document`);
          
          // Add relationship
          const relationshipXml = `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageFileName}"/>`;
          relsXml = relsXml.replace('</Relationships>', `${relationshipXml}</Relationships>`);
          
          // Replace marker with image XML (logo sized at 2 inches)
          const imageXml = `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="1905000" cy="1905000"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${imageCounter}" name="Logo ${imageCounter}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${imageCounter}" name="Logo ${imageCounter}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1905000" cy="1905000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
          
          // Replace the marker
          const markerPattern = new RegExp(marker, 'g');
          const replacements = (documentXml.match(markerPattern) || []).length;
          documentXml = documentXml.replace(markerPattern, imageXml);
          
          console.log(`Replaced ${replacements} occurrences of ${marker} with image`);
          
          imageCounter++;
          relIdCounter++;
        }
        
        // Update the document.xml and rels
        zip.file('word/document.xml', documentXml);
        zip.file('word/_rels/document.xml.rels', relsXml);
        
        console.log('Image placeholders processed successfully');
      }
      
      // Generate the filled document
      const filledDocBuffer = zip.generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });
      
      // Step 5: Upload the filled document to temporary storage with sanitized filename
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
    const maxAttempts = 60; // 60 seconds timeout (increased for complex documents)
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;

    while (!jobComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      attempts++;

      try {
        const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${cloudConvertApiKey}`,
          },
        });

        if (!statusResponse.ok) {
          const errorText = await statusResponse.text();
          console.warn(`Status check failed (attempt ${attempts}):`, statusResponse.status, errorText);
          consecutiveErrors++;
          
          // Only throw if we've had multiple consecutive errors
          if (consecutiveErrors >= maxConsecutiveErrors) {
            throw new Error(`Failed to check job status after ${maxConsecutiveErrors} consecutive attempts: ${errorText}`);
          }
          
          // Otherwise continue polling
          continue;
        }

        // Reset error counter on success
        consecutiveErrors = 0;

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
      } catch (error: any) {
        // If it's already a thrown error from above, rethrow it
        if (error.message.includes('Conversion failed') || error.message.includes('consecutive attempts')) {
          throw error;
        }
        
        // Otherwise, log and continue (might be a transient network issue)
        console.warn(`Error checking job status (attempt ${attempts}):`, error.message);
        consecutiveErrors++;
        
        if (consecutiveErrors >= maxConsecutiveErrors) {
          throw new Error(`Failed to check job status after ${maxConsecutiveErrors} consecutive errors: ${error.message}`);
        }
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
