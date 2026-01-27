/**
 * Bulk Import Dialog
 * Import drawings from Excel file (local or Dropbox)
 * Supports the WM Engineering drawing register format
 */

import { useState, useCallback } from 'react';
import { FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useBulkImportDrawings } from '@/hooks/useProjectDrawings';
import { DrawingFormData, detectDrawingCategory } from '@/types/drawings';
import { DropboxFileInput } from '@/components/storage/DropboxFileInput';
import { DropboxFile } from '@/hooks/useDropbox';

interface ParsedDrawing {
  drawing_number: string;
  drawing_title: string;
  category: string;
  current_revision: string;
  shop_number?: string;
  isValid: boolean;
  error?: string;
}

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

/**
 * Find the last non-empty revision letter from a row of revision columns
 * Revisions are typically: 0, 1, 2, 3... or A, B, C...
 */
function findLatestRevision(row: unknown[], startCol: number): string {
  let lastRevision = 'A';
  
  for (let i = startCol; i < row.length; i++) {
    const cell = row[i];
    if (cell !== null && cell !== undefined && cell !== '') {
      const value = String(cell).trim();
      // Check if it's a valid revision (number or letter)
      if (/^[0-9A-Z]$/i.test(value)) {
        // Convert numeric revisions to letters (0=A, 1=B, etc.)
        if (/^\d$/.test(value)) {
          const num = parseInt(value, 10);
          lastRevision = String.fromCharCode(65 + num); // 65 = 'A'
        } else {
          lastRevision = value.toUpperCase();
        }
      }
    }
  }
  
  return lastRevision;
}

/**
 * Parse the WM Engineering drawing register format
 * Format has:
 * - Header rows with project info
 * - Row with "DRW No" and "DRAWING TITLE" headers
 * - Drawing rows with number in col A, title in col B, revisions spread across date columns
 */
