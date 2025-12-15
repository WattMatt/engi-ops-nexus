import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Upload, Download, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImportFittingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string | null;
}

interface ParsedFitting {
  fitting_code: string;
  manufacturer?: string;
  model_name: string;
  fitting_type: string;
  wattage?: number;
  lumen_output?: number;
  color_temperature?: number;
  cri?: number;
  beam_angle?: number;
  ip_rating?: string;
  ik_rating?: string;
  lifespan_hours?: number;
  dimensions?: string;
  weight?: number;
  supply_cost: number;
  install_cost: number;
  category?: string;
  subcategory?: string;
  is_dimmable: boolean;
  driver_type?: string;
  notes?: string;
  isValid: boolean;
  errors: string[];
}

const CSV_TEMPLATE_HEADERS = [
  'fitting_code',
  'manufacturer',
  'model_name',
  'fitting_type',
  'wattage',
  'lumen_output',
  'color_temperature',
  'cri',
  'beam_angle',
  'ip_rating',
  'ik_rating',
  'lifespan_hours',
  'dimensions',
  'weight',
  'supply_cost',
  'install_cost',
  'category',
  'subcategory',
  'is_dimmable',
  'driver_type',
  'notes',
];

const VALID_TYPES = ['downlight', 'panel', 'linear', 'floodlight', 'decorative', 'emergency', 'exit_sign', 'outdoor'];

export const ImportFittingsDialog = ({
  open,
  onOpenChange,
  projectId,
}: ImportFittingsDialogProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedData, setParsedData] = useState<ParsedFitting[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [step, setStep] = useState<'upload' | 'preview'>('upload');

  const importMutation = useMutation({
    mutationFn: async (fittings: ParsedFitting[]) => {
      const { data: userData } = await supabase.auth.getUser();
      const validFittings = fittings
        .filter((f) => f.isValid)
        .map(({ isValid, errors, ...f }) => ({
          ...f,
          project_id: projectId || null,
          created_by: userData.user?.id || null,
        }));

      const { error } = await supabase.from('lighting_fittings').insert(validFittings);
      if (error) throw error;
      return validFittings.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['lighting-fittings'] });
      toast.success(`Imported ${count} fittings successfully`);
      handleClose();
    },
    onError: (error) => {
      toast.error('Failed to import fittings', { description: error.message });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setParsedData(parsed);
      setStep('preview');
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string): ParsedFitting[] => {
    const lines = text.split('\n').filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
    const rows = lines.slice(1);

    return rows.map((row) => {
      const values = parseCSVRow(row);
      const fitting: Partial<ParsedFitting> = {};
      const errors: string[] = [];

      headers.forEach((header, index) => {
        const value = values[index]?.trim().replace(/"/g, '') || '';
        
        switch (header) {
          case 'fitting_code':
            fitting.fitting_code = value;
            if (!value) errors.push('Missing code');
            break;
          case 'manufacturer':
            fitting.manufacturer = value || undefined;
            break;
          case 'model_name':
            fitting.model_name = value;
            if (!value) errors.push('Missing model');
            break;
          case 'fitting_type':
            fitting.fitting_type = value.toLowerCase();
            if (!value) errors.push('Missing type');
            else if (!VALID_TYPES.includes(value.toLowerCase())) {
              errors.push(`Invalid type: ${value}`);
            }
            break;
          case 'wattage':
            fitting.wattage = value ? parseFloat(value) : undefined;
            break;
          case 'lumen_output':
            fitting.lumen_output = value ? parseFloat(value) : undefined;
            break;
          case 'color_temperature':
            fitting.color_temperature = value ? parseInt(value) : undefined;
            break;
          case 'cri':
            fitting.cri = value ? parseInt(value) : undefined;
            break;
          case 'beam_angle':
            fitting.beam_angle = value ? parseInt(value) : undefined;
            break;
          case 'ip_rating':
            fitting.ip_rating = value || undefined;
            break;
          case 'ik_rating':
            fitting.ik_rating = value || undefined;
            break;
          case 'lifespan_hours':
            fitting.lifespan_hours = value ? parseInt(value) : undefined;
            break;
          case 'dimensions':
            fitting.dimensions = value || undefined;
            break;
          case 'weight':
            fitting.weight = value ? parseFloat(value) : undefined;
            break;
          case 'supply_cost':
            fitting.supply_cost = value ? parseFloat(value) : 0;
            break;
          case 'install_cost':
            fitting.install_cost = value ? parseFloat(value) : 0;
            break;
          case 'category':
            fitting.category = value || undefined;
            break;
          case 'subcategory':
            fitting.subcategory = value || undefined;
            break;
          case 'is_dimmable':
            fitting.is_dimmable = value.toLowerCase() === 'true' || value === '1';
            break;
          case 'driver_type':
            fitting.driver_type = value || undefined;
            break;
          case 'notes':
            fitting.notes = value || undefined;
            break;
        }
      });

      return {
        fitting_code: fitting.fitting_code || '',
        model_name: fitting.model_name || '',
        fitting_type: fitting.fitting_type || '',
        supply_cost: fitting.supply_cost || 0,
        install_cost: fitting.install_cost || 0,
        is_dimmable: fitting.is_dimmable || false,
        ...fitting,
        isValid: errors.length === 0,
        errors,
      };
    });
  };

  const parseCSVRow = (row: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of row) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const downloadTemplate = () => {
    const exampleRow = [
      'DL-001',
      'Philips',
      'CoreLine Downlight',
      'downlight',
      '15',
      '1500',
      '4000',
      '80',
      '60',
      'IP20',
      'IK08',
      '50000',
      '150mm x 75mm',
      '0.5',
      '250',
      '150',
      'LED',
      'Recessed',
      'true',
      'DALI',
      'Sample fitting',
    ];

    const csvContent = [CSV_TEMPLATE_HEADERS.join(','), exampleRow.join(',')].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lighting-fittings-template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const handleClose = () => {
    setParsedData([]);
    setFileName('');
    setStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onOpenChange(false);
  };

  const validCount = parsedData.filter((f) => f.isValid).length;
  const invalidCount = parsedData.length - validCount;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Import Lighting Fittings</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import fittings into your library
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6 py-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop your CSV file here, or click to browse
              </p>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="max-w-xs mx-auto"
              />
            </div>

            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Need a template? Download our CSV template with all required columns and an example
                row to get started.
              </AlertDescription>
            </Alert>

            <Button variant="outline" onClick={downloadTemplate} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{fileName}</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="default">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {validCount} valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {invalidCount} invalid
                  </Badge>
                )}
              </div>
            </div>

            <ScrollArea className="h-[350px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Status</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Wattage</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((fitting, index) => (
                    <TableRow key={index} className={!fitting.isValid ? 'bg-destructive/10' : ''}>
                      <TableCell>
                        {fitting.isValid ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{fitting.fitting_code}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{fitting.model_name}</TableCell>
                      <TableCell>{fitting.fitting_type}</TableCell>
                      <TableCell>{fitting.wattage ? `${fitting.wattage}W` : '-'}</TableCell>
                      <TableCell>R{(fitting.supply_cost + fitting.install_cost).toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-destructive">
                        {fitting.errors.join(', ')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {invalidCount > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {invalidCount} row(s) have validation errors and will be skipped during import.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button
                onClick={() => importMutation.mutate(parsedData)}
                disabled={validCount === 0 || importMutation.isPending}
              >
                {importMutation.isPending ? 'Importing...' : `Import ${validCount} Fittings`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
