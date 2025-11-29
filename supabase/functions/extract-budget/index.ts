import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedSection {
  section_code: string;
  section_name: string;
  display_order: number;
  line_items: ExtractedLineItem[];
}

interface ExtractedLineItem {
  item_number: string;
  description: string;
  area: number | null;
  area_unit: string;
  base_rate: number | null;
  ti_rate: number | null;
  total: number;
  shop_number: string | null;
  is_tenant_item: boolean;
}

interface ExtractedBudget {
  budget_number: string;
  revision: string;
  budget_date: string;
  prepared_for_company: string | null;
  prepared_for_contact: string | null;
  sections: ExtractedSection[];
  area_schedule: AreaScheduleItem[];
}

interface AreaScheduleItem {
  shop_number: string;
  tenant_name: string;
  area: number;
  area_unit: string;
  base_rate: number | null;
  ti_rate: number | null;
  total: number | null;
  category: string;
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

    const { file_content, project_id, budget_id } = await req.json();

    if (!file_content) {
      throw new Error('file_content is required');
    }

    console.log(`[Budget Extract] Starting extraction for project: ${project_id}`);

    // Update budget status if budget_id provided
    if (budget_id) {
      await supabase
        .from('electrical_budgets')
        .update({ extraction_status: 'processing' })
        .eq('id', budget_id);
    }

    const extractionPrompt = `You are an expert at parsing South African electrical budget documents.

DOCUMENT STRUCTURE TO DETECT:
1. COVER PAGE: Budget number, date, revision, prepared for company/contact
2. SECTIONS: Look for sections labeled A through H (e.g., "A. PRELIMS", "B. BULK SUPPLY", "C. RETAIL SECTION")
3. LINE ITEMS: Each item has description, area (m²), rates, and total
4. AREA SCHEDULE: Section C typically contains tenant/shop items with areas and rates

SECTION CODES TO RECOGNIZE:
- A: PRELIMS / PRELIMINARIES
- B: BULK SUPPLY / MEDIUM VOLTAGE
- C: RETAIL SECTION / TENANTS / SHOPS (IMPORTANT: Contains both Base Rate AND TI Rate columns)
- D: EXTERIOR & PARKING
- E: COMMON AREAS
- F: FIRE DETECTION
- G: EARTHING / LIGHTNING PROTECTION
- H: CONTINGENCY / PROVISIONAL

CRITICAL - SECTION C RATE EXTRACTION:
Section C (Retail/Tenants) typically has a table with MULTIPLE RATE COLUMNS:
- Column headers may include: "Area (m²)", "BASE RATE (R/m²)", "TI RATE (R/m²)", "TOTAL (R)"
- BASE RATE: The base electrical allowance rate per square meter
- TI RATE: Tenant Installation rate per square meter (additional rate for tenant fit-out)
- The TOTAL = Area × (Base Rate + TI Rate)
- BOTH rates must be extracted separately - do NOT combine them into one rate

For SECTION C (Retail/Tenants), extract for each shop:
- Shop number (e.g., "SHOP 1", "Shop 77", "Shop 27/28")
- Tenant name (e.g., "CLICKS", "SHOPRITE", "SUPERSPAR")
- Area in m²
- Base Rate (R/m²) - the base electrical rate
- TI Rate (R/m²) - the tenant installation rate (may also be called "TI", "Tenant Installation", "Fit-out Rate")
- Category (Standard, Fast Food, Restaurant, National)

Extract ALL sections and line items. For each line item:
1. item_number - Reference number (e.g., "C.1", "C.2.1")
2. description - Full description including shop name
3. area - Numeric area value in m²
4. area_unit - Usually "m²"
5. base_rate - Base rate per m² (R value) - REQUIRED for Section C items
6. ti_rate - TI (Tenant Installation) rate per m² - REQUIRED for Section C items, extract from separate column
7. total - Total cost = area × (base_rate + ti_rate)
8. shop_number - For Section C items, the shop number
9. is_tenant_item - true if this is a shop/tenant line item

Return ONLY valid JSON in this exact format:
{
  "budget_number": "string",
  "revision": "string (e.g., Rev 1)",
  "budget_date": "YYYY-MM-DD",
  "prepared_for_company": "string or null",
  "prepared_for_contact": "string or null",
  "sections": [
    {
      "section_code": "A",
      "section_name": "PRELIMS",
      "display_order": 1,
      "line_items": [
        {
          "item_number": "A.1",
          "description": "Item description",
          "area": 100.5,
          "area_unit": "m²",
          "base_rate": 250.00,
          "ti_rate": null,
          "total": 25050.00,
          "shop_number": null,
          "is_tenant_item": false
        }
      ]
    }
  ],
  "area_schedule": [
    {
      "shop_number": "1",
      "tenant_name": "CLICKS",
      "area": 574.4,
      "area_unit": "m²",
      "base_rate": 250.00,
      "ti_rate": 150.00,
      "total": 229760.00,
      "category": "Standard"
    }
  ]
}

RULES:
- Parse ALL sections from A to H
- For Section C, identify each tenant/shop and include in area_schedule WITH BOTH base_rate AND ti_rate
- Costs are in South African Rand (R)
- Total = area × (base_rate + ti_rate)
- Preserve original item numbering
- Category detection: Fast Food = restaurants with cooking, Restaurant = sit-down dining, National = major chains like Shoprite/Clicks/PnP
- IMPORTANT: Do NOT skip the TI Rate column - it is essential data

BUDGET CONTENT:
${file_content}`;

