import { useState, useRef, useEffect } from "react";
import { Canvas as FabricCanvas } from "fabric";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Toolbar } from "./Toolbar";
import { EquipmentPanel } from "./EquipmentPanel";
import { LoadDesignDialog } from "./LoadDesignDialog";
import { ScaleDialog } from "./ScaleDialog";
import { SaveDesignDialog } from "./SaveDesignDialog";
import { uploadPdfFile, getPdfUrl } from "@/lib/floor-plan/supabase-storage";
import * as PDFJS from "pdfjs-dist";

// Configure PDF.js worker
PDFJS.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS.version}/pdf.worker.min.js`;

interface FloorPlanAppProps {
  userId: string;
}

export type ToolMode = "select" | "equipment" | "cable" | "zone";

export function FloorPlanApp({ userId }: FloorPlanAppProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [tool, setTool] = useState<ToolMode>("select");
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<string | null>(null);
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [scale, setScale] = useState<number | null>(null);
  const [currentDesignId, setCurrentDesignId] = useState<string | null>(null);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: window.innerWidth - 400,
      height: window.innerHeight - 100,
      backgroundColor: "#f5f5f5",
    });

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, []);

  // Load PDF background
  useEffect(() => {
    if (!fabricCanvas || !pdfUrl) return;

    loadPdfToCanvas(pdfUrl);
  }, [fabricCanvas, pdfUrl]);

  const loadPdfToCanvas = async (url: string) => {
    try {
      const loadingTask = PDFJS.getDocument(url);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      const imageData = canvas.toDataURL();
      
      if (fabricCanvas) {
        fabricCanvas.setBackgroundImage(
          imageData,
          () => {
            fabricCanvas.renderAll();
            toast.success("PDF loaded successfully");
          },
          {
            scaleX: fabricCanvas.width! / canvas.width,
            scaleY: fabricCanvas.height! / canvas.height,
          }
        );
      }
    } catch (error) {
      console.error("Error loading PDF:", error);
      toast.error("Failed to load PDF");
    }
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    try {
      toast.loading("Uploading PDF...");
      const { url } = await uploadPdfFile(userId, file);
      setPdfFile(file);
      setPdfUrl(url);
      toast.dismiss();
      toast.success("PDF uploaded successfully");
      setScaleDialogOpen(true);
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to upload PDF");
      console.error(error);
    }
  };

  const handleSetScale = (scaleValue: number) => {
    setScale(scaleValue);
    setScaleDialogOpen(false);
    toast.success(`Scale set: 1:${scaleValue}`);
  };

  return (
    <div className="flex h-screen">
      {/* Left Sidebar - Equipment Panel */}
      <div className="w-64 border-r bg-card">
        <EquipmentPanel
          onSelectEquipment={(type) => {
            setTool("equipment");
            setSelectedEquipmentType(type);
          }}
          selectedType={selectedEquipmentType}
        />
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="border-b bg-card p-2">
          <Toolbar
            tool={tool}
            onToolChange={setTool}
            onUploadPdf={handlePdfUpload}
            onSave={() => setSaveDialogOpen(true)}
            onLoad={() => setLoadDialogOpen(true)}
            onSetScale={() => setScaleDialogOpen(true)}
            hasScale={scale !== null}
            hasPdf={pdfUrl !== null}
          />
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-hidden p-4">
          {!pdfUrl ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Upload a PDF floor plan to get started
                </p>
                <Button asChild>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handlePdfUpload}
                      className="hidden"
                    />
                    Upload PDF
                  </label>
                </Button>
              </div>
            </div>
          ) : (
            <canvas ref={canvasRef} className="border shadow-lg" />
          )}
        </div>
      </div>

      {/* Dialogs */}
      <ScaleDialog
        open={scaleDialogOpen}
        onOpenChange={setScaleDialogOpen}
        onSetScale={handleSetScale}
      />
      <SaveDesignDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        userId={userId}
        canvas={fabricCanvas}
        pdfUrl={pdfUrl}
        scale={scale}
        onSaved={(id) => {
          setCurrentDesignId(id);
          toast.success("Design saved successfully");
        }}
      />
      <LoadDesignDialog
        open={loadDialogOpen}
        onOpenChange={setLoadDialogOpen}
        userId={userId}
        onLoad={(design) => {
          setCurrentDesignId(design.id);
          setPdfUrl(design.pdf_url);
          setScale(design.scale_meters_per_pixel || null);
          toast.success("Design loaded successfully");
        }}
      />
    </div>
  );
}
