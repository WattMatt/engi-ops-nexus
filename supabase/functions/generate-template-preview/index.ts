import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PreviewRequest {
  blankTemplateUrl: string;
  templateType: string;
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

    // Convert blank template to PDF for WYSIWYG preview
    console.log('Converting blank template to PDF for preview...');

    const convertResponse = await supabase.functions.invoke('convert-word-to-pdf', {
      body: {
        templateUrl: blankTemplateUrl,
      },
    });

    if (convertResponse.error) {
      console.error('Error converting to PDF:', convertResponse.error);
      throw new Error('Failed to convert template to PDF');
    }

    const pdfUrl = convertResponse.data?.pdfUrl;
    console.log('PDF preview generated:', pdfUrl);

    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl,
        message: 'Preview generated from blank template with placeholders visible',
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
