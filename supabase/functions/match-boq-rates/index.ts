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

interface ColumnMapping {
  itemCode: number | null;
  description: number | null;
  quantity: number | null;
  unit: number | null;
  supplyRate: number | null;
  installRate: number | null;
  totalRate: number | null;
  amount: number | null;
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

/**
 * Parse a currency/number string to a float
 * Handles formats like: "R 1,234.56", "1234.56", "R1234", "1 234,56"
 */
function parseRate(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  
  const str = String(value).trim();
  if (!str) return 0;
  
  // Remove currency symbols and spaces
  let cleaned = str.replace(/^[R$€£]\s*/i, '').trim();
  
  // Handle different number formats:
  // 1,234.56 (US/ZA format) -> 1234.56
  // 1.234,56 (EU format) -> 1234.56
  // 1 234,56 (FR format) -> 1234.56
  
  // Check if comma is decimal separator (EU format)
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    // Single comma could be decimal (1234,56) or thousands (1,234)
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length === 2) {
      // Likely decimal: 1234,56
      cleaned = cleaned.replace(',', '.');
    } else {
      // Likely thousands: 1,234
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',') && cleaned.includes('.')) {
    // Both present: determine which is decimal
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      // EU format: 1.234,56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,234.56
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  
  // Remove any remaining non-numeric chars except . and -
  cleaned = cleaned.replace(/[^\d.-]/g, '');
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * PHASE 3: Master Material Matching with specialized patterns
 * 
 * MATCHING RULES:
 * - Confidence >= 0.8: Strong match (same item + specs)
 * - Confidence 0.6-0.79: Partial match (similar item)
 * - Confidence < 0.6: No match → New item
 */
function matchToMasterMaterial(
  description: string,
  materialReference: { id: string; code: string; name: string; unit: string | null }[],
  categories: MaterialCategory[] | null
): { materialId: string | null; confidence: number; categoryId: string | null; categoryName: string | null } {
  const descLower = description.toLowerCase().trim();
  
  if (!descLower || descLower.length < 3) {
    return { materialId: null, confidence: 0, categoryId: null, categoryName: null };
  }

  let bestMatchId: string | null = null;
  let bestConfidence = 0;
  
  // Extract key specifications from description
  const specs = extractSpecifications(descLower);

  for (const material of materialReference) {
    const nameLower = material.name.toLowerCase();
    const materialSpecs = extractSpecifications(nameLower);
    
    // 1. EXACT MATCH
    if (descLower === nameLower) {
      return { materialId: material.id, confidence: 0.98, categoryId: null, categoryName: null };
    }
    
    // 2. CABLE MATCHING: Match by type + size + cores
    if (specs.isCable && materialSpecs.isCable) {
      const cableConfidence = matchCable(specs, materialSpecs);
      if (cableConfidence > bestConfidence) {
        bestConfidence = cableConfidence;
        bestMatchId = material.id;
      }
      continue;
    }
    
    // 3. LIGHT FITTING MATCHING: Match by type + dimensions
    if (specs.isLight && materialSpecs.isLight) {
      const lightConfidence = matchLight(specs, materialSpecs);
      if (lightConfidence > bestConfidence) {
        bestConfidence = lightConfidence;
        bestMatchId = material.id;
      }
      continue;
    }
    
    // 4. DISTRIBUTION BOARD MATCHING: Match by type + ways
    if (specs.isDB && materialSpecs.isDB) {
      const dbConfidence = matchDB(specs, materialSpecs);
      if (dbConfidence > bestConfidence) {
        bestConfidence = dbConfidence;
        bestMatchId = material.id;
      }
      continue;
    }
    
    // 5. GENERIC MATCHING: Word overlap
    const genericConfidence = matchGeneric(descLower, nameLower);
    if (genericConfidence > bestConfidence) {
      bestConfidence = genericConfidence;
      bestMatchId = material.id;
    }
  }
  
  // Suggest category for unmatched items
  let suggestedCategoryId: string | null = null;
  let suggestedCategoryName: string | null = null;
  
  if (bestConfidence < 0.6 && categories && categories.length > 0) {
    const categoryMatch = suggestCategory(descLower, categories);
    suggestedCategoryId = categoryMatch.id;
    suggestedCategoryName = categoryMatch.name;
  }
  
  return {
    materialId: bestConfidence >= 0.6 ? bestMatchId : null,
    confidence: bestConfidence,
    categoryId: suggestedCategoryId,
    categoryName: suggestedCategoryName
  };
}

interface ExtractedSpecs {
  isCable: boolean;
  isLight: boolean;
  isDB: boolean;
  cores: number | null;
  size: number | null;
  cableType: string | null;
  dimensions: string | null;
  lightType: string | null;
  ways: number | null;
  dbType: string | null;
  keywords: string[];
}

function extractSpecifications(text: string): ExtractedSpecs {
  const specs: ExtractedSpecs = {
    isCable: false, isLight: false, isDB: false,
    cores: null, size: null, cableType: null,
    dimensions: null, lightType: null, ways: null, dbType: null,
    keywords: []
  };
  
  const lower = text.toLowerCase();
  
  // CABLE DETECTION
  const cablePatterns = ['cable', 'xlpe', 'pvc', 'swa', 'pilc', 'core', 'conductor'];
  const hasCableKeyword = cablePatterns.some(p => lower.includes(p));
  const coreMatch = lower.match(/(\d+)\s*(?:c|core|cre)/i);
  const sizeMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:mm²?|sqmm)/i);
  
  if (hasCableKeyword || (coreMatch && sizeMatch)) {
    specs.isCable = true;
    if (coreMatch) specs.cores = parseInt(coreMatch[1]);
    if (sizeMatch) specs.size = parseFloat(sizeMatch[1]);
    if (lower.includes('xlpe')) specs.cableType = 'XLPE';
    else if (lower.includes('pvc')) specs.cableType = 'PVC';
    else if (lower.includes('swa')) specs.cableType = 'SWA';
  }
  
  // LIGHT DETECTION
  const lightPatterns = ['led', 'light', 'luminaire', 'fitting', 'downlight', 'panel', 'bulkhead'];
  if (lightPatterns.some(p => lower.includes(p))) {
    specs.isLight = true;
    const dimMatch = lower.match(/(\d+)\s*[x×]\s*(\d+)/);
    if (dimMatch) specs.dimensions = `${dimMatch[1]}x${dimMatch[2]}`;
    if (lower.includes('panel')) specs.lightType = 'Panel';
    else if (lower.includes('downlight')) specs.lightType = 'Downlight';
    else if (lower.includes('bulkhead')) specs.lightType = 'Bulkhead';
  }
  
  // DB DETECTION
  const dbPatterns = ['db', 'distribution', 'board', 'mcb', 'way', 'tpn', 'spn'];
  if (dbPatterns.some(p => lower.includes(p))) {
    specs.isDB = true;
    const waysMatch = lower.match(/(\d+)\s*(?:way|w\b)/i);
    if (waysMatch) specs.ways = parseInt(waysMatch[1]);
    if (lower.includes('tpn') || lower.includes('three phase')) specs.dbType = 'TPN';
    else if (lower.includes('spn') || lower.includes('single phase')) specs.dbType = 'SPN';
  }
  
  specs.keywords = lower.split(/\s+/).filter(w => w.length > 2);
  return specs;
}

