import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  ZoomIn, 
  ZoomOut, 
  Download, 
  RotateCw,
  Loader2,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { SpecSheet } from './types';
import { toast } from 'sonner';

interface SpecSheetViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  specSheet: SpecSheet;
}

export const SpecSheetViewer: React.FC<SpecSheetViewerProps> = ({
  open,
  onOpenChange,
  specSheet,
}) => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (open && specSheet) {
      loadFile();
    }
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [open, specSheet]);

  const loadFile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('lighting-spec-sheets')
        .createSignedUrl(specSheet.file_path, 3600);

      if (error) throw error;
      setFileUrl(data.signedUrl);
    } catch (error) {
      console.error('Error loading file:', error);
      toast.error('Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('lighting-spec-sheets')
        .download(specSheet.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = specSheet.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const isImage = specSheet.file_type.startsWith('image/');
  const isPdf = specSheet.file_type === 'application/pdf';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isImage ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            {specSheet.file_name}
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b pb-3">
          {isImage && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
                disabled={zoom <= 0.25}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground w-16 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                disabled={zoom >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setRotation(r => (r + 90) % 360)}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </>
          )}
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-muted/30 rounded-lg flex items-center justify-center">
          {loading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : fileUrl ? (
            isImage ? (
              <div className="overflow-auto w-full h-full flex items-center justify-center p-4">
                <img
                  src={fileUrl}
                  alt={specSheet.file_name}
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease',
                    maxWidth: zoom <= 1 ? '100%' : 'none',
                    maxHeight: zoom <= 1 ? '100%' : 'none',
                  }}
                  className="object-contain"
                />
              </div>
            ) : isPdf ? (
              <iframe
                src={fileUrl}
                className="w-full h-full rounded-lg"
                title={specSheet.file_name}
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Preview not available for this file type</p>
                <Button variant="link" onClick={handleDownload}>
                  Download to view
                </Button>
              </div>
            )
          ) : (
            <div className="text-center text-muted-foreground">
              <p>Failed to load file</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
