import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ==================== AUTH ====================

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
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/presentations',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/forms.body',
    'https://www.googleapis.com/auth/forms.responses.readonly',
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
    // Convert bytes to base64 safely (handles non-Latin1)
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

// ==================== COLOR HELPERS ====================

const COLORS = {
  primary: { red: 0.102, green: 0.396, blue: 0.643 },      // Deep blue
  primaryLight: { red: 0.851, green: 0.918, blue: 0.965 }, // Light blue
  success: { red: 0.204, green: 0.659, blue: 0.325 },      // Green
  successLight: { red: 0.851, green: 0.941, blue: 0.878 }, // Light green
  warning: { red: 0.984, green: 0.737, blue: 0.02 },       // Yellow
  warningLight: { red: 1, green: 0.949, blue: 0.8 },       // Light yellow
  danger: { red: 0.863, green: 0.208, blue: 0.271 },       // Red
  dangerLight: { red: 0.992, green: 0.878, blue: 0.886 },  // Light red
  white: { red: 1, green: 1, blue: 1 },
  black: { red: 0, green: 0, blue: 0 },
  gray: { red: 0.6, green: 0.6, blue: 0.6 },
  grayLight: { red: 0.95, green: 0.95, blue: 0.95 },
  grayMedium: { red: 0.85, green: 0.85, blue: 0.85 },
};

// ==================== SHEETS API ====================

async function createFormattedSheet(
  accessToken: string, 
  title: string, 
  items: any[], 
  upload: any
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  
  // Group items by bill
  const billGroups: Record<string, any[]> = {};
  for (const item of items) {
    const billKey = item.bill_name || 'General';
    if (!billGroups[billKey]) billGroups[billKey] = [];
    billGroups[billKey].push(item);
  }

  // Create spreadsheet with multiple sheets
  const sheets = [
    { properties: { sheetId: 0, title: 'Summary', gridProperties: { frozenRowCount: 1 } } },
    { properties: { sheetId: 1, title: 'All Items', gridProperties: { frozenRowCount: 1 } } },
    ...Object.keys(billGroups).map((bill, i) => ({
      properties: { sheetId: i + 2, title: bill.substring(0, 30), gridProperties: { frozenRowCount: 1 } }
    }))
  ];

  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ properties: { title }, sheets }),
  });

  if (!createResponse.ok) throw new Error(`Failed to create sheet: ${await createResponse.text()}`);
  
  const spreadsheet = await createResponse.json();
  const spreadsheetId = spreadsheet.spreadsheetId;

  // Prepare batch update requests
  const requests: any[] = [];

  // ===== SUMMARY SHEET =====
  const summaryData = [
    ['BOQ Summary Report'],
    [''],
    ['File Name', upload.file_name],
    ['Province', upload.province || 'N/A'],
    ['Building Type', upload.building_type || 'N/A'],
    ['Contractor', upload.contractor_name || 'N/A'],
    ['Tender Date', upload.tender_date || 'N/A'],
    ['Generated', new Date().toISOString().split('T')[0]],
    [''],
    ['Bill Summary'],
    ['Bill Name', 'Item Count', 'Total Supply', 'Total Install', 'Grand Total'],
  ];

  let grandTotalSupply = 0;
  let grandTotalInstall = 0;
  Object.entries(billGroups).forEach(([bill, billItems]) => {
    const supplyTotal = billItems.reduce((sum, i) => sum + (i.supply_rate * (i.quantity || 1) || 0), 0);
    const installTotal = billItems.reduce((sum, i) => sum + (i.install_rate * (i.quantity || 1) || 0), 0);
    grandTotalSupply += supplyTotal;
    grandTotalInstall += installTotal;
    summaryData.push([bill, billItems.length, supplyTotal, installTotal, supplyTotal + installTotal]);
  });
  summaryData.push(['TOTAL', items.length, grandTotalSupply, grandTotalInstall, grandTotalSupply + grandTotalInstall]);
  summaryData.push(['']);
  summaryData.push(['Status Breakdown']);
  summaryData.push(['Status', 'Count', 'Percentage']);
  
  const statusCounts: Record<string, number> = {};
  items.forEach(i => { statusCounts[i.review_status || 'pending'] = (statusCounts[i.review_status || 'pending'] || 0) + 1; });
  Object.entries(statusCounts).forEach(([status, count]) => {
    summaryData.push([status, count, `${((count / items.length) * 100).toFixed(1)}%`]);
  });

  // Write summary data
  await writeValues(accessToken, spreadsheetId, 'Summary!A1', summaryData);

  // ===== ALL ITEMS SHEET =====
  const allItemsHeaders = [
    'Row #', 'Bill #', 'Bill Name', 'Section', 'Item Code', 'Description', 
    'Unit', 'Qty', 'Supply Rate', 'Install Rate', 'Total Rate', 'Supply Cost', 
    'Install Cost', 'Total Cost', 'Status', 'Confidence', 'Notes'
  ];
  
  const allItemsData = [allItemsHeaders];
  items.forEach((item, idx) => {
    const qty = item.quantity || 1;
    const supplyRate = item.supply_rate || 0;
    const installRate = item.install_rate || 0;
    allItemsData.push([
      item.row_number || idx + 1,
      item.bill_number || '',
      item.bill_name || '',
      item.section_name || '',
      item.item_code || '',
      item.item_description || '',
      item.unit || '',
      qty,
      supplyRate,
      installRate,
      supplyRate + installRate,
      supplyRate * qty,
      installRate * qty,
      (supplyRate + installRate) * qty,
      item.review_status || 'pending',
      item.match_confidence ? `${(item.match_confidence * 100).toFixed(0)}%` : '',
      item.extraction_notes || ''
    ]);
  });

  await writeValues(accessToken, spreadsheetId, 'All Items!A1', allItemsData);

  // ===== BILL-SPECIFIC SHEETS =====
  for (const [bill, billItems] of Object.entries(billGroups)) {
    const sheetName = bill.substring(0, 30);
    const billData = [allItemsHeaders];
    billItems.forEach((item, idx) => {
      const qty = item.quantity || 1;
      const supplyRate = item.supply_rate || 0;
      const installRate = item.install_rate || 0;
      billData.push([
        item.row_number || idx + 1,
        item.bill_number || '',
        item.bill_name || '',
        item.section_name || '',
        item.item_code || '',
        item.item_description || '',
        item.unit || '',
        qty,
        supplyRate,
        installRate,
        supplyRate + installRate,
        supplyRate * qty,
        installRate * qty,
        (supplyRate + installRate) * qty,
        item.review_status || 'pending',
        item.match_confidence ? `${(item.match_confidence * 100).toFixed(0)}%` : '',
        item.extraction_notes || ''
      ]);
    });
    await writeValues(accessToken, spreadsheetId, `'${sheetName}'!A1`, billData);
  }

  // ===== FORMATTING REQUESTS =====
  
  // Summary sheet formatting
  requests.push(
    // Title formatting
    { mergeCells: { range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 5 }, mergeType: 'MERGE_ALL' } },
    { repeatCell: { 
      range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 5 },
      cell: { userEnteredFormat: { 
        backgroundColor: COLORS.primary, 
        textFormat: { foregroundColor: COLORS.white, bold: true, fontSize: 16 },
        horizontalAlignment: 'CENTER'
      } },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
    }},
    // Bill summary header
    { repeatCell: { 
      range: { sheetId: 0, startRowIndex: 9, endRowIndex: 10, startColumnIndex: 0, endColumnIndex: 5 },
      cell: { userEnteredFormat: { 
        backgroundColor: COLORS.primary, 
        textFormat: { foregroundColor: COLORS.white, bold: true },
        horizontalAlignment: 'CENTER'
      } },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
    }},
    { repeatCell: { 
      range: { sheetId: 0, startRowIndex: 10, endRowIndex: 11, startColumnIndex: 0, endColumnIndex: 5 },
      cell: { userEnteredFormat: { 
        backgroundColor: COLORS.primaryLight, 
        textFormat: { bold: true }
      } },
      fields: 'userEnteredFormat(backgroundColor,textFormat)'
    }}
  );

  // All Items sheet formatting
  requests.push(
    // Header row styling
    { repeatCell: { 
      range: { sheetId: 1, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 17 },
      cell: { userEnteredFormat: { 
        backgroundColor: COLORS.primary, 
        textFormat: { foregroundColor: COLORS.white, bold: true, fontSize: 10 },
        horizontalAlignment: 'CENTER',
        wrapStrategy: 'WRAP'
      } },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,wrapStrategy)'
    }},
    // Alternating row colors
    { addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId: 1, startRowIndex: 1, endRowIndex: items.length + 1, startColumnIndex: 0, endColumnIndex: 17 }],
        booleanRule: {
          condition: { type: 'CUSTOM_FORMULA', values: [{ userEnteredValue: '=MOD(ROW(),2)=0' }] },
          format: { backgroundColor: COLORS.grayLight }
        }
      },
      index: 0
    }},
    // Status conditional formatting - approved (green)
    { addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId: 1, startRowIndex: 1, endRowIndex: items.length + 1, startColumnIndex: 14, endColumnIndex: 15 }],
        booleanRule: {
          condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'approved' }] },
          format: { backgroundColor: COLORS.successLight, textFormat: { foregroundColor: COLORS.success } }
        }
      },
      index: 1
    }},
    // Status - rejected (red)
    { addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId: 1, startRowIndex: 1, endRowIndex: items.length + 1, startColumnIndex: 14, endColumnIndex: 15 }],
        booleanRule: {
          condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'rejected' }] },
          format: { backgroundColor: COLORS.dangerLight, textFormat: { foregroundColor: COLORS.danger } }
        }
      },
      index: 2
    }},
    // Status - pending (yellow)
    { addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId: 1, startRowIndex: 1, endRowIndex: items.length + 1, startColumnIndex: 14, endColumnIndex: 15 }],
        booleanRule: {
          condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'pending' }] },
          format: { backgroundColor: COLORS.warningLight, textFormat: { foregroundColor: { red: 0.6, green: 0.4, blue: 0 } } }
        }
      },
      index: 3
    }},
    // Auto-filter
    { setBasicFilter: { filter: { range: { sheetId: 1, startRowIndex: 0, endRowIndex: items.length + 1, startColumnIndex: 0, endColumnIndex: 17 } } } },
    // Column widths
    { updateDimensionProperties: { range: { sheetId: 1, dimension: 'COLUMNS', startIndex: 5, endIndex: 6 }, properties: { pixelSize: 300 }, fields: 'pixelSize' } },
    { updateDimensionProperties: { range: { sheetId: 1, dimension: 'COLUMNS', startIndex: 0, endIndex: 5 }, properties: { pixelSize: 100 }, fields: 'pixelSize' } },
    // Number formatting for currency columns
    { repeatCell: { 
      range: { sheetId: 1, startRowIndex: 1, endRowIndex: items.length + 1, startColumnIndex: 8, endColumnIndex: 14 },
      cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: 'R #,##0.00' } } },
      fields: 'userEnteredFormat.numberFormat'
    }},
    // Data validation for Status column
    { setDataValidation: {
      range: { sheetId: 1, startRowIndex: 1, endRowIndex: items.length + 1, startColumnIndex: 14, endColumnIndex: 15 },
      rule: {
        condition: { type: 'ONE_OF_LIST', values: [
          { userEnteredValue: 'pending' },
          { userEnteredValue: 'approved' },
          { userEnteredValue: 'rejected' },
          { userEnteredValue: 'needs_review' }
        ]},
        showCustomUi: true,
        strict: false
      }
    }},
    // Protect header row
    { addProtectedRange: {
      protectedRange: {
        range: { sheetId: 1, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 17 },
        description: 'Header row - do not edit',
        warningOnly: true
      }
    }}
  );

  // Apply same formatting to bill sheets
  Object.keys(billGroups).forEach((_, i) => {
    const sheetId = i + 2;
    const rowCount = billGroups[Object.keys(billGroups)[i]].length;
    requests.push(
      { repeatCell: { 
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 17 },
        cell: { userEnteredFormat: { 
          backgroundColor: COLORS.primary, 
          textFormat: { foregroundColor: COLORS.white, bold: true, fontSize: 10 },
          horizontalAlignment: 'CENTER'
        } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
      }},
      { setBasicFilter: { filter: { range: { sheetId, startRowIndex: 0, endRowIndex: rowCount + 1, startColumnIndex: 0, endColumnIndex: 17 } } } },
      { repeatCell: { 
        range: { sheetId, startRowIndex: 1, endRowIndex: rowCount + 1, startColumnIndex: 8, endColumnIndex: 14 },
        cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: 'R #,##0.00' } } },
        fields: 'userEnteredFormat.numberFormat'
      }}
    );
  });

  // Add chart to summary
  requests.push({
    addChart: {
      chart: {
        spec: {
          title: 'Cost Breakdown by Bill',
          pieChart: {
            legendPosition: 'RIGHT_LEGEND',
            domain: { sourceRange: { sources: [{ sheetId: 0, startRowIndex: 11, endRowIndex: 11 + Object.keys(billGroups).length, startColumnIndex: 0, endColumnIndex: 1 }] } },
            series: { sourceRange: { sources: [{ sheetId: 0, startRowIndex: 11, endRowIndex: 11 + Object.keys(billGroups).length, startColumnIndex: 4, endColumnIndex: 5 }] } },
          }
        },
        position: { overlayPosition: { anchorCell: { sheetId: 0, rowIndex: 2, columnIndex: 6 }, widthPixels: 400, heightPixels: 300 } }
      }
    }
  });

  // Execute batch update
  await batchUpdate(accessToken, spreadsheetId, requests);

  return { 
    spreadsheetId, 
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` 
  };
}

async function writeValues(accessToken: string, spreadsheetId: string, range: string, values: any[][]): Promise<void> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    }
  );
  if (!response.ok) throw new Error(`Failed to write values: ${await response.text()}`);
}

async function batchUpdate(accessToken: string, spreadsheetId: string, requests: any[]): Promise<void> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    }
  );
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Batch update failed:', errorText);
    // Don't throw - some formatting errors are non-critical
  }
}

async function readFromSheet(accessToken: string, spreadsheetId: string, range: string): Promise<{ headers: string[]; rows: any[][] }> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  if (!response.ok) throw new Error(`Failed to read sheet: ${await response.text()}`);
  const data = await response.json();
  return { headers: data.values?.[0] || [], rows: data.values?.slice(1) || [] };
}

// ==================== DRIVE API ====================

async function createFolder(accessToken: string, name: string, parentId?: string): Promise<string> {
  const metadata: any = {
    name,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (parentId) metadata.parents = [parentId];

  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata),
  });
  if (!response.ok) throw new Error(`Failed to create folder: ${await response.text()}`);
  return (await response.json()).id;
}

async function moveToFolder(accessToken: string, fileId: string, folderId: string): Promise<void> {
  // Get current parents
  const getResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const file = await getResponse.json();
  const previousParents = file.parents?.join(',') || '';

  await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${folderId}&removeParents=${previousParents}`,
    { method: 'PATCH', headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
}

async function shareFile(accessToken: string, fileId: string, role: string = 'writer', type: string = 'anyone'): Promise<string> {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, type }),
  });
  
  // Get sharing link
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const data = await response.json();
  return data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
}