function matchCable(desc: ExtractedSpecs, master: ExtractedSpecs): number {
  let score = 0.5;
  if (desc.cores && master.cores) {
    if (desc.cores === master.cores) score += 0.2;
    else return score * 0.5;
  }
  if (desc.size && master.size) {
    if (desc.size === master.size) score += 0.25;
    else if (Math.abs(desc.size - master.size) <= 5) score += 0.1;
    else return score * 0.5;
  }
  if (desc.cableType && master.cableType && desc.cableType === master.cableType) score += 0.1;
  return Math.min(score, 0.95);
}

function matchLight(desc: ExtractedSpecs, master: ExtractedSpecs): number {
  let score = 0.5;
  if (desc.dimensions && master.dimensions) {
    if (desc.dimensions === master.dimensions) score += 0.3;
    else return score * 0.6;
  }
  if (desc.lightType && master.lightType && desc.lightType === master.lightType) score += 0.15;
  return Math.min(score, 0.95);
}

function matchDB(desc: ExtractedSpecs, master: ExtractedSpecs): number {
  let score = 0.5;
  if (desc.ways && master.ways) {
    if (desc.ways === master.ways) score += 0.25;
    else return score * 0.5;
  }
  if (desc.dbType && master.dbType) {
    if (desc.dbType === master.dbType) score += 0.15;
    else return score * 0.6;
  }
  return Math.min(score, 0.90);
}

function matchGeneric(desc: string, master: string): number {
  const descWords = desc.split(/\s+/).filter(w => w.length > 2);
  const masterWords = master.split(/\s+/).filter(w => w.length > 2);
  if (descWords.length === 0 || masterWords.length === 0) return 0;
  
  let matches = 0;
  for (const dw of descWords) {
    if (masterWords.some(mw => dw === mw || dw.includes(mw) || mw.includes(dw))) matches++;
  }
  return Math.min((matches / Math.max(descWords.length, masterWords.length)) * 0.9, 0.75);
}

function suggestCategory(desc: string, categories: MaterialCategory[]): { id: string | null; name: string | null } {
  const keywords: Record<string, string[]> = {
    'cable': ['cable', 'conductor', 'xlpe', 'pvc', 'core'],
    'light': ['light', 'led', 'luminaire', 'fitting', 'panel'],
    'db': ['db', 'distribution', 'board', 'mcb'],
    'switch': ['switch', 'isolator', 'socket'],
    'conduit': ['conduit', 'trunking', 'containment', 'tray'],
  };
  
  for (const [keyword, patterns] of Object.entries(keywords)) {
    if (patterns.some(p => desc.includes(p))) {
      const cat = categories.find(c => c.category_name.toLowerCase().includes(keyword));
      if (cat) return { id: cat.id, name: cat.category_name };
    }
  }
  return { id: null, name: null };
}

