import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedItem {
  row_number: number;
  item_code: string | null;
  item_description: string;
  quantity: number | null;
  unit: string | null;
  supply_rate: number | null;
  install_rate: number | null;
  total_rate: number | null;
  suggested_category_name: string | null;
  match_confidence: number;
  raw_data: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const { upload_id, file_content, file_type } = await req.json();

    if (!upload_id) {
      throw new Error('upload_id is required');
    }

    console.log(`[BOQ Extract] Starting extraction for upload: ${upload_id}`);

    // Update upload status to processing
    await supabase
      .from('boq_uploads')
      .update({ 
        status: 'processing',
        extraction_started_at: new Date().toISOString()
      })
      .eq('id', upload_id);

    // Fetch material categories for AI context
    const { data: categories } = await supabase
      .from('material_categories')
      .select('category_code, category_name, description')
      .eq('is_active', true);

    // Fetch existing master materials for matching
    const { data: masterMaterials } = await supabase
      .from('master_materials')
      .select('id, material_code, material_name, category_id')
      .eq('is_active', true);

    const categoryList = categories?.map(c => `${c.category_code}: ${c.category_name} - ${c.description || ''}`).join('\n') || '';
    
    // Prepare AI prompt for extraction
    const extractionPrompt = `You are an expert at parsing electrical Bills of Quantities (BOQs) and extracting structured data.

Given the following BOQ content, extract each line item into a structured format.

MATERIAL CATEGORIES (use these codes for categorization):
${categoryList}

For each item, extract:
1. item_code - The item/reference number (if present)
2. item_description - Full description of the item
3. quantity - Numeric quantity
4. unit - Unit of measurement (each, m, m², kg, set, lot, pair)
5. supply_rate - Supply/material cost per unit (if shown separately)
6. install_rate - Installation cost per unit (if shown separately)
7. total_rate - Total rate per unit (if supply/install not separated)
8. suggested_category - Best matching category code from the list above
9. confidence - Your confidence in the categorization (0.0-1.0)

RULES:
- Parse ALL line items, even if incomplete
- For South African BOQs, costs are typically in ZAR (R)
- If a rate includes supply and install combined, put it in total_rate
- If you see "supply" and "fix" or "install" separately, split them
- Common categories: HV for high voltage, LV for low voltage, CB for cables, CT for containment, EA for earthing, LT for lighting
- Return a JSON array of extracted items

BOQ CONTENT:
${file_content}

Return ONLY a valid JSON array, no markdown or explanation.`;

    let extractedItems: ExtractedItem[] = [];

    if (googleApiKey) {
      // Use Gemini for extraction
      console.log('[BOQ Extract] Using Gemini AI for extraction');
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${googleApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: extractionPrompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 8192,
            }
          })
        }
      );

      const aiResult = await response.json();
      
      if (aiResult.candidates?.[0]?.content?.parts?.[0]?.text) {
        const rawText = aiResult.candidates[0].content.parts[0].text;
        // Clean up the response - remove markdown code blocks if present
        const cleanedText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        try {
          extractedItems = JSON.parse(cleanedText);
          console.log(`[BOQ Extract] AI extracted ${extractedItems.length} items`);
        } catch (parseError) {
          console.error('[BOQ Extract] Failed to parse AI response:', parseError);
          console.log('[BOQ Extract] Raw response:', rawText.substring(0, 500));
        }
      }
    } else {
      // Fallback: basic parsing without AI
      console.log('[BOQ Extract] No AI key available, using basic parsing');
      
      // Simple line-by-line parsing for CSV-like content
      const lines = file_content.split('\n').filter((l: string) => l.trim());
      
      extractedItems = lines.slice(1).map((line: string, index: number) => {
        const parts = line.split(/[,\t]/);
        return {
          row_number: index + 1,
          item_code: parts[0]?.trim() || null,
          item_description: parts[1]?.trim() || line.trim(),
          quantity: parseFloat(parts[2]) || null,
          unit: parts[3]?.trim() || null,
          supply_rate: parseFloat(parts[4]) || null,
          install_rate: parseFloat(parts[5]) || null,
          total_rate: parseFloat(parts[6]) || parseFloat(parts[4]) || null,
          suggested_category_name: null,
          match_confidence: 0.3,
          raw_data: { original_line: line }
        };
      }).filter((item: ExtractedItem) => item.item_description);
    }

    // Match extracted items to master materials
    const itemsWithMatches = extractedItems.map((item, index) => {
      let matchedMaterial = null;
      let matchConfidence = item.match_confidence || 0;

      if (masterMaterials && item.item_description) {
        const descLower = item.item_description.toLowerCase();
        
        // Try to find matching material
        for (const material of masterMaterials) {
          const nameLower = material.material_name.toLowerCase();
          const codeLower = material.material_code.toLowerCase();
          
          // Exact code match
          if (item.item_code && codeLower === item.item_code.toLowerCase()) {
            matchedMaterial = material;
            matchConfidence = 0.95;
            break;
          }
          
          // Partial name match
          if (descLower.includes(nameLower) || nameLower.includes(descLower)) {
            matchedMaterial = material;
            matchConfidence = Math.max(matchConfidence, 0.7);
          }
          
          // Keyword matching for common items
          const keywords = ['rmu', 'substation', 'distribution board', 'db', 'cable', 'xlpe', 'tray', 'ladder', 'earth'];
          for (const kw of keywords) {
            if (descLower.includes(kw) && nameLower.includes(kw)) {
              matchedMaterial = material;
              matchConfidence = Math.max(matchConfidence, 0.6);
            }
          }
        }
      }

      // Find category ID from suggested category name
      let suggestedCategoryId = null;
      if (item.suggested_category_name && categories) {
        const cat = categories.find(c => 
          c.category_code === item.suggested_category_name ||
          c.category_name.toLowerCase().includes((item.suggested_category_name || '').toLowerCase())
        );
        if (cat) {
          // Need to get the actual ID
          suggestedCategoryId = null; // We'll need a separate query for this
        }
      }

      return {
        upload_id,
        row_number: item.row_number || index + 1,
        item_code: item.item_code,
        item_description: item.item_description,
        quantity: item.quantity,
        unit: item.unit,
        supply_rate: item.supply_rate,
        install_rate: item.install_rate,
        total_rate: item.total_rate,
        suggested_category_name: item.suggested_category_name,
        matched_material_id: matchedMaterial?.id || null,
        match_confidence: matchConfidence,
        raw_data: item.raw_data || {},
        review_status: 'pending'
      };
    });

    // Insert extracted items
    if (itemsWithMatches.length > 0) {
      const { error: insertError } = await supabase
        .from('boq_extracted_items')
        .insert(itemsWithMatches);

      if (insertError) {
        console.error('[BOQ Extract] Insert error:', insertError);
        throw insertError;
      }
    }

    // Update upload record with results
    const matchedCount = itemsWithMatches.filter(i => i.matched_material_id).length;
    
    await supabase
      .from('boq_uploads')
      .update({
        status: 'completed',
        extraction_completed_at: new Date().toISOString(),
        total_items_extracted: itemsWithMatches.length,
        items_matched_to_master: matchedCount
      })
      .eq('id', upload_id);

    console.log(`[BOQ Extract] Completed: ${itemsWithMatches.length} items extracted, ${matchedCount} matched`);

    return new Response(
      JSON.stringify({
        success: true,
        items_extracted: itemsWithMatches.length,
        items_matched: matchedCount,
        message: `Successfully extracted ${itemsWithMatches.length} items from BOQ`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BOQ Extract] Error:', errorMessage);

    // Try to update upload status to failed
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { upload_id } = await req.json().catch(() => ({}));
      if (upload_id) {
        await supabase
          .from('boq_uploads')
          .update({
            status: 'failed',
            error_message: errorMessage
          })
          .eq('id', upload_id);
      }
    } catch (e) {
      console.error('[BOQ Extract] Failed to update status:', e);
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