// ==================== DOCS API ====================

async function createFormattedDoc(
  accessToken: string, 
  title: string, 
  items: any[], 
  upload: any
): Promise<{ documentId: string; documentUrl: string }> {
  
  // Create document
  const createResponse = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!createResponse.ok) throw new Error(`Failed to create doc: ${await createResponse.text()}`);
  
  const doc = await createResponse.json();
  const documentId = doc.documentId;

  // Build document content with formatting
  const requests: any[] = [];
  let index = 1;

  // Title
  const titleText = `BOQ Report: ${upload.file_name}\n`;
  requests.push({ insertText: { location: { index }, text: titleText } });
  requests.push({ updateParagraphStyle: {
    range: { startIndex: index, endIndex: index + titleText.length },
    paragraphStyle: { namedStyleType: 'TITLE', alignment: 'CENTER' },
    fields: 'namedStyleType,alignment'
  }});
  index += titleText.length;

  // Metadata section
  const metaLines = [
    `Generated: ${new Date().toLocaleDateString()}`,
    `Province: ${upload.province || 'N/A'}`,
    `Building Type: ${upload.building_type || 'N/A'}`,
    `Contractor: ${upload.contractor_name || 'N/A'}`,
    `Total Items: ${items.length}`,
    ''
  ].join('\n') + '\n';
  requests.push({ insertText: { location: { index }, text: metaLines } });
  index += metaLines.length;

  // Horizontal line
  requests.push({ insertText: { location: { index }, text: '\n' } });
  index += 1;

  // Group by bill
  const billGroups: Record<string, any[]> = {};
  items.forEach(item => {
    const bill = item.bill_name || 'General';
    if (!billGroups[bill]) billGroups[bill] = [];
    billGroups[bill].push(item);
  });

  // Table of contents placeholder
  const tocTitle = 'Table of Contents\n';
  requests.push({ insertText: { location: { index }, text: tocTitle } });
  requests.push({ updateParagraphStyle: {
    range: { startIndex: index, endIndex: index + tocTitle.length },
    paragraphStyle: { namedStyleType: 'HEADING_1' },
    fields: 'namedStyleType'
  }});
  index += tocTitle.length;

  Object.keys(billGroups).forEach((bill, i) => {
    const tocEntry = `${i + 1}. ${bill}\n`;
    requests.push({ insertText: { location: { index }, text: tocEntry } });
    index += tocEntry.length;
  });

  requests.push({ insertText: { location: { index }, text: '\n' } });
  index += 1;

  // Page break before content
  requests.push({ insertPageBreak: { location: { index } } });
  index += 1;

  // Content for each bill
  for (const [bill, billItems] of Object.entries(billGroups)) {
    // Bill heading
    const billHeading = `${bill}\n`;
    requests.push({ insertText: { location: { index }, text: billHeading } });
    requests.push({ updateParagraphStyle: {
      range: { startIndex: index, endIndex: index + billHeading.length },
      paragraphStyle: { namedStyleType: 'HEADING_1' },
      fields: 'namedStyleType'
    }});
    index += billHeading.length;

    // Summary for this bill
    const billTotal = billItems.reduce((sum, i) => sum + ((i.supply_rate || 0) + (i.install_rate || 0)) * (i.quantity || 1), 0);
    const summaryText = `Items: ${billItems.length} | Total: R ${billTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}\n\n`;
    requests.push({ insertText: { location: { index }, text: summaryText } });
    index += summaryText.length;

    // Create table for items
    const tableRows = Math.min(billItems.length + 1, 50); // Limit table size
    requests.push({
      insertTable: {
        rows: tableRows,
        columns: 6,
        location: { index }
      }
    });
    
    // Note: Table content would need separate inserts into table cells
    // For simplicity, we'll add items as formatted text instead
    index += 2; // Account for table insertion

    // Add items as formatted list instead of complex table
    const displayItems = billItems.slice(0, 50);
    for (const item of displayItems) {
      const itemLine = `• ${item.item_code || '-'}: ${item.item_description || 'No description'}\n`;
      const detailLine = `  Qty: ${item.quantity || '-'} ${item.unit || ''} | Rate: R${((item.supply_rate || 0) + (item.install_rate || 0)).toFixed(2)}\n`;
      requests.push({ insertText: { location: { index }, text: itemLine + detailLine } });
      index += itemLine.length + detailLine.length;
    }

    if (billItems.length > 50) {
      const moreText = `... and ${billItems.length - 50} more items\n`;
      requests.push({ insertText: { location: { index }, text: moreText } });
      index += moreText.length;
    }

    requests.push({ insertText: { location: { index }, text: '\n' } });
    index += 1;
  }

  // Apply updates
  await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });

  return { 
    documentId, 
    documentUrl: `https://docs.google.com/document/d/${documentId}/edit` 
  };
}

// ==================== SLIDES API ====================

