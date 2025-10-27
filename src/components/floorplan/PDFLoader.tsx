import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PDFLoaderProps {
  onPDFLoaded: (imageUrl: string, uploadedPdfUrl?: string) => void;
}

export const PDFLoader = ({ onPDFLoaded }: PDFLoaderProps) => {
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    setLoading(true);
    let uploadedPdfUrl: string | undefined;
    
    try {
      // Upload PDF to Supabase Storage
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("floor-plans")
        .upload(fileName, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error("Failed to upload PDF to storage");
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from("floor-plans")
          .getPublicUrl(fileName);
        uploadedPdfUrl = publicUrl;
      }

      // Convert PDF to image
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, verbosity: 0 });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2 });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      
      if (!context) {
        throw new Error("Could not get canvas context");
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      } as any).promise;

      const imageUrl = canvas.toDataURL("image/png");
      onPDFLoaded(imageUrl, uploadedPdfUrl);
      toast.success("PDF loaded successfully");
    } catch (error) {
      console.error("Error loading PDF:", error);
      toast.error("Failed to load PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <input
        id="pdf-upload"
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button variant="outline" disabled={loading} asChild>
        <label htmlFor="pdf-upload" className="cursor-pointer">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Load PDF
            </>
          )}
        </label>
      </Button>
    </>
  );
};
