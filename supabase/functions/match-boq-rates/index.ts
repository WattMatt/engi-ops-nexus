import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MasterMaterial {
  id: string;
  material_code: string;
  material_name: string;
  category_id: string | null;
  standard_supply_cost: number | null;
  standard_install_cost: number | null;
  unit: string | null;
}

interface MaterialCategory {
  id: string;
  category_code: string;
  category_name: string;
  parent_category_id: string | null;
}

interface MatchResult {
  row_number: number;
  item_description: string;
  item_code: string | null;
  unit: string | null;
  quantity: number | null;
  supply_rate: number | null;
  install_rate: number | null;
  total_rate: number | null;
  matched_material_id: string | null;
  match_confidence: number;
  suggested_category_id: string | null;
  suggested_category_name: string | null;
  is_new_item: boolean;
  bill_number: number | null;
  bill_name: string | null;
  section_code: string | null;
  section_name: string | null;
  is_outlier: boolean;
  outlier_reason: string | null;
  math_validated: boolean;
  calculated_total: number | null;
}

// Unit standardization mapping
const UNIT_MAPPING: Record<string, string> = {
  'm2': 'M2', 'm²': 'M2', 'sqm': 'M2', 'sq.m': 'M2', 'sq m': 'M2', 'm.sq': 'M2', 'square meter': 'M2', 'square metre': 'M2',
  'm3': 'M3', 'm³': 'M3', 'cum': 'M3', 'cu.m': 'M3', 'cubic meter': 'M3', 'cubic metre': 'M3',
  'm': 'M', 'lm': 'M', 'lin.m': 'M', 'linear meter': 'M', 'metre': 'M', 'meter': 'M',
  'nr': 'NO', 'no': 'NO', 'no.': 'NO', 'nos': 'NO', 'ea': 'NO', 'each': 'NO', 'pcs': 'NO', 'pc': 'NO', 'unit': 'NO', 'units': 'NO',
  'kg': 'KG', 'kgs': 'KG', 'kilogram': 'KG',
  't': 'TON', 'ton': 'TON', 'tonne': 'TON', 'tons': 'TON',
  'set': 'SET', 'sets': 'SET',
  'lot': 'LOT', 'lots': 'LOT',
  'item': 'ITEM', 'items': 'ITEM',
  'ps': 'PS', 'p.s.': 'PS', 'prov sum': 'PS', 'provisional sum': 'PS',
  'pc sum': 'PC', 'prime cost': 'PC',
};

function standardizeUnit(unit: string | null): string | null {
  if (!unit) return null;
  const normalized = unit.toLowerCase().trim();
  return UNIT_MAPPING[normalized] || unit.toUpperCase();
}

async function getGoogleAccessToken(): Promise<string> {
  const serviceEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const privateKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');

  if (!serviceEmail || !privateKey) {
    throw new Error('Google service account credentials not configured');
  }

  const cleanedKey = privateKey.replace(/\\n/g, '\n');
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const scopes = [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
  ].join(' ');

  const claim = {
    iss: serviceEmail,
    scope: scopes,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const base64urlEncode = (obj: object | Uint8Array): string => {
    let bytes: Uint8Array;
    if (obj instanceof Uint8Array) {
      bytes = obj;
    } else {
      bytes = new TextEncoder().encode(JSON.stringify(obj));
    }
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const encodedHeader = base64urlEncode(header);
  const encodedClaim = base64urlEncode(claim);
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = cleanedKey.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signatureInput));
  const encodedSignature = base64urlEncode(new Uint8Array(signature));
  const jwt = `${signatureInput}.${encodedSignature}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${errorText}`);
  }

  return (await tokenResponse.json()).access_token;
}

