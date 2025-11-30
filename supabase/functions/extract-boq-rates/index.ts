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

// Category keywords for better matching
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'HV': ['substation', '11kv', '11 kv', '22kv', '33kv', 'medium voltage', 'mv ', 'rmu', 'ring main', 'transformer', 'mva', 'switchgear'],
  'LV': ['distribution board', 'db-', 'mdb', 'sdb', 'main board', 'sub board', 'panel', 'lv ', 'low voltage', 'busbar', 'bus duct'],
  'CB-PW': ['xlpe', 'pvc cable', 'power cable', 'armoured cable', 'swa ', 'cable 4c', 'cable 3c', 'cable 2c', '95mm', '70mm', '50mm', '35mm', '25mm', '16mm'],
  'CB-CT': ['control cable', 'signal cable', 'instrumentation', 'screened cable'],
  'CT': ['cable tray', 'cable ladder', 'trunking', 'conduit', 'gpo trunking', 'perforated', 'solid lid'],
  'EA': ['earth', 'earthing', 'ground', 'electrode', 'lightning', 'equipotential', 'earth rod', 'earth tape', 'earth bar'],
  'LT': ['light fitting', 'led ', 'luminaire', 'downlight', 'panel light', 'strip light', 'high bay', 'flood light', 'emergency light', 'exit sign'],
  'AC': ['gland', 'lug', 'termination', 'cable accessories', 'joint', 'heat shrink', 'cable tie'],
  'SW': ['switch', 'socket', 'isolator', 'mcb', 'mccb', 'rcd', 'rcbo', 'circuit breaker', 'contactor', 'starter', 'dol'],
  'GN': ['prelim', 'builders work', 'testing', 'commissioning', 'as-built', 'documentation', 'general', 'attendance'],
  'FC': ['fire alarm', 'smoke detector', 'call point', 'sounder', 'beacon', 'fire detection'],
  'SC': ['access control', 'cctv', 'camera', 'intercom', 'gate motor', 'boom gate', 'security'],
  'AV': ['speaker', 'audio', 'video', 'projector', 'screen', 'pa system', 'background music'],
  'DB': ['draw box', 'junction box', 'pull box', 'enclosure', 'ip55', 'ip65', 'weatherproof box'],
  'AP': ['appliance', 'geyser', 'water heater', 'extractor', 'fan', 'pump', 'motor', 'hvac', 'air conditioning'],
};

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
    console.log(`[BOQ Extract] Content length: ${file_content?.length || 0} characters`);

    await supabase
      .from('boq_uploads')
      .update({ 
        status: 'processing',
        extraction_started_at: new Date().toISOString()
      })
      .eq('id', upload_id);

    // Fetch reference data
    const { data: categories } = await supabase
      .from('material_categories')
      .select('id, category_code, category_name, description')
      .eq('is_active', true);

    const { data: masterMaterials } = await supabase
      .from('master_materials')
      .select('id, material_code, material_name, category_id, standard_supply_cost, standard_install_cost')
      .eq('is_active', true);

    const { data: standardSections } = await supabase
      .from('boq_sections')
      .select('section_code, section_name, display_order, category_mapping_id')
      .order('display_order');

    const categoryList = categories?.map(c => `${c.category_code}: ${c.category_name} - ${c.description || ''}`).join('\n') || '';
    const sectionList = standardSections?.map(s => `${s.section_code}: ${s.section_name}`).join('\n') || '';
    
    // Build a comprehensive extraction prompt
    const extractionPrompt = `You are an expert South African electrical quantity surveyor parsing Bills of Quantities (BOQs).
Your task is to extract EVERY single line item from this BOQ document, preserving all details exactly as shown.

DOCUMENT STRUCTURE TO DETECT:
1. BILLS: "BILL 1", "BILL NO. 1", "BILL 2" etc. Each bill = different building/area (MALL, BOXER, TRUWORTHS, etc.)
2. SECTIONS: Letter codes A through N:
   - A: Preliminaries & General
   - B: Medium/High Voltage (Substations, RMUs, MV cables)
   - C: Low Voltage Distribution (Main DBs, Sub DBs, Panels)
   - D: Low Voltage Cabling (Power cables, XLPE, SWA, PVC)
   - E: Containment (Cable tray, ladder, conduit, trunking)
   - F: Earthing & Lightning (Earth electrodes, conductors, bonding)
   - G: General Power (Sockets, isolators, switches)
   - H: Lighting (LED fittings, emergency lights, exit signs)
   - I: Fire Detection & Alarm
   - J: Security Systems (CCTV, Access Control)
   - K: Appliances (Geysers, extractors, pumps)
   - L: Testing & Commissioning
   - M: Builders Work
   - N: Provisional/Rate Only Items

3. LINE ITEMS: Each has item code (B2.1, D1.1.1), description, qty, unit, rates

AVAILABLE MATERIAL CATEGORIES (use these codes):
${categoryList}

STANDARD SECTIONS:
${sectionList}

EXTRACTION RULES - CRITICAL:
1. Extract EVERY line item - do NOT skip any items
2. Preserve exact item codes as shown (B2.1, D1.1.1, E3.2.1, etc.)
3. Parse ALL columns: Item, Description, Qty, Unit, Supply Rate, Install Rate, Amount
4. Handle "Rate Only" items - they have no quantity but have rates
5. Handle "Prime Cost" items - base cost + profit percentage
6. South African currency is ZAR (R) - amounts can be R1,250.00 or 1250.00
7. Common units: each, m, m², m³, kg, set, lot, pair, No, Nr, item, sum

ITEM TYPES TO RECOGNIZE:
- Substations, RMUs, transformers → HV category
- Main DBs, sub DBs, panels → LV category  
- XLPE cables, SWA cables, PVC cables → CB-PW category
- Cable tray, ladder, trunking, conduit → CT category
- Earth electrodes, earth bars, bonding → EA category
- LED fittings, downlights, emergency lights → LT category
- Draw boxes, junction boxes → DB category
- Isolators, MCBs, switches, sockets → SW category
- Geysers, extractors, pumps → AP category
- Cable glands, lugs, terminations → AC category

FOR EACH ITEM, RETURN:
{
  "row_number": <sequential number>,
  "bill_number": <1, 2, 3 etc or null>,
  "bill_name": "<MALL PORTION, BOXER etc or null>",
  "section_code": "<A-N>",
  "section_name": "<full section name>",
  "item_code": "<exact code like B2.1>",
  "item_description": "<full description>",
  "quantity": <number or null if rate only>,
  "is_rate_only": <true/false>,
  "unit": "<each/m/m²/kg/etc>",
  "supply_rate": <number or null>,
  "install_rate": <number or null>,
  "total_rate": <number if combined rate>,
  "supply_cost": <total supply amount>,
  "install_cost": <total install amount>,
  "prime_cost": <PC base cost if applicable>,
  "profit_percentage": <% on PC items>,
  "suggested_category_name": "<category code from list>",
  "match_confidence": <0.0-1.0>
}

Return ONLY a valid JSON array, no markdown code blocks or explanation.
Parse ALL items from ALL sheets/bills/sections in this document.

BOQ CONTENT TO PARSE:
${file_content}`;

    let extractedItems: ExtractedItem[] = [];

    if (googleApiKey && file_content && file_content.length > 50) {
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
              maxOutputTokens: 65536,
            }
          })
        }
      );

      const aiResult = await response.json();
      
      if (aiResult.candidates?.[0]?.content?.parts?.[0]?.text) {
        const rawText = aiResult.candidates[0].content.parts[0].text;
        // Clean up JSON response
        let cleanedText = rawText
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        
        // Handle potential BOM or other issues
        if (cleanedText.charCodeAt(0) === 0xFEFF) {
          cleanedText = cleanedText.slice(1);
        }
        
        try {
          extractedItems = JSON.parse(cleanedText);
          console.log(`[BOQ Extract] AI extracted ${extractedItems.length} items`);
        } catch (parseError) {
          console.error('[BOQ Extract] Failed to parse AI response:', parseError);
          console.log('[BOQ Extract] Raw response preview:', rawText.substring(0, 2000));
          
          // Try to find and extract JSON array from response
          const jsonMatch = rawText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            try {
              extractedItems = JSON.parse(jsonMatch[0]);
              console.log(`[BOQ Extract] Recovered ${extractedItems.length} items from partial response`);
            } catch (e) {
              console.error('[BOQ Extract] Recovery also failed');
            }
          }
        }
      } else {
        console.error('[BOQ Extract] No AI response:', JSON.stringify(aiResult).substring(0, 1000));
        // Check for rate limiting or errors
        if (aiResult.error) {
          console.error('[BOQ Extract] AI Error:', aiResult.error);
        }
      }
    } else {
      console.log('[BOQ Extract] Using basic parsing (no AI key or content too short)');
      extractedItems = parseBasicBOQ(file_content);
    }

    // Process and match items
    const itemsWithMatches = extractedItems.map((item, index) => {
      let matchedMaterial: { id: string; material_name: string } | null = null;
      let matchConfidence = item.match_confidence || 0;
      let suggestedCategoryId: string | null = null;
      let suggestedCategoryName = item.suggested_category_name;

      const descLower = (item.item_description || '').toLowerCase();
      
      // First, try to determine category from keywords
      if (!suggestedCategoryName) {
        for (const [catCode, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
          for (const kw of keywords) {
            if (descLower.includes(kw.toLowerCase())) {
              suggestedCategoryName = catCode;
              break;
            }
          }
          if (suggestedCategoryName) break;
        }
      }

      // Find category ID
      if (suggestedCategoryName && categories) {
        const cat = categories.find(c => 
          c.category_code.toLowerCase() === suggestedCategoryName?.toLowerCase()
        );
        if (cat) {
          suggestedCategoryId = cat.id;
        }
      }

      // Try to match to master materials
      if (masterMaterials && item.item_description) {
        // Exact code match
        for (const material of masterMaterials) {
          const nameLower = material.material_name.toLowerCase();
          const codeLower = (material.material_code || '').toLowerCase();
          const itemCodeLower = (item.item_code || '').toLowerCase();
          
          // Exact code match
          if (itemCodeLower && codeLower && codeLower === itemCodeLower) {
            matchedMaterial = material;
            matchConfidence = 0.95;
            break;
          }
          
          // Exact description match
          if (descLower === nameLower) {
            matchedMaterial = material;
            matchConfidence = 0.9;
            break;
          }
        }

        // Fuzzy matching if no exact match
        if (!matchedMaterial) {
          for (const material of masterMaterials) {
            const nameLower = material.material_name.toLowerCase();
            
            // Partial description match
            if (descLower.includes(nameLower) || nameLower.includes(descLower)) {
              if (descLower.length < 200 && nameLower.length < 200) { // Avoid false matches on long descriptions
                matchedMaterial = material;
                matchConfidence = Math.max(matchConfidence, 0.7);
              }
            }
            
            // Keyword-based matching for electrical items
            const matchKeywords = [
              'xlpe', 'swa', 'pvc', 'cable', 'tray', 'ladder', 'trunking', 'conduit',
              'led', 'downlight', 'panel light', 'emergency', 'exit sign',
              'mcb', 'mccb', 'isolator', 'contactor', 'starter',
              'earth rod', 'earth bar', 'electrode',
              'distribution board', 'db ', 'mdb', 'sdb',
              'gland', 'lug', 'termination',
              'draw box', 'junction box',
              'rmu', 'transformer', 'substation'
            ];
            
            for (const kw of matchKeywords) {
              if (descLower.includes(kw) && nameLower.includes(kw)) {
                matchedMaterial = material;
                matchConfidence = Math.max(matchConfidence, 0.6);
                break;
              }
            }
            
            if (matchConfidence >= 0.7) break;
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
        item_description: item.item_description || 'Unknown item',
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
        suggested_category_id: suggestedCategoryId,
        suggested_category_name: suggestedCategoryName,
        matched_material_id: matchedMaterial?.id || null,
        match_confidence: matchConfidence,
        raw_data: item.raw_data || {},
        review_status: 'pending'
      };
    });

    // Insert extracted items
    if (itemsWithMatches.length > 0) {
      // Insert in batches to avoid payload size limits
      const batchSize = 100;
      for (let i = 0; i < itemsWithMatches.length; i += batchSize) {
        const batch = itemsWithMatches.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('boq_extracted_items')
          .insert(batch);

        if (insertError) {
          console.error(`[BOQ Extract] Insert error for batch ${i}:`, insertError);
          throw insertError;
        }
      }
      console.log(`[BOQ Extract] Inserted ${itemsWithMatches.length} items`);
    }

    // Calculate statistics
    const matchedCount = itemsWithMatches.filter(i => i.matched_material_id).length;
    const rateOnlyCount = itemsWithMatches.filter(i => i.is_rate_only).length;
    const billNumbers = new Set(itemsWithMatches.map(i => i.bill_number).filter(Boolean));
    const sectionCodes = new Set(itemsWithMatches.map(i => i.section_code).filter(Boolean));
    
    // Update upload status
    await supabase
      .from('boq_uploads')
      .update({
        status: 'completed',
        extraction_completed_at: new Date().toISOString(),
        total_items_extracted: itemsWithMatches.length,
        items_matched_to_master: matchedCount
      })
      .eq('id', upload_id);

    console.log(`[BOQ Extract] Completed: ${itemsWithMatches.length} items, ${matchedCount} matched, ${billNumbers.size} bills, ${sectionCodes.size} sections`);

    return new Response(
      JSON.stringify({
        success: true,
        items_extracted: itemsWithMatches.length,
        items_matched: matchedCount,
        rate_only_items: rateOnlyCount,
        bills_found: billNumbers.size,
        sections_found: sectionCodes.size,
        sections: Array.from(sectionCodes),
        message: `Successfully extracted ${itemsWithMatches.length} items from ${billNumbers.size} bill(s) across ${sectionCodes.size} section(s)`
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

/**
 * Basic BOQ parsing when AI is not available
 */
function parseBasicBOQ(content: string): ExtractedItem[] {
  if (!content) return [];
  
  const lines = content.split('\n').filter(l => l.trim());
  const items: ExtractedItem[] = [];
  
  let currentBill = 1;
  let currentBillName = '';
  let currentSection = '';
  let currentSectionName = '';
  let rowNumber = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip sheet headers and empty lines
    if (trimmed.startsWith('===') || trimmed.startsWith('###') || !trimmed) {
      // But extract bill/section info from headers
      const billMatch = trimmed.match(/BILL\s*(?:NO\.?\s*)?(\d+)|BILL\s*(\d+)/i);
      if (billMatch) {
        currentBill = parseInt(billMatch[1] || billMatch[2]);
        const nameMatch = trimmed.match(/[-:]\s*(.+?)(?:\s*===|$)/);
        currentBillName = nameMatch?.[1]?.trim() || '';
      }
      continue;
    }
    
    // Detect bill headers
    const billMatch = trimmed.match(/BILL\s*(?:NO\.?\s*)?(\d+)\s*[-:.]?\s*(.+)?/i);
    if (billMatch) {
      currentBill = parseInt(billMatch[1]);
      currentBillName = billMatch[2]?.trim() || '';
      continue;
    }

    // Detect section headers (A. PRELIMINARIES, B. MEDIUM VOLTAGE, etc.)
    const sectionMatch = trimmed.match(/^([A-N])[.\s]+(.+)/i) || 
                        trimmed.match(/SECTION\s*([A-N])[.\s]*(.+)?/i);
    if (sectionMatch) {
      currentSection = sectionMatch[1].toUpperCase();
      currentSectionName = sectionMatch[2]?.trim() || '';
      continue;
    }

    // Detect line items (A1.1, B2.1, D1.1.1, etc.)
    const itemMatch = trimmed.match(/^([A-N]\d+(?:\.\d+)*)\s+(.+)/i);
    if (itemMatch) {
      rowNumber++;
      const parts = line.split(/\t/);
      const isRateOnly = /rate\s*only/i.test(line);
      
      // Try to extract numeric values from tab-separated columns
      let qty: number | null = null;
      let unit: string | null = null;
      let supplyRate: number | null = null;
      let installRate: number | null = null;
      let totalRate: number | null = null;
      
      // Typical column order: Item | Description | Qty | Unit | Supply | Install | Amount
      if (parts.length >= 3) {
        const qtyStr = parts[2]?.trim();
        if (qtyStr && !isRateOnly) {
          qty = parseFloat(qtyStr.replace(/[^\d.-]/g, '')) || null;
        }
      }
      if (parts.length >= 4) {
        unit = parts[3]?.trim() || null;
      }
      if (parts.length >= 5) {
        supplyRate = parseFloat(parts[4]?.replace(/[^\d.-]/g, '')) || null;
      }
      if (parts.length >= 6) {
        installRate = parseFloat(parts[5]?.replace(/[^\d.-]/g, '')) || null;
      }
      if (parts.length >= 7) {
        totalRate = parseFloat(parts[6]?.replace(/[^\d.-]/g, '')) || null;
      }
      
      // Determine category from description
      const descLower = (itemMatch[2] || parts[1] || '').toLowerCase();
      let suggestedCategory: string | null = null;
      
      for (const [catCode, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (const kw of keywords) {
          if (descLower.includes(kw.toLowerCase())) {
            suggestedCategory = catCode;
            break;
          }
        }
        if (suggestedCategory) break;
      }
      
      items.push({
        row_number: rowNumber,
        bill_number: currentBill,
        bill_name: currentBillName,
        section_code: currentSection || itemMatch[1].charAt(0).toUpperCase(),
        section_name: currentSectionName,
        item_code: itemMatch[1],
        item_description: itemMatch[2]?.trim() || parts[1]?.trim() || '',
        quantity: qty,
        is_rate_only: isRateOnly,
        unit: unit,
        supply_rate: supplyRate,
        install_rate: installRate,
        total_rate: totalRate || supplyRate,
        supply_cost: qty && supplyRate ? qty * supplyRate : null,
        install_cost: qty && installRate ? qty * installRate : null,
        prime_cost: null,
        profit_percentage: null,
        suggested_category_name: suggestedCategory,
        match_confidence: 0.3,
        raw_data: { original_line: line, parts }
      });
    }
  }

  return items;
}
