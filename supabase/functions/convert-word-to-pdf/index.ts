import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import PizZip from 'https://esm.sh/pizzip@3.1.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConversionRequest {
  templateUrl: string;
  templateId?: string;
  placeholderData?: Record<string, string>;
  imagePlaceholders?: Record<string, string>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const cloudConvertApiKey = Deno.env.get('CLOUDCONVERT_API_KEY');

    if (!cloudConvertApiKey) {
      throw new Error('CLOUDCONVERT_API_KEY environment variable is not set');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { templateUrl, templateId, placeholderData, imagePlaceholders }: ConversionRequest = await req.json();

    const urlParts = templateUrl.split('/');
    const originalFileName = decodeURIComponent(urlParts[urlParts.length - 1]);
    const fileName = originalFileName.replace(/\s+/g, '_');

    console.log('Starting conversion:', { fileName, hasData: !!placeholderData, hasImages: !!imagePlaceholders });

    let finalTemplateUrl = templateUrl;
    let tempFilePath: string | null = null;

    // Process template with placeholders
    if ((placeholderData && Object.keys(placeholderData).length > 0) || (imagePlaceholders && Object.keys(imagePlaceholders).length > 0)) {
      console.log('Processing template with placeholders');
      
      const templateResponse = await fetch(templateUrl);
      if (!templateResponse.ok) {
        throw new Error('Failed to download template');
      }
      const templateArrayBuffer = await templateResponse.arrayBuffer();
      
      let zip = new PizZip(templateArrayBuffer);
      const docFile = zip.file('word/document.xml');
      if (!docFile) {
        throw new Error('document.xml not found');
      }
      let documentXml = docFile.asText();
      
      // Replace text placeholders directly in XML
      if (placeholderData && Object.keys(placeholderData).length > 0) {
        console.log('Replacing text placeholders');
        
        // First pass: Remove formatting tags within placeholders to make them matchable
        // This handles cases where Word splits {placeholder} across multiple XML elements
        documentXml = documentXml.replace(
          /\{([^}]*?)<[^>]+>([^}]*?)\}/g,
          (match, before, after) => {
            // Extract just the text content
            const cleanBefore = before.replace(/<[^>]+>/g, '');
            const cleanAfter = after.replace(/<[^>]+>/g, '');
            return `{${cleanBefore}${cleanAfter}}`;
          }
        );
        
        // Also handle double braces
        documentXml = documentXml.replace(
          /\{\{([^}]*?)<[^>]+>([^}]*?)\}\}/g,
          (match, before, after) => {
            const cleanBefore = before.replace(/<[^>]+>/g, '');
            const cleanAfter = after.replace(/<[^>]+>/g, '');
            return `{{${cleanBefore}${cleanAfter}}}`;
          }
        );
        
        // Now replace with actual values
        for (const [key, value] of Object.entries(placeholderData)) {
          if (value && typeof value === 'string') {
            const escapedValue = value
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&apos;');
            
            // Replace all variations
            const patterns = [
              new RegExp(`\\{\\{${key}\\}\\}`, 'gi'),
              new RegExp(`\\{${key}\\}`, 'gi'),
            ];
            
            let replaced = false;
            patterns.forEach(pattern => {
              if (documentXml.match(pattern)) {
                documentXml = documentXml.replace(pattern, escapedValue);
                replaced = true;
              }
            });
            
            if (replaced) {
              console.log(`Replaced: ${key} = ${value.substring(0, 50)}`);
            }
          }
        }
      }
      
      // Handle image placeholders
      if (imagePlaceholders && Object.keys(imagePlaceholders).length > 0) {
        console.log('Processing images');
        
        // Fetch placeholder logo once
        const placeholderLogoUrl = 'https://rsdisaisxdglmdmzmkyw.supabase.co/storage/v1/object/public/document-templates/placeholder-logo.png';
        let placeholderBuffer: Uint8Array | null = null;
        
        try {
          const placeholderResponse = await fetch(placeholderLogoUrl);
          if (placeholderResponse.ok) {
            placeholderBuffer = new Uint8Array(await placeholderResponse.arrayBuffer());
            console.log('Loaded placeholder logo');
          }
        } catch (error) {
          console.error('Error loading placeholder logo:', error);
        }
        
        const imageBuffers: Record<string, { buffer: Uint8Array; ext: string }> = {};
        for (const [key, imageUrl] of Object.entries(imagePlaceholders)) {
          // Use placeholder if no URL provided
          const effectiveUrl = imageUrl || placeholderLogoUrl;
          const isPlaceholder = !imageUrl && placeholderBuffer;
          
          try {
            if (isPlaceholder && placeholderBuffer) {
              // Use cached placeholder
              imageBuffers[key] = {
                buffer: placeholderBuffer,
                ext: 'png'
              };
              console.log(`Using placeholder for ${key}`);
            } else if (effectiveUrl) {
              const imageResponse = await fetch(effectiveUrl);
              if (imageResponse.ok) {
                const imageBuffer = await imageResponse.arrayBuffer();
                const ext = effectiveUrl.toLowerCase().match(/\.(jpg|jpeg|png)$/)?.[1] || 'png';
                imageBuffers[key] = {
                  buffer: new Uint8Array(imageBuffer),
                  ext: ext === 'jpg' ? 'jpeg' : ext
                };
                console.log(`Fetched ${key}: ${imageBuffer.byteLength} bytes`);
              }
            }
          } catch (error) {
            console.error(`Error fetching ${key}:`, error);
          }
        }
        
        let relsXml = '';
        try {
          const relsFile = zip.file('word/_rels/document.xml.rels');
          relsXml = relsFile ? relsFile.asText() : '';
        } catch (e) {
          console.log('Creating new rels file');
        }
        
        if (!relsXml) {
          relsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
        }
        
        let imageCounter = 1;
        let relIdCounter = 100;
        
        // Step 1: Try to find and replace existing image frames based on Alt Text
        let framesReplaced = 0;
        
        for (const [placeholderKey, imageData] of Object.entries(imageBuffers)) {
          // Look for alt text matches (e.g., "client_logo", "company_logo")
          const altTextVariations = [
            placeholderKey,
            placeholderKey.replace(/_/g, ''),
            placeholderKey.toLowerCase(),
            placeholderKey.toLowerCase().replace(/_/g, ''),
          ];
          
          // Find all drawing elements with matching alt text
          const drawingRegex = /<w:drawing>[\s\S]*?<\/w:drawing>/g;
          let match;
          
          while ((match = drawingRegex.exec(documentXml)) !== null) {
            const drawingXml = match[0];
            
            // Extract alt text from wp:docPr descr attribute
            const descrMatch = drawingXml.match(/<wp:docPr[^>]+descr="([^"]*)"/);
            if (descrMatch) {
              const altText = descrMatch[1].toLowerCase().replace(/\s+/g, '');
              
              // Check if this alt text matches any of our variations
              if (altTextVariations.some(v => altText.includes(v.toLowerCase()))) {
                console.log(`Found frame with alt text: ${descrMatch[1]} for ${placeholderKey}`);
                
                // Generate new image filename and relationship ID
                const imageFileName = `image${imageCounter}.${imageData.ext}`;
                const newRelId = `rId${relIdCounter}`;
                
                // Add image to zip
                zip.file(`word/media/${imageFileName}`, imageData.buffer);
                
                // Add new relationship
                const relationshipXml = `<Relationship Id="${newRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageFileName}"/>`;
                relsXml = relsXml.replace('</Relationships>', `${relationshipXml}</Relationships>`);
                
                // SIMPLE APPROACH: Only replace the r:embed reference, keep everything else intact
                const newDrawingXml = drawingXml.replace(
                  /<a:blip r:embed="[^"]+"/,
                  `<a:blip r:embed="${newRelId}"`
                );
                
                // Replace in document
                documentXml = documentXml.replace(drawingXml, newDrawingXml);
                
                console.log(`Replaced frame image: ${placeholderKey}`);
                framesReplaced++;
                imageCounter++;
                relIdCounter++;
                
                break; // Only replace the first matching frame for this placeholder
              }
            }
          }
        }
        
        console.log(`Replaced ${framesReplaced} image frames based on Alt Text`);
        
        // Step 2: Fall back to text placeholder replacement for any remaining images
        for (const [placeholderKey, imageData] of Object.entries(imageBuffers)) {
          // Check if we already replaced this via frame detection
          const alreadyReplaced = documentXml.match(new RegExp(`Alt Text[^>]*${placeholderKey}`, 'i'));
          
          const patterns = [
            new RegExp(`\\{\\{${placeholderKey}\\}\\}`, 'gi'),
            new RegExp(`\\{${placeholderKey}\\}`, 'gi'),
          ];
          
          let foundTextPlaceholder = false;
          patterns.forEach(pattern => {
            if (documentXml.match(pattern)) {
              foundTextPlaceholder = true;
            }
          });
          
          // Only do text replacement if we haven't already replaced via frame AND text placeholder exists
          if (!alreadyReplaced && foundTextPlaceholder) {
            const imageFileName = `image${imageCounter}.${imageData.ext}`;
            const relId = `rId${relIdCounter}`;
            
            zip.file(`word/media/${imageFileName}`, imageData.buffer);
            
            const relationshipXml = `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageFileName}"/>`;
            relsXml = relsXml.replace('</Relationships>', `${relationshipXml}</Relationships>`);
            
            // Use default sizes for text placeholder replacement
            const isClientImage = placeholderKey.toLowerCase().includes('client');
            const imageWidth = isClientImage ? 1620000 : 1440000;
            const imageHeight = isClientImage ? 1620000 : 1080000;
            
            const imageXml = `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${imageWidth}" cy="${imageHeight}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${imageCounter}" name="Image ${imageCounter}" descr="${placeholderKey}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${imageCounter}" name="Image ${imageCounter}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${imageWidth}" cy="${imageHeight}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
            
            patterns.forEach(pattern => {
              const count = (documentXml.match(pattern) || []).length;
              documentXml = documentXml.replace(pattern, imageXml);
              if (count > 0) console.log(`Replaced ${count} text placeholder ${placeholderKey} with image`);
            });
            
            imageCounter++;
            relIdCounter++;
          }
        }
        
        zip.file('word/_rels/document.xml.rels', relsXml);
      }
      
      zip.file('word/document.xml', documentXml);
      
      const filledDocBuffer = zip.generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });
      
      const timestamp = Date.now();
      tempFilePath = `temp/${timestamp}-filled-${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('document-templates')
        .upload(tempFilePath, filledDocBuffer, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: false,
        });
      
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('document-templates')
        .getPublicUrl(tempFilePath);
      
      finalTemplateUrl = publicUrl;
      console.log('Filled template uploaded');
    }

    // Convert to PDF
    console.log('Starting CloudConvert job with template:', finalTemplateUrl);
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
      throw new Error(`Job creation failed: ${errorText}`);
    }

    const jobData = await createJobResponse.json();
    const jobId = jobData.data.id;
    console.log('CloudConvert job created:', jobId);

    // Poll for completion
    let jobComplete = false;
    let exportTask = null;
    let attempts = 0;
    const maxAttempts = 60;

    while (!jobComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${cloudConvertApiKey}` },
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        const status = statusData.data.status;
        
        if (attempts % 10 === 0) {
          console.log(`CloudConvert status check ${attempts}: ${status}`);
        }

        if (status === 'finished') {
          jobComplete = true;
          exportTask = statusData.data.tasks.find((task: any) => task.name === 'export-file');
          console.log('CloudConvert job finished successfully');
        } else if (status === 'error') {
          const failedTask = statusData.data.tasks.find((task: any) => task.status === 'error');
          console.error('CloudConvert task failed:', failedTask);
          throw new Error(`Conversion failed: ${failedTask?.message || JSON.stringify(failedTask) || 'Unknown error'}`);
        }
      } else {
        console.error('CloudConvert status check failed:', statusResponse.status);
      }
    }

    if (!jobComplete || !exportTask) {
      console.error(`CloudConvert timeout after ${attempts} attempts`);
      throw new Error('Conversion timed out');
    }

    // Download PDF
    const pdfUrl = exportTask.result.files[0].url;
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error('PDF download failed');
    }

    const pdfBlob = await pdfResponse.blob();
    const pdfArrayBuffer = await pdfBlob.arrayBuffer();

    // Upload PDF
    const pdfFileName = fileName.replace(/\.(docx?|dotx?)$/i, '.pdf');
    const timestamp = Date.now();
    const storagePath = `converted/${timestamp}-${pdfFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('document-templates')
      .upload(storagePath, pdfArrayBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`PDF upload failed: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('document-templates')
      .getPublicUrl(storagePath);

    // Cleanup temp file
    if (tempFilePath) {
      await supabase.storage.from('document-templates').remove([tempFilePath]);
    }

    // Update database
    if (templateId) {
      await supabase
        .from('document_templates')
        .update({
          pdf_version_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId);
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
    console.error('Error in convert-word-to-pdf:', error);
    console.error('Error details:', { 
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error
    });
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
