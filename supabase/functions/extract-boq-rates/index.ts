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

// Non-material patterns to filter out
const NON_MATERIAL_PATTERNS = [
  /^notes?\s*(to\s*tenderer)?$/i,
  /^(failure|comply|shall|must|refer|ditto|as\s*above)/i,
  /^(preliminary|preamble|general\s*notes)/i,
  /^(section|bill)\s*\d*$/i,
  /^(sub)?total$/i,
  /^carried\s*(forward|to)/i,
  /^(rate|amount)\s*only$/i,
  /^\d+\.?\s*$/, // Just numbers
  /^[a-z]\.?\s*$/i, // Just single letters
  /^(the\s+)?tenderer/i,
  /^(item|description|qty|quantity|unit|rate|amount)$/i, // Column headers
];

// Minimum description length for valid material
const MIN_DESCRIPTION_LENGTH = 5;

/**
 * Filter out non-material items from extracted list
 */
function filterValidMaterialItems(items: ExtractedItem[]): ExtractedItem[] {
  return items.filter(item => {
    const desc = (item.item_description || '').trim();
    
    // Skip empty or very short descriptions
    if (!desc || desc.length < MIN_DESCRIPTION_LENGTH) {
      return false;
    }
    
    // Skip if description is just a number
    if (/^\d+\.?\d*$/.test(desc)) {
      return false;
    }
    
    // Skip if matches non-material patterns
    for (const pattern of NON_MATERIAL_PATTERNS) {
      if (pattern.test(desc)) {
        return false;
      }
    }
    
    // Skip if no rates AND no quantity (likely a header or note)
    const hasRate = item.supply_rate || item.install_rate || item.total_rate;
    const hasQty = item.quantity !== null && item.quantity !== undefined;
    const isRateOnly = item.is_rate_only;
    
    if (!hasRate && !hasQty && !isRateOnly) {
      // Allow if it has an item code that looks valid
      if (!item.item_code || !/^[A-Z]\d+/i.test(item.item_code)) {
        return false;
      }
    }
    
    return true;
  });
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

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { upload_id, file_content, file_type } = await req.json();

    if (!upload_id) {
      throw new Error('upload_id is required');
    }

    console.log(`[BOQ Extract] Starting extraction for upload: ${upload_id}`);
    console.log(`[BOQ Extract] Content length: ${file_content?.length || 0} characters`);

    // Update status to processing immediately
    await supabase
      .from('boq_uploads')
      .update({ 
        status: 'processing',
        extraction_started_at: new Date().toISOString()
      })
      .eq('id', upload_id);

    // Process in background using EdgeRuntime.waitUntil
    const processingPromise = processExtraction(
      supabase,
      upload_id,
      file_content,
      lovableApiKey
    );

    // Use EdgeRuntime.waitUntil to continue processing after response
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(processingPromise);
    } else {
      // Fallback: just start the promise (won't wait for completion)
      processingPromise.catch(err => {
        console.error('[BOQ Extract] Background processing error:', err);
      });
    }

    // Return immediately - processing continues in background
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Processing started. Check upload status for results.',
        upload_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BOQ Extract] Error:', errorMessage);

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
 * Main extraction processing - runs in background
 */