async function fetchGoogleSheetContent(spreadsheetId: string): Promise<string> {
  const accessToken = await getGoogleAccessToken();
  
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const metaResponse = await fetch(metaUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  if (!metaResponse.ok) {
    throw new Error(`Failed to fetch Google Sheet: ${metaResponse.status}`);
  }
  
  const metadata = await metaResponse.json();
  const sheets = metadata.sheets || [];
  
  let combinedContent = '';
  
  for (const sheet of sheets) {
    const sheetTitle = sheet.properties?.title;
    if (!sheetTitle) continue;
    
    const skipPatterns = ['cover', 'summary', 'contents', 'index', 'template'];
    if (skipPatterns.some(p => sheetTitle.toLowerCase().includes(p))) continue;
    
    const rangeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}`;
    const rangeResponse = await fetch(rangeUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!rangeResponse.ok) continue;
    
    const rangeData = await rangeResponse.json();
    const values = rangeData.values || [];
    
    if (values.length === 0) continue;
    
    combinedContent += `\n=== SHEET: ${sheetTitle} ===\n`;
    for (const row of values) {
      combinedContent += (row as string[]).join('\t') + '\n';
    }
  }
  
  return combinedContent;
}

// Declare EdgeRuntime for background task processing
declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
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

    const { upload_id, file_content, google_sheet_id } = await req.json();

    if (!upload_id) {
      throw new Error('upload_id is required');
    }

    console.log(`[BOQ Match] Starting matching for upload: ${upload_id}`);
    
    let contentToProcess = file_content;

    if (google_sheet_id) {
      console.log(`[BOQ Match] Fetching from Google Sheet: ${google_sheet_id}`);
      contentToProcess = await fetchGoogleSheetContent(google_sheet_id);
    }

    // Update status to processing immediately
    await supabase
      .from('boq_uploads')
      .update({ 
        status: 'processing',
        extraction_started_at: new Date().toISOString()
      })
      .eq('id', upload_id);

    // Use background task processing for large files
    // This allows the function to return immediately while processing continues
    const backgroundTask = processMatching(
      supabase,
      upload_id,
      contentToProcess,
      lovableApiKey
    );

    // Start background processing
    EdgeRuntime.waitUntil(backgroundTask);

    // Return immediately - client will poll for status
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Processing started. Please poll for status.',
        upload_id,
        status: 'processing'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BOQ Match] Error:', errorMessage);

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
 * Main matching processing - OPTIMIZED with batch operations
 */
async function processMatching(
  supabase: any,
  upload_id: string,
  file_content: string,
  lovableApiKey: string | undefined
): Promise<{ total_items: number; matched_count: number; new_count: number }> {
  try {
    // Fetch master materials and categories in parallel
    const [materialsResult, categoriesResult] = await Promise.all([
      supabase
        .from('master_materials')
        .select('id, material_code, material_name, category_id, standard_supply_cost, standard_install_cost, unit')
        .eq('is_active', true),
      supabase
        .from('material_categories')
        .select('id, category_code, category_name, parent_category_id')
        .eq('is_active', true)
    ]);

    const masterMaterials = materialsResult.data || [];
    const categories = categoriesResult.data || [];

    console.log(`[BOQ Match] Found ${masterMaterials.length} master materials to match against`);

    // Build the material reference for AI
    const materialReference = masterMaterials.map((m: MasterMaterial) => ({
      id: m.id,
      code: m.material_code,
      name: m.material_name,
      unit: m.unit,
      supply_cost: m.standard_supply_cost,
      install_cost: m.standard_install_cost,
    }));

    // Use AI to extract items AND match them
    const matchResults = await extractAndMatchWithAI(
      file_content,
      materialReference,
      categories,
      lovableApiKey
    );

    console.log(`[BOQ Match] AI returned ${matchResults.length} items`);

    // Delete existing items for this upload
    await supabase
      .from('boq_extracted_items')
      .delete()
      .eq('upload_id', upload_id);

    // Prepare batch insert data
    const itemsToInsert: any[] = [];
    let matchedCount = 0;
    let newItemCount = 0;
    const masterUpdates = new Map<string, any>();

    for (const result of matchResults) {
      const standardizedUnit = standardizeUnit(result.unit);
      
      // Prepare item for batch insert
      itemsToInsert.push({
        upload_id,
        row_number: result.row_number,
        item_code: result.item_code,
        item_description: result.item_description,
        unit: standardizedUnit,
        quantity: result.quantity,
        supply_rate: result.supply_rate,
        install_rate: result.install_rate,
        total_rate: result.total_rate,
        matched_material_id: result.matched_material_id,
        match_confidence: result.match_confidence,
        suggested_category_id: result.suggested_category_id,
        suggested_category_name: result.suggested_category_name,
        review_status: 'pending',
        bill_number: result.bill_number,
        bill_name: result.bill_name,
        section_code: result.section_code,
        section_name: result.section_name,
        extraction_notes: result.is_outlier ? `OUTLIER: ${result.outlier_reason}` : 
                         (!result.math_validated ? 'Math validation failed' : null),
      });

      if (result.matched_material_id && result.match_confidence >= 0.7) {
        matchedCount++;
        
        // Collect master material updates (only update if no rate exists)
        if (!masterUpdates.has(result.matched_material_id)) {
          const masterMaterial = materialReference.find((m: any) => m.id === result.matched_material_id);
          if (masterMaterial) {
            const boqSupply = result.supply_rate || (result.total_rate ? result.total_rate * 0.7 : null);
            const boqInstall = result.install_rate || (result.total_rate ? result.total_rate * 0.3 : null);
            
            const updateData: any = {};
            if (boqSupply && (masterMaterial.supply_cost === 0 || masterMaterial.supply_cost === null)) {
              updateData.standard_supply_cost = boqSupply;
            }
            if (boqInstall && (masterMaterial.install_cost === 0 || masterMaterial.install_cost === null)) {
              updateData.standard_install_cost = boqInstall;
            }
            if (standardizedUnit && !masterMaterial.unit) {
              updateData.unit = standardizedUnit;
            }
            
            if (Object.keys(updateData).length > 0) {
              masterUpdates.set(result.matched_material_id, updateData);
            }
          }
        }
      } else {
        newItemCount++;
      }
    }

    // BATCH INSERT all items at once (much faster than individual inserts)
    if (itemsToInsert.length > 0) {
      // Insert in chunks of 100 to avoid payload size limits
      const chunkSize = 100;
      for (let i = 0; i < itemsToInsert.length; i += chunkSize) {
        const chunk = itemsToInsert.slice(i, i + chunkSize);
        const { error: insertError } = await supabase
          .from('boq_extracted_items')
          .insert(chunk);
        
        if (insertError) {
          console.error(`[BOQ Match] Batch insert error for chunk ${i / chunkSize + 1}:`, insertError);
        }
      }
      console.log(`[BOQ Match] Batch inserted ${itemsToInsert.length} items`);
    }

    // Apply master material updates
    let ratesUpdatedCount = 0;
    for (const [materialId, updateData] of masterUpdates) {
      const { error: updateError } = await supabase
        .from('master_materials')
        .update(updateData)
        .eq('id', materialId);
      
      if (!updateError) {
        ratesUpdatedCount++;
      }
    }

    // Log summary
    console.log(`[BOQ Match] Processing Summary:`);
    console.log(`  - Total items extracted: ${matchResults.length}`);
    console.log(`  - Matched to master: ${matchedCount}`);
    console.log(`  - New items (unmatched): ${newItemCount}`);
    console.log(`  - Master rates updated: ${ratesUpdatedCount}`);

    // Update upload status with summary
    await supabase
      .from('boq_uploads')
      .update({ 
        status: 'completed',
        extraction_completed_at: new Date().toISOString(),
        total_items_extracted: matchResults.length,
        items_matched_to_master: matchedCount,
        items_added_to_master: ratesUpdatedCount,
      })
      .eq('id', upload_id);

    console.log(`[BOQ Match] Completed successfully`);

    return {
      total_items: matchResults.length,
      matched_count: matchedCount,
      new_count: newItemCount
    };

  } catch (error) {
    console.error('[BOQ Match] Processing error:', error);
    await supabase
      .from('boq_uploads')
      .update({ 
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        extraction_completed_at: new Date().toISOString()
      })
      .eq('id', upload_id);
    throw error;
  }
}

/**
 * Use AI to extract items from BOQ and match them to master materials
 */
async function extractAndMatchWithAI(
  content: string,
  materialReference: { id: string; code: string; name: string; unit: string | null; supply_cost: number | null; install_cost: number | null }[],
  categories: MaterialCategory[] | null,
  lovableApiKey: string | undefined
): Promise<MatchResult[]> {
  if (!lovableApiKey) {
    console.log('[BOQ Match] No API key, using basic parsing');
    return basicParse(content, materialReference, categories);
  }

  try {
    // Truncate content if too long
    const maxChars = 60000;
    const truncatedContent = content.length > maxChars 
      ? content.substring(0, maxChars) + '\n... [truncated]'
      : content;

    // Create material list with rates for comparison
    const materialList = materialReference.slice(0, 250).map(m => 
      `${m.code}: ${m.name} [${m.unit || 'NO'}] - Supply: R${m.supply_cost || 0}, Install: R${m.install_cost || 0}`
    ).join('\n');

    const categoryList = categories?.map(c => 
      `${c.category_code}: ${c.category_name}`
    ).join('\n') || '';

    const prompt = `Role: You are an expert Construction Data Analyst and Quantity Surveyor specializing in electrical installations.

Task: Analyze this Bill of Quantities (BOQ) document. Perform these steps:

STEP 1: DATA EXTRACTION & CLEANING
- Identify the main headers (Item No, Description, Unit, Quantity, Rate, Amount)
- Handle merged cells and sub-headings (e.g., "Electrical Works", "Lighting")
- Ensure every row has its parent category assigned
- Standardize Units using this mapping:
  m2, sqm, m.sq, sq.m → M2
  m3, cum, cu.m → M3
  m, lm, lin.m → M
  nr, no, each, ea, pcs → NO
  kg, kgs → KG
  set, sets → SET
  lot → LOT
  ps, prov sum → PS

STEP 2: MATH VALIDATION
- Verify: Quantity × Rate = Amount/Total
- Flag any discrepancies (within 5% tolerance is OK)

STEP 3: MATCH TO MASTER DATABASE
MASTER MATERIALS LIBRARY (match items to these):
${materialList}

AVAILABLE CATEGORIES (for unmatched items):
${categoryList}

STEP 4: PRICE OUTLIER DETECTION
- Flag items where rates are significantly different from master rates (>50% variance)
- Flag items with unusually high or low rates for their category

BOQ CONTENT TO ANALYZE:
${truncatedContent}

STRUCTURE EXTRACTION:
- bill_number: Sequential (1, 2, 3...) - infer from document order
- bill_name: Bill title (e.g., "ELECTRICAL INSTALLATION", "LIGHTING")
- section_code: Code like "A", "B", "1.0" from the BOQ
- section_name: Full section name (e.g., "CABLE CONTAINMENT", "DISTRIBUTION BOARDS")

Return a JSON array with this EXACT structure:
[
  {
    "row_number": 1,
    "item_description": "Clear description from BOQ",
    "item_code": "Item code if present (e.g., A1.01, 1.2.3)",
    "unit": "Standardized unit (M2, M, NO, etc.)",
    "quantity": 10,
    "supply_rate": 100.00,
    "install_rate": 50.00,
    "total_rate": 150.00,
    "calculated_total": 1500.00,
    "math_validated": true,
    "matched_material_code": "CODE from master list or null",
    "match_confidence": 0.85,
    "suggested_category_code": "Category code for unmatched",
    "bill_number": 1,
    "bill_name": "ELECTRICAL INSTALLATION",
    "section_code": "A",
    "section_name": "CABLE CONTAINMENT",
    "is_outlier": false,
    "outlier_reason": null
  }
]

MATCHING RULES:
- match_confidence >= 0.8: Strong match (same item type and specs)
- match_confidence 0.6-0.79: Partial match (similar item, different specs)
- match_confidence < 0.6: No match - set matched_material_code to null
- For cables: match by type, size, cores (e.g., "4c 95mm XLPE" matches "4 Core 95mm² XLPE")
- For lights: match by type and dimensions (e.g., "LED Panel 600x600" matches "600x600 LED Panel Light")

OUTLIER RULES:
- is_outlier: true if rate differs >50% from matched master material rate
- is_outlier: true if rate is unusually low (<R10 for materials) or high (>R10000 for standard items)
- outlier_reason: Brief explanation (e.g., "Rate 80% higher than master", "Suspiciously low rate")

CRITICAL: Return ONLY valid JSON array. No markdown, no explanation.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are a Construction Data Analyst expert. Extract BOQ items with precise rates, standardize units, validate math, and match to master materials. Return only valid JSON.' 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error('[BOQ Match] AI API error:', response.status);
      return basicParse(content, materialReference, categories);
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content || '';
    
    console.log('[BOQ Match] Raw AI response length:', aiText.length);
    
    // Clean up AI response - remove markdown fences, extra text
    let cleanedText = aiText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    
    // Parse AI response - try multiple approaches
    let parsed: any[] = [];
    
    // Try 1: Direct parse
    try {
      parsed = JSON.parse(cleanedText);
      console.log('[BOQ Match] Direct JSON parse succeeded');
    } catch (e1) {
      console.log('[BOQ Match] Direct parse failed, trying repair strategies...');
      
      // Try 2: The response might be truncated - try to repair
      // Find where the array starts
      const arrayStart = cleanedText.indexOf('[');
      if (arrayStart >= 0) {
        let jsonContent = cleanedText.substring(arrayStart);
        
        // Try 3: Parse as-is first
        try {
          parsed = JSON.parse(jsonContent);
          console.log('[BOQ Match] Parse after array extraction succeeded');
        } catch (e2) {
          // Try 4: Repair truncated JSON - find the last complete object
          // Look for the last complete object pattern "}," or "}" before potential truncation
          const lastCompleteObj = jsonContent.lastIndexOf('},');
          const lastSingleObj = jsonContent.lastIndexOf('}');
          
          let repairPoint = -1;
          if (lastCompleteObj > 0) {
            repairPoint = lastCompleteObj + 1; // Include the }
          } else if (lastSingleObj > 0) {
            repairPoint = lastSingleObj + 1;
          }
          
          if (repairPoint > 0) {
            // Try to close the array
            const repairedJson = jsonContent.substring(0, repairPoint) + ']';
            try {
              parsed = JSON.parse(repairedJson);
              console.log(`[BOQ Match] Repaired JSON parse succeeded with ${parsed.length} items`);
            } catch (e3) {
              // Try 5: More aggressive repair - extract individual objects
              console.log('[BOQ Match] Repair failed, trying object extraction...');
              const objectPattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
              const objects = jsonContent.match(objectPattern) || [];
              console.log(`[BOQ Match] Found ${objects.length} potential objects`);
              
              for (const obj of objects) {
                try {
                  const item = JSON.parse(obj);
                  if (item.item_description) {
                    parsed.push(item);
                  }
                } catch {}
              }
              
              if (parsed.length > 0) {
                console.log(`[BOQ Match] Extracted ${parsed.length} valid items from objects`);
              }
            }
          }
        }
      }
    }
    
    if (!Array.isArray(parsed) || parsed.length === 0) {
      console.log('[BOQ Match] All JSON parsing failed, using enhanced basic parse');
      console.log('[BOQ Match] First 500 chars:', cleanedText.substring(0, 500));
      return basicParse(content, materialReference, categories);
    }
    
    // Log success stats
    const itemsWithRates = parsed.filter((p: any) => (p.total_rate || p.supply_rate || p.install_rate) > 0).length;
    console.log(`[BOQ Match] AI JSON parsed: ${parsed.length} items, ${itemsWithRates} with rates`);
    
    // Convert AI response to our format
    return parsed.map((item: any, index: number) => {
      // Find matched material ID from code
      let matchedMaterialId: string | null = null;
      if (item.matched_material_code) {
        const matched = materialReference.find(m => 
          m.code.toLowerCase() === item.matched_material_code?.toLowerCase()
        );
        matchedMaterialId = matched?.id || null;
      }

      // Find category ID
      let suggestedCategoryId: string | null = null;
      if (item.suggested_category_code && categories) {
        const cat = categories.find(c => 
          c.category_code.toLowerCase() === item.suggested_category_code?.toLowerCase()
        );
        suggestedCategoryId = cat?.id || null;
      }

      return {
        row_number: item.row_number || index + 1,
        item_description: item.item_description || 'Unknown item',
        item_code: item.item_code || null,
        unit: standardizeUnit(item.unit),
        quantity: item.quantity || null,
        supply_rate: item.supply_rate || null,
        install_rate: item.install_rate || null,
        total_rate: item.total_rate || (item.supply_rate || 0) + (item.install_rate || 0) || null,
        matched_material_id: matchedMaterialId,
        match_confidence: item.match_confidence || 0,
        suggested_category_id: suggestedCategoryId,
        suggested_category_name: item.suggested_category_code || null,
        is_new_item: !matchedMaterialId || (item.match_confidence || 0) < 0.6,
        bill_number: item.bill_number || null,
        bill_name: item.bill_name || null,
        section_code: item.section_code || null,
        section_name: item.section_name || null,
        is_outlier: item.is_outlier || false,
        outlier_reason: item.outlier_reason || null,
        math_validated: item.math_validated !== false,
        calculated_total: item.calculated_total || null,
      };
    });

  } catch (error) {
    console.error('[BOQ Match] AI extraction error:', error);
    return basicParse(content, materialReference, categories);
  }
}

