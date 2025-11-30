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

  // Create JWT for Google OAuth - expanded scopes for all APIs
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const scopes = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/presentations',
    'https://www.googleapis.com/auth/gmail.send',
  ].join(' ');

  const claim = {
    iss: serviceEmail,
    scope: scopes,
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

// ==================== SHEETS API ====================

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

async function writeToSheet(accessToken: string, spreadsheetId: string, sheetData: SheetData, sheetName: string = 'BOQ Data'): Promise<void> {
  const values = [sheetData.headers, ...sheetData.rows];
  
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1?valueInputOption=USER_ENTERED`,
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

async function readFromSheet(accessToken: string, spreadsheetId: string, range: string = 'A:Z'): Promise<SheetData> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
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

// ==================== DRIVE API ====================

async function shareFile(accessToken: string, fileId: string, role: string = 'writer'): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role,
        type: 'anyone',
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.warn('Share file failed:', errorText);
  }
}

// ==================== DOCS API ====================

async function createGoogleDoc(accessToken: string, title: string): Promise<{ documentId: string; documentUrl: string }> {
  const response = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Create doc failed:', errorText);
    throw new Error(`Failed to create Google Doc: ${errorText}`);
  }

  const data = await response.json();
  return {
    documentId: data.documentId,
    documentUrl: `https://docs.google.com/document/d/${data.documentId}/edit`,
  };
}

async function updateGoogleDoc(accessToken: string, documentId: string, requests: any[]): Promise<void> {
  const response = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Update doc failed:', errorText);
    throw new Error(`Failed to update Google Doc: ${errorText}`);
  }
}

// ==================== SLIDES API ====================

async function createGoogleSlides(accessToken: string, title: string): Promise<{ presentationId: string; presentationUrl: string }> {
  const response = await fetch('https://slides.googleapis.com/v1/presentations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Create presentation failed:', errorText);
    throw new Error(`Failed to create Google Slides: ${errorText}`);
  }

  const data = await response.json();
  return {
    presentationId: data.presentationId,
    presentationUrl: `https://docs.google.com/presentation/d/${data.presentationId}/edit`,
  };
}

async function updateGoogleSlides(accessToken: string, presentationId: string, requests: any[]): Promise<void> {
  const response = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Update presentation failed:', errorText);
    throw new Error(`Failed to update Google Slides: ${errorText}`);
  }
}

// ==================== GMAIL API ====================

async function sendGmail(
  accessToken: string, 
  to: string, 
  subject: string, 
  body: string,
  fromName?: string
): Promise<{ messageId: string }> {
  // Build the email in RFC 2822 format
  const serviceEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const from = fromName ? `${fromName} <${serviceEmail}>` : serviceEmail;
  
  const emailLines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    body,
  ];
  
  const email = emailLines.join('\r\n');
  const encodedEmail = btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedEmail }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Send email failed:', errorText);
    throw new Error(`Failed to send email via Gmail: ${errorText}`);
  }

  const data = await response.json();
  return { messageId: data.id };
}