async function processExtraction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  upload_id: string,
  file_content: string,
  lovableApiKey: string | undefined
): Promise<void> {
  try {
    // Fetch reference data
    const { data: categories } = await supabase
      .from('material_categories')
      .select('id, category_code, category_name, description')
      .eq('is_active', true);

    const { data: masterMaterials } = await supabase
      .from('master_materials')
      .select('id, material_code, material_name, category_id, standard_supply_cost, standard_install_cost')
      .eq('is_active', true);

    const categoryList = categories?.map((c: { category_code: string; category_name: string }) => `${c.category_code}: ${c.category_name}`).join(', ') || '';
    
    // Split content into sheets for processing
    const sheets = splitIntoSheets(file_content);
    console.log(`[BOQ Extract] Found ${sheets.length} sheets to process`);

    let allExtractedItems: ExtractedItem[] = [];
    let globalRowNumber = 0;

    // Process each sheet separately to avoid truncation
    for (const sheet of sheets) {
      if (sheet.content.length < 100) continue; // Skip empty/small sheets
      
      console.log(`[BOQ Extract] Processing sheet: ${sheet.name}`);
      
      const sheetItems = await extractFromSheet(sheet, categoryList, lovableApiKey);
      
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

    // Filter out non-material items (notes, headers, preamble, etc.)
    const beforeFilter = allExtractedItems.length;
    allExtractedItems = filterValidMaterialItems(allExtractedItems);
    console.log(`[BOQ Extract] Filtered: ${beforeFilter} -> ${allExtractedItems.length} valid material items`);

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
        const cat = categories.find((c: { category_code: string; id: string }) => 
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
    
    // Update upload status to completed
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

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BOQ Extract] Processing error:', errorMessage);

    // Update status to failed
    await supabase
      .from('boq_uploads')
      .update({
        status: 'failed',
        error_message: errorMessage
      })
      .eq('id', upload_id);
  }
}

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
  lovableApiKey: string | undefined
): Promise<ExtractedItem[]> {
  if (!lovableApiKey) {
    console.log(`[BOQ Extract] No API key, using basic parsing for ${sheet.name}`);
    return parseSheetBasic(sheet.name, sheet.content);
  }

  const systemPrompt = `You are an expert at extracting electrical Bills of Quantities (BOQ) data. Extract ONLY actual material/work items.

CRITICAL - DO NOT EXTRACT THESE:
- "NOTES TO TENDERER" or any notes/preamble text
- Row numbers alone (1, 2, 3, etc.)
- Section headers without items (just "A. CABLES" alone)
- Instructions like "Failure to comply with...", "The tenderer shall...", etc.
- Blank or summary rows
- Text that is clearly NOT a physical material or work item
- Percentage adjustments or contingencies without descriptions
- "Ditto", "As above", "Refer to" references alone

EXTRACT ONLY items that are:
- Physical materials (cables, conduit, switches, DBs, lights, etc.)
- Measurable work items with quantities and units
- Items with item codes like A1, B2.1, C1.1.1, etc.
- Items that have an actual material/work DESCRIPTION (not just numbers)

IMPORTANT RULES:
1. Item descriptions must be meaningful (e.g., "4mm² 4-core XLPE cable" NOT "1" or "2")
2. Skip any row that doesn't describe actual electrical materials or work
3. Parse South African BOQ format with costs in Rands (R)
4. Identify supply rate vs install rate columns correctly
5. Mark items as "rate_only" if quantity shows "Rate Only" or "RATE ONLY"

CATEGORIES for suggested_category_name:
${categoryList}

Common SA BOQ sections:
- A: Medium Voltage (substations, RMUs, MV cables)
- B: Low Voltage (DBs, panels, busbars)  
- C: Cables & Conductors (XLPE, PVC, armoured)
- D: Containment (conduit, trunking, cable tray)
- E: Earthing (earth rods, tape, conductors)
- F: Lighting (LED fittings, emergency lights)
- G: Small Power (sockets, isolators)
- H: Fire Detection
- J: CCTV / Security
- K: Telkom / Data`;

  const userPrompt = `Extract ONLY actual material/work line items from this sheet: "${sheet.name}"

SKIP: notes, instructions, headers without items, row numbers alone, preamble text.
ONLY INCLUDE: items with real material descriptions + quantities + rates.

For EACH valid material item extract:
- item_code: exact code (A1, B2.1, C1.1.1) - REQUIRED
- item_description: full material description (NOT just numbers) - REQUIRED, must be meaningful
- quantity: number or null if rate only
- is_rate_only: true/false
- unit: each/m/m²/kg/No/Nr/Sum/Lot/item/%
- supply_rate: supply cost per unit (R value)
- install_rate: install cost per unit (R value)
- total_rate: if rates not split
- section_code: letter (A, B, C...)
- section_name: section title
- suggested_category_name: from categories list
- bill_number: from sheet name (e.g., "4 Boxer" = 4)
- bill_name: tenant/area name

RESPOND WITH ONLY A JSON ARRAY, NO MARKDOWN BLOCKS. Return empty array [] if no valid materials found.

SHEET CONTENT:
${sheet.content.substring(0, 25000)}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 32000,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[BOQ Extract] API error ${response.status} for ${sheet.name}:`, errorText.substring(0, 300));
      
      if (response.status === 429) {
        console.log(`[BOQ Extract] Rate limited, using basic parsing for ${sheet.name}`);
      }
      return parseSheetBasic(sheet.name, sheet.content);
    }

    const aiResult = await response.json();
    
    if (aiResult.choices?.[0]?.message?.content) {
      const rawText = aiResult.choices[0].message.content;
      console.log(`[BOQ Extract] AI response length for ${sheet.name}: ${rawText.length} chars`);
      return parseAIResponse(rawText, sheet.name);
    } else {
      console.error(`[BOQ Extract] No AI content for ${sheet.name}:`, JSON.stringify(aiResult).substring(0, 300));
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
        match_confidence: 0.5,
        raw_data: item
      }));
    }
  } catch (parseError) {
    console.error(`[BOQ Extract] JSON parse error for ${sheetName}:`, parseError);
    
    // Try to extract partial items
    return extractPartialItems(cleanedText, sheetName);
  }
  
  return [];
}