    let extractedBudget: ExtractedBudget | null = null;

    if (lovableApiKey) {
      console.log('[Budget Extract] Using Lovable AI for extraction');
      console.log('[Budget Extract] Content length:', file_content.length, 'characters');
      
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Use gemini-2.5-pro for better handling of large documents
          model: 'google/gemini-2.5-pro',
          messages: [
            { role: 'system', content: 'You are a document parsing assistant. Return only valid, complete JSON. Do not truncate the output.' },
            { role: 'user', content: extractionPrompt }
          ],
        }),
      });

      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (response.status === 402) {
        throw new Error('AI credits exhausted. Please add credits to continue.');
      }
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Budget Extract] API error:', response.status, errorText);
        throw new Error(`AI service error: ${response.status}`);
      }

      // Get raw response text first to debug any issues
      const responseText = await response.text();
      console.log('[Budget Extract] Raw response length:', responseText.length, 'characters');
      
      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response from AI service');
      }
      
      let aiResult;
      try {
        aiResult = JSON.parse(responseText);
      } catch (e) {
        console.error('[Budget Extract] Failed to parse API response:', responseText.substring(0, 500));
        throw new Error('Invalid JSON response from AI service');
      }
      
      console.log('[Budget Extract] Response parsed, extracting content...');
      
      if (aiResult.choices?.[0]?.message?.content) {
        const rawText = aiResult.choices[0].message.content;
        console.log('[Budget Extract] Content length:', rawText.length, 'characters');
        
        // Clean the response - remove markdown code blocks
        let cleanedText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Try to extract JSON if wrapped in other text
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedText = jsonMatch[0];
        }
        
        try {
          extractedBudget = JSON.parse(cleanedText);
          console.log(`[Budget Extract] AI extracted ${extractedBudget?.sections?.length || 0} sections`);
        } catch (parseError) {
          console.error('[Budget Extract] Failed to parse AI response:', parseError);
          console.log('[Budget Extract] Raw response (first 2000 chars):', rawText.substring(0, 2000));
          console.log('[Budget Extract] Raw response (last 500 chars):', rawText.substring(rawText.length - 500));
          
          // Try to salvage partial JSON by closing brackets
          try {
            let fixedJson = cleanedText;
            // Count open brackets
            const openBraces = (fixedJson.match(/\{/g) || []).length;
            const closeBraces = (fixedJson.match(/\}/g) || []).length;
            const openBrackets = (fixedJson.match(/\[/g) || []).length;
            const closeBrackets = (fixedJson.match(/\]/g) || []).length;
            
            // Add missing closing brackets
            for (let i = 0; i < openBrackets - closeBrackets; i++) {
              fixedJson += ']';
            }
            for (let i = 0; i < openBraces - closeBraces; i++) {
              fixedJson += '}';
            }
            
            extractedBudget = JSON.parse(fixedJson);
            console.log('[Budget Extract] Recovered partial JSON successfully');
          } catch (recoveryError) {
            console.error('[Budget Extract] JSON recovery failed:', recoveryError);
            throw new Error('Failed to parse AI extraction results - response may have been truncated');
          }
        }
      } else {
        console.error('[Budget Extract] No AI response content:', JSON.stringify(aiResult).substring(0, 500));
        throw new Error('No response from AI');
      }
    } else {
      throw new Error('AI service not configured');
    }

    // Update budget status
    if (budget_id && extractedBudget) {
      await supabase
        .from('electrical_budgets')
        .update({ 
          extraction_status: 'extracted',
          budget_number: extractedBudget.budget_number || undefined,
          revision: extractedBudget.revision || undefined,
          prepared_for_company: extractedBudget.prepared_for_company || undefined,
          prepared_for_contact: extractedBudget.prepared_for_contact || undefined,
        })
        .eq('id', budget_id);
    }

    const totalSections = extractedBudget?.sections?.length || 0;
    const totalLineItems = extractedBudget?.sections?.reduce((sum, s) => sum + (s.line_items?.length || 0), 0) || 0;
    const totalAreaSchedule = extractedBudget?.area_schedule?.length || 0;

    console.log(`[Budget Extract] Completed: ${totalSections} sections, ${totalLineItems} line items, ${totalAreaSchedule} area schedule items`);

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedBudget,
        summary: {
          sections: totalSections,
          line_items: totalLineItems,
          area_schedule_items: totalAreaSchedule
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Budget Extract] Error:', errorMessage);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