function parseDrawingRegister(jsonData: unknown[][]): ParsedDrawing[] {
  const drawings: ParsedDrawing[] = [];
  
  // Find the header row (contains "DRW No" or "DRW" in first few columns)
  let headerRowIndex = -1;
  let drawingNoColIndex = 0;
  let titleColIndex = 1;
  let revisionStartCol = 6; // Revisions typically start around column 6
  
  for (let i = 0; i < Math.min(50, jsonData.length); i++) {
    const row = jsonData[i] as unknown[];
    if (!row || row.length < 2) continue;
    
    const firstCell = String(row[0] || '').toLowerCase().trim();
    const secondCell = String(row[1] || '').toLowerCase().trim();
    
    // Look for "DRW No" or similar in first column
    if (firstCell.includes('drw') || firstCell === 'no' || firstCell.includes('drawing no')) {
      headerRowIndex = i;
      drawingNoColIndex = 0;
      
      // Find title column
      for (let j = 1; j < Math.min(6, row.length); j++) {
        const cell = String(row[j] || '').toLowerCase().trim();
        if (cell.includes('title') || cell.includes('description') || cell.includes('drawing title')) {
          titleColIndex = j;
          break;
        }
      }
      
      // Find where revisions start (look for "REVISION" keyword)
      for (let j = 2; j < row.length; j++) {
        const cell = String(row[j] || '').toLowerCase().trim();
        if (cell.includes('revision') || cell.includes('rev')) {
          revisionStartCol = j;
          break;
        }
      }
      break;
    }
    
    // Alternative: look for "DRAWING TITLE" in second column
    if (secondCell.includes('drawing title') || secondCell.includes('title')) {
      headerRowIndex = i;
      drawingNoColIndex = 0;
      titleColIndex = 1;
      break;
    }
  }
  
  console.log('[BulkImport] Found header at row:', headerRowIndex, 
    'Drawing col:', drawingNoColIndex, 
    'Title col:', titleColIndex,
    'Revision start:', revisionStartCol);
  
  // If no header found, try to detect from first data row
  if (headerRowIndex === -1) {
    // Look for first row that looks like a drawing number
    for (let i = 0; i < Math.min(50, jsonData.length); i++) {
      const row = jsonData[i] as unknown[];
      if (!row || row.length < 2) continue;
      
      const firstCell = String(row[0] || '').trim();
      // Check if first cell looks like a drawing number (contains / and numbers)
      if (/\d+\/[A-Z]\//.test(firstCell)) {
        headerRowIndex = i - 1; // Set header to row before data
        break;
      }
    }
  }
  
  // Parse drawing rows
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i] as unknown[];
    if (!row || row.length < 2) continue;
    
    const drawingNumber = String(row[drawingNoColIndex] || '').trim();
    const title = String(row[titleColIndex] || '').trim();
    
    // Skip empty rows
    if (!drawingNumber) continue;
    
    // Skip section headers (single-word rows like "TENANTS")
    if (!title && drawingNumber.toUpperCase() === drawingNumber && !/\d/.test(drawingNumber)) {
      console.log('[BulkImport] Skipping section header:', drawingNumber);
      continue;
    }
    
    // Skip summary/total rows
    if (drawingNumber.toLowerCase().includes('total') || 
        drawingNumber.toLowerCase().includes('sheet no')) {
      continue;
    }
    
    // Validate drawing number format (should contain project/discipline/number pattern)
    const isValidFormat = /\d+\/[A-Z]\//.test(drawingNumber) || /\d+\/[A-Z]\/\d+/.test(drawingNumber);
    
    // Auto-detect category from drawing number
    const category = detectDrawingCategory(drawingNumber);
    
    // Find the latest revision from the row
    const currentRevision = findLatestRevision(row, revisionStartCol);
    
    // Extract shop number if tenant drawing (pattern: /4XX or /401, etc.)
    let shopNumber: string | undefined;
    const shopMatch = drawingNumber.match(/\/4(\d+)/);
    const shopNameMatch = drawingNumber.match(/\/4([A-Z]+)/);
    if (shopMatch) {
      shopNumber = shopMatch[1];
    } else if (shopNameMatch) {
      shopNumber = shopNameMatch[1];
    }
    
    drawings.push({
      drawing_number: drawingNumber,
      drawing_title: title || 'Untitled',
      category,
      current_revision: currentRevision,
      shop_number: shopNumber,
      isValid: isValidFormat && !!title,
      error: !isValidFormat ? 'Invalid drawing number format' : !title ? 'Missing title' : undefined,
    });
  }
  
  console.log('[BulkImport] Parsed', drawings.length, 'drawings');
  return drawings;
}