/**
 * Extract partial items from malformed JSON
 */
function extractPartialItems(text: string, sheetName: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  
  // Look for objects with item_code and item_description
  const objectPattern = /\{[^{}]*"item_code"\s*:\s*"[^"]+"\s*[^{}]*"item_description"\s*:\s*"[^"]+"\s*[^{}]*\}/g;
  const matches = text.match(objectPattern);
  
  if (matches) {
    for (const match of matches) {
      try {
        const item = JSON.parse(match);
        items.push({
          row_number: items.length + 1,
          bill_number: extractBillNumber(sheetName),
          bill_name: extractBillName(sheetName),
          section_code: item.section_code || null,
          section_name: item.section_name || null,
          item_code: item.item_code,
          item_description: item.item_description,
          quantity: parseFloat(item.quantity) || null,
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
          match_confidence: 0.3,
          raw_data: item
        });
      } catch {
        // Skip malformed objects
      }
    }
  }
  
  return items;
}

/**
 * Extract bill number from sheet name
 */
function extractBillNumber(sheetName: string): number | null {
  const match = sheetName.match(/^(\d+)/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Extract bill name from sheet name
 */
function extractBillName(sheetName: string): string | null {
  const match = sheetName.match(/^\d+[\.\s]+(.+)$/);
  return match ? match[1].trim() : sheetName;
}

/**
 * Basic parsing for a single sheet - improved to detect columns
 */
function parseSheetBasic(sheetName: string, content: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  const lines = content.split('\n').filter(l => l.trim());
  
  let currentSection = '';
  let currentSectionCode = '';
  let rowNum = 0;
  
  // Try to detect column positions from header row
  let headerRow: string[] = [];
  let columnMap = { desc: -1, qty: -1, unit: -1, supply: -1, install: -1, rate: -1, amount: -1, code: -1 };
  
  // Find header row by looking for common column names
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const line = lines[i].toLowerCase();
    if (line.includes('description') || line.includes('particulars') || line.includes('qty') || line.includes('rate')) {
      headerRow = lines[i].split('\t');
      headerRow.forEach((col, idx) => {
        const c = col.toLowerCase().trim();
        if (/desc|particular|item\s*desc/i.test(c)) columnMap.desc = idx;
        if (/^qty$|quantity/i.test(c)) columnMap.qty = idx;
        if (/^unit$|^u$/i.test(c)) columnMap.unit = idx;
        if (/supply|material/i.test(c)) columnMap.supply = idx;
        if (/install|labour|labor/i.test(c)) columnMap.install = idx;
        if (/^rate$|unit.*rate/i.test(c)) columnMap.rate = idx;
        if (/amount|total/i.test(c)) columnMap.amount = idx;
        if (/item|ref|^no\.?$|^nr$/i.test(c)) columnMap.code = idx;
      });
      break;
    }
  }
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Check for section headers
    const sectionMatch = trimmed.match(/^###\s*([A-Z][\.\s]*.+)/i);
    if (sectionMatch) {
      currentSectionCode = sectionMatch[1].match(/^([A-Z])/)?.[1] || '';
      currentSection = sectionMatch[1];
      continue;
    }
    
    // Skip header/note rows
    if (/^(item|description|qty|rate|notes?\s*to|failure|comply|shall|must)/i.test(trimmed)) {
      continue;
    }
    
    const parts = trimmed.split('\t');
    if (parts.length < 2) continue;
    
    // Try to extract from detected columns or use positional fallback
    let itemCode = columnMap.code >= 0 ? parts[columnMap.code]?.trim() : null;
    let description = columnMap.desc >= 0 ? parts[columnMap.desc]?.trim() : parts[0]?.trim();
    let unit = columnMap.unit >= 0 ? parts[columnMap.unit]?.trim() : null;
    let quantity: number | null = null;
    let supplyRate: number | null = null;
    let installRate: number | null = null;
    let totalRate: number | null = null;
    let isRateOnly = false;
    
    // Parse quantity
    const qtyStr = columnMap.qty >= 0 ? parts[columnMap.qty] : parts[1];
    if (qtyStr?.toLowerCase().includes('rate only')) {
      isRateOnly = true;
    } else {
      quantity = parseFloat(qtyStr) || null;
    }
    
    // Parse rates - try detected columns first
    if (columnMap.supply >= 0) supplyRate = parseFloat(parts[columnMap.supply]) || null;
    if (columnMap.install >= 0) installRate = parseFloat(parts[columnMap.install]) || null;
    if (columnMap.rate >= 0) totalRate = parseFloat(parts[columnMap.rate]) || null;
    
    // Fallback: look for numbers in later columns
    if (!supplyRate && !installRate && !totalRate) {
      for (let i = 2; i < parts.length; i++) {
        const num = parseFloat(parts[i]?.replace(/[R,\s]/g, ''));
        if (!isNaN(num) && num > 0) {
          if (!supplyRate) supplyRate = num;
          else if (!installRate) installRate = num;
          break;
        }
      }
    }
    
    // Try to extract item code from description if not found
    if (!itemCode) {
      const codeMatch = description?.match(/^([A-Z]\d+(?:\.\d+)*)\s*/i);
      if (codeMatch) {
        itemCode = codeMatch[1];
        description = description?.substring(codeMatch[0].length).trim();
      }
    }
    
    // Skip if description is too short or looks like garbage
    if (!description || description.length < 5 || /^\d+\.?\d*$/.test(description)) {
      continue;
    }
    
    // Skip if no rates and no meaningful quantity
    if (!supplyRate && !installRate && !totalRate && !quantity && !isRateOnly) {
      continue;
    }
    
    rowNum++;
    
    // Suggest category
    let suggestedCategory = null;
    const descLower = description.toLowerCase();
    for (const [catCode, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(kw => descLower.includes(kw.toLowerCase()))) {
        suggestedCategory = catCode;
        break;
      }
    }
    
    items.push({
      row_number: rowNum,
      bill_number: extractBillNumber(sheetName),
      bill_name: extractBillName(sheetName),
      section_code: currentSectionCode,
      section_name: currentSection,
      item_code: itemCode,
      item_description: description,
      quantity: isRateOnly ? null : quantity,
      is_rate_only: isRateOnly,
      unit,
      supply_rate: supplyRate,
      install_rate: installRate,
      total_rate: totalRate,
      supply_cost: null,
      install_cost: null,
      prime_cost: null,
      profit_percentage: null,
      suggested_category_name: suggestedCategory,
      match_confidence: 0.4,
      raw_data: { original_line: trimmed }
    });
  }
  
  return items;
}

/**
 * Fallback basic BOQ parsing
 */
function parseBasicBOQ(content: string): ExtractedItem[] {
  const sheets = splitIntoSheets(content);
  
  if (sheets.length > 0) {
    let allItems: ExtractedItem[] = [];
    for (const sheet of sheets) {
      allItems = allItems.concat(parseSheetBasic(sheet.name, sheet.content));
    }
    return allItems;
  }
  
  // If no sheets, parse entire content
  return parseSheetBasic('Unknown', content);
}
