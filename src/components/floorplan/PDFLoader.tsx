import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";

// Set worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PDFLoaderProps {
  onPDFLoaded: (imageUrl: string) => void;
}

export const PDFLoader = ({ onPDFLoaded }: PDFLoaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File input change event triggered");
    const file = event.target.files?.[0];
    
    if (!file) {
      console.log("No file selected");
      return;
    }

    console.log("File selected:", file.name, file.type, file.size);

    if (file.type !== "application/pdf") {
      console.error("Invalid file type:", file.type);
      toast.error("Please select a PDF file");
      return;
    }

    try {
      toast.info("Loading PDF...");
      console.log("Starting PDF processing...");

      const arrayBuffer = await file.arrayBuffer();
      console.log("ArrayBuffer created, size:", arrayBuffer.byteLength);

      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      console.log("PDF loaded, pages:", pdf.numPages);

      const page = await pdf.getPage(1);
      console.log("First page loaded");

      const viewport = page.getViewport({ scale: 2 });
      console.log("Viewport created:", viewport.width, "x", viewport.height);

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      
      if (!context) {
        throw new Error("Could not get canvas context");
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext as any).promise;
      console.log("Page rendered to canvas");

      const imageUrl = canvas.toDataURL("image/png");
      console.log("Image URL created, length:", imageUrl.length);

      onPDFLoaded(imageUrl);
      toast.success("PDF loaded successfully");
    } catch (error) {
      console.error("Error loading PDF:", error);
      toast.error(`Failed to load PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleButtonClick = () => {
    console.log("Load PDF button clicked");
    console.log("File input ref:", fileInputRef.current);
    
    if (!fileInputRef.current) {
      console.error("File input ref is null!");
      toast.error("File input not initialized");
      return;
    }

    try {
      fileInputRef.current.click();
      console.log("File input click triggered");
    } catch (error) {
      console.error("Error triggering file input:", error);
      toast.error("Could not open file dialog");
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleFileSelect}
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
        aria-hidden="true"
      />
      <Button onClick={handleButtonClick}>
        <Upload className="h-4 w-4 mr-2" />
        Load PDF
      </Button>
    </div>
  );
};