/**
 * PHASE 4: Outlier & Anomaly Detection
 * 
 * OUTLIER RULES:
 * 1. Rate differs >50% from matched master rate → OUTLIER
 * 2. Rate < R10 for materials (suspiciously low) → FLAG
 * 3. Rate > R10,000 for standard items → FLAG
 * 4. Quantity = 0 but rate > 0 → "Rate Only" item
 * 5. Math error: Qty × Rate ≠ Amount (>5%) → FLAG
 */

// Market Benchmarks for South Africa (ZAR)
const MARKET_BENCHMARKS: Record<string, { min: number; max: number }> = {
  'containment': { min: 50, max: 500 },      // R50-500/m
  'cable': { min: 20, max: 2000 },           // R20-2000/m depending on size
  'db': { min: 3000, max: 50000 },           // R3,000-50,000/unit
  'light': { min: 200, max: 5000 },          // R200-5,000/unit
  'general': { min: 50, max: 10000 },        // R50-10,000/item
};

interface OutlierResult {
  isOutlier: boolean;
  outlierReason: string | null;
  isRateOnly: boolean;
  mathValidated: boolean;
}

function detectOutliers(
  item: {
    description: string;
    quantity: number | null;
    totalRate: number | null;
    supplyRate: number | null;
    installRate: number | null;
    amount: number | null;
  },
  matchedMaterial: { supply_cost: number | null; install_cost: number | null } | null,
  matchConfidence: number
): OutlierResult {
  const reasons: string[] = [];
  let isOutlier = false;
  let isRateOnly = false;
  let mathValidated = true;
  
  const { description, quantity, totalRate, supplyRate, installRate, amount } = item;
  const descLower = description.toLowerCase();
  
  // 1. RATE ONLY DETECTION: Quantity = 0 but rate > 0
  if ((quantity === null || quantity === 0) && (totalRate || 0) > 0) {
    isRateOnly = true;
    // Not necessarily an outlier, just flagged
  }
  
  // Skip outlier checks for rate-only items or items with no rate
  if (!totalRate || totalRate <= 0) {
    return { isOutlier: false, outlierReason: null, isRateOnly, mathValidated };
  }
  
  // 2. MASTER RATE COMPARISON (if matched with confidence >= 0.7)
  if (matchedMaterial && matchConfidence >= 0.7) {
    const masterTotal = (matchedMaterial.supply_cost || 0) + (matchedMaterial.install_cost || 0);
    if (masterTotal > 0) {
      const variance = Math.abs(totalRate - masterTotal) / masterTotal;
      if (variance > 0.5) {
        isOutlier = true;
        const percentDiff = Math.round(variance * 100);
        if (totalRate > masterTotal) {
          reasons.push(`Rate ${percentDiff}% higher than master (R${masterTotal})`);
        } else {
          reasons.push(`Rate ${percentDiff}% lower than master (R${masterTotal})`);
        }
      }
    }
  }
  
  // 3. SUSPICIOUSLY LOW RATE (< R10 for materials)
  // Exclude labor-only items
  const isLaborOnly = descLower.includes('labour') || descLower.includes('labor') || 
                      descLower.includes('installation only');
  if (!isLaborOnly && totalRate < 10 && !isRateOnly) {
    isOutlier = true;
    reasons.push('Suspiciously low rate (< R10)');
  }
  
  // 4. SUSPICIOUSLY HIGH RATE (> R10,000 for standard items)
  // Allow high rates for special equipment
  const isSpecialEquipment = descLower.includes('transformer') || descLower.includes('generator') ||
                             descLower.includes('switchgear') || descLower.includes('mdb') ||
                             descLower.includes('substation') || descLower.includes('ups');
  if (!isSpecialEquipment && totalRate > 10000) {
    // Check against market benchmarks
    const category = detectItemCategory(descLower);
    const benchmark = MARKET_BENCHMARKS[category];
    if (benchmark && totalRate > benchmark.max * 2) {
      isOutlier = true;
      reasons.push(`Rate R${totalRate} exceeds benchmark (R${benchmark.max}) for ${category}`);
    }
  }
  
  // 5. MATH VALIDATION: Qty × Rate ≈ Amount (within 5% tolerance)
  if (quantity && quantity > 0 && amount && amount > 0) {
    const calculatedAmount = quantity * totalRate;
    const mathVariance = Math.abs(calculatedAmount - amount) / amount;
    if (mathVariance > 0.05) {
      mathValidated = false;
      isOutlier = true;
      reasons.push(`Math validation failed: ${quantity} × R${totalRate} = R${calculatedAmount.toFixed(2)}, expected R${amount}`);
    }
  }
  
  // 6. MARKET BENCHMARK CHECK (only if not already flagged for master variance)
  if (!isOutlier && reasons.length === 0) {
    const category = detectItemCategory(descLower);
    const benchmark = MARKET_BENCHMARKS[category];
    if (benchmark) {
      if (totalRate < benchmark.min * 0.5) {
        isOutlier = true;
        reasons.push(`Rate R${totalRate} below market minimum (R${benchmark.min}) for ${category}`);
      }
    }
  }
  
  return {
    isOutlier,
    outlierReason: reasons.length > 0 ? reasons.join('; ') : null,
    isRateOnly,
    mathValidated
  };
}

