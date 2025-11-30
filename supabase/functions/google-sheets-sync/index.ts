import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SheetData {
  headers: string[];
  rows: (string | number | null)[][];
}

// Get Google API access token using service account
async function getGoogleAccessToken(): Promise<string> {
  const serviceEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const privateKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');

  if (!serviceEmail || !privateKey) {
    throw new Error('Google service account credentials not configured');
  }

  // Clean up the private key (handle escaped newlines)
  const cleanedKey = privateKey.replace(/\\n/g, '\n');

  // Create JWT for Google OAuth
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  // Base64url encode
  const base64urlEncode = (obj: object | Uint8Array): string => {
    const str = obj instanceof Uint8Array 
      ? new TextDecoder().decode(obj)
      : JSON.stringify(obj);
    const base64 = btoa(str);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const encodedHeader = base64urlEncode(header);
  const encodedClaim = base64urlEncode(claim);
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  // Import the private key and sign
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = cleanedKey
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = base64urlEncode(new Uint8Array(signature));
  const jwt = `${signatureInput}.${encodedSignature}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Token exchange failed:', errorText);
    throw new Error(`Failed to get access token: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// Create a new Google Sheet
async function createGoogleSheet(accessToken: string, title: string): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: 'BOQ Data' } }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Create sheet failed:', errorText);
    throw new Error(`Failed to create Google Sheet: ${errorText}`);
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl,
  };
}

// Write data to Google Sheet
async function writeToSheet(accessToken: string, spreadsheetId: string, sheetData: SheetData): Promise<void> {
  const values = [sheetData.headers, ...sheetData.rows];
  
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Write to sheet failed:', errorText);
    throw new Error(`Failed to write to Google Sheet: ${errorText}`);
  }
}

// Read data from Google Sheet
async function readFromSheet(accessToken: string, spreadsheetId: string, range: string = 'A:Z'): Promise<SheetData> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Read from sheet failed:', errorText);
    throw new Error(`Failed to read from Google Sheet: ${errorText}`);
  }

  const data = await response.json();
  const values = data.values || [];
  
  return {
    headers: values[0] || [],
    rows: values.slice(1),
  };
}