async function createFormattedPresentation(
  accessToken: string, 
  title: string, 
  items: any[], 
  upload: any
): Promise<{ presentationId: string; presentationUrl: string }> {
  
  // Create presentation
  const createResponse = await fetch('https://slides.googleapis.com/v1/presentations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!createResponse.ok) throw new Error(`Failed to create presentation: ${await createResponse.text()}`);
  
  const presentation = await createResponse.json();
  const presentationId = presentation.presentationId;
  const titleSlideId = presentation.slides[0].objectId;

  // Group by bill
  const billGroups: Record<string, any[]> = {};
  items.forEach(item => {
    const bill = item.bill_name || 'General';
    if (!billGroups[bill]) billGroups[bill] = [];
    billGroups[bill].push(item);
  });

  const requests: any[] = [];

  // Update title slide
  const titlePlaceholder = presentation.slides[0].pageElements?.find((e: any) => 
    e.shape?.placeholder?.type === 'CENTERED_TITLE' || e.shape?.placeholder?.type === 'TITLE'
  );
  const subtitlePlaceholder = presentation.slides[0].pageElements?.find((e: any) => 
    e.shape?.placeholder?.type === 'SUBTITLE'
  );

  if (titlePlaceholder) {
    requests.push({
      insertText: { objectId: titlePlaceholder.objectId, text: title, insertionIndex: 0 }
    });
  }
  if (subtitlePlaceholder) {
    requests.push({
      insertText: { 
        objectId: subtitlePlaceholder.objectId, 
        text: `${upload.province || ''} | ${upload.building_type || ''}\nGenerated: ${new Date().toLocaleDateString()}`,
        insertionIndex: 0 
      }
    });
  }

  // Create summary slide
  const summarySlideId = `summary_${Date.now()}`;
  requests.push({
    createSlide: {
      objectId: summarySlideId,
      insertionIndex: 1,
      slideLayoutReference: { predefinedLayout: 'TITLE_AND_BODY' }
    }
  });

  // Create slides for each bill (limit to first 10 bills)
  const billEntries = Object.entries(billGroups).slice(0, 10);
  billEntries.forEach(([bill, billItems], i) => {
    const slideId = `bill_${i}_${Date.now()}`;
    requests.push({
      createSlide: {
        objectId: slideId,
        insertionIndex: i + 2,
        slideLayoutReference: { predefinedLayout: 'TITLE_AND_BODY' }
      }
    });
  });

  // Apply initial slide creation
  await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });

  // Get updated presentation to find text boxes
  const getResponse = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const updatedPresentation = await getResponse.json();

  const textRequests: any[] = [];

  // Add content to summary slide
  const summarySlide = updatedPresentation.slides?.find((s: any) => s.objectId === summarySlideId);
  if (summarySlide) {
    const summaryTitle = summarySlide.pageElements?.find((e: any) => e.shape?.placeholder?.type === 'TITLE');
    const summaryBody = summarySlide.pageElements?.find((e: any) => e.shape?.placeholder?.type === 'BODY');
    
    if (summaryTitle) {
      textRequests.push({ insertText: { objectId: summaryTitle.objectId, text: 'Project Summary', insertionIndex: 0 } });
    }
    if (summaryBody) {
      const summaryText = [
        `Total Items: ${items.length}`,
        `Bills: ${Object.keys(billGroups).length}`,
        '',
        ...Object.entries(billGroups).map(([bill, items]) => 
          `• ${bill}: ${items.length} items`
        ).slice(0, 8)
      ].join('\n');
      textRequests.push({ insertText: { objectId: summaryBody.objectId, text: summaryText, insertionIndex: 0 } });
    }
  }

  // Add content to bill slides
  billEntries.forEach(([bill, billItems], i) => {
    const slide = updatedPresentation.slides?.[i + 2];
    if (slide) {
      const titleEl = slide.pageElements?.find((e: any) => e.shape?.placeholder?.type === 'TITLE');
      const bodyEl = slide.pageElements?.find((e: any) => e.shape?.placeholder?.type === 'BODY');
      
      if (titleEl) {
        textRequests.push({ insertText: { objectId: titleEl.objectId, text: bill, insertionIndex: 0 } });
      }
      if (bodyEl) {
        const billTotal = billItems.reduce((sum, i) => sum + ((i.supply_rate || 0) + (i.install_rate || 0)) * (i.quantity || 1), 0);
        const bodyText = [
          `Items: ${billItems.length}`,
          `Total: R ${billTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          '',
          'Top Items:',
          ...billItems.slice(0, 5).map(item => `• ${item.item_description?.substring(0, 60) || 'Item'}`)
        ].join('\n');
        textRequests.push({ insertText: { objectId: bodyEl.objectId, text: bodyText, insertionIndex: 0 } });
      }
    }
  });

  if (textRequests.length > 0) {
    await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: textRequests }),
    });
  }

  return { 
    presentationId, 
    presentationUrl: `https://docs.google.com/presentation/d/${presentationId}/edit` 
  };
}

// ==================== GMAIL API ====================

async function sendFormattedEmail(
  accessToken: string, 
  to: string, 
  subject: string, 
  htmlBody: string,
  options?: { cc?: string; bcc?: string; replyTo?: string; attachments?: { name: string; content: string; mimeType: string }[] }
): Promise<{ messageId: string }> {
  const serviceEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  
  const boundary = `boundary_${Date.now()}`;
  let emailParts = [
    `From: BOQ System <${serviceEmail}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
  ];

  if (options?.cc) emailParts.push(`Cc: ${options.cc}`);
  if (options?.bcc) emailParts.push(`Bcc: ${options.bcc}`);
  if (options?.replyTo) emailParts.push(`Reply-To: ${options.replyTo}`);

  if (options?.attachments?.length) {
    emailParts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    emailParts.push('');
    emailParts.push(`--${boundary}`);
    emailParts.push('Content-Type: text/html; charset=utf-8');
    emailParts.push('');
    emailParts.push(htmlBody);
    
    for (const attachment of options.attachments) {
      emailParts.push(`--${boundary}`);
      emailParts.push(`Content-Type: ${attachment.mimeType}; name="${attachment.name}"`);
      emailParts.push('Content-Transfer-Encoding: base64');
      emailParts.push(`Content-Disposition: attachment; filename="${attachment.name}"`);
      emailParts.push('');
      emailParts.push(attachment.content);
    }
    emailParts.push(`--${boundary}--`);
  } else {
    emailParts.push('Content-Type: text/html; charset=utf-8');
    emailParts.push('');
    emailParts.push(htmlBody);
  }

  const email = emailParts.join('\r\n');
  const encodedEmail = btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: encodedEmail }),
  });

  if (!response.ok) throw new Error(`Failed to send email: ${await response.text()}`);
  return { messageId: (await response.json()).id };
}

function generateEmailTemplate(upload: any, items: any[], sheetUrl?: string, docUrl?: string): string {
  const billGroups: Record<string, any[]> = {};
  items.forEach(item => {
    const bill = item.bill_name || 'General';
    if (!billGroups[bill]) billGroups[bill] = [];
    billGroups[bill].push(item);
  });

  const totalValue = items.reduce((sum, i) => sum + ((i.supply_rate || 0) + (i.install_rate || 0)) * (i.quantity || 1), 0);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: linear-gradient(135deg, #1a65a3 0%, #2980b9 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .summary-box { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .stat { display: inline-block; margin: 10px 20px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #1a65a3; }
        .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #1a65a3; color: white; padding: 12px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #eee; }
        tr:nth-child(even) { background: #f8f9fa; }
        .btn { display: inline-block; background: #1a65a3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 5px; }
        .btn-secondary { background: #27ae60; }
        .footer { background: #f1f1f1; padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📋 BOQ Report Shared</h1>
        <p>${upload.file_name}</p>
      </div>
      <div class="content">
        <div class="summary-box">
          <div class="stat">
            <div class="stat-value">${items.length}</div>
            <div class="stat-label">Total Items</div>
          </div>
          <div class="stat">
            <div class="stat-value">${Object.keys(billGroups).length}</div>
            <div class="stat-label">Bills</div>
          </div>
          <div class="stat">
            <div class="stat-value">R ${totalValue.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            <div class="stat-label">Total Value</div>
          </div>
        </div>

        <h3>Project Details</h3>
        <table>
          <tr><td><strong>Province</strong></td><td>${upload.province || 'N/A'}</td></tr>
          <tr><td><strong>Building Type</strong></td><td>${upload.building_type || 'N/A'}</td></tr>
          <tr><td><strong>Contractor</strong></td><td>${upload.contractor_name || 'N/A'}</td></tr>
          <tr><td><strong>Tender Date</strong></td><td>${upload.tender_date || 'N/A'}</td></tr>
        </table>

        <h3>Bill Summary</h3>
        <table>
          <tr><th>Bill</th><th>Items</th><th>Total Value</th></tr>
          ${Object.entries(billGroups).map(([bill, billItems]) => {
            const billTotal = billItems.reduce((sum, i) => sum + ((i.supply_rate || 0) + (i.install_rate || 0)) * (i.quantity || 1), 0);
            return `<tr><td>${bill}</td><td>${billItems.length}</td><td>R ${billTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td></tr>`;
          }).join('')}
        </table>

        <div style="text-align: center; margin: 30px 0;">
          ${sheetUrl ? `<a href="${sheetUrl}" class="btn">📊 Open in Google Sheets</a>` : ''}
          ${docUrl ? `<a href="${docUrl}" class="btn btn-secondary">📄 View Full Report</a>` : ''}
        </div>
      </div>
      <div class="footer">
        <p>This is an automated message from the BOQ Management System</p>
        <p>Generated on ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;
}

// ==================== FORMS API ====================

interface FormQuestion {
  title: string;
  type: 'text' | 'paragraph' | 'multiple_choice' | 'checkbox' | 'dropdown' | 'scale' | 'date' | 'time' | 'file_upload';
  required?: boolean;
  description?: string;
  options?: string[];
  low_label?: string;
  high_label?: string;
  scale_min?: number;
  scale_max?: number;
  include_year?: boolean;
  include_time?: boolean;
  points?: number;
  correct_answers?: string[];
  feedback_correct?: string;
  feedback_incorrect?: string;
}

interface FormSettings {
  title: string;
  description?: string;
  document_title?: string;
  confirmation_message?: string;
  is_quiz?: boolean;
  collect_email?: boolean;
  limit_one_response?: boolean;
  allow_response_edits?: boolean;
  show_link_to_respond_again?: boolean;
  shuffle_questions?: boolean;
  progress_bar?: boolean;
  linked_sheet_id?: string;
}

async function createForm(accessToken: string, settings: FormSettings): Promise<{ formId: string; formUrl: string; responderUri: string }> {
  // Create the form
  const createResponse = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      info: {
        title: settings.title,
        documentTitle: settings.document_title || settings.title,
      }
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    console.error('Failed to create form:', errorText);
    throw new Error(`Failed to create form: ${errorText}`);
  }

  const form = await createResponse.json();
  const formId = form.formId;

  // Update form settings
  const updateRequests: any[] = [];

  if (settings.description) {
    updateRequests.push({
      updateFormInfo: {
        info: { description: settings.description },
        updateMask: 'description'
      }
    });
  }

  if (settings.is_quiz) {
    updateRequests.push({
      updateSettings: {
        settings: { quizSettings: { isQuiz: true } },
        updateMask: 'quizSettings.isQuiz'
      }
    });
  }

  if (updateRequests.length > 0) {
    await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: updateRequests }),
    });
  }

  return {
    formId,
    formUrl: `https://docs.google.com/forms/d/${formId}/edit`,
    responderUri: form.responderUri || `https://docs.google.com/forms/d/e/${formId}/viewform`,
  };
}

async function addFormQuestions(accessToken: string, formId: string, questions: FormQuestion[]): Promise<void> {
  const requests: any[] = [];

  questions.forEach((question, index) => {
    const itemRequest: any = {
      createItem: {
        item: {
          title: question.title,
          description: question.description,
          questionItem: {
            question: {
              required: question.required || false,
            }
          }
        },
        location: { index }
      }
    };

    // Configure question type
    switch (question.type) {
      case 'text':
        itemRequest.createItem.item.questionItem.question.textQuestion = {
          paragraph: false
        };
        break;
      
      case 'paragraph':
        itemRequest.createItem.item.questionItem.question.textQuestion = {
          paragraph: true
        };
        break;
      
      case 'multiple_choice':
        itemRequest.createItem.item.questionItem.question.choiceQuestion = {
          type: 'RADIO',
          options: (question.options || []).map(opt => ({ value: opt })),
          shuffle: false
        };
        break;
      
      case 'checkbox':
        itemRequest.createItem.item.questionItem.question.choiceQuestion = {
          type: 'CHECKBOX',
          options: (question.options || []).map(opt => ({ value: opt })),
          shuffle: false
        };
        break;
      
      case 'dropdown':
        itemRequest.createItem.item.questionItem.question.choiceQuestion = {
          type: 'DROP_DOWN',
          options: (question.options || []).map(opt => ({ value: opt })),
          shuffle: false
        };
        break;
      
      case 'scale':
        itemRequest.createItem.item.questionItem.question.scaleQuestion = {
          low: question.scale_min || 1,
          high: question.scale_max || 5,
          lowLabel: question.low_label || '',
          highLabel: question.high_label || ''
        };
        break;
      
      case 'date':
        itemRequest.createItem.item.questionItem.question.dateQuestion = {
          includeYear: question.include_year !== false,
          includeTime: question.include_time || false
        };
        break;
      
      case 'time':
        itemRequest.createItem.item.questionItem.question.timeQuestion = {
          duration: false
        };
        break;
      
      case 'file_upload':
        itemRequest.createItem.item.questionItem.question.fileUploadQuestion = {
          folderId: '', // Will use default
          maxFiles: 1,
          maxFileSize: 10485760 // 10MB
        };
        break;
    }

    // Add grading for quiz questions
    if (question.points !== undefined || question.correct_answers?.length) {
      itemRequest.createItem.item.questionItem.question.grading = {
        pointValue: question.points || 0,
        correctAnswers: question.correct_answers ? {
          answers: question.correct_answers.map(a => ({ value: a }))
        } : undefined,
        generalFeedback: question.feedback_correct ? {
          text: question.feedback_correct
        } : undefined,
        whenRight: question.feedback_correct ? { text: question.feedback_correct } : undefined,
        whenWrong: question.feedback_incorrect ? { text: question.feedback_incorrect } : undefined
      };
    }

    requests.push(itemRequest);
  });

  if (requests.length > 0) {
    const response = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to add questions:', errorText);
      // Don't throw - continue with partial success
    }
  }
}

async function addFormSections(accessToken: string, formId: string, sections: { title: string; description?: string; index: number }[]): Promise<void> {
  const requests = sections.map(section => ({
    createItem: {
      item: {
        title: section.title,
        description: section.description,
        pageBreakItem: {}
      },
      location: { index: section.index }
    }
  }));

  if (requests.length > 0) {
    await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });
  }
}

async function addFormImage(accessToken: string, formId: string, imageUrl: string, title?: string, index?: number): Promise<void> {
  const request = {
    createItem: {
      item: {
        title: title || '',
        imageItem: {
          image: { sourceUri: imageUrl }
        }
      },
      location: { index: index || 0 }
    }
  };

  await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [request] }),
  });
}

