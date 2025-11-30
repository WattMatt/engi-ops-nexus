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
  ].join(' ');

  const claim = {
    iss: serviceEmail,
    scope: scopes,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

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
