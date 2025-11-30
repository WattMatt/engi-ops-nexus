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
  'CB-PW': ['xlpe', 'pvc cable', 'power cable', 'armoured cable', 'swa ', 'cable 4c', 'cable 3c', 'cable 2c', '95mm', '70mm', '50mm', '35mm', '25mm', '16mm', '240mm', '185mm', '150mm', '120mm'],
  'CB-CT': ['control cable', 'signal cable', 'instrumentation', 'screened cable'],
  'CT': ['cable tray', 'cable ladder', 'trunking', 'conduit', 'gpo trunking', 'perforated', 'solid lid', 'nextube'],
  'EA': ['earth', 'earthing', 'ground', 'electrode', 'lightning', 'equipotential', 'earth rod', 'earth tape', 'earth bar'],
  'LT': ['light fitting', 'led ', 'luminaire', 'downlight', 'panel light', 'strip light', 'high bay', 'flood light', 'emergency light', 'exit sign'],
  'AC': ['gland', 'lug', 'termination', 'cable accessories', 'joint', 'heat shrink', 'cable tie'],
  'SW': ['switch', 'socket', 'isolator', 'mcb', 'mccb', 'rcd', 'rcbo', 'circuit breaker', 'contactor', 'starter', 'dol'],
  'GN': ['prelim', 'builders work', 'testing', 'commissioning', 'as-built', 'documentation', 'general', 'attendance'],
  'FC': ['fire alarm', 'smoke detector', 'call point', 'sounder', 'beacon', 'fire detection'],
  'SC': ['access control', 'cctv', 'camera', 'intercom', 'gate motor', 'boom gate', 'security'],
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

    const categoryList = categories?.map(c => `${c.category_code}: ${c.category_name}`).join(', ') || '';
    
    // Split content into sheets for processing
    const sheets = splitIntoSheets(file_content);
    console.log(`[BOQ Extract] Found ${sheets.length} sheets to process`);

    let allExtractedItems: ExtractedItem[] = [];
    let globalRowNumber = 0;

    // Process each sheet separately to avoid truncation
    for (const sheet of sheets) {
      if (sheet.content.length < 100) continue; // Skip empty/small sheets
      
      console.log(`[BOQ Extract] Processing sheet: ${sheet.name}`);
      
      const sheetItems = await extractFromSheet(sheet, categoryList, googleApiKey);
      
      // Add global row numbers
      for (const item of sheetItems) {
        globalRowNumber++;
        item.row_number = globalRowNumber;
      }
      
      allExtractedItems = allExtractedItems.concat(sheetItems);
      console.log(`[BOQ Extract] Extracted ${sheetItems.length} items from ${sheet.name}`);
    }

    // If AI extraction got nothing, try basic parsing
    if (allExtractedItems.length === 0) {
      console.log('[BOQ Extract] AI extraction returned nothing, falling back to basic parsing');
      allExtractedItems = parseBasicBOQ(file_content);
    }

    console.log(`[BOQ Extract] Total items extracted: ${allExtractedItems.length}`);

    // Process and match items
    const itemsWithMatches = allExtractedItems.map((item, index) => {
      let matchedMaterial: { id: string; material_name: string } | null = null;
      let matchConfidence = item.match_confidence || 0;
      let suggestedCategoryId: string | null = null;
      let suggestedCategoryName = item.suggested_category_name;

      const descLower = (item.item_description || '').toLowerCase();
      
      // Determine category from keywords if not set
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
        for (const material of masterMaterials) {
          const nameLower = material.material_name.toLowerCase();
          const codeLower = (material.material_code || '').toLowerCase();
          const itemCodeLower = (item.item_code || '').toLowerCase();
          
          if (itemCodeLower && codeLower && codeLower === itemCodeLower) {
            matchedMaterial = material;
            matchConfidence = 0.95;
            break;
          }
          
          if (descLower === nameLower) {
            matchedMaterial = material;
            matchConfidence = 0.9;
            break;
          }
        }

        if (!matchedMaterial) {
          for (const material of masterMaterials) {
            const nameLower = material.material_name.toLowerCase();
            
            if (descLower.includes(nameLower) || nameLower.includes(descLower)) {
              if (descLower.length < 200 && nameLower.length < 200) {
                matchedMaterial = material;
                matchConfidence = Math.max(matchConfidence, 0.7);
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
      const batchSize = 50;
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

    console.log(`[BOQ Extract] Completed: ${itemsWithMatches.length} items, ${matchedCount} matched`);

    return new Response(
      JSON.stringify({
        success: true,
        items_extracted: itemsWithMatches.length,
        items_matched: matchedCount,
        rate_only_items: rateOnlyCount,
        bills_found: billNumbers.size,
        sections_found: sectionCodes.size,
        sections: Array.from(sectionCodes),
        message: `Successfully extracted ${itemsWithMatches.length} items`
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
 * Split content into individual sheets
 */
function splitIntoSheets(content: string): { name: string; content: string }[] {
  if (!content) return [];
  
  const sheets: { name: string; content: string }[] = [];
  const sheetMarker = '=== SHEET:';
  
  const parts = content.split(sheetMarker);
  
  for (const part of parts) {
    if (!part.trim()) continue;
    
    const lines = part.split('\n');
    const firstLine = lines[0] || '';
    const nameMatch = firstLine.match(/^(.+?)\s*===$/);
    const name = nameMatch ? nameMatch[1].trim() : 'Unknown';
    const sheetContent = lines.slice(1).join('\n');
    
    // Skip non-BOQ sheets
    if (name.toLowerCase().includes('notes') || 
        name.toLowerCase().includes('qualifications') ||
        name.toLowerCase().includes('summary')) {
      continue;
    }
    
    sheets.push({ name, content: sheetContent });
  }
  
  return sheets;
}

/**
 * Extract items from a single sheet using AI
 */
async function extractFromSheet(
  sheet: { name: string; content: string },
  categoryList: string,
  googleApiKey: string | undefined
): Promise<ExtractedItem[]> {
  if (!googleApiKey) {
    return parseSheetBasic(sheet.name, sheet.content);
  }

  const prompt = `Extract ALL electrical BOQ line items from this sheet. Return a JSON array.

SHEET: ${sheet.name}

For EACH line item with an item code (like A1, B2.1, C1.1.1, D3.2), extract:
- item_code: exact code (A1, B2.1, etc.)
- item_description: full description
- quantity: number or null if "Rate Only"
- is_rate_only: true if quantity shows "Rate Only" or "RATE ONLY"
- unit: each/m/m²/kg/No/Nr/Sum/Lot/%
- supply_rate: supply cost per unit
- install_rate: install cost per unit
- total_rate: combined rate if not split
- suggested_category_name: one of [${categoryList}]
- bill_number: extract from sheet name if present (e.g., "BILL NO. 1" = 1)
- section_code: A, B, C, D, etc.
- section_name: section title

South African BOQ format - costs in Rands (R).
ONLY return valid JSON array, no markdown, no explanation.

CONTENT:
${sheet.content.substring(0, 30000)}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
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
      return parseAIResponse(rawText, sheet.name);
    } else {
      console.error(`[BOQ Extract] No AI response for sheet ${sheet.name}:`, JSON.stringify(aiResult).substring(0, 500));
      return parseSheetBasic(sheet.name, sheet.content);
    }
  } catch (error) {
    console.error(`[BOQ Extract] AI error for sheet ${sheet.name}:`, error);
    return parseSheetBasic(sheet.name, sheet.content);
  }
}

/**
 * Parse AI response with robust error handling
 */
function parseAIResponse(rawText: string, sheetName: string): ExtractedItem[] {
  // Clean up response
  let cleanedText = rawText
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  
  // Try to find JSON array
  const arrayStart = cleanedText.indexOf('[');
  const arrayEnd = cleanedText.lastIndexOf(']');
  
  if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
    cleanedText = cleanedText.substring(arrayStart, arrayEnd + 1);
  }
  
  try {
    const items = JSON.parse(cleanedText);
    if (Array.isArray(items)) {
      return items.map((item, idx) => ({
        row_number: idx + 1,
        bill_number: item.bill_number || extractBillNumber(sheetName),
        bill_name: item.bill_name || extractBillName(sheetName),
        section_code: item.section_code || null,
        section_name: item.section_name || null,
        item_code: item.item_code || null,
        item_description: item.item_description || '',
        quantity: item.is_rate_only ? null : (parseFloat(item.quantity) || null),
        is_rate_only: item.is_rate_only || false,
        unit: item.unit || null,
        supply_rate: parseFloat(item.supply_rate) || null,
        install_rate: parseFloat(item.install_rate) || null,
        total_rate: parseFloat(item.total_rate) || null,
        supply_cost: parseFloat(item.supply_cost) || null,
        install_cost: parseFloat(item.install_cost) || null,
        prime_cost: parseFloat(item.prime_cost) || null,
        profit_percentage: parseFloat(item.profit_percentage) || null,
        suggested_category_name: item.suggested_category_name || null,
        match_confidence: item.match_confidence || 0.5,
        raw_data: { sheet: sheetName }
      }));
    }
  } catch (parseError) {
    console.error(`[BOQ Extract] JSON parse error for ${sheetName}:`, parseError);
    
    // Try to extract partial valid objects
    const partialItems = extractPartialItems(cleanedText, sheetName);
    if (partialItems.length > 0) {
      console.log(`[BOQ Extract] Recovered ${partialItems.length} items from partial response`);
      return partialItems;
    }
  }
  
  return [];
}

/**
 * Extract items from partial/truncated JSON
 */
function extractPartialItems(text: string, sheetName: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  
  // Match individual JSON objects
  const objectRegex = /\{[^{}]*"item_code"\s*:\s*"([^"]+)"[^{}]*"item_description"\s*:\s*"([^"]+)"[^{}]*\}/g;
  let match;
  let rowNum = 0;
  
  while ((match = objectRegex.exec(text)) !== null) {
    rowNum++;
    try {
      const objText = match[0];
      const item = JSON.parse(objText);
      items.push({
        row_number: rowNum,
        bill_number: extractBillNumber(sheetName),
        bill_name: extractBillName(sheetName),
        section_code: item.section_code || item.item_code?.charAt(0) || null,
        section_name: item.section_name || null,
        item_code: item.item_code,
        item_description: item.item_description,
        quantity: item.is_rate_only ? null : (parseFloat(item.quantity) || null),
        is_rate_only: item.is_rate_only || false,
        unit: item.unit || null,
        supply_rate: parseFloat(item.supply_rate) || null,
        install_rate: parseFloat(item.install_rate) || null,
        total_rate: parseFloat(item.total_rate) || null,
        supply_cost: null,
        install_cost: null,
        prime_cost: null,
        profit_percentage: null,
        suggested_category_name: item.suggested_category_name || null,
        match_confidence: 0.4,
        raw_data: { sheet: sheetName, partial: true }
      });
    } catch {
      // Skip invalid objects
    }
  }
  
  return items;
}

/**
 * Extract bill number from sheet name
 */
function extractBillNumber(sheetName: string): number | null {
  const match = sheetName.match(/BILL\s*(?:NO\.?\s*)?(\d+)/i) || 
                sheetName.match(/^(\d+)\./);
  return match ? parseInt(match[1]) : 1;
}

/**
 * Extract bill name from sheet name
 */
function extractBillName(sheetName: string): string | null {
  // Clean up sheet name
  let name = sheetName
    .replace(/BILL\s*(?:NO\.?\s*)?\d+\s*[-:.]\s*/i, '')
    .replace(/^\d+\.\d*\s*/, '')
    .trim();
  
  return name || null;
}

/**
 * Basic parsing for a single sheet
 */
function parseSheetBasic(sheetName: string, content: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  const lines = content.split('\n');
  
  let currentSection = '';
  let currentSectionName = '';
  let rowNumber = 0;
  
  const billNumber = extractBillNumber(sheetName);
  const billName = extractBillName(sheetName);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('###')) continue;
    
    // Detect section headers
    const sectionMatch = trimmed.match(/^([A-N])[.\s]+(.+)/i);
    if (sectionMatch && !trimmed.match(/^\w\d/)) {
      currentSection = sectionMatch[1].toUpperCase();
      currentSectionName = sectionMatch[2].trim();
      continue;
    }
    
    // Detect line items
    const itemMatch = trimmed.match(/^([A-N]\d+(?:\.\d+)*)\s+(.+)/i);
    if (itemMatch) {
      rowNumber++;
      const parts = line.split(/\t/);
      const isRateOnly = /rate\s*only/i.test(line);
      
      let qty: number | null = null;
      let unit: string | null = null;
      let supplyRate: number | null = null;
      let installRate: number | null = null;
      let amount: number | null = null;
      
      // Parse tab-separated values
      if (parts.length >= 3) {
        const qtyStr = parts[2]?.trim();
        if (qtyStr && !isRateOnly && !/rate/i.test(qtyStr)) {
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
        amount = parseFloat(parts[6]?.replace(/[^\d.-]/g, '')) || null;
      }
      
      const description = itemMatch[2]?.trim() || parts[1]?.trim() || '';
      
      // Determine category from description
      const descLower = description.toLowerCase();
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
        bill_number: billNumber,
        bill_name: billName,
        section_code: currentSection || itemMatch[1].charAt(0).toUpperCase(),
        section_name: currentSectionName,
        item_code: itemMatch[1],
        item_description: description,
        quantity: qty,
        is_rate_only: isRateOnly,
        unit: unit,
        supply_rate: supplyRate,
        install_rate: installRate,
        total_rate: amount && qty ? amount / qty : supplyRate,
        supply_cost: qty && supplyRate ? qty * supplyRate : null,
        install_cost: qty && installRate ? qty * installRate : null,
        prime_cost: null,
        profit_percentage: null,
        suggested_category_name: suggestedCategory,
        match_confidence: 0.3,
        raw_data: { original_line: line, parts, sheet: sheetName }
      });
    }
  }

  return items;
}

/**
 * Fallback basic parsing for entire content
 */
function parseBasicBOQ(content: string): ExtractedItem[] {
  if (!content) return [];
  
  const sheets = splitIntoSheets(content);
  let allItems: ExtractedItem[] = [];
  let globalRow = 0;
  
  for (const sheet of sheets) {
    const items = parseSheetBasic(sheet.name, sheet.content);
    for (const item of items) {
      globalRow++;
      item.row_number = globalRow;
    }
    allItems = allItems.concat(items);
  }
  
  // If no sheets found, parse entire content
  if (allItems.length === 0) {
    allItems = parseSheetBasic('Main', content);
  }
  
  return allItems;
}