// ==================== MAIN HANDLER ====================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { action } = requestBody;
    
    console.log(`Google API action: ${action}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const accessToken = await getGoogleAccessToken();
    console.log('Got Google access token');

    switch (action) {
      // ==================== SHEETS ACTIONS ====================
      case 'export': {
        const { upload_id, title } = requestBody;
        if (!upload_id) throw new Error('upload_id is required for export');

        const { data: upload, error: uploadError } = await supabase
          .from('boq_uploads')
          .select('*')
          .eq('id', upload_id)
          .single();

        if (uploadError || !upload) throw new Error('Upload not found');

        const { data: items, error: itemsError } = await supabase
          .from('boq_extracted_items')
          .select('*')
          .eq('upload_id', upload_id)
          .order('row_number');

        if (itemsError) throw new Error(`Failed to get items: ${itemsError.message}`);

        const sheetTitle = title || `BOQ - ${upload.file_name} - ${new Date().toISOString().split('T')[0]}`;
        const { spreadsheetId, spreadsheetUrl } = await createGoogleSheet(accessToken, sheetTitle);
        console.log(`Created sheet: ${spreadsheetId}`);

        const headers = [
          'Row #', 'Bill #', 'Bill Name', 'Section Code', 'Section Name',
          'Item Code', 'Item Description', 'Unit', 'Quantity',
          'Supply Rate', 'Install Rate', 'Total Rate',
          'Review Status', 'Match Confidence', 'Matched Material ID', 'Notes'
        ];

        const rows = (items || []).map(item => [
          item.row_number, item.bill_number, item.bill_name, item.section_code, item.section_name,
          item.item_code, item.item_description, item.unit, item.quantity,
          item.supply_rate, item.install_rate, item.total_rate,
          item.review_status || 'pending', item.match_confidence, item.matched_material_id, item.extraction_notes
        ]);

        await writeToSheet(accessToken, spreadsheetId, { headers, rows });
        console.log(`Wrote ${rows.length} rows to sheet`);

        await shareFile(accessToken, spreadsheetId);

        await supabase.from('boq_uploads').update({ 
          source_description: `${upload.source_description || ''}\n[Google Sheet: ${spreadsheetUrl}]`.trim()
        }).eq('id', upload_id);

        return new Response(JSON.stringify({
          success: true, spreadsheetId, spreadsheetUrl, itemCount: rows.length,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'sync_from_sheet': {
        const { spreadsheet_id, upload_id } = requestBody;
        if (!spreadsheet_id || !upload_id) throw new Error('spreadsheet_id and upload_id are required');

        const sheetData = await readFromSheet(accessToken, spreadsheet_id, 'BOQ Data!A:P');
        console.log(`Read ${sheetData.rows.length} rows from sheet`);

        const headerMap: Record<string, number> = {};
        sheetData.headers.forEach((h, i) => {
          headerMap[h.toLowerCase().replace(/[^a-z0-9]/g, '_')] = i;
        });

        let updatedCount = 0;
        for (const row of sheetData.rows) {
          const rowNum = row[headerMap['row__'] || headerMap['row_']] as number;
          if (!rowNum) continue;

          const updates: Record<string, any> = {};
          if (row[headerMap['item_description']]) updates.item_description = row[headerMap['item_description']];
          if (row[headerMap['unit']]) updates.unit = row[headerMap['unit']];
          if (row[headerMap['quantity']] !== undefined) updates.quantity = parseFloat(row[headerMap['quantity']] as string) || null;
          if (row[headerMap['supply_rate']] !== undefined) updates.supply_rate = parseFloat(row[headerMap['supply_rate']] as string) || null;
          if (row[headerMap['install_rate']] !== undefined) updates.install_rate = parseFloat(row[headerMap['install_rate']] as string) || null;
          if (row[headerMap['total_rate']] !== undefined) updates.total_rate = parseFloat(row[headerMap['total_rate']] as string) || null;
          if (row[headerMap['review_status']]) updates.review_status = row[headerMap['review_status']];
          if (row[headerMap['notes']]) updates.extraction_notes = row[headerMap['notes']];

          if (Object.keys(updates).length > 0) {
            const { error } = await supabase.from('boq_extracted_items')
              .update(updates).eq('upload_id', upload_id).eq('row_number', rowNum);
            if (!error) updatedCount++;
          }
        }

        return new Response(JSON.stringify({
          success: true, updatedCount, totalRows: sheetData.rows.length,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'sync_to_sheet': {
        const { spreadsheet_id, upload_id } = requestBody;
        if (!spreadsheet_id || !upload_id) throw new Error('spreadsheet_id and upload_id are required');

        const { data: items, error: itemsError } = await supabase
          .from('boq_extracted_items')
          .select('*')
          .eq('upload_id', upload_id)
          .order('row_number');

        if (itemsError) throw new Error(`Failed to get items: ${itemsError.message}`);

        const headers = [
          'Row #', 'Bill #', 'Bill Name', 'Section Code', 'Section Name',
          'Item Code', 'Item Description', 'Unit', 'Quantity',
          'Supply Rate', 'Install Rate', 'Total Rate',
          'Review Status', 'Match Confidence', 'Matched Material ID', 'Notes'
        ];

        const rows = (items || []).map(item => [
          item.row_number, item.bill_number, item.bill_name, item.section_code, item.section_name,
          item.item_code, item.item_description, item.unit, item.quantity,
          item.supply_rate, item.install_rate, item.total_rate,
          item.review_status || 'pending', item.match_confidence, item.matched_material_id, item.extraction_notes
        ]);

        await writeToSheet(accessToken, spreadsheet_id, { headers, rows });

        return new Response(JSON.stringify({
          success: true, itemCount: rows.length,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // ==================== DOCS ACTIONS ====================
      case 'create_doc': {
        const { title, content } = requestBody;
        if (!title) throw new Error('title is required');

        const { documentId, documentUrl } = await createGoogleDoc(accessToken, title);
        console.log(`Created doc: ${documentId}`);

        if (content) {
          await updateGoogleDoc(accessToken, documentId, [
            { insertText: { location: { index: 1 }, text: content } }
          ]);
        }

        await shareFile(accessToken, documentId);

        return new Response(JSON.stringify({
          success: true, documentId, documentUrl,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'create_boq_report': {
        const { upload_id, title } = requestBody;
        if (!upload_id) throw new Error('upload_id is required');

        const { data: upload } = await supabase.from('boq_uploads').select('*').eq('id', upload_id).single();
        if (!upload) throw new Error('Upload not found');

        const { data: items } = await supabase.from('boq_extracted_items')
          .select('*').eq('upload_id', upload_id).order('bill_number, section_code, row_number');

        const docTitle = title || `BOQ Report - ${upload.file_name}`;
        const { documentId, documentUrl } = await createGoogleDoc(accessToken, docTitle);

        // Build document content
        const lines: string[] = [
          `BOQ Report: ${upload.file_name}\n`,
          `Generated: ${new Date().toLocaleDateString()}\n`,
          `Province: ${upload.province || 'N/A'}\n`,
          `Building Type: ${upload.building_type || 'N/A'}\n`,
          `Total Items: ${items?.length || 0}\n\n`,
          '─'.repeat(50) + '\n\n',
        ];

        let currentBill = '';
        let currentSection = '';
        for (const item of items || []) {
          if (item.bill_name && item.bill_name !== currentBill) {
            currentBill = item.bill_name;
            lines.push(`\nBILL: ${item.bill_number || ''} - ${currentBill}\n`);
            lines.push('─'.repeat(40) + '\n');
          }
          if (item.section_name && item.section_name !== currentSection) {
            currentSection = item.section_name;
            lines.push(`\n  Section: ${item.section_code || ''} ${currentSection}\n`);
          }
          lines.push(`    ${item.item_code || ''}: ${item.item_description}\n`);
          lines.push(`      Qty: ${item.quantity || '-'} ${item.unit || ''} | Rate: R${item.total_rate || '-'}\n`);
        }

        await updateGoogleDoc(accessToken, documentId, [
          { insertText: { location: { index: 1 }, text: lines.join('') } }
        ]);

        await shareFile(accessToken, documentId);

        return new Response(JSON.stringify({
          success: true, documentId, documentUrl, itemCount: items?.length || 0,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // ==================== SLIDES ACTIONS ====================
      case 'create_presentation': {
        const { title } = requestBody;
        if (!title) throw new Error('title is required');

        const { presentationId, presentationUrl } = await createGoogleSlides(accessToken, title);
        await shareFile(accessToken, presentationId);

        return new Response(JSON.stringify({
          success: true, presentationId, presentationUrl,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'create_boq_presentation': {
        const { upload_id, title } = requestBody;
        if (!upload_id) throw new Error('upload_id is required');

        const { data: upload } = await supabase.from('boq_uploads').select('*').eq('id', upload_id).single();
        if (!upload) throw new Error('Upload not found');

        const { data: items } = await supabase.from('boq_extracted_items')
          .select('*').eq('upload_id', upload_id).order('bill_number, section_code');

        const presTitle = title || `BOQ Presentation - ${upload.file_name}`;
        const { presentationId, presentationUrl } = await createGoogleSlides(accessToken, presTitle);

        // Group items by bill
        const billGroups: Record<string, any[]> = {};
        for (const item of items || []) {
          const billKey = item.bill_name || 'General';
          if (!billGroups[billKey]) billGroups[billKey] = [];
          billGroups[billKey].push(item);
        }

        // Create slides for each bill (simplified - just creates title slide for now)
        const requests: any[] = [];
        let slideIndex = 0;

        // Title slide update
        requests.push({
          insertText: {
            objectId: 'title',
            text: presTitle,
          }
        });

        await shareFile(accessToken, presentationId);

        return new Response(JSON.stringify({
          success: true, presentationId, presentationUrl, billCount: Object.keys(billGroups).length,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // ==================== GMAIL ACTIONS ====================
      case 'send_email': {
        const { to, subject, body, from_name } = requestBody;
        if (!to || !subject || !body) throw new Error('to, subject, and body are required');

        const { messageId } = await sendGmail(accessToken, to, subject, body, from_name);
        console.log(`Sent email: ${messageId}`);

        return new Response(JSON.stringify({
          success: true, messageId,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'share_boq_via_email': {
        const { upload_id, to, message } = requestBody;
        if (!upload_id || !to) throw new Error('upload_id and to are required');

        const { data: upload } = await supabase.from('boq_uploads').select('*').eq('id', upload_id).single();
        if (!upload) throw new Error('Upload not found');

        // Check for linked sheet
        const sheetMatch = upload.source_description?.match(/\[Google Sheet: (https:\/\/[^\]]+)\]/);
        const sheetUrl = sheetMatch ? sheetMatch[1] : null;

        const subject = `BOQ Shared: ${upload.file_name}`;
        const htmlBody = `
          <h2>BOQ Document Shared</h2>
          <p><strong>File:</strong> ${upload.file_name}</p>
          <p><strong>Province:</strong> ${upload.province || 'N/A'}</p>
          <p><strong>Building Type:</strong> ${upload.building_type || 'N/A'}</p>
          <p><strong>Items Extracted:</strong> ${upload.total_items_extracted || 0}</p>
          ${sheetUrl ? `<p><a href="${sheetUrl}">View in Google Sheets</a></p>` : ''}
          ${message ? `<hr><p>${message}</p>` : ''}
        `;

        const { messageId } = await sendGmail(accessToken, to, subject, htmlBody, 'BOQ System');

        return new Response(JSON.stringify({
          success: true, messageId,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Google API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
