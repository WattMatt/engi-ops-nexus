import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedItem {
  row_number: number;
  bill_number: number | null;
  bill_name: string | null;
  section_code: string | null;
  section_name: string | null;
  item_code: string | null;
  item_description: string;
  quantity: number | null;
  is_rate_only: boolean;
  unit: string | null;
  supply_rate: number | null;
  install_rate: number | null;
  total_rate: number | null;
  supply_cost: number | null;
  install_cost: number | null;
  prime_cost: number | null;
  profit_percentage: number | null;
  suggested_category_name: string | null;
  match_confidence: number;
  raw_data: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { upload_id, file_content, file_type } = await req.json();

    if (!upload_id) {
      throw new Error('upload_id is required');
    }

    console.log(`[BOQ Extract] Starting extraction for upload: ${upload_id}`);

    await supabase
      .from('boq_uploads')
      .update({ 
        status: 'processing',
        extraction_started_at: new Date().toISOString()
      })
      .eq('id', upload_id);

    const { data: categories } = await supabase
      .from('material_categories')
      .select('category_code, category_name, description')
      .eq('is_active', true);

    const { data: masterMaterials } = await supabase
      .from('master_materials')
      .select('id, material_code, material_name, category_id')
      .eq('is_active', true);

    const { data: standardSections } = await supabase
      .from('boq_sections')
      .select('section_code, section_name, display_order')
      .order('display_order');

    const categoryList = categories?.map(c => `${c.category_code}: ${c.category_name} - ${c.description || ''}`).join('\n') || '';
    const sectionList = standardSections?.map(s => `${s.section_code}: ${s.section_name}`).join('\n') || '';
    
    const extractionPrompt = `You are an expert at parsing South African electrical Bills of Quantities (BOQs). 
This BOQ may contain multiple BILLS (e.g., "BILL 1 - MALL PORTION", "BILL 2 - SUPERSPAR") and multiple SECTIONS within each bill.

IMPORTANT STRUCTURE TO DETECT:
1. BILLS: Look for "BILL 1", "BILL 2", "BILL NO. 1", or similar patterns. Each bill represents a different building/area.
2. SECTIONS: Within each bill, look for section headers like "B. MEDIUM VOLTAGE", "D. LOW VOLTAGE DISTRIBUTION", etc.
3. LINE ITEMS: Each item has an item code (e.g., "B2.1", "D1.1.1"), description, quantity, unit, and rates.

MATERIAL CATEGORIES (use these codes for categorization):
${categoryList}

STANDARD BOQ SECTIONS:
${sectionList}

For each line item, extract:
1. bill_number - Integer (1, 2, 3, etc.) identifying which bill this belongs to
2. bill_name - Name of the bill (e.g., "MALL PORTION", "SUPERSPAR", "TOPS")
3. section_code - Letter code (A, B, C, D, etc.)
4. section_name - Full section name (e.g., "Medium Voltage Equipment")
5. item_code - The item/reference number (B2.1, D1.1.1, etc.)
6. item_description - Full description of the item
7. quantity - Numeric quantity (null if "Rate Only")
8. is_rate_only - Boolean true if quantity shows "Rate Only", "RATE ONLY", "Rate", or similar
9. unit - Unit of measurement (each, m, m², kg, set, lot, pair, No, Nr)
10. supply_rate - Supply/material cost per unit (if shown separately)
11. install_rate - Installation cost per unit (if shown separately)
12. total_rate - Combined rate per unit (if supply/install not separated)
13. supply_cost - Total supply cost (quantity × supply_rate)
14. install_cost - Total install cost (quantity × install_rate)
15. prime_cost - If item is a "Prime Cost" item, the base cost before profit
16. profit_percentage - Profit margin on Prime Cost items (usually shown as %)
17. suggested_category - Best matching category code from the list above
18. confidence - Your confidence in the extraction (0.0-1.0)

RULES:
- Parse ALL line items from ALL bills and sections
- For South African BOQs, costs are in ZAR (R)
- "Rate Only" items have no quantity but capture rates for use elsewhere
- Section headers are typically bold or in larger font, not priced items
- Prelims (Section A) usually have different structure - still extract them
- Prime Cost items show base cost + profit percentage
- If supply and install are combined, put the value in total_rate
- Preserve the original item codes exactly as shown
- Group items correctly under their parent bill and section

Return ONLY a valid JSON array of extracted items, no markdown or explanation.

BOQ CONTENT:
${file_content}`;

    let extractedItems: ExtractedItem[] = [];

    if (googleApiKey) {
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
              maxOutputTokens: 32768,
            }
          })
        }
      );

      const aiResult = await response.json();
      
      if (aiResult.candidates?.[0]?.content?.parts?.[0]?.text) {
        const rawText = aiResult.candidates[0].content.parts[0].text;
        const cleanedText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        try {
          extractedItems = JSON.parse(cleanedText);
          console.log(`[BOQ Extract] AI extracted ${extractedItems.length} items`);
        } catch (parseError) {
          console.error('[BOQ Extract] Failed to parse AI response:', parseError);
          console.log('[BOQ Extract] Raw response:', rawText.substring(0, 1000));
        }
      } else {
        console.error('[BOQ Extract] No AI response:', JSON.stringify(aiResult).substring(0, 500));
      }
    } else {
      console.log('[BOQ Extract] No Google AI key, using basic parsing');
      extractedItems = parseBasicBOQ(file_content);
    }

    const itemsWithMatches = extractedItems.map((item, index) => {
      let matchedMaterial = null;
      let matchConfidence = item.match_confidence || 0;

      if (masterMaterials && item.item_description) {
        const descLower = item.item_description.toLowerCase();
        
        for (const material of masterMaterials) {
          const nameLower = material.material_name.toLowerCase();
          const codeLower = material.material_code.toLowerCase();
          
          if (item.item_code && codeLower === item.item_code.toLowerCase()) {
            matchedMaterial = material;
            matchConfidence = 0.95;
            break;
          }
          
          if (descLower.includes(nameLower) || nameLower.includes(descLower)) {
            matchedMaterial = material;
            matchConfidence = Math.max(matchConfidence, 0.7);
          }
          
          const keywords = ['rmu', 'substation', 'distribution board', 'db', 'cable', 'xlpe', 
                          'tray', 'ladder', 'earth', 'lighting', 'led', 'emergency', 'isolator',
                          'circuit breaker', 'mcb', 'mccb', 'contactor', 'transformer'];
          for (const kw of keywords) {
            if (descLower.includes(kw) && nameLower.includes(kw)) {
              matchedMaterial = material;
              matchConfidence = Math.max(matchConfidence, 0.6);
            }
          }
        }
      }

      return {
        upload_id,
        row_number: item.row_number || index + 1,
        bill_number: item.bill_number,
        bill_name: item.bill_name,
        section_code: item.section_code,
        section_name: item.section_name,
        item_code: item.item_code,
        item_description: item.item_description,
        quantity: item.is_rate_only ? null : item.quantity,
        is_rate_only: item.is_rate_only || false,
        unit: item.unit,
        supply_rate: item.supply_rate,
        install_rate: item.install_rate,
        total_rate: item.total_rate,
        supply_cost: item.supply_cost,
        install_cost: item.install_cost,
        prime_cost: item.prime_cost,
        profit_percentage: item.profit_percentage,
        suggested_category_name: item.suggested_category_name,
        matched_material_id: matchedMaterial?.id || null,
        match_confidence: matchConfidence,
        raw_data: item.raw_data || {},
        review_status: 'pending'
      };
    });

    if (itemsWithMatches.length > 0) {
      const { error: insertError } = await supabase
        .from('boq_extracted_items')
        .insert(itemsWithMatches);

      if (insertError) {
        console.error('[BOQ Extract] Insert error:', insertError);
        throw insertError;
      }
    }

    const matchedCount = itemsWithMatches.filter(i => i.matched_material_id).length;
    const rateOnlyCount = itemsWithMatches.filter(i => i.is_rate_only).length;
    const billCount = new Set(itemsWithMatches.map(i => i.bill_number).filter(Boolean)).size;
    const sectionCount = new Set(itemsWithMatches.map(i => `${i.bill_number}-${i.section_code}`).filter(s => s !== 'null-null')).size;
    
    await supabase
      .from('boq_uploads')
      .update({
        status: 'completed',
        extraction_completed_at: new Date().toISOString(),
        total_items_extracted: itemsWithMatches.length,
        items_matched_to_master: matchedCount
      })
      .eq('id', upload_id);

    console.log(`[BOQ Extract] Completed: ${itemsWithMatches.length} items, ${matchedCount} matched, ${billCount} bills, ${sectionCount} sections`);

    return new Response(
      JSON.stringify({
        success: true,
        items_extracted: itemsWithMatches.length,
        items_matched: matchedCount,
        rate_only_items: rateOnlyCount,
        bills_found: billCount,
        sections_found: sectionCount,
        message: `Successfully extracted ${itemsWithMatches.length} items from ${billCount} bill(s)`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BOQ Extract] Error:', errorMessage);

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

function parseBasicBOQ(content: string): ExtractedItem[] {
  const lines = content.split('\n').filter(l => l.trim());
  const items: ExtractedItem[] = [];
  
  let currentBill = 1;
  let currentBillName = '';
  let currentSection = '';
  let currentSectionName = '';
  let rowNumber = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    
    const billMatch = trimmed.match(/BILL\s*(?:NO\.?\s*)?(\d+)\s*[-:.]?\s*(.+)?/i);
    if (billMatch) {
      currentBill = parseInt(billMatch[1]);
      currentBillName = billMatch[2]?.trim() || '';
      continue;
    }

    const sectionMatch = trimmed.match(/^([A-N])[.\s]+(.+)/i) || 
                        trimmed.match(/SECTION\s*([A-N])[.\s]*(.+)?/i);
    if (sectionMatch) {
      currentSection = sectionMatch[1].toUpperCase();
      currentSectionName = sectionMatch[2]?.trim() || '';
      continue;
    }

    const itemMatch = trimmed.match(/^([A-N]\d+(?:\.\d+)*)\s+(.+)/i);
    if (itemMatch) {
      rowNumber++;
      const parts = line.split(/\t|,/);
      const isRateOnly = /rate\s*only/i.test(line);
      
      items.push({
        row_number: rowNumber,
        bill_number: currentBill,
        bill_name: currentBillName,
        section_code: currentSection || itemMatch[1].charAt(0).toUpperCase(),
        section_name: currentSectionName,
        item_code: itemMatch[1],
        item_description: itemMatch[2] || parts[1]?.trim() || '',
        quantity: isRateOnly ? null : (parseFloat(parts[2]) || null),
        is_rate_only: isRateOnly,
        unit: parts[3]?.trim() || null,
        supply_rate: parseFloat(parts[4]) || null,
        install_rate: parseFloat(parts[5]) || null,
        total_rate: parseFloat(parts[6]) || parseFloat(parts[4]) || null,
        supply_cost: null,
        install_cost: null,
        prime_cost: null,
        profit_percentage: null,
        suggested_category_name: null,
        match_confidence: 0.3,
        raw_data: { original_line: line }
      });
    }
  }

  return items;
}
