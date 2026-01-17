import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedBill {
  bill_number: number;
  bill_name: string;
  description?: string;
  sections: ExtractedSection[];
}

interface ExtractedSection {
  section_code: string;
  section_name: string;
  description?: string;
  items: ExtractedItem[];
}

interface ExtractedItem {
  item_code?: string;
  description: string;
  unit?: string;
  item_type: 'quantity' | 'prime_cost' | 'percentage' | 'sub_header';
}

interface ExtractionResult {
  template_name: string;
  template_description: string;
  building_type?: string;
  bills: ExtractedBill[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      file_content, 
      template_name, 
      template_description,
      building_type,
      tags,
      user_id,
      save_to_database 
    } = await req.json();

    if (!file_content) {
      throw new Error('file_content is required');
    }

    console.log(`[BOQ Template Extract] Starting extraction, content length: ${file_content?.length || 0}`);

    // Use AI to extract the structure
    const extractedStructure = await extractBOQStructureWithAI(file_content, lovableApiKey);

    if (!extractedStructure || !extractedStructure.bills || extractedStructure.bills.length === 0) {
      throw new Error('Failed to extract any bills from the document');
    }

    console.log(`[BOQ Template Extract] Extracted ${extractedStructure.bills.length} bills`);

    // If save_to_database is true, save the template
    let savedTemplateId: string | null = null;
    
    if (save_to_database && user_id) {
      savedTemplateId = await saveTemplateToDatabase(
        supabase,
        {
          name: template_name || extractedStructure.template_name || 'Extracted BOQ Template',
          description: template_description || extractedStructure.template_description || 'Template extracted from PDF',
          building_type: building_type || extractedStructure.building_type,
          tags: tags || [],
          bills: extractedStructure.bills,
        },
        user_id
      );
      console.log(`[BOQ Template Extract] Saved template with ID: ${savedTemplateId}`);
    }

    // Return the extracted structure
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          template_id: savedTemplateId,
          structure: extractedStructure,
          stats: {
            total_bills: extractedStructure.bills.length,
            total_sections: extractedStructure.bills.reduce((acc, b) => acc + b.sections.length, 0),
            total_items: extractedStructure.bills.reduce(
              (acc, b) => acc + b.sections.reduce((sacc, s) => sacc + s.items.length, 0), 
              0
            ),
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BOQ Template Extract] Error:', errorMessage);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

/**
 * Extract BOQ structure using AI
 */
async function extractBOQStructureWithAI(
  content: string,
  apiKey: string
): Promise<ExtractionResult> {
  const systemPrompt = `You are an expert Quantity Surveyor specializing in analyzing Bill of Quantities (BOQ) documents. Your task is to extract the STRUCTURE (not quantities or rates) from BOQ documents to create reusable templates.

EXTRACTION RULES:
1. Identify all BILLS (major divisions like "Bill 1: Preliminaries", "Bill 2: Electrical Installations")
2. Within each bill, identify SECTIONS (like "Section A: General", "Section B: Distribution Boards")
3. Within each section, identify LINE ITEMS with their descriptions and units
4. DO NOT include quantities, rates, or amounts - only structure
5. Determine the item_type for each item:
   - "quantity": Normal measured item with a unit
   - "prime_cost": P.C. sum items or provisional sum items
   - "percentage": Items calculated as percentage of other items
   - "sub_header": Section headers or grouping labels (no unit needed)

OUTPUT FORMAT (JSON):
{
  "template_name": "Descriptive name for this BOQ structure",
  "template_description": "Brief description of what project type this BOQ covers",
  "building_type": "mall|office|retail|industrial|residential|hospital|mixed_use|other",
  "bills": [
    {
      "bill_number": 1,
      "bill_name": "Bill name",
      "description": "Optional description",
      "sections": [
        {
          "section_code": "A",
          "section_name": "Section name",
          "description": "Optional description",
          "items": [
            {
              "item_code": "A1.1",
              "description": "Item description",
              "unit": "NO|M|M2|M3|KG|SET|LOT|ITEM|PS|%",
              "item_type": "quantity"
            }
          ]
        }
      ]
    }
  ]
}`;

  const userPrompt = `Extract the BOQ template structure from this document. Remember:
- Extract ONLY the structure (bills, sections, items)
- Do NOT include any quantities, rates, or amounts
- Identify the building type if possible
- Standardize units to: NO, M, M2, M3, KG, SET, LOT, ITEM, PS, %

DOCUMENT CONTENT:
${content.substring(0, 80000)}`; // Limit content to avoid token limits

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 16000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[BOQ Template Extract] AI API error:', errorText);
    throw new Error(`AI extraction failed: ${response.status}`);
  }

  const result = await response.json();
  const content_response = result.choices?.[0]?.message?.content;

  if (!content_response) {
    throw new Error('No content in AI response');
  }

  try {
    const parsed = JSON.parse(content_response);
    return parsed as ExtractionResult;
  } catch (parseError) {
    console.error('[BOQ Template Extract] Failed to parse AI response:', content_response);
    throw new Error('Failed to parse AI response as JSON');
  }
}

/**
 * Save extracted template to database
 */
async function saveTemplateToDatabase(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  templateData: {
    name: string;
    description: string;
    building_type?: string;
    tags: string[];
    bills: ExtractedBill[];
  },
  userId: string
): Promise<string> {
  // Create the template
  const { data: template, error: templateError } = await supabase
    .from('bill_structure_templates')
    .insert({
      name: templateData.name,
      description: templateData.description,
      template_type: 'boq',
      building_type: templateData.building_type || null,
      tags: templateData.tags,
      is_global: true,
      created_by: userId,
    })
    .select()
    .single();

  if (templateError) {
    console.error('[BOQ Template Extract] Error creating template:', templateError);
    throw templateError;
  }

  // Create bills
  for (let bIdx = 0; bIdx < templateData.bills.length; bIdx++) {
    const bill = templateData.bills[bIdx];
    
    const { data: templateBill, error: billError } = await supabase
      .from('template_bills')
      .insert({
        template_id: template.id,
        bill_number: bill.bill_number,
        bill_name: bill.bill_name,
        description: bill.description || null,
        display_order: bIdx,
      })
      .select()
      .single();

    if (billError) {
      console.error('[BOQ Template Extract] Error creating bill:', billError);
      throw billError;
    }

    // Create sections
    for (let sIdx = 0; sIdx < bill.sections.length; sIdx++) {
      const section = bill.sections[sIdx];
      
      const { data: templateSection, error: sectionError } = await supabase
        .from('template_sections')
        .insert({
          template_bill_id: templateBill.id,
          section_code: section.section_code,
          section_name: section.section_name,
          description: section.description || null,
          display_order: sIdx,
        })
        .select()
        .single();

      if (sectionError) {
        console.error('[BOQ Template Extract] Error creating section:', sectionError);
        throw sectionError;
      }

      // Create items
      if (section.items && section.items.length > 0) {
        const templateItems = section.items.map((item, idx) => ({
          template_section_id: templateSection.id,
          item_code: item.item_code || null,
          description: item.description,
          unit: item.unit || null,
          item_type: item.item_type || 'quantity',
          display_order: idx,
        }));

        const { error: itemsError } = await supabase
          .from('template_items')
          .insert(templateItems);

        if (itemsError) {
          console.error('[BOQ Template Extract] Error creating items:', itemsError);
          throw itemsError;
        }
      }
    }
  }

  return template.id;
}