export function BulkImportDialog({
  open,
  onOpenChange,
  projectId,
}: BulkImportDialogProps) {
  const [parsedDrawings, setParsedDrawings] = useState<ParsedDrawing[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [parseError, setParseError] = useState<string>('');
  
  const bulkImport = useBulkImportDrawings();
  
  const parseExcelFile = useCallback((file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the second sheet if available (drawing register is often on sheet 2)
        // Otherwise use first sheet
        let sheetName = workbook.SheetNames[0];
        
        // Look for a sheet that might be the drawing register
        for (const name of workbook.SheetNames) {
          const lowerName = name.toLowerCase();
          if (lowerName.includes('register') || 
              lowerName.includes('drawing') || 
              lowerName.includes('issue')) {
            sheetName = name;
            break;
          }
        }
        
        // If sheet names don't help, try sheet 2 (index 1) if it exists
        // as the first sheet is often a cover/info sheet
        if (workbook.SheetNames.length > 1 && sheetName === workbook.SheetNames[0]) {
          sheetName = workbook.SheetNames[1];
        }
        
        console.log('[BulkImport] Using sheet:', sheetName);
        
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
        
        console.log('[BulkImport] Total rows in sheet:', jsonData.length);
        
        const drawings = parseDrawingRegister(jsonData);
        
        if (drawings.length === 0) {
          setParseError('No drawings found in the file. Please check the format.');
        } else {
          setParsedDrawings(drawings);
          setParseError('');
        }
      } catch (error) {
        console.error('Parse error:', error);
        setParseError('Failed to parse Excel file. Please check the format.');
      }
    };
    
    reader.readAsArrayBuffer(file);
  }, []);
  
  const handleFileChange = (file: File) => {
    setFileName(file.name);
    parseExcelFile(file);
  };

  const handleDropboxFileSelect = (dropboxFile: DropboxFile, content: ArrayBuffer) => {
    setFileName(dropboxFile.name);
    try {
      const blob = new Blob([content]);
      const file = new File([blob], dropboxFile.name);
      parseExcelFile(file);
    } catch (error) {
      console.error('Parse error from Dropbox file:', error);
      setParseError('Failed to parse Excel file from Dropbox. Please check the format.');
    }
  };
  
  const handleImport = async () => {
    const validDrawings = parsedDrawings.filter(d => d.isValid);
    
    if (validDrawings.length === 0) {
      return;
    }
    
    const drawingsToImport: DrawingFormData[] = validDrawings.map(d => ({
      drawing_number: d.drawing_number,
      drawing_title: d.drawing_title,
      category: d.category,
      shop_number: d.shop_number,
      current_revision: d.current_revision,
      status: 'draft',
      visible_to_contractor: true,
      visible_to_client: false,
    }));
    
    await bulkImport.mutateAsync({
      projectId,
      drawings: drawingsToImport,
    });
    
    setParsedDrawings([]);
    setFileName('');
    onOpenChange(false);
  };
  
  const validCount = parsedDrawings.filter(d => d.isValid).length;
  const invalidCount = parsedDrawings.filter(d => !d.isValid).length;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Import Drawings from Excel</DialogTitle>
          <DialogDescription>
            Upload your drawing register Excel file. The system will detect drawing numbers, titles, and current revisions.
          </DialogDescription>
        </DialogHeader>
        
        {parsedDrawings.length === 0 ? (
          <div className="py-8">
            <div className="text-center mb-6">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">
                Import Drawing Register
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Upload an Excel file or import from Dropbox
              </p>
            </div>

            <DropboxFileInput
              onFileSelect={handleFileChange}
              onDropboxFileSelect={handleDropboxFileSelect}
              allowedExtensions={['.xlsx', '.xls']}
              accept=".xlsx,.xls"
              placeholder="Supports .xlsx and .xls files"
              dropboxTitle="Import Drawing Register"
              dropboxDescription="Select an Excel file from your Dropbox"
            />
            
            {parseError && (
              <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                {parseError}
              </div>
            )}
            
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Supported Format:</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• WM Engineering Drawing Issue Register format</p>
                <p>• Column A: Drawing numbers (e.g., 636/E/001)</p>
                <p>• Column B: Drawing titles/descriptions</p>
                <p>• Revision columns with dates - latest revision is auto-detected</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-4">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{fileName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {validCount} valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {invalidCount} issues
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Preview Table */}
            <ScrollArea className="h-[400px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead className="w-36">Drawing No.</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-24">Category</TableHead>
                    <TableHead className="w-16">Rev</TableHead>
                    <TableHead className="w-20">Shop</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedDrawings.map((drawing, index) => (
                    <TableRow 
                      key={index}
                      className={!drawing.isValid ? 'bg-destructive/5' : ''}
                    >
                      <TableCell>
                        {drawing.isValid ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {drawing.drawing_number}
                        {drawing.error && (
                          <p className="text-xs text-destructive mt-1">{drawing.error}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{drawing.drawing_title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{drawing.category}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium">
                        {drawing.current_revision}
                      </TableCell>
                      <TableCell className="text-sm">{drawing.shop_number || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </>
        )}
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              setParsedDrawings([]);
              setFileName('');
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          {parsedDrawings.length > 0 && (
            <Button
              onClick={handleImport}
              disabled={validCount === 0 || bulkImport.isPending}
            >
              {bulkImport.isPending ? 'Importing...' : `Import ${validCount} Drawings`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
