import * as XLSX from 'xlsx';

export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: Record<string, string | number | null>[];
  rawText: string;
}

export interface ParsedExcelResult {
  sheets: ParsedSheet[];
  totalRows: number;
  combinedText: string;
}

/**
 * Parse an Excel file and extract all sheets with their data
 */
export async function parseExcelFile(file: File): Promise<ParsedExcelResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        const sheets: ParsedSheet[] = [];
        let totalRows = 0;
        const textParts: string[] = [];
        
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          
          // Get range of cells
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
          
          // Extract headers from first row
          const headers: string[] = [];
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
            const cell = worksheet[cellAddress];
            headers.push(cell ? String(cell.v || '').trim() : `Column_${col}`);
          }
          
          // Extract all rows as JSON
          const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
            header: headers.length > 0 ? headers : undefined,
            defval: null,
            raw: false, // Get formatted strings
          });
          
          // Convert to structured text for AI parsing
          const rawText = convertSheetToText(sheetName, worksheet, range);
          
          // Process rows
          const rows = jsonData.map(row => {
            const processedRow: Record<string, string | number | null> = {};
            for (const key of Object.keys(row)) {
              const value = row[key];
              if (value === null || value === undefined || value === '') {
                processedRow[key] = null;
              } else if (typeof value === 'number') {
                processedRow[key] = value;
              } else {
                processedRow[key] = String(value).trim();
              }
            }
            return processedRow;
          });
          
          sheets.push({
            name: sheetName,
            headers,
            rows,
            rawText
          });
          
          totalRows += rows.length;
          textParts.push(rawText);
        }
        
        resolve({
          sheets,
          totalRows,
          combinedText: textParts.join('\n\n')
        });
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Convert a worksheet to structured text preserving BOQ structure
 */
function convertSheetToText(sheetName: string, worksheet: XLSX.WorkSheet, range: XLSX.Range): string {
  const lines: string[] = [];
  lines.push(`=== SHEET: ${sheetName} ===`);
  lines.push('');
  
  // Track merged cells
  const merges = worksheet['!merges'] || [];
  const mergedCells = new Set<string>();
  const mergeValues: Record<string, string> = {};
  
  for (const merge of merges) {
    const startCell = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
    const cell = worksheet[startCell];
    const value = cell ? String(cell.v || '') : '';
    
    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (addr !== startCell) {
          mergedCells.add(addr);
        }
        mergeValues[addr] = value;
      }
    }
  }
  
  // Process each row
  for (let row = range.s.r; row <= range.e.r; row++) {
    const rowCells: string[] = [];
    let hasContent = false;
    
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      
      if (mergedCells.has(cellAddress)) {
        // Skip merged cells that aren't the start
        continue;
      }
      
      const cell = worksheet[cellAddress];
      let value = '';
      
      if (cell) {
        if (cell.t === 'n') {
          // Number - format with appropriate precision
          value = formatNumber(cell.v as number);
        } else if (cell.w) {
          // Formatted value
          value = cell.w;
        } else if (cell.v !== undefined && cell.v !== null) {
          value = String(cell.v);
        }
      }
      
      value = value.trim();
      if (value) hasContent = true;
      rowCells.push(value);
    }
    
    if (hasContent) {
      // Check if this looks like a section header
      const rowText = rowCells.join('\t');
      const isSectionHeader = /^[A-N]\.\s|^BILL\s|^SECTION|TOTAL|SUBTOTAL/i.test(rowText);
      
      if (isSectionHeader) {
        lines.push('');
        lines.push(`### ${rowText.replace(/\t+/g, ' ').trim()}`);
        lines.push('');
      } else {
        lines.push(rowCells.join('\t'));
      }
    }
  }
  
  return lines.join('\n');
}

/**
 * Format a number appropriately (for currency/quantities)
 */
function formatNumber(num: number): string {
  if (Number.isNaN(num)) return '';
  
  // If it's a whole number or close to it
  if (Math.abs(num - Math.round(num)) < 0.0001) {
    return Math.round(num).toString();
  }
  
  // For decimals, use appropriate precision
  if (Math.abs(num) >= 1000) {
    return num.toFixed(2);
  } else if (Math.abs(num) >= 1) {
    return num.toFixed(2);
  } else {
    return num.toFixed(4);
  }
}

/**
 * Detect common BOQ column patterns in headers
 */
export function detectBOQColumns(headers: string[]): {
  itemCode?: number;
  description?: number;
  quantity?: number;
  unit?: number;
  supplyRate?: number;
  installRate?: number;
  totalRate?: number;
  amount?: number;
} {
  const result: ReturnType<typeof detectBOQColumns> = {};
  
  const patterns = {
    itemCode: /item|ref|no\.?|code|^nr$/i,
    description: /desc|particular|detail|specification/i,
    quantity: /qty|quantity|qnty/i,
    unit: /^unit$|^u$|measurement/i,
    supplyRate: /supply|material|mat|supp/i,
    installRate: /install|labour|labor|lab|inst/i,
    totalRate: /^rate$|unit.*rate|combined/i,
    amount: /amount|total|sum|value/i
  };
  
  headers.forEach((header, index) => {
    const h = header.toLowerCase().trim();
    
    for (const [key, pattern] of Object.entries(patterns)) {
      if (pattern.test(h) && result[key as keyof typeof result] === undefined) {
        result[key as keyof typeof result] = index;
      }
    }
  });
  
  return result;
}