/**
 * Enhanced basic parsing fallback - uses column structure from mapped data
 */
function basicParse(
  content: string,
  materialReference: { id: string; code: string; name: string; unit: string | null; supply_cost?: number | null; install_cost?: number | null }[],
  categories: MaterialCategory[] | null
): MatchResult[] {
  const results: MatchResult[] = [];
  const lines = content.split('\n');
  let rowNumber = 0;
  let currentSheet = '';
  let currentBillNumber = 0;
  let headerIndices: { [key: string]: number } = {};

  console.log('[BOQ Match] Basic parsing', lines.length, 'lines');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Detect sheet name
    if (trimmed.startsWith('=== SHEET:')) {
      currentSheet = trimmed.replace('=== SHEET:', '').replace('===', '').trim();
      currentBillNumber++;
      headerIndices = {};
      continue;
    }
    
    // Detect header row (tab-separated headers from our column mapping)
    if (trimmed.includes('\t') && 
        (trimmed.toLowerCase().includes('description') || 
         trimmed.toLowerCase().includes('item'))) {
      const headers = trimmed.split('\t').map(h => h.trim().toLowerCase());
      headers.forEach((h, idx) => {
        if (h.includes('item') && h.includes('code')) headerIndices['itemCode'] = idx;
        else if (h.includes('description') || h === 'desc') headerIndices['description'] = idx;
        else if (h.includes('qty') || h.includes('quantity')) headerIndices['quantity'] = idx;
        else if (h === 'unit') headerIndices['unit'] = idx;
        else if (h.includes('supply') && h.includes('rate')) headerIndices['supplyRate'] = idx;
        else if (h.includes('install') && h.includes('rate')) headerIndices['installRate'] = idx;
        else if ((h.includes('total') || h === 'rate') && !h.includes('amount')) headerIndices['totalRate'] = idx;
        else if (h.includes('amount') || h.includes('total')) headerIndices['amount'] = idx;
      });
      console.log('[BOQ Match] Found headers:', headerIndices);
      continue;
    }

    // Skip non-data lines
    if (/^(note|bill|section|item\s+no|description|qty|unit|rate|amount)$/i.test(trimmed)) continue;
    if (/^(total|subtotal|sub-total|carried|summary|brought)$/i.test(trimmed.split(/\t/)[0]?.toLowerCase() || '')) continue;

    // Parse data rows
    const parts = trimmed.split('\t').map(p => p.trim());
    
    // Try to extract using header indices first
    let description = '';
    let itemCode = '';
    let unit = '';
    let quantity = 0;
    let supplyRate = 0;
    let installRate = 0;
    let totalRate = 0;
    let amount = 0;

    if (Object.keys(headerIndices).length > 0) {
      // Use mapped column positions
      if (headerIndices['itemCode'] !== undefined) itemCode = parts[headerIndices['itemCode']] || '';
      if (headerIndices['description'] !== undefined) description = parts[headerIndices['description']] || '';
      if (headerIndices['unit'] !== undefined) unit = parts[headerIndices['unit']] || '';
      if (headerIndices['quantity'] !== undefined) quantity = parseFloat(parts[headerIndices['quantity']]?.replace(/[^\d.-]/g, '') || '0') || 0;
      if (headerIndices['supplyRate'] !== undefined) supplyRate = parseFloat(parts[headerIndices['supplyRate']]?.replace(/[^\d.-]/g, '') || '0') || 0;
      if (headerIndices['installRate'] !== undefined) installRate = parseFloat(parts[headerIndices['installRate']]?.replace(/[^\d.-]/g, '') || '0') || 0;
      if (headerIndices['totalRate'] !== undefined) totalRate = parseFloat(parts[headerIndices['totalRate']]?.replace(/[^\d.-]/g, '') || '0') || 0;
      if (headerIndices['amount'] !== undefined) amount = parseFloat(parts[headerIndices['amount']]?.replace(/[^\d.-]/g, '') || '0') || 0;
    } else {
      // Fallback: heuristic parsing
      for (const part of parts) {
        if (part.length > description.length && !/^[\d.,\s]+$/.test(part) && part.length > 3) {
          description = part;
        }
        if (/^(m|m2|m²|m3|m³|each|no|nr|item|set|lot|kg|l|lm|ps|pc)$/i.test(part)) {
          unit = part;
        }
        const num = parseFloat(part.replace(/[^\d.-]/g, ''));
        if (!isNaN(num) && num > 0) {
          if (num < 10000 && quantity === 0) {
            quantity = num;
          } else if (num > 0) {
            totalRate = num;
          }
        }
      }
    }

    if (!description || description.length < 3) continue;

    // Calculate rates if not provided
    if (totalRate === 0 && (supplyRate > 0 || installRate > 0)) {
      totalRate = supplyRate + installRate;
    }
    if (totalRate > 0 && supplyRate === 0 && installRate === 0) {
      supplyRate = totalRate * 0.7;
      installRate = totalRate * 0.3;
    }
    // If we have amount and quantity, calculate rate
    if (totalRate === 0 && amount > 0 && quantity > 0) {
      totalRate = amount / quantity;
      supplyRate = totalRate * 0.7;
      installRate = totalRate * 0.3;
    }

    rowNumber++;

    // Match to master materials
    let matchedId: string | null = null;
    let matchConfidence = 0;
    const descLower = description.toLowerCase();

    for (const material of materialReference) {
      const nameLower = material.name.toLowerCase();
      
      if (descLower === nameLower) {
        matchedId = material.id;
        matchConfidence = 0.95;
        break;
      }
      
      // Check for significant word overlap
      const descWords = descLower.split(/\s+/).filter(w => w.length > 2);
      const nameWords = nameLower.split(/\s+/).filter(w => w.length > 2);
      const commonWords = descWords.filter(w => nameWords.some(nw => nw.includes(w) || w.includes(nw)));
      const wordOverlap = commonWords.length / Math.max(descWords.length, nameWords.length, 1);
      
      if (wordOverlap > matchConfidence && wordOverlap >= 0.4) {
        matchedId = material.id;
        matchConfidence = wordOverlap;
      }
    }

    results.push({
      row_number: rowNumber,
      item_description: description,
      item_code: itemCode || null,
      unit: standardizeUnit(unit) || null,
      quantity: quantity || null,
      supply_rate: supplyRate || null,
      install_rate: installRate || null,
      total_rate: totalRate || null,
      matched_material_id: matchConfidence >= 0.5 ? matchedId : null,
      match_confidence: matchConfidence,
      suggested_category_id: null,
      suggested_category_name: null,
      is_new_item: matchConfidence < 0.5,
      bill_number: currentBillNumber || null,
      bill_name: currentSheet || null,
      section_code: null,
      section_name: null,
      is_outlier: false,
      outlier_reason: null,
      math_validated: true,
      calculated_total: (quantity || 0) * (totalRate || 0),
    });
  }

  console.log('[BOQ Match] Basic parse extracted', results.length, 'items');
  console.log('[BOQ Match] Items with rates:', results.filter(r => (r.total_rate || 0) > 0).length);
  
  return results;
}
