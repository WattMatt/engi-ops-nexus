import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ParsedIESData {
  manufacturer: string;
  catalogNumber: string;
  lampType: string;
  lumens: number;
  mountingType: string;
  candelas: number[];
  verticalAngles: number[];
  horizontalAngles: number[];
  watts: number;
}

interface IESFileParserProps {
  fittingId?: string;
  onDataParsed?: (data: ParsedIESData) => void;
}

export const IESFileParser = ({ fittingId, onDataParsed }: IESFileParserProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsedData, setParsedData] = useState<ParsedIESData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Parse IES file content
  const parseIESFile = useCallback((content: string): ParsedIESData => {
    const lines = content.split('\n').map(line => line.trim());
    
    let manufacturer = '';
    let catalogNumber = '';
    let lampType = '';
    let lumens = 0;
    let mountingType = '';
    let watts = 0;
    const candelas: number[] = [];
    const verticalAngles: number[] = [];
    const horizontalAngles: number[] = [];

    // Parse header keywords
    lines.forEach((line, index) => {
      if (line.startsWith('[MANUFAC]')) {
        manufacturer = line.replace('[MANUFAC]', '').trim();
      } else if (line.startsWith('[LUMCAT]') || line.startsWith('[LUMINAIRE CATALOG NUMBER]')) {
        catalogNumber = line.replace(/\[LUMCAT\]|\[LUMINAIRE CATALOG NUMBER\]/g, '').trim();
      } else if (line.startsWith('[LAMP]')) {
        lampType = line.replace('[LAMP]', '').trim();
      } else if (line.startsWith('[_ABSOLUTE]') || line.startsWith('[LUMENS]')) {
        const match = line.match(/\d+/);
        if (match) lumens = parseInt(match[0]);
      } else if (line.startsWith('[_MOUNTING]')) {
        const value = line.replace('[_MOUNTING]', '').trim().toLowerCase();
        if (value.includes('recessed')) mountingType = 'Recessed';
        else if (value.includes('surface')) mountingType = 'Surface';
        else if (value.includes('pendant')) mountingType = 'Pendant';
        else mountingType = 'Other';
      }
    });

    // Find TILT=NONE line and parse photometric data after it
    const tiltIndex = lines.findIndex(line => line.includes('TILT='));
    if (tiltIndex !== -1) {
      // Parse the photometric data line (usually contains number of lamps, lumens per lamp, etc.)
      const dataStartIndex = tiltIndex + 1;
      if (dataStartIndex < lines.length) {
        const photometricLine = lines[dataStartIndex];
        const values = photometricLine.split(/\s+/).map(Number).filter(n => !isNaN(n));
        
        if (values.length >= 10) {
          // IES format: number_of_lamps lumens_per_lamp multiplier n_vertical n_horizontal photo_type units width length height
          lumens = lumens || (values[0] * values[1] * values[2]);
          
          const nVertical = values[3];
          const nHorizontal = values[4];
          
          // Parse angles and candela values
          let currentIndex = dataStartIndex + 1;
          let dataValues: number[] = [];
          
          while (currentIndex < lines.length) {
            const lineValues = lines[currentIndex].split(/\s+/).map(Number).filter(n => !isNaN(n));
            dataValues = dataValues.concat(lineValues);
            currentIndex++;
          }

          // Extract vertical angles
          for (let i = 0; i < nVertical && i < dataValues.length; i++) {
            verticalAngles.push(dataValues[i]);
          }

          // Extract horizontal angles
          for (let i = nVertical; i < nVertical + nHorizontal && i < dataValues.length; i++) {
            horizontalAngles.push(dataValues[i]);
          }

          // Extract candela values
          for (let i = nVertical + nHorizontal; i < dataValues.length; i++) {
            candelas.push(dataValues[i]);
          }
        }
      }
    }

    // Estimate watts from lumens if not available (assuming ~100 lm/W efficiency)
    watts = watts || Math.round(lumens / 100);

    return {
      manufacturer,
      catalogNumber,
      lampType,
      lumens,
      mountingType,
      watts,
      candelas,
      verticalAngles,
      horizontalAngles
    };
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.ies')) {
      setError('Please upload a valid .ies file');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Read file content
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress((e.loaded / e.total) * 50);
          }
        };
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });

      setUploadProgress(50);
      setIsParsing(true);

      // Parse IES data
      const data = parseIESFile(content);
      setUploadProgress(80);

      // If fittingId provided, save to database
      if (fittingId) {
        const { error: dbError } = await supabase
          .from('lighting_photometric_data')
          .upsert({
            fitting_id: fittingId,
            ies_file_path: file.name,
            candela_data: { candelas: data.candelas, verticalAngles: data.verticalAngles, horizontalAngles: data.horizontalAngles },
            lumens: data.lumens,
            lamp_type: data.lampType,
            mounting_type: data.mountingType
          }, { onConflict: 'fitting_id' });

        if (dbError) throw dbError;
      }

      setUploadProgress(100);
      setParsedData(data);
      onDataParsed?.(data);
      toast.success('IES file parsed successfully');

    } catch (err) {
      console.error('Error parsing IES file:', err);
      setError('Failed to parse IES file');
      toast.error('Failed to parse IES file');
    } finally {
      setIsUploading(false);
      setIsParsing(false);
    }
  }, [fittingId, parseIESFile, onDataParsed]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          IES File Parser
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
          <input
            type="file"
            accept=".ies"
            onChange={handleFileUpload}
            className="hidden"
            id="ies-upload"
            disabled={isUploading}
          />
          <label htmlFor="ies-upload" className="cursor-pointer">
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">Upload IES Photometric File</p>
            <p className="text-xs text-muted-foreground">
              Supports standard IES LM-63 format (.ies)
            </p>
          </label>
        </div>

        {/* Progress */}
        {(isUploading || isParsing) && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{isParsing ? 'Parsing...' : 'Uploading...'}</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Parsed Data Display */}
        {parsedData && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">File parsed successfully</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-muted/30">
                <CardContent className="py-4">
                  <div className="text-sm text-muted-foreground">Manufacturer</div>
                  <div className="font-medium">{parsedData.manufacturer || 'Not specified'}</div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="py-4">
                  <div className="text-sm text-muted-foreground">Catalog Number</div>
                  <div className="font-medium">{parsedData.catalogNumber || 'Not specified'}</div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="py-4">
                  <div className="text-sm text-muted-foreground">Total Lumens</div>
                  <div className="font-medium text-lg">{parsedData.lumens.toLocaleString()} lm</div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="py-4">
                  <div className="text-sm text-muted-foreground">Mounting Type</div>
                  <div className="font-medium">{parsedData.mountingType || 'Not specified'}</div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="py-4">
                  <div className="text-sm text-muted-foreground">Lamp Type</div>
                  <div className="font-medium">{parsedData.lampType || 'Not specified'}</div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="py-4">
                  <div className="text-sm text-muted-foreground">Estimated Watts</div>
                  <div className="font-medium">{parsedData.watts}W</div>
                </CardContent>
              </Card>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Photometric Data</div>
                  <div className="text-sm">
                    {parsedData.verticalAngles.length} vertical angles × {parsedData.horizontalAngles.length} horizontal angles
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {parsedData.candelas.length} candela values extracted
                  </div>
                </div>
                <Badge variant="secondary">
                  <Lightbulb className="h-3 w-3 mr-1" />
                  {(parsedData.lumens / parsedData.watts).toFixed(0)} lm/W
                </Badge>
              </div>
            </div>

            {fittingId && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowRight className="h-4 w-4" />
                Data linked to fitting and saved to database
              </div>
            )}
          </div>
        )}

        {/* Help text */}
        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">What is an IES file?</p>
          <p>
            IES (Illuminating Engineering Society) files contain photometric data that describes 
            how light is distributed from a luminaire. This data is used for accurate lighting 
            calculations and simulations.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default IESFileParser;
