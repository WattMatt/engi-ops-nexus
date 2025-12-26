import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DetectedCircuit {
  ref: string;
  type: string;
  description?: string;
}

interface DetectedDB {
  name: string;
  location?: string;
  circuits: DetectedCircuit[];
}

interface ScanResult {
  distribution_boards: DetectedDB[];
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
}

export function useAICircuitScan() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const scanLayout = async (imageBase64: string, mimeType: string = 'image/png'): Promise<ScanResult | null> => {
    setIsScanning(true);
    setScanResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('scan-circuit-layout', {
        body: { imageBase64, mimeType }
      });

      if (error) {
        // Handle specific error codes
        if (error.message?.includes('429')) {
          toast.error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (error.message?.includes('402')) {
          toast.error('AI credits depleted. Please add credits to your workspace.');
        } else {
          toast.error(error.message || 'Failed to scan layout');
        }
        return null;
      }

      if (data.error) {
        toast.error(data.error);
        return null;
      }

      setScanResult(data);
      
      const dbCount = data.distribution_boards?.length || 0;
      const circuitCount = data.distribution_boards?.reduce(
        (sum: number, db: DetectedDB) => sum + (db.circuits?.length || 0), 
        0
      ) || 0;

      if (dbCount > 0) {
        toast.success(`Found ${dbCount} distribution board(s) with ${circuitCount} circuit(s)`);
      } else {
        toast.info('No circuit references detected. Try a clearer image or add manually.');
      }

      return data;
    } catch (err) {
      console.error('AI scan error:', err);
      toast.error('Failed to analyze layout');
      return null;
    } finally {
      setIsScanning(false);
    }
  };

  const captureCanvasAsImage = async (canvasElement: HTMLCanvasElement): Promise<string | null> => {
    try {
      const dataUrl = canvasElement.toDataURL('image/png');
      // Remove the data URL prefix to get just the base64
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      return base64;
    } catch (err) {
      console.error('Failed to capture canvas:', err);
      return null;
    }
  };

  return {
    isScanning,
    scanResult,
    scanLayout,
    captureCanvasAsImage,
  };
}