function detectItemCategory(desc: string): string {
  if (desc.includes('trunking') || desc.includes('tray') || desc.includes('ladder') || desc.includes('conduit')) {
    return 'containment';
  }
  if (desc.includes('cable') || desc.includes('xlpe') || desc.includes('pvc') || desc.includes('conductor')) {
    return 'cable';
  }
  if (desc.includes('db') || desc.includes('distribution') || desc.includes('board') || desc.includes('panel')) {
    return 'db';
  }
  if (desc.includes('light') || desc.includes('led') || desc.includes('luminaire') || desc.includes('fitting')) {
    return 'light';
  }
  return 'general';
}

/**
 * Rate averaging for duplicate items in same upload
 */
interface RateTracker {
  items: Array<{ rate: number; quantity: number }>;
  averageRate: number;
  minRate: number;
  maxRate: number;
  count: number;
}

function trackRates(
  matchResults: MatchResult[],
  materialReference: { id: string; supply_cost: number | null; install_cost: number | null }[]
): Map<string, RateTracker> {
  const rateTrackers = new Map<string, RateTracker>();
  
  for (const item of matchResults) {
    if (!item.matched_material_id || !item.total_rate || item.total_rate <= 0) continue;
    
    const existing = rateTrackers.get(item.matched_material_id);
    if (existing) {
      existing.items.push({ rate: item.total_rate, quantity: item.quantity || 1 });
      existing.count++;
      existing.minRate = Math.min(existing.minRate, item.total_rate);
      existing.maxRate = Math.max(existing.maxRate, item.total_rate);
      // Weighted average by quantity
      const totalQty = existing.items.reduce((sum, i) => sum + i.quantity, 0);
      existing.averageRate = existing.items.reduce((sum, i) => sum + i.rate * i.quantity, 0) / totalQty;
    } else {
      rateTrackers.set(item.matched_material_id, {
        items: [{ rate: item.total_rate, quantity: item.quantity || 1 }],
        averageRate: item.total_rate,
        minRate: item.total_rate,
        maxRate: item.total_rate,
        count: 1
      });
    }
  }
  
  // Log rate variations
  for (const [materialId, tracker] of rateTrackers) {
    if (tracker.count > 1) {
      const material = materialReference.find(m => m.id === materialId);
      const variance = ((tracker.maxRate - tracker.minRate) / tracker.averageRate * 100).toFixed(1);
      console.log(`[BOQ Match] Rate variation for material: ${tracker.count} entries, ` +
                  `Avg: R${tracker.averageRate.toFixed(2)}, Range: R${tracker.minRate}-${tracker.maxRate} (${variance}% variance)`);
    }
  }
  
  return rateTrackers;
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

    const { upload_id, file_content, google_sheet_id, column_mappings } = await req.json();

    if (!upload_id) {
      throw new Error('upload_id is required');
    }

    console.log(`[BOQ Match] Starting matching for upload: ${upload_id}`);
    console.log(`[BOQ Match] Column mappings provided: ${column_mappings ? 'YES' : 'NO'}`);
    if (column_mappings) {
      console.log('[BOQ Match] Column mappings:', JSON.stringify(column_mappings));
    }
    
    let contentToProcess = file_content;

    if (google_sheet_id) {
      console.log(`[BOQ Match] Fetching from Google Sheet: ${google_sheet_id}`);
      contentToProcess = await fetchGoogleSheetContent(google_sheet_id);
    }

    // Update status to processing immediately - with error handling
    const { error: statusError } = await supabase
      .from('boq_uploads')
      .update({ 
        status: 'processing',
        extraction_started_at: new Date().toISOString(),
        error_message: null
      })
      .eq('id', upload_id);

    if (statusError) {
      console.error('[BOQ Match] Failed to update status to processing:', statusError);
      throw new Error(`Failed to update status: ${statusError.message}`);
    }

    console.log('[BOQ Match] Status updated to processing, starting background task...');

    // Use background task processing for large files
    const backgroundTask = processMatching(
      supabase,
      upload_id,
      contentToProcess,
      lovableApiKey,
      column_mappings
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
  lovableApiKey: string | undefined,
  columnMappings?: Record<string, ColumnMapping>
): Promise<{ total_items: number; matched_count: number; new_count: number }> {
  console.log('[BOQ Match] processMatching() started');
  
  try {
    // Fetch master materials and categories in parallel
    console.log('[BOQ Match] Fetching master materials and categories...');
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

    if (materialsResult.error) {
      console.error('[BOQ Match] Error fetching materials:', materialsResult.error);
      throw new Error(`Failed to fetch materials: ${materialsResult.error.message}`);
    }
    if (categoriesResult.error) {
      console.error('[BOQ Match] Error fetching categories:', categoriesResult.error);
      throw new Error(`Failed to fetch categories: ${categoriesResult.error.message}`);
    }

    const masterMaterials = materialsResult.data || [];
    const categories = categoriesResult.data || [];

    console.log(`[BOQ Match] Found ${masterMaterials.length} master materials, ${categories.length} categories`);

    // Build the material reference for AI
    const materialReference = masterMaterials.map((m: MasterMaterial) => ({
      id: m.id,
      code: m.material_code,
      name: m.material_name,
      unit: m.unit,
      supply_cost: m.standard_supply_cost,
      install_cost: m.standard_install_cost,
    }));

    // Use enhanced basic parse with column mappings OR AI
    let matchResults: MatchResult[];
    
    // If we have column mappings, use the improved basicParse directly for reliability
    // This ensures we get the exact columns the user mapped
    if (columnMappings && Object.keys(columnMappings).length > 0) {
      console.log('[BOQ Match] Using basicParse with provided column mappings');
      matchResults = basicParseWithMappings(
        file_content,
        materialReference,
        categories,
        columnMappings
      );
    } else if (lovableApiKey) {
      // Fallback to AI extraction
      console.log('[BOQ Match] No column mappings, using AI extraction');
      matchResults = await extractAndMatchWithAI(
        file_content,
        materialReference,
        categories,
        lovableApiKey
      );
    } else {
      console.log('[BOQ Match] No API key or mappings, using basic parse');
      matchResults = basicParse(file_content, materialReference, categories);
    }

    console.log(`[BOQ Match] Extraction returned ${matchResults.length} items`);
    
    // Log rate statistics
    const itemsWithRates = matchResults.filter(r => (r.total_rate || 0) > 0);
    console.log(`[BOQ Match] Items with rates: ${itemsWithRates.length}`);
    if (itemsWithRates.length > 0) {
      console.log('[BOQ Match] Sample items with rates:');
      itemsWithRates.slice(0, 5).forEach((item, i) => {
        console.log(`  ${i + 1}. "${item.item_description?.substring(0, 50)}..." - Supply: R${item.supply_rate}, Install: R${item.install_rate}, Total: R${item.total_rate}`);
      });
    }

    // PHASE 4: Run outlier detection on all items
    console.log('[BOQ Match] Running outlier detection...');
    let outlierCount = 0;
    let rateOnlyCount = 0;
    let mathFailCount = 0;
    
    for (const result of matchResults) {
      // Find matched material for rate comparison
      const matchedMaterial = result.matched_material_id 
        ? materialReference.find((m: any) => m.id === result.matched_material_id)
        : null;
      
      const outlierResult = detectOutliers(
        {
          description: result.item_description,
          quantity: result.quantity,
          totalRate: result.total_rate,
          supplyRate: result.supply_rate,
          installRate: result.install_rate,
          amount: result.calculated_total
        },
        matchedMaterial ? { 
          supply_cost: matchedMaterial.supply_cost || null, 
          install_cost: matchedMaterial.install_cost || null 
        } : null,
        result.match_confidence
      );
      
      // Update result with outlier info
      result.is_outlier = outlierResult.isOutlier;
      result.outlier_reason = outlierResult.outlierReason;
      result.math_validated = outlierResult.mathValidated;
      
      // Track counts
      if (outlierResult.isOutlier) outlierCount++;
      if (outlierResult.isRateOnly) rateOnlyCount++;
      if (!outlierResult.mathValidated) mathFailCount++;
    }
    
    console.log(`[BOQ Match] Outlier detection complete: ${outlierCount} outliers, ${rateOnlyCount} rate-only, ${mathFailCount} math failures`);
    
    // Track rate variations for duplicate items
    const rateTrackers = trackRates(matchResults, materialReference as any);
    console.log(`[BOQ Match] Tracked rates for ${rateTrackers.size} unique materials`);

    // Delete existing items for this upload
    const { error: deleteError } = await supabase
      .from('boq_extracted_items')
      .delete()
      .eq('upload_id', upload_id);
    
    if (deleteError) {
      console.error('[BOQ Match] Error deleting existing items:', deleteError);
    }

    // Prepare batch insert data
    const itemsToInsert: any[] = [];
    let matchedCount = 0;
    let newItemCount = 0;
    const masterUpdates = new Map<string, any>();

    for (const result of matchResults) {
      const standardizedUnit = standardizeUnit(result.unit);
      
      // Check if this is a rate-only item
      const isRateOnly = (result.quantity === null || result.quantity === 0) && (result.total_rate || 0) > 0;
      
      // Build extraction notes
      const notes: string[] = [];
      if (result.is_outlier && result.outlier_reason) notes.push(`OUTLIER: ${result.outlier_reason}`);
      if (!result.math_validated) notes.push('Math validation failed');
      if (isRateOnly) notes.push('Rate only - no quantity');
      
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
        review_status: result.is_outlier ? 'flagged' : 'pending',
        bill_number: result.bill_number,
        bill_name: result.bill_name,
        section_code: result.section_code,
        section_name: result.section_name,
        is_rate_only: isRateOnly,
        extraction_notes: notes.length > 0 ? notes.join('; ') : null,
      });

      // MATCHING THRESHOLDS per Phase 3 spec:
      // >= 0.8: Strong match (same item + specs)
      // 0.6-0.79: Partial match (similar item)
      // < 0.6: No match → New item
      const isMatched = result.matched_material_id && result.match_confidence >= 0.6;
      
      if (isMatched) {
        matchedCount++;
        
        // AUTO-UPDATE MASTER RATES when confidence >= 0.7 (per Phase 3 spec)
        if (result.match_confidence >= 0.7 && !masterUpdates.has(result.matched_material_id!)) {
          const masterMaterial = materialReference.find((m: any) => m.id === result.matched_material_id);
          if (masterMaterial) {
            const boqSupply = result.supply_rate || (result.total_rate ? result.total_rate * 0.7 : null);
            const boqInstall = result.install_rate || (result.total_rate ? result.total_rate * 0.3 : null);
            
            const updateData: any = {};
            // Only update if master rate is 0 or null
            if (boqSupply && boqSupply > 0 && (masterMaterial.supply_cost === 0 || masterMaterial.supply_cost === null)) {
              updateData.standard_supply_cost = Math.round(boqSupply * 100) / 100;
              console.log(`[BOQ Match] Will update ${masterMaterial.code} supply_cost to R${updateData.standard_supply_cost} (confidence: ${result.match_confidence.toFixed(2)})`);
            }
            if (boqInstall && boqInstall > 0 && (masterMaterial.install_cost === 0 || masterMaterial.install_cost === null)) {
              updateData.standard_install_cost = Math.round(boqInstall * 100) / 100;
              console.log(`[BOQ Match] Will update ${masterMaterial.code} install_cost to R${updateData.standard_install_cost} (confidence: ${result.match_confidence.toFixed(2)})`);
            }
            if (standardizedUnit && !masterMaterial.unit) {
              updateData.unit = standardizedUnit;
            }
            
            if (Object.keys(updateData).length > 0) {
              masterUpdates.set(result.matched_material_id!, updateData);
            }
          }
        }
      } else {
        newItemCount++;
      }
    }

    // BATCH INSERT all items at once (much faster than individual inserts)
    if (itemsToInsert.length > 0) {
      console.log(`[BOQ Match] Inserting ${itemsToInsert.length} items in batches...`);
      // Insert in chunks of 100 to avoid payload size limits
      const chunkSize = 100;
      for (let i = 0; i < itemsToInsert.length; i += chunkSize) {
        const chunk = itemsToInsert.slice(i, i + chunkSize);
        const { error: insertError } = await supabase
          .from('boq_extracted_items')
          .insert(chunk);
        
        if (insertError) {
          console.error(`[BOQ Match] Batch insert error for chunk ${i / chunkSize + 1}:`, insertError);
        } else {
          console.log(`[BOQ Match] Inserted chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(itemsToInsert.length / chunkSize)}`);
        }
      }
      console.log(`[BOQ Match] Batch inserted ${itemsToInsert.length} items`);
    }

    // Apply master material updates
    let ratesUpdatedCount = 0;
    console.log(`[BOQ Match] Applying ${masterUpdates.size} master material updates...`);
    for (const [materialId, updateData] of masterUpdates) {
      const { error: updateError } = await supabase
        .from('master_materials')
        .update(updateData)
        .eq('id', materialId);
      
      if (!updateError) {
        ratesUpdatedCount++;
      } else {
        console.error(`[BOQ Match] Failed to update material ${materialId}:`, updateError);
      }
    }

    // Log summary
    console.log(`[BOQ Match] ========== Processing Summary ==========`);
    console.log(`  Total items extracted: ${matchResults.length}`);
    console.log(`  Items with rates: ${itemsWithRates.length}`);
    console.log(`  Matched to master: ${matchedCount}`);
    console.log(`  New items (unmatched): ${newItemCount}`);
    console.log(`  Master rates updated: ${ratesUpdatedCount}`);
    console.log(`  Outliers detected: ${outlierCount}`);
    console.log(`  Rate-only items: ${rateOnlyCount}`);
    console.log(`  Math validation failures: ${mathFailCount}`);
    console.log(`[BOQ Match] =======================================`);

    // Update upload status with summary
    const { error: finalStatusError } = await supabase
      .from('boq_uploads')
      .update({ 
        status: 'completed',
        extraction_completed_at: new Date().toISOString(),
        total_items_extracted: matchResults.length,
        items_matched_to_master: matchedCount,
        items_added_to_master: ratesUpdatedCount,
        error_message: null
      })
      .eq('id', upload_id);

    if (finalStatusError) {
      console.error('[BOQ Match] Failed to update final status:', finalStatusError);
    }

    console.log(`[BOQ Match] Completed successfully`);

    return {
      total_items: matchResults.length,
      matched_count: matchedCount,
      new_count: newItemCount
    };

  } catch (error) {
    console.error('[BOQ Match] Processing error:', error);
    
    // Always update status to error
    try {
      await supabase
        .from('boq_uploads')
        .update({ 
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          extraction_completed_at: new Date().toISOString()
        })
        .eq('id', upload_id);
      console.log('[BOQ Match] Status updated to error');
    } catch (statusError) {
      console.error('[BOQ Match] Failed to update error status:', statusError);
    }
    
    throw error;
  }
}