async function addFormVideo(accessToken: string, formId: string, youtubeUri: string, title?: string, index?: number): Promise<void> {
  const request = {
    createItem: {
      item: {
        title: title || '',
        videoItem: {
          video: { youtubeUri }
        }
      },
      location: { index: index || 0 }
    }
  };

  await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [request] }),
  });
}

async function getFormResponses(accessToken: string, formId: string): Promise<{ responses: any[]; responseCount: number }> {
  const response = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get form responses: ${errorText}`);
  }

  const data = await response.json();
  return {
    responses: data.responses || [],
    responseCount: data.responses?.length || 0
  };
}

async function getForm(accessToken: string, formId: string): Promise<any> {
  const response = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get form: ${errorText}`);
  }

  return await response.json();
}

async function createWatchForResponses(accessToken: string, formId: string, topicName: string): Promise<{ watchId: string; expireTime: string }> {
  const response = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/watches`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      watch: {
        target: { topic: { topicName } },
        eventType: 'RESPONSES'
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create watch: ${errorText}`);
  }

  const data = await response.json();
  return {
    watchId: data.id,
    expireTime: data.expireTime
  };
}

async function linkFormToSheet(accessToken: string, formId: string, spreadsheetId?: string): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  // If no spreadsheetId provided, create a new one
  let targetSpreadsheetId = spreadsheetId;
  
  if (!targetSpreadsheetId) {
    // Get form info for title
    const form = await getForm(accessToken, formId);
    const title = `${form.info?.title || 'Form'} (Responses)`;
    
    // Create new spreadsheet
    const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties: { title } }),
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create linked sheet: ${await createResponse.text()}`);
    }
    
    const sheet = await createResponse.json();
    targetSpreadsheetId = sheet.spreadsheetId;
  }

  // Note: Direct form-to-sheet linking requires Google Apps Script or manual setup
  // We'll return the spreadsheet info for manual linking
  return {
    spreadsheetId: targetSpreadsheetId!,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/edit`
  };
}

async function createBOQReviewForm(
  accessToken: string, 
  items: any[], 
  upload: any
): Promise<{ formId: string; formUrl: string; responderUri: string }> {
  // Create the form
  const { formId, formUrl, responderUri } = await createForm(accessToken, {
    title: `BOQ Review: ${upload.file_name}`,
    description: `Please review the extracted BOQ items and provide your feedback.\n\nProject: ${upload.province || 'N/A'} | ${upload.building_type || 'N/A'}\nContractor: ${upload.contractor_name || 'N/A'}`,
    is_quiz: false
  });

  // Group items by bill for organized review
  const billGroups: Record<string, any[]> = {};
  items.forEach(item => {
    const bill = item.bill_name || 'General';
    if (!billGroups[bill]) billGroups[bill] = [];
    billGroups[bill].push(item);
  });

  // Add questions for review
  const questions: FormQuestion[] = [
    {
      title: 'Reviewer Name',
      type: 'text',
      required: true,
      description: 'Please enter your full name'
    },
    {
      title: 'Review Date',
      type: 'date',
      required: true,
      include_year: true
    },
    {
      title: 'Overall Assessment',
      type: 'multiple_choice',
      required: true,
      description: 'How would you rate the overall quality of this BOQ?',
      options: ['Excellent - Ready for use', 'Good - Minor corrections needed', 'Fair - Significant review required', 'Poor - Major issues found']
    },
    {
      title: 'Accuracy Rating',
      type: 'scale',
      required: true,
      description: 'Rate the accuracy of quantities and rates (1 = Very Inaccurate, 5 = Very Accurate)',
      scale_min: 1,
      scale_max: 5,
      low_label: 'Very Inaccurate',
      high_label: 'Very Accurate'
    },
    {
      title: 'Completeness Rating',
      type: 'scale',
      required: true,
      description: 'Rate the completeness of items (1 = Many items missing, 5 = Fully complete)',
      scale_min: 1,
      scale_max: 5,
      low_label: 'Incomplete',
      high_label: 'Complete'
    },
    {
      title: 'Items Requiring Correction',
      type: 'checkbox',
      required: false,
      description: 'Select all bill sections that need corrections',
      options: Object.keys(billGroups)
    },
    {
      title: 'Specific Issues Found',
      type: 'paragraph',
      required: false,
      description: 'Please describe any specific issues, incorrect rates, or missing items you identified'
    },
    {
      title: 'Recommended Actions',
      type: 'checkbox',
      required: false,
      description: 'What actions do you recommend?',
      options: [
        'Approve as-is',
        'Update quantities',
        'Revise rates',
        'Add missing items',
        'Remove incorrect items',
        'Re-extract from source',
        'Requires site verification'
      ]
    },
    {
      title: 'Priority Level',
      type: 'dropdown',
      required: true,
      description: 'How urgent are the required changes?',
      options: ['Low - Can wait', 'Medium - Address within week', 'High - Needs immediate attention', 'Critical - Block until resolved']
    },
    {
      title: 'Additional Comments',
      type: 'paragraph',
      required: false,
      description: 'Any other comments or suggestions for improvement'
    }
  ];

  await addFormQuestions(accessToken, formId, questions);

  // Share the form
  await shareFile(accessToken, formId);

  return { formId, formUrl, responderUri };
}

async function createBOQSurveyForm(
  accessToken: string,
  surveyTitle: string,
  surveyDescription: string,
  customQuestions: FormQuestion[]
): Promise<{ formId: string; formUrl: string; responderUri: string }> {
  const { formId, formUrl, responderUri } = await createForm(accessToken, {
    title: surveyTitle,
    description: surveyDescription
  });

  await addFormQuestions(accessToken, formId, customQuestions);
  await shareFile(accessToken, formId);

  return { formId, formUrl, responderUri };
}

