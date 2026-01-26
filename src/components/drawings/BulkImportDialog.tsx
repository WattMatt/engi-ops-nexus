/**
 * Bulk Import Dialog
 * Import drawings from Excel file
 */

import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
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

interface ParsedDrawing {
  drawing_number: string;
  drawing_title: string;
  category: string;
  shop_number?: string;
  isValid: boolean;
  error?: string;
}

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
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
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
        
        // Find header row (looking for "DRW" or "Drawing" columns)
        let headerRowIndex = -1;
        let drawingNoColIndex = -1;
        let titleColIndex = -1;
        
        for (let i = 0; i < Math.min(15, jsonData.length); i++) {
          const row = jsonData[i] as unknown[];
          if (!row) continue;
          
          for (let j = 0; j < row.length; j++) {
            const cell = String(row[j] || '').toLowerCase().trim();
            if (cell.includes('drw') || cell.includes('drawing no') || cell === 'no') {
              drawingNoColIndex = j;
              headerRowIndex = i;
            }
            if (cell.includes('title') || cell.includes('description')) {
              titleColIndex = j;
            }
          }
          
          if (headerRowIndex !== -1) break;
        }
        
        // If no header found, assume first row is data
        if (headerRowIndex === -1) {
          headerRowIndex = -1;
          drawingNoColIndex = 0;
          titleColIndex = 1;
        }
        
        // Parse drawings
        const drawings: ParsedDrawing[] = [];
        
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i] as unknown[];
          if (!row || row.length === 0) continue;
          
          const drawingNumber = String(row[drawingNoColIndex] || '').trim();
          const title = String(row[titleColIndex] || '').trim();
          
          // Skip empty rows or summary rows
          if (!drawingNumber || drawingNumber.toLowerCase().includes('total')) {
            continue;
          }
          
          // Validate drawing number format
          const isValidFormat = /\d+\/[A-Z]\//.test(drawingNumber);
          
          // Auto-detect category
          const category = detectDrawingCategory(drawingNumber);
          
          // Extract shop number if tenant drawing
          let shopNumber: string | undefined;
          const shopMatch = drawingNumber.match(/\/4(\d+)/);
          if (shopMatch) {
            shopNumber = shopMatch[1];
          }
          
          drawings.push({
            drawing_number: drawingNumber,
            drawing_title: title || 'Untitled',
            category,
            shop_number: shopNumber,
            isValid: isValidFormat && !!title,
            error: !isValidFormat ? 'Invalid drawing number format' : !title ? 'Missing title' : undefined,
          });
        }
        
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
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      parseExcelFile(file);
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
      current_revision: 'A',
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
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Import Drawings from Excel</DialogTitle>
          <DialogDescription>
            Upload an Excel file with your drawing register. The system will detect drawing numbers and titles automatically.
          </DialogDescription>
        </DialogHeader>
        
        {parsedDrawings.length === 0 ? (
          <div className="py-8">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <label className="cursor-pointer">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">
                  Drop Excel file here or click to upload
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Supports .xlsx and .xls files
                </p>
                <Button type="button" variant="secondary">
                  <Upload className="h-4 w-4 mr-2" />
                  Select File
                </Button>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
            
            {parseError && (
              <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                {parseError}
              </div>
            )}
            
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Expected Format:</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Column with drawing numbers (e.g., 636/E/001)</p>
                <p>• Column with drawing titles/descriptions</p>
                <p>• Headers can be: "DRW No", "Drawing No", "Title", "Description"</p>
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
                    <TableHead className="w-32">Drawing No.</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-24">Category</TableHead>
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