/**
 * Enhanced basic parsing that uses explicit column mappings from the wizard
 */
function basicParseWithMappings(
  content: string,
  materialReference: { id: string; code: string; name: string; unit: string | null; supply_cost?: number | null; install_cost?: number | null }[],
  categories: MaterialCategory[] | null,
  columnMappings: Record<string, ColumnMapping>
): MatchResult[] {
  const results: MatchResult[] = [];
  const lines = content.split('\n');
  let rowNumber = 0;
  let currentSheet = '';
  let currentBillNumber = 0;
  let currentMapping: ColumnMapping | null = null;
  let isFirstDataRow = true;

  console.log('[BOQ Match] basicParseWithMappings processing', lines.length, 'lines');
  console.log('[BOQ Match] Available mappings for sheets:', Object.keys(columnMappings));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Detect sheet name
    if (trimmed.startsWith('=== SHEET:')) {
      currentSheet = trimmed.replace('=== SHEET:', '').replace('===', '').trim();
      currentBillNumber++;
      currentMapping = columnMappings[currentSheet] || null;
      isFirstDataRow = true;
      
      console.log(`[BOQ Match] Processing sheet: "${currentSheet}", mapping found: ${currentMapping ? 'YES' : 'NO'}`);
      if (currentMapping) {
        console.log(`[BOQ Match] Column indices - desc:${currentMapping.description}, unit:${currentMapping.unit}, qty:${currentMapping.quantity}, supplyRate:${currentMapping.supplyRate}, installRate:${currentMapping.installRate}, totalRate:${currentMapping.totalRate}, amount:${currentMapping.amount}`);
      }
      continue;
    }

    // Skip if no mapping for this sheet
    if (!currentMapping || currentMapping.description === null) continue;
    
    // Skip header row (first row after sheet marker)
    if (isFirstDataRow && trimmed.includes('\t')) {
      const parts = trimmed.split('\t');
      // Check if this looks like a header (contains typical header words)
      const headerWords = ['description', 'item', 'unit', 'qty', 'rate', 'amount', 'total', 'code'];
      const isHeader = parts.some(p => headerWords.some(h => p.toLowerCase().includes(h)));
      if (isHeader) {
        console.log('[BOQ Match] Skipping header row');
        isFirstDataRow = false;
        continue;
      }
      isFirstDataRow = false;
    }

    // Parse data rows using the mapped column positions
    const parts = trimmed.split('\t').map(p => p.trim());
    
    // Extract values using exact column positions
    const itemCode = currentMapping.itemCode !== null ? (parts[currentMapping.itemCode] || '') : '';
    const description = currentMapping.description !== null ? (parts[currentMapping.description] || '') : '';
    const unit = currentMapping.unit !== null ? (parts[currentMapping.unit] || '') : '';
    const quantityRaw = currentMapping.quantity !== null ? parts[currentMapping.quantity] : '';
    const supplyRateRaw = currentMapping.supplyRate !== null ? parts[currentMapping.supplyRate] : '';
    const installRateRaw = currentMapping.installRate !== null ? parts[currentMapping.installRate] : '';
    const totalRateRaw = currentMapping.totalRate !== null ? parts[currentMapping.totalRate] : '';
    const amountRaw = currentMapping.amount !== null ? parts[currentMapping.amount] : '';

    // Skip rows without meaningful description
    if (!description || description.length < 3) continue;
    
    // Skip total/subtotal rows
    const descLower = description.toLowerCase();
    if (/^(total|subtotal|sub-total|carried|summary|brought|section\s*total)/i.test(descLower)) continue;

    // Parse numeric values with currency handling
    const quantity = parseRate(quantityRaw);
    let supplyRate = parseRate(supplyRateRaw);
    let installRate = parseRate(installRateRaw);
    let totalRate = parseRate(totalRateRaw);
    const amount = parseRate(amountRaw);

    // Calculate missing rates
    if (totalRate === 0 && (supplyRate > 0 || installRate > 0)) {
      totalRate = supplyRate + installRate;
    }
    if (totalRate > 0 && supplyRate === 0 && installRate === 0) {
      supplyRate = Math.round(totalRate * 0.7 * 100) / 100;
      installRate = Math.round(totalRate * 0.3 * 100) / 100;
    }
    // If we have amount and quantity but no rate, calculate it
    if (totalRate === 0 && amount > 0 && quantity > 0) {
      totalRate = Math.round((amount / quantity) * 100) / 100;
      supplyRate = Math.round(totalRate * 0.7 * 100) / 100;
      installRate = Math.round(totalRate * 0.3 * 100) / 100;
    }

    rowNumber++;

    // Log first few items with rates for debugging
    if (rowNumber <= 5 && totalRate > 0) {
      console.log(`[BOQ Match] Row ${rowNumber}: "${description.substring(0, 40)}..." | Qty: ${quantity} | Supply: R${supplyRate} | Install: R${installRate} | Total: R${totalRate}`);
    }

    // Match to master materials using specialized pattern matching
    const matchResult = matchToMasterMaterial(descLower, materialReference, categories);

    results.push({
      row_number: rowNumber,
      item_description: description,
      item_code: itemCode || null,
      unit: standardizeUnit(unit) || null,
      quantity: quantity || null,
      supply_rate: supplyRate || null,
      install_rate: installRate || null,
      total_rate: totalRate || null,
      matched_material_id: matchResult.confidence >= 0.6 ? matchResult.materialId : null,
      match_confidence: matchResult.confidence,
      suggested_category_id: matchResult.categoryId,
      suggested_category_name: matchResult.categoryName,
      is_new_item: matchResult.confidence < 0.6,
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

  const itemsWithRates = results.filter(r => (r.total_rate || 0) > 0);
  console.log(`[BOQ Match] basicParseWithMappings extracted ${results.length} items, ${itemsWithRates.length} with rates`);
  
  return results;
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
      const arrayStart = cleanedText.indexOf('[');
      if (arrayStart >= 0) {
        let jsonContent = cleanedText.substring(arrayStart);
        
        // Try 3: Parse as-is first
        try {
          parsed = JSON.parse(jsonContent);
          console.log('[BOQ Match] Parse after array extraction succeeded');
        } catch (e2) {
          // Try 4: Repair truncated JSON
          const lastCompleteObj = jsonContent.lastIndexOf('},');
          const lastSingleObj = jsonContent.lastIndexOf('}');
          
          let repairPoint = -1;
          if (lastCompleteObj > 0) {
            repairPoint = lastCompleteObj + 1;
          } else if (lastSingleObj > 0) {
            repairPoint = lastSingleObj + 1;
          }
          
          if (repairPoint > 0) {
            const repairedJson = jsonContent.substring(0, repairPoint) + ']';
            try {
              parsed = JSON.parse(repairedJson);
              console.log(`[BOQ Match] Repaired JSON parse succeeded with ${parsed.length} items`);
            } catch (e3) {
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
      console.log('[BOQ Match] All JSON parsing failed, using basic parse');
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
 * Basic parsing fallback without column mappings
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
      if (headerIndices['quantity'] !== undefined) quantity = parseRate(parts[headerIndices['quantity']]);
      if (headerIndices['supplyRate'] !== undefined) supplyRate = parseRate(parts[headerIndices['supplyRate']]);
      if (headerIndices['installRate'] !== undefined) installRate = parseRate(parts[headerIndices['installRate']]);
      if (headerIndices['totalRate'] !== undefined) totalRate = parseRate(parts[headerIndices['totalRate']]);
      if (headerIndices['amount'] !== undefined) amount = parseRate(parts[headerIndices['amount']]);
    } else {
      // Fallback: heuristic parsing
      for (const part of parts) {
        if (part.length > description.length && !/^[\d.,\s]+$/.test(part) && part.length > 3) {
          description = part;
        }
        if (/^(m|m2|m²|m3|m³|each|no|nr|item|set|lot|kg|l|lm|ps|pc)$/i.test(part)) {
          unit = part;
        }
        const num = parseRate(part);
        if (num > 0) {
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
      supplyRate = Math.round(totalRate * 0.7 * 100) / 100;
      installRate = Math.round(totalRate * 0.3 * 100) / 100;
    }
    // If we have amount and quantity, calculate rate
    if (totalRate === 0 && amount > 0 && quantity > 0) {
      totalRate = Math.round((amount / quantity) * 100) / 100;
      supplyRate = Math.round(totalRate * 0.7 * 100) / 100;
      installRate = Math.round(totalRate * 0.3 * 100) / 100;
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
