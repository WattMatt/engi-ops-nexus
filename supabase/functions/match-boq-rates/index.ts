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
}

// Processing is now synchronous - no EdgeRuntime needed

/**
 * Get Google Access Token using service account
 */
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

/**
 * Fetch content from Google Sheets
 */
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

    // Update status to processing
    await supabase
      .from('boq_uploads')
      .update({ 
        status: 'processing',
        extraction_started_at: new Date().toISOString()
      })
      .eq('id', upload_id);

    // Process synchronously (Supabase has 150s timeout which is enough)
    await processMatching(
      supabase,
      upload_id,
      contentToProcess,
      lovableApiKey
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Matching completed.',
        upload_id
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
 * Main matching processing
 */
async function processMatching(
  supabase: any,
  upload_id: string,
  file_content: string,
  lovableApiKey: string | undefined
): Promise<void> {
  try {
    // Fetch master materials and categories
    const { data: masterMaterials } = await supabase
      .from('master_materials')
      .select('id, material_code, material_name, category_id, standard_supply_cost, standard_install_cost, unit')
      .eq('is_active', true);

    const { data: categories } = await supabase
      .from('material_categories')
      .select('id, category_code, category_name, parent_category_id')
      .eq('is_active', true);

    if (!masterMaterials || masterMaterials.length === 0) {
      console.log('[BOQ Match] No master materials found - please build your master library first');
      await supabase
        .from('boq_uploads')
        .update({ 
          status: 'error',
          error_message: 'No master materials found. Please add materials to your master library first.',
          extraction_completed_at: new Date().toISOString()
        })
        .eq('id', upload_id);
      return;
    }

    console.log(`[BOQ Match] Found ${masterMaterials.length} master materials to match against`);

    // Build the material reference for AI
    const materialReference = masterMaterials.map((m: MasterMaterial) => ({
      id: m.id,
      code: m.material_code,
      name: m.material_name,
      unit: m.unit
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

    // Extract unique sections from results and ensure they have proper structure
    const sectionsMap = new Map<string, { 
      section_code: string; 
      section_name: string; 
      bill_number: number | null;
      bill_name: string | null;
      display_order: number;
    }>();
    
    let sectionOrder = 0;
    for (const result of matchResults) {
      const sectionKey = `${result.bill_number || 0}-${result.section_code || 'UNASSIGNED'}`;
      if (!sectionsMap.has(sectionKey)) {
        sectionsMap.set(sectionKey, {
          section_code: result.section_code || 'UNASSIGNED',
          section_name: result.section_name || 'Unassigned Items',
          bill_number: result.bill_number,
          bill_name: result.bill_name,
          display_order: sectionOrder++,
        });
      }
    }

    // Log the extracted structure
    console.log(`[BOQ Match] Extracted ${sectionsMap.size} unique sections from BOQ`);
    for (const [key, section] of sectionsMap) {
      console.log(`[BOQ Match]   Bill ${section.bill_number}: ${section.bill_name} > Section ${section.section_code}: ${section.section_name}`);
    }

    // Process matches and create price history
    let matchedCount = 0;
    let newItemCount = 0;
    let ratesUpdatedCount = 0;
    const priceHistoryEntries: any[] = [];

    for (const result of matchResults) {
      // Insert into boq_extracted_items
      await supabase
        .from('boq_extracted_items')
        .insert({
          upload_id,
          row_number: result.row_number,
          item_code: result.item_code,
          item_description: result.item_description,
          unit: result.unit,
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
        });

      if (result.matched_material_id && result.match_confidence >= 0.7) {
        matchedCount++;
        
        // Find the master material to get current rates
        const masterMaterial = masterMaterials.find((m: MasterMaterial) => m.id === result.matched_material_id);
        
        if (masterMaterial && (result.supply_rate || result.install_rate || result.total_rate)) {
          // Calculate rates from BOQ
          const boqSupply = result.supply_rate || (result.total_rate ? result.total_rate * 0.7 : null);
          const boqInstall = result.install_rate || (result.total_rate ? result.total_rate * 0.3 : null);
          
          // Create price history entry
          priceHistoryEntries.push({
            material_id: result.matched_material_id,
            old_supply_cost: masterMaterial.standard_supply_cost,
            new_supply_cost: boqSupply,
            old_install_cost: masterMaterial.standard_install_cost,
            new_install_cost: boqInstall,
            change_percent: calculateChangePercent(
              masterMaterial.standard_supply_cost,
              masterMaterial.standard_install_cost,
              boqSupply,
              boqInstall
            ),
            change_reason: `BOQ rate from upload: ${upload_id}`,
          });

          // AUTO-UPDATE: Update master material with BOQ rates (high confidence matches)
          if (result.match_confidence >= 0.7 && (boqSupply || boqInstall)) {
            const updateData: any = {};
            
            // Only update if BOQ has a rate and master is 0 or BOQ has higher value
            if (boqSupply && (masterMaterial.standard_supply_cost === 0 || masterMaterial.standard_supply_cost === null)) {
              updateData.standard_supply_cost = boqSupply;
            }
            if (boqInstall && (masterMaterial.standard_install_cost === 0 || masterMaterial.standard_install_cost === null)) {
              updateData.standard_install_cost = boqInstall;
            }
            
            // Update if we have data to update
            if (Object.keys(updateData).length > 0) {
              const { error: updateError } = await supabase
                .from('master_materials')
                .update(updateData)
                .eq('id', result.matched_material_id);
              
              if (updateError) {
                console.error(`[BOQ Match] Failed to update master material ${result.matched_material_id}:`, updateError);
              } else {
                ratesUpdatedCount++;
                console.log(`[BOQ Match] Updated rates for ${masterMaterial.material_code}: Supply=${boqSupply}, Install=${boqInstall}`);
              }
            }
          }
        }
      } else {
        newItemCount++;
      }
    }

    // Insert price history entries
    if (priceHistoryEntries.length > 0) {
      // Get the current user from the upload
      const { data: uploadData } = await supabase
        .from('boq_uploads')
        .select('uploaded_by')
        .eq('id', upload_id)
        .single();

      for (const entry of priceHistoryEntries) {
        await supabase
          .from('material_price_audit')
          .insert({
            ...entry,
            changed_by: uploadData?.uploaded_by || '00000000-0000-0000-0000-000000000000',
          });
      }
      console.log(`[BOQ Match] Created ${priceHistoryEntries.length} price history entries`);
    }

    console.log(`[BOQ Match] Auto-updated ${ratesUpdatedCount} master material rates`);

    // Update upload status
    await supabase
      .from('boq_uploads')
      .update({ 
        status: 'completed',
        extraction_completed_at: new Date().toISOString(),
        total_items_extracted: matchResults.length,
        items_matched_to_master: matchedCount,
        items_added_to_master: 0, // Will be updated when user manually adds
      })
      .eq('id', upload_id);

    console.log(`[BOQ Match] Completed: ${matchedCount} matched, ${newItemCount} new items flagged`);

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
  }
}

function calculateChangePercent(
  oldSupply: number | null,
  oldInstall: number | null,
  newSupply: number | null,
  newInstall: number | null
): number {
  const oldTotal = (oldSupply || 0) + (oldInstall || 0);
  const newTotal = (newSupply || 0) + (newInstall || 0);
  
  if (oldTotal === 0) return newTotal > 0 ? 100 : 0;
  return ((newTotal - oldTotal) / oldTotal) * 100;
}

/**
 * Use AI to extract items from BOQ and match them to master materials
 */
async function extractAndMatchWithAI(
  content: string,
  materialReference: { id: string; code: string; name: string; unit: string | null }[],
  categories: MaterialCategory[] | null,
  lovableApiKey: string | undefined
): Promise<MatchResult[]> {
  if (!lovableApiKey) {
    console.log('[BOQ Match] No API key, using basic parsing');
    return basicParse(content, materialReference, categories);
  }

  try {
    // Truncate content if too long
    const maxChars = 50000;
    const truncatedContent = content.length > maxChars 
      ? content.substring(0, maxChars) + '\n... [truncated]'
      : content;

    // Create a compact material list for the prompt
    const materialList = materialReference.slice(0, 200).map(m => 
      `${m.code}: ${m.name}`
    ).join('\n');

    const categoryList = categories?.map(c => 
      `${c.category_code}: ${c.category_name}`
    ).join('\n') || '';

    const prompt = `You are analyzing a Bill of Quantities (BOQ) document. Your task is to:
1. PRESERVE THE BOQ STRUCTURE - identify Bills, Sections, and Subsections
2. Extract each material/item line with its rates and quantities
3. Match items against the master materials library

MASTER MATERIALS LIBRARY (match items to these):
${materialList}

AVAILABLE CATEGORIES (for unmatched items):
${categoryList}

BOQ CONTENT TO ANALYZE:
${truncatedContent}

CRITICAL - BOQ STRUCTURE EXTRACTION:
BOQs are typically organized as:
- BILL (e.g., "BILL No. 1 - ELECTRICAL INSTALLATION", "BILL 2: LIGHTING")
- SECTION (e.g., "A - PRELIMINARIES", "B - DISTRIBUTION BOARDS", "1.0 CABLE CONTAINMENT")
- SUBSECTION (e.g., "A1 - General Items", "B2.1 - DB Boards")

Look for patterns like:
- "BILL No. X", "BILL X:", "SECTION X", numbered headings (1.0, 2.0, A, B)
- Indentation and formatting that indicates hierarchy
- Headers in CAPS or bold markers

Return a JSON array. EVERY item MUST have bill_number, bill_name, section_code, section_name:
[
  {
    "row_number": 1,
    "item_description": "The item description from BOQ",
    "item_code": "Item code if present (e.g., A1.01, 1.2.3)",
    "unit": "Unit (m, m2, each, nr, etc)",
    "quantity": 10,
    "supply_rate": 100.00,
    "install_rate": 50.00,
    "total_rate": 150.00,
    "matched_material_code": "CODE from master list if matched, null if no match",
    "match_confidence": 0.85,
    "suggested_category_code": "Category code for unmatched items",
    "bill_number": 1,
    "bill_name": "ELECTRICAL INSTALLATION",
    "section_code": "A",
    "section_name": "PRELIMINARIES"
  }
]

STRUCTURE RULES:
- bill_number: Sequential number (1, 2, 3...) - infer from document order if not explicit
- bill_name: The bill title/description (e.g., "ELECTRICAL INSTALLATION", "LIGHTING", "CABLING")
- section_code: Code like "A", "B", "1.0", "2.0" from the BOQ
- section_name: Full section name (e.g., "CABLE CONTAINMENT", "DISTRIBUTION BOARDS")
- If structure is unclear, group logically by item type (cables together, DBs together, etc.)

MATCHING RULES:
- Match confidence >= 0.8: Strong match (same item type, similar specs)
- Match confidence 0.6-0.79: Partial match (similar item, different specs)  
- Match confidence < 0.6: No match (flag as new item)
- Cable: match by type and size (e.g., "4c 95mm XLPE" matches "4 Core 95mm² XLPE")
- Fittings: match by type (e.g., "LED Panel 600x600" matches "600x600 LED Panel Light")

Only return valid JSON array. No markdown, no explanation.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a BOQ analysis expert. Extract items and match them to master materials. Return only valid JSON.' },
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
    
    // Parse AI response
    const jsonMatch = aiText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log('[BOQ Match] Could not parse AI response as JSON');
      return basicParse(content, materialReference, categories);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
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
        unit: item.unit || null,
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
      };
    });

  } catch (error) {
    console.error('[BOQ Match] AI extraction error:', error);
    return basicParse(content, materialReference, categories);
  }
}

/**
 * Basic parsing fallback without AI
 */
function basicParse(
  content: string,
  materialReference: { id: string; code: string; name: string; unit: string | null }[],
  categories: MaterialCategory[] | null
): MatchResult[] {
  const results: MatchResult[] = [];
  const lines = content.split('\n');
  let rowNumber = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 10) continue;
    
    // Skip obvious headers/notes
    if (/^(note|bill|section|item|description|qty|unit|rate|amount)$/i.test(trimmed)) continue;
    if (/^(total|subtotal|carried|summary)$/i.test(trimmed)) continue;

    // Try to parse as tab/comma separated
    const parts = trimmed.split(/\t|,/).map(p => p.trim()).filter(p => p);
    if (parts.length < 2) continue;

    // Look for description (longest text field)
    let description = '';
    let unit = '';
    let rate = 0;
    
    for (const part of parts) {
      if (part.length > description.length && !/^\d+\.?\d*$/.test(part)) {
        description = part;
      }
      if (/^(m|m2|m²|each|no|nr|item|set|lot|kg|l)$/i.test(part)) {
        unit = part;
      }
      const num = parseFloat(part.replace(/[^\d.]/g, ''));
      if (!isNaN(num) && num > 0 && num < 100000) {
        rate = num;
      }
    }

    if (!description || description.length < 5) continue;

    rowNumber++;

    // Try to match to master materials
    let matchedId: string | null = null;
    let matchConfidence = 0;
    const descLower = description.toLowerCase();

    for (const material of materialReference) {
      const nameLower = material.name.toLowerCase();
      
      // Exact match
      if (descLower === nameLower) {
        matchedId = material.id;
        matchConfidence = 0.95;
        break;
      }
      
      // Contains match
      if (descLower.includes(nameLower) || nameLower.includes(descLower)) {
        const similarity = Math.min(descLower.length, nameLower.length) / Math.max(descLower.length, nameLower.length);
        if (similarity > matchConfidence) {
          matchedId = material.id;
          matchConfidence = similarity;
        }
      }
    }

    results.push({
      row_number: rowNumber,
      item_description: description,
      item_code: null,
      unit: unit || null,
      quantity: null,
      supply_rate: rate * 0.7 || null,
      install_rate: rate * 0.3 || null,
      total_rate: rate || null,
      matched_material_id: matchConfidence >= 0.6 ? matchedId : null,
      match_confidence: matchConfidence,
      suggested_category_id: null,
      suggested_category_name: null,
      is_new_item: matchConfidence < 0.6,
      bill_number: null,
      bill_name: null,
      section_code: null,
      section_name: null,
    });
  }

  return results;
}