// Make the sheet publicly viewable (anyone with link can view)
async function shareSheet(accessToken: string, spreadsheetId: string): Promise<void> {
  // Get the file ID (same as spreadsheet ID for Sheets)
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'writer',
        type: 'anyone',
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Share sheet failed:', errorText);
    // Don't throw - sharing is optional
    console.warn('Could not share sheet publicly:', errorText);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, upload_id, spreadsheet_id, sheet_data, title } = await req.json();
    
    console.log(`Google Sheets action: ${action}, upload_id: ${upload_id}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const accessToken = await getGoogleAccessToken();
    console.log('Got Google access token');

    switch (action) {
      case 'export': {
        // Export BOQ data to a new Google Sheet
        if (!upload_id) {
          throw new Error('upload_id is required for export');
        }

        // Get upload info
        const { data: upload, error: uploadError } = await supabase
          .from('boq_uploads')
          .select('*')
          .eq('id', upload_id)
          .single();

        if (uploadError || !upload) {
          throw new Error('Upload not found');
        }

        // Get extracted items
        const { data: items, error: itemsError } = await supabase
          .from('boq_extracted_items')
          .select('*')
          .eq('upload_id', upload_id)
          .order('row_number');

        if (itemsError) {
          throw new Error(`Failed to get items: ${itemsError.message}`);
        }

        // Create sheet
        const sheetTitle = title || `BOQ - ${upload.file_name} - ${new Date().toISOString().split('T')[0]}`;
        const { spreadsheetId, spreadsheetUrl } = await createGoogleSheet(accessToken, sheetTitle);
        console.log(`Created sheet: ${spreadsheetId}`);

        // Prepare data
        const headers = [
          'Row #', 'Bill #', 'Bill Name', 'Section Code', 'Section Name',
          'Item Code', 'Item Description', 'Unit', 'Quantity',
          'Supply Rate', 'Install Rate', 'Total Rate',
          'Review Status', 'Match Confidence', 'Matched Material ID',
          'Notes'
        ];

        const rows = (items || []).map(item => [
          item.row_number,
          item.bill_number,
          item.bill_name,
          item.section_code,
          item.section_name,
          item.item_code,
          item.item_description,
          item.unit,
          item.quantity,
          item.supply_rate,
          item.install_rate,
          item.total_rate,
          item.review_status || 'pending',
          item.match_confidence,
          item.matched_material_id,
          item.extraction_notes
        ]);

        await writeToSheet(accessToken, spreadsheetId, { headers, rows });
        console.log(`Wrote ${rows.length} rows to sheet`);

        // Share the sheet
        await shareSheet(accessToken, spreadsheetId);

        // Update the upload record with the sheet info
        await supabase
          .from('boq_uploads')
          .update({ 
            // Store sheet info in source_description for now (we could add dedicated columns later)
            source_description: `${upload.source_description || ''}\n[Google Sheet: ${spreadsheetUrl}]`.trim()
          })
          .eq('id', upload_id);

        return new Response(JSON.stringify({
          success: true,
          spreadsheetId,
          spreadsheetUrl,
          itemCount: rows.length,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'sync_from_sheet': {
        // Sync data from Google Sheet back to database
        if (!spreadsheet_id || !upload_id) {
          throw new Error('spreadsheet_id and upload_id are required for sync');
        }

        const sheetData = await readFromSheet(accessToken, spreadsheet_id, 'BOQ Data!A:P');
        console.log(`Read ${sheetData.rows.length} rows from sheet`);

        // Map headers to indices
        const headerMap: Record<string, number> = {};
        sheetData.headers.forEach((h, i) => {
          headerMap[h.toLowerCase().replace(/[^a-z0-9]/g, '_')] = i;
        });

        // Process each row and update database
        let updatedCount = 0;
        for (const row of sheetData.rows) {
          const rowNum = row[headerMap['row__'] || headerMap['row_']] as number;
          if (!rowNum) continue;

          const updates: Record<string, any> = {};
          
          // Map editable fields
          if (row[headerMap['item_description']]) {
            updates.item_description = row[headerMap['item_description']];
          }
          if (row[headerMap['unit']]) {
            updates.unit = row[headerMap['unit']];
          }
          if (row[headerMap['quantity']] !== undefined) {
            updates.quantity = parseFloat(row[headerMap['quantity']] as string) || null;
          }
          if (row[headerMap['supply_rate']] !== undefined) {
            updates.supply_rate = parseFloat(row[headerMap['supply_rate']] as string) || null;
          }
          if (row[headerMap['install_rate']] !== undefined) {
            updates.install_rate = parseFloat(row[headerMap['install_rate']] as string) || null;
          }
          if (row[headerMap['total_rate']] !== undefined) {
            updates.total_rate = parseFloat(row[headerMap['total_rate']] as string) || null;
          }
          if (row[headerMap['review_status']]) {
            updates.review_status = row[headerMap['review_status']];
          }
          if (row[headerMap['notes']]) {
            updates.extraction_notes = row[headerMap['notes']];
          }

          if (Object.keys(updates).length > 0) {
            const { error } = await supabase
              .from('boq_extracted_items')
              .update(updates)
              .eq('upload_id', upload_id)
              .eq('row_number', rowNum);

            if (!error) updatedCount++;
          }
        }

        console.log(`Updated ${updatedCount} items from sheet`);

        return new Response(JSON.stringify({
          success: true,
          updatedCount,
          totalRows: sheetData.rows.length,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'sync_to_sheet': {
        // Sync data from database to existing Google Sheet
        if (!spreadsheet_id || !upload_id) {
          throw new Error('spreadsheet_id and upload_id are required for sync');
        }

        // Get latest items from database
        const { data: items, error: itemsError } = await supabase
          .from('boq_extracted_items')
          .select('*')
          .eq('upload_id', upload_id)
          .order('row_number');

        if (itemsError) {
          throw new Error(`Failed to get items: ${itemsError.message}`);
        }

        const headers = [
          'Row #', 'Bill #', 'Bill Name', 'Section Code', 'Section Name',
          'Item Code', 'Item Description', 'Unit', 'Quantity',
          'Supply Rate', 'Install Rate', 'Total Rate',
          'Review Status', 'Match Confidence', 'Matched Material ID',
          'Notes'
        ];

        const rows = (items || []).map(item => [
          item.row_number,
          item.bill_number,
          item.bill_name,
          item.section_code,
          item.section_name,
          item.item_code,
          item.item_description,
          item.unit,
          item.quantity,
          item.supply_rate,
          item.install_rate,
          item.total_rate,
          item.review_status || 'pending',
          item.match_confidence,
          item.matched_material_id,
          item.extraction_notes
        ]);

        await writeToSheet(accessToken, spreadsheet_id, { headers, rows });
        console.log(`Synced ${rows.length} rows to sheet`);

        return new Response(JSON.stringify({
          success: true,
          itemCount: rows.length,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Google Sheets sync error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