// ==================== MAIN HANDLER ====================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;
    
    console.log(`Google API action: ${action}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const accessToken = await getGoogleAccessToken();

    switch (action) {
      // ===== SHEETS =====
      case 'export': {
        const { upload_id, title } = body;
        if (!upload_id) throw new Error('upload_id required');

        const { data: upload } = await supabase.from('boq_uploads').select('*').eq('id', upload_id).single();
        if (!upload) throw new Error('Upload not found');

        const { data: items } = await supabase.from('boq_extracted_items')
          .select('*').eq('upload_id', upload_id).order('bill_number, section_code, row_number');

        const sheetTitle = title || `BOQ - ${upload.file_name}`;
        const { spreadsheetId, spreadsheetUrl } = await createFormattedSheet(accessToken, sheetTitle, items || [], upload);
        
        await shareFile(accessToken, spreadsheetId);

        await supabase.from('boq_uploads').update({ 
          source_description: `${upload.source_description || ''}\n[Google Sheet: ${spreadsheetUrl}]`.trim()
        }).eq('id', upload_id);

        return new Response(JSON.stringify({
          success: true, spreadsheetId, spreadsheetUrl, itemCount: items?.length || 0,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'sync_from_sheet': {
        const { spreadsheet_id, upload_id } = body;
        if (!spreadsheet_id || !upload_id) throw new Error('spreadsheet_id and upload_id required');

        const sheetData = await readFromSheet(accessToken, spreadsheet_id, "'All Items'!A:Q");
        
        const headerMap: Record<string, number> = {};
        sheetData.headers.forEach((h, i) => { headerMap[h.toLowerCase().replace(/[^a-z0-9]/g, '_')] = i; });

        let updatedCount = 0;
        for (const row of sheetData.rows) {
          const rowNum = row[headerMap['row__'] || 0];
          if (!rowNum) continue;

          const updates: Record<string, any> = {};
          if (row[headerMap['description']]) updates.item_description = row[headerMap['description']];
          if (row[headerMap['unit']]) updates.unit = row[headerMap['unit']];
          if (row[headerMap['qty']]) updates.quantity = parseFloat(row[headerMap['qty']]) || null;
          if (row[headerMap['supply_rate']]) updates.supply_rate = parseFloat(row[headerMap['supply_rate']]) || null;
          if (row[headerMap['install_rate']]) updates.install_rate = parseFloat(row[headerMap['install_rate']]) || null;
          if (row[headerMap['status']]) updates.review_status = row[headerMap['status']];
          if (row[headerMap['notes']]) updates.extraction_notes = row[headerMap['notes']];

          if (Object.keys(updates).length > 0) {
            const { error } = await supabase.from('boq_extracted_items')
              .update(updates).eq('upload_id', upload_id).eq('row_number', rowNum);
            if (!error) updatedCount++;
          }
        }

        return new Response(JSON.stringify({ success: true, updatedCount }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // ===== DOCS =====
      case 'create_boq_report': {
        const { upload_id, title } = body;
        if (!upload_id) throw new Error('upload_id required');

        const { data: upload } = await supabase.from('boq_uploads').select('*').eq('id', upload_id).single();
        if (!upload) throw new Error('Upload not found');

        const { data: items } = await supabase.from('boq_extracted_items')
          .select('*').eq('upload_id', upload_id).order('bill_number, section_code, row_number');

        const docTitle = title || `BOQ Report - ${upload.file_name}`;
        const { documentId, documentUrl } = await createFormattedDoc(accessToken, docTitle, items || [], upload);
        
        await shareFile(accessToken, documentId);

        return new Response(JSON.stringify({
          success: true, documentId, documentUrl, itemCount: items?.length || 0,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // ===== SLIDES =====
      case 'create_boq_presentation': {
        const { upload_id, title } = body;
        if (!upload_id) throw new Error('upload_id required');

        const { data: upload } = await supabase.from('boq_uploads').select('*').eq('id', upload_id).single();
        if (!upload) throw new Error('Upload not found');

        const { data: items } = await supabase.from('boq_extracted_items')
          .select('*').eq('upload_id', upload_id).order('bill_number, section_code');

        const presTitle = title || `BOQ Presentation - ${upload.file_name}`;
        const { presentationId, presentationUrl } = await createFormattedPresentation(accessToken, presTitle, items || [], upload);
        
        await shareFile(accessToken, presentationId);

        return new Response(JSON.stringify({
          success: true, presentationId, presentationUrl, itemCount: items?.length || 0,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // ===== DRIVE =====
      case 'create_project_folder': {
        const { project_name, upload_id } = body;
        
        const folderId = await createFolder(accessToken, project_name || 'BOQ Project');
        await shareFile(accessToken, folderId);
        
        const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;

        return new Response(JSON.stringify({
          success: true, folderId, folderUrl,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'organize_files': {
        const { folder_id, file_ids } = body;
        if (!folder_id || !file_ids?.length) throw new Error('folder_id and file_ids required');

        for (const fileId of file_ids) {
          await moveToFolder(accessToken, fileId, folder_id);
        }

        return new Response(JSON.stringify({
          success: true, movedCount: file_ids.length,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // ===== GMAIL =====
      case 'share_boq_via_email': {
        const { upload_id, to, cc, bcc, message, include_sheet, include_doc } = body;
        if (!upload_id || !to) throw new Error('upload_id and to required');

        const { data: upload } = await supabase.from('boq_uploads').select('*').eq('id', upload_id).single();
        if (!upload) throw new Error('Upload not found');

        const { data: items } = await supabase.from('boq_extracted_items')
          .select('*').eq('upload_id', upload_id).order('bill_number, section_code');

        // Get existing sheet URL
        const sheetMatch = upload.source_description?.match(/\[Google Sheet: (https:\/\/[^\]]+)\]/);
        let sheetUrl = sheetMatch?.[1];
        let docUrl: string | undefined;

        // Create sheet if requested and doesn't exist
        if (include_sheet && !sheetUrl) {
          const { spreadsheetUrl } = await createFormattedSheet(accessToken, `BOQ - ${upload.file_name}`, items || [], upload);
          sheetUrl = spreadsheetUrl;
        }

        // Create doc if requested
        if (include_doc) {
          const { documentUrl } = await createFormattedDoc(accessToken, `BOQ Report - ${upload.file_name}`, items || [], upload);
          docUrl = documentUrl;
        }

        const htmlBody = generateEmailTemplate(upload, items || [], sheetUrl, docUrl);
        const subject = `BOQ Shared: ${upload.file_name}`;

        const { messageId } = await sendFormattedEmail(accessToken, to, subject, htmlBody, { cc, bcc });

        return new Response(JSON.stringify({
          success: true, messageId, sheetUrl, docUrl,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'send_custom_email': {
        const { to, subject, html_body, cc, bcc, reply_to } = body;
        if (!to || !subject || !html_body) throw new Error('to, subject, and html_body required');

        const { messageId } = await sendFormattedEmail(accessToken, to, subject, html_body, { cc, bcc, replyTo: reply_to });

        return new Response(JSON.stringify({ success: true, messageId }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // ===== FORMS =====
      case 'create_boq_review_form': {
        const { upload_id } = body;
        if (!upload_id) throw new Error('upload_id required');

        const { data: upload } = await supabase.from('boq_uploads').select('*').eq('id', upload_id).single();
        if (!upload) throw new Error('Upload not found');

        const { data: items } = await supabase.from('boq_extracted_items')
          .select('*').eq('upload_id', upload_id).order('bill_number, section_code');

        const { formId, formUrl, responderUri } = await createBOQReviewForm(accessToken, items || [], upload);

        return new Response(JSON.stringify({
          success: true, formId, formUrl, responderUri, itemCount: items?.length || 0,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'create_custom_form': {
        const { title, description, questions, is_quiz } = body;
        if (!title) throw new Error('title required');

        const { formId, formUrl, responderUri } = await createForm(accessToken, {
          title,
          description,
          is_quiz: is_quiz || false
        });

        if (questions?.length) {
          await addFormQuestions(accessToken, formId, questions);
        }

        await shareFile(accessToken, formId);

        return new Response(JSON.stringify({
          success: true, formId, formUrl, responderUri,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'add_form_questions': {
        const { form_id, questions } = body;
        if (!form_id || !questions?.length) throw new Error('form_id and questions required');

        await addFormQuestions(accessToken, form_id, questions);

        return new Response(JSON.stringify({ success: true, questionCount: questions.length }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      case 'add_form_section': {
        const { form_id, sections } = body;
        if (!form_id || !sections?.length) throw new Error('form_id and sections required');

        await addFormSections(accessToken, form_id, sections);

        return new Response(JSON.stringify({ success: true, sectionCount: sections.length }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      case 'add_form_media': {
        const { form_id, media_type, url, title, index } = body;
        if (!form_id || !media_type || !url) throw new Error('form_id, media_type, and url required');

        if (media_type === 'image') {
          await addFormImage(accessToken, form_id, url, title, index);
        } else if (media_type === 'video') {
          await addFormVideo(accessToken, form_id, url, title, index);
        } else {
          throw new Error('media_type must be "image" or "video"');
        }

        return new Response(JSON.stringify({ success: true }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      case 'get_form': {
        const { form_id } = body;
        if (!form_id) throw new Error('form_id required');

        const form = await getForm(accessToken, form_id);

        return new Response(JSON.stringify({ success: true, form }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      case 'get_form_responses': {
        const { form_id } = body;
        if (!form_id) throw new Error('form_id required');

        const { responses, responseCount } = await getFormResponses(accessToken, form_id);

        return new Response(JSON.stringify({ success: true, responses, responseCount }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      case 'link_form_to_sheet': {
        const { form_id, spreadsheet_id } = body;
        if (!form_id) throw new Error('form_id required');

        const { spreadsheetId, spreadsheetUrl } = await linkFormToSheet(accessToken, form_id, spreadsheet_id);

        return new Response(JSON.stringify({ 
          success: true, spreadsheetId, spreadsheetUrl,
          note: 'For automatic response syncing, manually link via Google Forms settings'
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'create_feedback_form': {
        const { project_name, project_id } = body;

        const { formId, formUrl, responderUri } = await createForm(accessToken, {
          title: `Project Feedback: ${project_name || 'General'}`,
          description: 'We value your feedback. Please take a moment to share your thoughts.'
        });

        const feedbackQuestions: FormQuestion[] = [
          {
            title: 'How satisfied are you with the overall project?',
            type: 'scale',
            required: true,
            scale_min: 1,
            scale_max: 5,
            low_label: 'Very Unsatisfied',
            high_label: 'Very Satisfied'
          },
          {
            title: 'Communication Quality',
            type: 'scale',
            required: true,
            description: 'How would you rate the quality of communication throughout the project?',
            scale_min: 1,
            scale_max: 5,
            low_label: 'Poor',
            high_label: 'Excellent'
          },
          {
            title: 'Timeline Adherence',
            type: 'scale',
            required: true,
            description: 'How well did we meet the project timeline?',
            scale_min: 1,
            scale_max: 5,
            low_label: 'Significantly Delayed',
            high_label: 'On Time/Early'
          },
          {
            title: 'Quality of Work',
            type: 'scale',
            required: true,
            description: 'How would you rate the quality of the deliverables?',
            scale_min: 1,
            scale_max: 5,
            low_label: 'Below Expectations',
            high_label: 'Exceeded Expectations'
          },
          {
            title: 'What did we do well?',
            type: 'paragraph',
            required: false,
            description: 'Please share specific examples of what went well'
          },
          {
            title: 'Areas for Improvement',
            type: 'paragraph',
            required: false,
            description: 'What could we have done better?'
          },
          {
            title: 'Would you recommend us to others?',
            type: 'multiple_choice',
            required: true,
            options: ['Definitely Yes', 'Probably Yes', 'Not Sure', 'Probably No', 'Definitely No']
          },
          {
            title: 'May we contact you for a testimonial?',
            type: 'multiple_choice',
            required: true,
            options: ['Yes', 'No']
          },
          {
            title: 'Contact Email (Optional)',
            type: 'text',
            required: false,
            description: 'If you\'d like us to follow up, please provide your email'
          }
        ];

        await addFormQuestions(accessToken, formId, feedbackQuestions);
        await shareFile(accessToken, formId);

        return new Response(JSON.stringify({
          success: true, formId, formUrl, responderUri,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'create_site_inspection_form': {
        const { project_name, inspection_type } = body;

        const { formId, formUrl, responderUri } = await createForm(accessToken, {
          title: `Site Inspection: ${project_name || 'Project'}`,
          description: `${inspection_type || 'General'} Inspection Form\nPlease complete all required fields during your site visit.`
        });

        const inspectionQuestions: FormQuestion[] = [
          {
            title: 'Inspector Name',
            type: 'text',
            required: true
          },
          {
            title: 'Inspection Date',
            type: 'date',
            required: true,
            include_year: true,
            include_time: true
          },
          {
            title: 'Inspection Type',
            type: 'dropdown',
            required: true,
            options: ['Pre-Construction', 'Progress Inspection', 'Quality Check', 'Safety Audit', 'Final Inspection', 'Defects Inspection']
          },
          {
            title: 'Weather Conditions',
            type: 'multiple_choice',
            required: true,
            options: ['Clear/Sunny', 'Partly Cloudy', 'Overcast', 'Light Rain', 'Heavy Rain', 'Windy']
          },
          {
            title: 'Overall Site Condition',
            type: 'scale',
            required: true,
            scale_min: 1,
            scale_max: 5,
            low_label: 'Poor',
            high_label: 'Excellent'
          },
          {
            title: 'Safety Compliance',
            type: 'checkbox',
            required: true,
            description: 'Check all items that are compliant',
            options: ['PPE in use', 'Signage adequate', 'Fire extinguishers accessible', 'First aid kit available', 'Hazards cordoned off', 'Work permits displayed']
          },
          {
            title: 'Work Progress Assessment',
            type: 'multiple_choice',
            required: true,
            options: ['Ahead of Schedule', 'On Schedule', 'Slightly Behind', 'Significantly Behind', 'Stalled']
          },
          {
            title: 'Issues Identified',
            type: 'paragraph',
            required: false,
            description: 'Describe any issues or concerns observed'
          },
          {
            title: 'Corrective Actions Required',
            type: 'paragraph',
            required: false,
            description: 'List any immediate actions needed'
          },
          {
            title: 'Photo Documentation',
            type: 'file_upload',
            required: false,
            description: 'Upload photos from the inspection'
          },
          {
            title: 'Follow-up Required?',
            type: 'multiple_choice',
            required: true,
            options: ['Yes - Within 24 hours', 'Yes - Within 1 week', 'Yes - At next scheduled visit', 'No follow-up needed']
          },
          {
            title: 'Additional Notes',
            type: 'paragraph',
            required: false
          }
        ];

        await addFormQuestions(accessToken, formId, inspectionQuestions);
        await shareFile(accessToken, formId);

        return new Response(JSON.stringify({
          success: true, formId, formUrl, responderUri,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'create_variation_request_form': {
        const { project_name } = body;

        const { formId, formUrl, responderUri } = await createForm(accessToken, {
          title: `Variation Request: ${project_name || 'Project'}`,
          description: 'Submit a variation or change order request for review'
        });

        const variationQuestions: FormQuestion[] = [
          {
            title: 'Requestor Name',
            type: 'text',
            required: true
          },
          {
            title: 'Request Date',
            type: 'date',
            required: true,
            include_year: true
          },
          {
            title: 'Variation Type',
            type: 'dropdown',
            required: true,
            options: ['Addition', 'Omission', 'Substitution', 'Design Change', 'Scope Change', 'Other']
          },
          {
            title: 'Affected Trade/Section',
            type: 'checkbox',
            required: true,
            options: ['Electrical', 'Mechanical', 'Plumbing', 'Structural', 'Finishes', 'Civil', 'Other']
          },
          {
            title: 'Description of Variation',
            type: 'paragraph',
            required: true,
            description: 'Provide a detailed description of the proposed change'
          },
          {
            title: 'Reason for Variation',
            type: 'paragraph',
            required: true,
            description: 'Explain why this variation is necessary'
          },
          {
            title: 'Estimated Cost Impact',
            type: 'multiple_choice',
            required: true,
            options: ['No cost impact', 'Under R10,000', 'R10,000 - R50,000', 'R50,000 - R100,000', 'Over R100,000', 'Cost saving (credit)']
          },
          {
            title: 'Estimated Time Impact',
            type: 'multiple_choice',
            required: true,
            options: ['No time impact', '1-3 days', '1-2 weeks', '2-4 weeks', 'Over 1 month', 'Accelerates schedule']
          },
          {
            title: 'Priority Level',
            type: 'dropdown',
            required: true,
            options: ['Low - Can wait', 'Medium - Needed within 2 weeks', 'High - Needed within 1 week', 'Critical - Blocking work']
          },
          {
            title: 'Supporting Documents',
            type: 'file_upload',
            required: false,
            description: 'Upload any supporting documents, drawings, or photos'
          },
          {
            title: 'Additional Comments',
            type: 'paragraph',
            required: false
          }
        ];

        await addFormQuestions(accessToken, formId, variationQuestions);
        await shareFile(accessToken, formId);

        return new Response(JSON.stringify({
          success: true, formId, formUrl, responderUri,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // ===== MASTER RATES & AUTO-LOOKUP =====
      case 'create_master_rates_sheet': {
        // Create a Google Sheet containing all master materials with rates
        const { data: materials, error: matError } = await supabase
          .from('master_materials')
          .select(`
            *,
            category:material_categories(name)
          `)
          .order('category_id, name');

        if (matError) throw new Error(`Failed to fetch materials: ${matError.message}`);

        const title = 'Master Rates Library';
        
        // Create spreadsheet
        const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            properties: { title },
            sheets: [
              { properties: { sheetId: 0, title: 'Master Rates', gridProperties: { frozenRowCount: 1 } } },
              { properties: { sheetId: 1, title: 'By Category', gridProperties: { frozenRowCount: 1 } } }
            ]
          }),
        });

        if (!createResponse.ok) throw new Error(`Failed to create sheet: ${await createResponse.text()}`);
        const spreadsheet = await createResponse.json();
        const spreadsheetId = spreadsheet.spreadsheetId;

        // Prepare data
        const headers = ['ID', 'Name', 'Description', 'Category', 'Unit', 'Supply Rate', 'Install Rate', 'Total Rate', 'Last Updated', 'Usage Count'];
        const rows = (materials || []).map(m => [
          m.id,
          m.name || '',
          m.description || '',
          m.category?.name || 'Uncategorized',
          m.unit_of_measure || '',
          m.standard_supply_cost || 0,
          m.standard_install_cost || 0,
          (m.standard_supply_cost || 0) + (m.standard_install_cost || 0),
          m.updated_at ? new Date(m.updated_at).toLocaleDateString() : '',
          m.usage_count || 0
        ]);

        await writeValues(accessToken, spreadsheetId, 'Master Rates!A1', [headers, ...rows]);

        // Group by category for second sheet
        const categoryGroups: Record<string, any[]> = {};
        (materials || []).forEach(m => {
          const cat = m.category?.name || 'Uncategorized';
          if (!categoryGroups[cat]) categoryGroups[cat] = [];
          categoryGroups[cat].push(m);
        });

        const categoryData: any[][] = [['Category', 'Item Count', 'Avg Supply Rate', 'Avg Install Rate', 'Avg Total Rate']];
        Object.entries(categoryGroups).forEach(([cat, items]) => {
          const avgSupply = items.reduce((s, i) => s + (i.standard_supply_cost || 0), 0) / items.length;
          const avgInstall = items.reduce((s, i) => s + (i.standard_install_cost || 0), 0) / items.length;
          categoryData.push([cat, items.length, avgSupply, avgInstall, avgSupply + avgInstall]);
        });

        await writeValues(accessToken, spreadsheetId, 'By Category!A1', categoryData);

        // Apply formatting
        const requests = [
          { repeatCell: { 
            range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 10 },
            cell: { userEnteredFormat: { backgroundColor: COLORS.primary, textFormat: { foregroundColor: COLORS.white, bold: true } } },
            fields: 'userEnteredFormat(backgroundColor,textFormat)'
          }},
          { repeatCell: { 
            range: { sheetId: 0, startRowIndex: 1, endRowIndex: rows.length + 1, startColumnIndex: 5, endColumnIndex: 8 },
            cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: 'R #,##0.00' } } },
            fields: 'userEnteredFormat.numberFormat'
          }},
          { setBasicFilter: { filter: { range: { sheetId: 0, startRowIndex: 0, endRowIndex: rows.length + 1, startColumnIndex: 0, endColumnIndex: 10 } } } },
          { repeatCell: { 
            range: { sheetId: 1, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 5 },
            cell: { userEnteredFormat: { backgroundColor: COLORS.primary, textFormat: { foregroundColor: COLORS.white, bold: true } } },
            fields: 'userEnteredFormat(backgroundColor,textFormat)'
          }}
        ];

        await batchUpdate(accessToken, spreadsheetId, requests);
        await shareFile(accessToken, spreadsheetId);

        return new Response(JSON.stringify({
          success: true,
          spreadsheetId,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
          materialCount: materials?.length || 0
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'export_with_auto_rates': {
        // Export BOQ items and auto-populate rates from master library
        const { upload_id, title } = body;
        if (!upload_id) throw new Error('upload_id required');

        const { data: upload } = await supabase.from('boq_uploads').select('*').eq('id', upload_id).single();
        if (!upload) throw new Error('Upload not found');

        const { data: items } = await supabase.from('boq_extracted_items')
          .select('*').eq('upload_id', upload_id).order('bill_number, section_code, row_number');

        // Fetch master materials for rate lookup
        const { data: masterMaterials } = await supabase
          .from('master_materials')
          .select('id, name, description, standard_supply_cost, standard_install_cost, unit_of_measure');

        // Function to find best matching material
        const findBestMatch = (description: string) => {
          if (!masterMaterials || !description) return null;
          const descLower = description.toLowerCase();
          
          // Try exact match first
          let match = masterMaterials.find(m => 
            m.name?.toLowerCase() === descLower || 
            m.description?.toLowerCase() === descLower
          );
          if (match) return { ...match, confidence: 1.0 };

          // Try contains match
          match = masterMaterials.find(m => 
            descLower.includes(m.name?.toLowerCase() || '') ||
            m.name?.toLowerCase().includes(descLower.substring(0, 20))
          );
          if (match) return { ...match, confidence: 0.7 };

          // Try keyword match
          const keywords = descLower.split(/\s+/).filter(k => k.length > 3);
          for (const material of masterMaterials) {
            const matName = (material.name || '').toLowerCase();
            const matchCount = keywords.filter(k => matName.includes(k)).length;
            if (matchCount >= 2) return { ...material, confidence: 0.5 };
          }

          return null;
        };

        // Enhance items with master rates
        const enhancedItems = (items || []).map(item => {
          const match = findBestMatch(item.item_description);
          return {
            ...item,
            master_match: match ? match.name : null,
            master_supply_rate: match?.standard_supply_cost || null,
            master_install_rate: match?.standard_install_cost || null,
            match_confidence: match?.confidence || 0,
            rate_source: match ? 'master_library' : 'boq_original'
          };
        });

        // Create spreadsheet with enhanced data
        const sheetTitle = title || `BOQ (Auto-Rated) - ${upload.file_name}`;
        const billGroups: Record<string, any[]> = {};
        enhancedItems.forEach(item => {
          const bill = item.bill_name || 'General';
          if (!billGroups[bill]) billGroups[bill] = [];
          billGroups[bill].push(item);
        });

        const sheets = [
          { properties: { sheetId: 0, title: 'Summary', gridProperties: { frozenRowCount: 1 } } },
          { properties: { sheetId: 1, title: 'All Items', gridProperties: { frozenRowCount: 1 } } },
          { properties: { sheetId: 2, title: 'Rate Comparison', gridProperties: { frozenRowCount: 1 } } },
        ];

        const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ properties: { title: sheetTitle }, sheets }),
        });

        if (!createResponse.ok) throw new Error(`Failed to create sheet: ${await createResponse.text()}`);
        const spreadsheet = await createResponse.json();
        const spreadsheetId = spreadsheet.spreadsheetId;

        // All Items sheet with master rates
        const allHeaders = [
          'Row #', 'Bill', 'Description', 'Unit', 'Qty',
          'BOQ Supply Rate', 'BOQ Install Rate', 'BOQ Total',
          'Master Supply Rate', 'Master Install Rate', 'Master Total',
          'Variance', 'Variance %', 'Match Confidence', 'Rate Source'
        ];

        const allData = [allHeaders, ...enhancedItems.map((item, idx) => {
          const boqSupply = item.supply_rate || 0;
          const boqInstall = item.install_rate || 0;
          const boqTotal = boqSupply + boqInstall;
          const masterSupply = item.master_supply_rate || boqSupply;
          const masterInstall = item.master_install_rate || boqInstall;
          const masterTotal = masterSupply + masterInstall;
          const variance = masterTotal - boqTotal;
          const variancePct = boqTotal > 0 ? (variance / boqTotal) * 100 : 0;

          return [
            item.row_number || idx + 1,
            item.bill_name || '',
            item.item_description || '',
            item.unit || '',
            item.quantity || 1,
            boqSupply,
            boqInstall,
            boqTotal,
            masterSupply,
            masterInstall,
            masterTotal,
            variance,
            `${variancePct.toFixed(1)}%`,
            item.match_confidence ? `${(item.match_confidence * 100).toFixed(0)}%` : '0%',
            item.rate_source || 'boq_original'
          ];
        })];

        await writeValues(accessToken, spreadsheetId, 'All Items!A1', allData);

        // Rate Comparison sheet
        const comparisonData = [
          ['Rate Source Analysis'],
          [''],
          ['Source', 'Item Count', 'Total Value (BOQ)', 'Total Value (Master)', 'Variance'],
          ['Master Library Matches', 
            enhancedItems.filter(i => i.rate_source === 'master_library').length,
            enhancedItems.filter(i => i.rate_source === 'master_library').reduce((s, i) => s + ((i.supply_rate || 0) + (i.install_rate || 0)) * (i.quantity || 1), 0),
            enhancedItems.filter(i => i.rate_source === 'master_library').reduce((s, i) => s + ((i.master_supply_rate || 0) + (i.master_install_rate || 0)) * (i.quantity || 1), 0),
            0
          ],
          ['BOQ Original Rates',
            enhancedItems.filter(i => i.rate_source !== 'master_library').length,
            enhancedItems.filter(i => i.rate_source !== 'master_library').reduce((s, i) => s + ((i.supply_rate || 0) + (i.install_rate || 0)) * (i.quantity || 1), 0),
            enhancedItems.filter(i => i.rate_source !== 'master_library').reduce((s, i) => s + ((i.supply_rate || 0) + (i.install_rate || 0)) * (i.quantity || 1), 0),
            0
          ],
        ];
        // Calculate variance
        comparisonData[3][4] = (comparisonData[3][3] as number) - (comparisonData[3][2] as number);
        comparisonData[4][4] = 0;

        await writeValues(accessToken, spreadsheetId, 'Rate Comparison!A1', comparisonData);

        // Summary
        const matchedCount = enhancedItems.filter(i => i.rate_source === 'master_library').length;
        const summaryData = [
          ['BOQ Auto-Rate Summary'],
          [''],
          ['File', upload.file_name],
          ['Province', upload.province || 'N/A'],
          ['Total Items', enhancedItems.length],
          ['Items Matched to Master', matchedCount],
          ['Match Rate', `${((matchedCount / enhancedItems.length) * 100).toFixed(1)}%`],
          [''],
          ['Rate Variance Analysis'],
          ['Items with higher master rates', enhancedItems.filter(i => (i.master_supply_rate || 0) + (i.master_install_rate || 0) > (i.supply_rate || 0) + (i.install_rate || 0)).length],
          ['Items with lower master rates', enhancedItems.filter(i => (i.master_supply_rate || 0) + (i.master_install_rate || 0) < (i.supply_rate || 0) + (i.install_rate || 0)).length],
        ];

        await writeValues(accessToken, spreadsheetId, 'Summary!A1', summaryData);

        // Apply formatting
        const requests = [
          { repeatCell: { 
            range: { sheetId: 1, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 15 },
            cell: { userEnteredFormat: { backgroundColor: COLORS.primary, textFormat: { foregroundColor: COLORS.white, bold: true } } },
            fields: 'userEnteredFormat(backgroundColor,textFormat)'
          }},
          { repeatCell: { 
            range: { sheetId: 1, startRowIndex: 1, endRowIndex: enhancedItems.length + 1, startColumnIndex: 5, endColumnIndex: 12 },
            cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: 'R #,##0.00' } } },
            fields: 'userEnteredFormat.numberFormat'
          }},
          { setBasicFilter: { filter: { range: { sheetId: 1, startRowIndex: 0, endRowIndex: enhancedItems.length + 1, startColumnIndex: 0, endColumnIndex: 15 } } } },
          // Conditional formatting for variance
          { addConditionalFormatRule: {
            rule: {
              ranges: [{ sheetId: 1, startRowIndex: 1, endRowIndex: enhancedItems.length + 1, startColumnIndex: 11, endColumnIndex: 12 }],
              booleanRule: {
                condition: { type: 'NUMBER_GREATER', values: [{ userEnteredValue: '0' }] },
                format: { backgroundColor: COLORS.dangerLight }
              }
            },
            index: 0
          }},
          { addConditionalFormatRule: {
            rule: {
              ranges: [{ sheetId: 1, startRowIndex: 1, endRowIndex: enhancedItems.length + 1, startColumnIndex: 11, endColumnIndex: 12 }],
              booleanRule: {
                condition: { type: 'NUMBER_LESS', values: [{ userEnteredValue: '0' }] },
                format: { backgroundColor: COLORS.successLight }
              }
            },
            index: 1
          }}
        ];

        await batchUpdate(accessToken, spreadsheetId, requests);
        await shareFile(accessToken, spreadsheetId);

        return new Response(JSON.stringify({
          success: true,
          spreadsheetId,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
          itemCount: enhancedItems.length,
          matchedCount,
          matchRate: ((matchedCount / enhancedItems.length) * 100).toFixed(1)
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'import_from_sheet': {
        // Import BOQ data FROM a Google Sheet
        const { spreadsheet_id, sheet_name, project_id, province, building_type, contractor_name } = body;
        if (!spreadsheet_id) throw new Error('spreadsheet_id required');

        // Get spreadsheet info
        const infoResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!infoResponse.ok) throw new Error(`Failed to access spreadsheet: ${await infoResponse.text()}`);
        const spreadsheetInfo = await infoResponse.json();

        const targetSheet = sheet_name || spreadsheetInfo.sheets?.[0]?.properties?.title || 'Sheet1';
        
        // Read the sheet data
        const sheetData = await readFromSheet(accessToken, spreadsheet_id, `'${targetSheet}'!A:Z`);
        
        if (!sheetData.headers.length) throw new Error('No data found in sheet');

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Create upload record
        const { data: uploadRecord, error: uploadError } = await supabase
          .from('boq_uploads')
          .insert({
            file_name: `${spreadsheetInfo.properties?.title || 'Sheet Import'}.gsheet`,
            file_path: `google_sheets/${spreadsheet_id}`,
            file_type: 'gsheet',
            source_description: `Imported from Google Sheet: https://docs.google.com/spreadsheets/d/${spreadsheet_id}`,
            province: province || null,
            building_type: building_type || null,
            contractor_name: contractor_name || null,
            project_id: project_id || null,
            uploaded_by: user.id,
            status: 'processing'
          })
          .select()
          .single();

        if (uploadError) throw new Error(`Failed to create upload record: ${uploadError.message}`);

        // Map headers to expected columns
        const headerMap: Record<string, number> = {};
        sheetData.headers.forEach((h, i) => {
          const normalized = h.toLowerCase().replace(/[^a-z0-9]/g, '_');
          headerMap[normalized] = i;
        });

        // Common column name mappings
        const descCol = headerMap['description'] ?? headerMap['item_description'] ?? headerMap['item'] ?? headerMap['material'] ?? 0;
        const unitCol = headerMap['unit'] ?? headerMap['uom'] ?? headerMap['unit_of_measure'] ?? -1;
        const qtyCol = headerMap['qty'] ?? headerMap['quantity'] ?? headerMap['amount'] ?? -1;
        const rateCol = headerMap['rate'] ?? headerMap['total_rate'] ?? headerMap['price'] ?? headerMap['unit_price'] ?? -1;
        const supplyCol = headerMap['supply_rate'] ?? headerMap['supply'] ?? headerMap['material_rate'] ?? -1;
        const installCol = headerMap['install_rate'] ?? headerMap['install'] ?? headerMap['labour_rate'] ?? headerMap['labor_rate'] ?? -1;
        const billCol = headerMap['bill'] ?? headerMap['bill_name'] ?? headerMap['section'] ?? -1;
        const codeCol = headerMap['item_code'] ?? headerMap['code'] ?? headerMap['ref'] ?? headerMap['reference'] ?? -1;

        // Parse rows into items
        const items = sheetData.rows
          .filter(row => row[descCol] && row[descCol].toString().trim())
          .map((row, idx) => {
            const totalRate = rateCol >= 0 ? parseFloat(row[rateCol]) || 0 : 0;
            const supplyRate = supplyCol >= 0 ? parseFloat(row[supplyCol]) || (totalRate * 0.6) : (totalRate * 0.6);
            const installRate = installCol >= 0 ? parseFloat(row[installCol]) || (totalRate * 0.4) : (totalRate * 0.4);

            return {
              upload_id: uploadRecord.id,
              row_number: idx + 1,
              item_description: row[descCol]?.toString() || '',
              unit: unitCol >= 0 ? row[unitCol]?.toString() : null,
              quantity: qtyCol >= 0 ? parseFloat(row[qtyCol]) || 1 : 1,
              supply_rate: supplyRate,
              install_rate: installRate,
              total_rate: supplyRate + installRate,
              bill_name: billCol >= 0 ? row[billCol]?.toString() : null,
              item_code: codeCol >= 0 ? row[codeCol]?.toString() : null,
              review_status: 'pending',
              raw_data: row
            };
          });

        // Insert items
        if (items.length > 0) {
          const { error: itemsError } = await supabase
            .from('boq_extracted_items')
            .insert(items);

          if (itemsError) {
            console.error('Failed to insert items:', itemsError);
          }
        }

        // Update upload status
        await supabase.from('boq_uploads').update({
          status: 'completed',
          total_items_extracted: items.length,
          extraction_completed_at: new Date().toISOString()
        }).eq('id', uploadRecord.id);

        return new Response(JSON.stringify({
          success: true,
          uploadId: uploadRecord.id,
          itemCount: items.length,
          sheetName: targetSheet,
          spreadsheetTitle: spreadsheetInfo.properties?.title
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'create_boq_template': {
        // Create a BOQ template with VLOOKUP formulas to master rates
        const { template_name, include_master_rates, sections } = body;

        // Create spreadsheet with template structure
        const title = template_name || 'BOQ Template';
        const sheets = [
          { properties: { sheetId: 0, title: 'Instructions', gridProperties: { frozenRowCount: 0 } } },
          { properties: { sheetId: 1, title: 'BOQ Entry', gridProperties: { frozenRowCount: 1 } } },
          { properties: { sheetId: 2, title: 'Summary', gridProperties: { frozenRowCount: 1 } } },
        ];

        if (include_master_rates) {
          sheets.push({ properties: { sheetId: 3, title: 'Master Rates', gridProperties: { frozenRowCount: 1 } } });
        }

        // Add section sheets
        const defaultSections = sections || ['Preliminaries', 'Electrical', 'Mechanical', 'Civil', 'Finishes'];
        defaultSections.forEach((section: string, i: number) => {
          sheets.push({ properties: { sheetId: i + 10, title: section.substring(0, 30), gridProperties: { frozenRowCount: 1 } } });
        });

        const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ properties: { title }, sheets }),
        });

        if (!createResponse.ok) throw new Error(`Failed to create template: ${await createResponse.text()}`);
        const spreadsheet = await createResponse.json();
        const spreadsheetId = spreadsheet.spreadsheetId;

        // Instructions sheet
        const instructions = [
          ['BOQ Template Instructions'],
          [''],
          ['1. Enter item details in the BOQ Entry sheet or section-specific sheets'],
          ['2. Use the Description column - rates will auto-lookup from Master Rates'],
          ['3. Review calculated totals in the Summary sheet'],
          ['4. Override rates manually if needed by editing Supply/Install columns'],
          [''],
          ['Column Guide:'],
          ['- Item Code: Your reference code'],
          ['- Description: Item description (used for rate lookup)'],
          ['- Unit: Unit of measure (m, m², nr, etc.)'],
          ['- Quantity: Amount required'],
          ['- Supply Rate: Material/supply cost per unit'],
          ['- Install Rate: Labour/installation cost per unit'],
          ['- Total Rate: Calculated (Supply + Install)'],
          ['- Total Cost: Calculated (Qty × Total Rate)'],
          [''],
          ['Tips:'],
          ['- Green cells = auto-populated from Master Rates'],
          ['- Yellow cells = manually entered rates'],
          ['- Red highlight = rate significantly different from master'],
        ];

        await writeValues(accessToken, spreadsheetId, 'Instructions!A1', instructions);

        // BOQ Entry sheet with formulas
        const boqHeaders = ['Item Code', 'Description', 'Unit', 'Qty', 'Supply Rate', 'Install Rate', 'Total Rate', 'Total Cost', 'Notes'];
        const boqData = [boqHeaders];
        
        // Add formula rows (template)
        for (let i = 0; i < 100; i++) {
          const row = i + 2;
          boqData.push([
            '', // Item code
            '', // Description
            '', // Unit
            '', // Qty
            include_master_rates ? `=IF(B${row}="","",IFERROR(VLOOKUP(B${row},'Master Rates'!$B:$F,4,FALSE),0))` : '',
            include_master_rates ? `=IF(B${row}="","",IFERROR(VLOOKUP(B${row},'Master Rates'!$B:$F,5,FALSE),0))` : '',
            `=IF(B${row}="","",E${row}+F${row})`,
            `=IF(B${row}="","",D${row}*G${row})`,
            '' // Notes
          ]);
        }

        await writeValues(accessToken, spreadsheetId, 'BOQ Entry!A1', boqData);

        // Summary sheet
        const summaryData = [
          ['BOQ Summary'],
          [''],
          ['Total Items', '=COUNTA(\'BOQ Entry\'!B:B)-1'],
          ['Total Supply Cost', '=SUMPRODUCT(\'BOQ Entry\'!D2:D101,\'BOQ Entry\'!E2:E101)'],
          ['Total Install Cost', '=SUMPRODUCT(\'BOQ Entry\'!D2:D101,\'BOQ Entry\'!F2:F101)'],
          ['Grand Total', '=SUM(\'BOQ Entry\'!H:H)'],
          [''],
          ['Section Breakdown'],
          ...defaultSections.map((section: string) => [section, `=SUM('${section.substring(0, 30)}'!H:H)`])
        ];

        await writeValues(accessToken, spreadsheetId, 'Summary!A1', summaryData);

        // Master Rates sheet (if included)
        if (include_master_rates) {
          const { data: materials } = await supabase
            .from('master_materials')
            .select('id, name, description, unit_of_measure, standard_supply_cost, standard_install_cost')
            .order('name');

          const ratesHeaders = ['ID', 'Name', 'Description', 'Unit', 'Supply Rate', 'Install Rate'];
          const ratesData = [
            ratesHeaders,
            ...(materials || []).map(m => [
              m.id,
              m.name || '',
              m.description || '',
              m.unit_of_measure || '',
              m.standard_supply_cost || 0,
              m.standard_install_cost || 0
            ])
          ];

          await writeValues(accessToken, spreadsheetId, 'Master Rates!A1', ratesData);
        }

        // Section sheets
        for (const section of defaultSections) {
          const sectionHeaders = ['Item Code', 'Description', 'Unit', 'Qty', 'Supply Rate', 'Install Rate', 'Total Rate', 'Total Cost', 'Notes'];
          const sectionData = [sectionHeaders];
          
          for (let i = 0; i < 50; i++) {
            const row = i + 2;
            sectionData.push([
              '',
              '',
              '',
              '',
              include_master_rates ? `=IF(B${row}="","",IFERROR(VLOOKUP(B${row},'Master Rates'!$B:$F,4,FALSE),0))` : '',
              include_master_rates ? `=IF(B${row}="","",IFERROR(VLOOKUP(B${row},'Master Rates'!$B:$F,5,FALSE),0))` : '',
              `=IF(B${row}="","",E${row}+F${row})`,
              `=IF(B${row}="","",D${row}*G${row})`,
              ''
            ]);
          }

          await writeValues(accessToken, spreadsheetId, `'${section.substring(0, 30)}'!A1`, sectionData);
        }

        // Apply formatting
        const formatRequests = [
          { repeatCell: { 
            range: { sheetId: 1, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 9 },
            cell: { userEnteredFormat: { backgroundColor: COLORS.primary, textFormat: { foregroundColor: COLORS.white, bold: true } } },
            fields: 'userEnteredFormat(backgroundColor,textFormat)'
          }},
          { repeatCell: { 
            range: { sheetId: 1, startRowIndex: 1, endRowIndex: 101, startColumnIndex: 4, endColumnIndex: 8 },
            cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: 'R #,##0.00' } } },
            fields: 'userEnteredFormat.numberFormat'
          }},
          { setBasicFilter: { filter: { range: { sheetId: 1, startRowIndex: 0, endRowIndex: 101, startColumnIndex: 0, endColumnIndex: 9 } } } },
        ];

        await batchUpdate(accessToken, spreadsheetId, formatRequests);
        await shareFile(accessToken, spreadsheetId);

        return new Response(JSON.stringify({
          success: true,
          spreadsheetId,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
          sections: defaultSections,
          hasMasterRates: include_master_rates
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'sync_master_rates_to_sheet': {
        // Update master rates in an existing sheet
        const { spreadsheet_id } = body;
        if (!spreadsheet_id) throw new Error('spreadsheet_id required');

        const { data: materials } = await supabase
          .from('master_materials')
          .select('id, name, description, unit_of_measure, standard_supply_cost, standard_install_cost')
          .order('name');

        const ratesHeaders = ['ID', 'Name', 'Description', 'Unit', 'Supply Rate', 'Install Rate'];
        const ratesData = [
          ratesHeaders,
          ...(materials || []).map(m => [
            m.id,
            m.name || '',
            m.description || '',
            m.unit_of_measure || '',
            m.standard_supply_cost || 0,
            m.standard_install_cost || 0
          ])
        ];

        // Clear existing and write new data
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/'Master Rates'!A:F:clear`,
          { method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}` } }
        );

        await writeValues(accessToken, spreadsheet_id, 'Master Rates!A1', ratesData);

        return new Response(JSON.stringify({
          success: true,
          materialCount: materials?.length || 0,
          message: 'Master rates updated - formulas will recalculate automatically'
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
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
