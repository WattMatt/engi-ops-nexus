import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Canvas as FabricCanvas, Image as FabricImage, Point } from "fabric";
import { PDFLoader } from "@/components/floorplan/PDFLoader";
import { Toolbar } from "@/components/floorplan/Toolbar";
import { ProjectOverview } from "@/components/floorplan/ProjectOverview";
import { DesignPurposeDialog } from "@/components/floorplan/DesignPurposeDialog";
import { ScaleDialog } from "@/components/floorplan/ScaleDialog";
import { DesignPurpose, Tool, ProjectData, ScaleCalibration } from "@/components/floorplan/types";

const FloorPlan = () => {
  const [projectId] = useState(localStorage.getItem("selectedProjectId"));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [pdfImageUrl, setPdfImageUrl] = useState<string | null>(null);
  const [designPurpose, setDesignPurpose] = useState<DesignPurpose | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [rotation, setRotation] = useState(0);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [scaleCalibration, setScaleCalibration] = useState<ScaleCalibration>({
    metersPerPixel: 0,
    isSet: false,
  });
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false);
  const [scaleLinePixels, setScaleLinePixels] = useState(0);
  const [projectData, setProjectData] = useState<ProjectData>({
    equipment: [],
    cables: [],
    zones: [],
    containment: [],
    pvArrays: [],
  });

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) {
      console.log("Canvas ref not ready yet");
      return;
    }
    
    if (fabricCanvas) {
      console.log("Canvas already initialized");
      return;
    }

    console.log("Initializing Fabric canvas...");
    try {
      const canvas = new FabricCanvas(canvasRef.current, {
        width: 1200,
        height: 800,
        backgroundColor: "#f5f5f5",
      });

      // Enable zoom with mouse wheel
      canvas.on("mouse:wheel", (opt) => {
        const delta = opt.e.deltaY;
        let zoom = canvas.getZoom();
        zoom *= 0.999 ** delta;
        
        // Limit zoom level
        if (zoom > 20) zoom = 20;
        if (zoom < 0.1) zoom = 0.1;
        
        const point = new Point(opt.e.offsetX, opt.e.offsetY);
        canvas.zoomToPoint(point, zoom);
        opt.e.preventDefault();
        opt.e.stopPropagation();
      });

      // Enable panning with mouse drag (Alt/Option key + drag)
      let isPanning = false;
      let lastPosX = 0;
      let lastPosY = 0;

      canvas.on("mouse:down", (opt) => {
        const evt = opt.e as MouseEvent;
        if (evt.altKey === true) {
          isPanning = true;
          canvas.selection = false;
          lastPosX = evt.clientX;
          lastPosY = evt.clientY;
          canvas.defaultCursor = "grab";
        }
      });

      canvas.on("mouse:move", (opt) => {
        if (isPanning) {
          const evt = opt.e as MouseEvent;
          const vpt = canvas.viewportTransform;
          if (vpt) {
            vpt[4] += evt.clientX - lastPosX;
            vpt[5] += evt.clientY - lastPosY;
            canvas.requestRenderAll();
          }
          lastPosX = evt.clientX;
          lastPosY = evt.clientY;
        }
      });

      canvas.on("mouse:up", () => {
        canvas.setViewportTransform(canvas.viewportTransform);
        isPanning = false;
        canvas.selection = true;
        canvas.defaultCursor = "default";
      });

      console.log("Fabric canvas created successfully");
      setFabricCanvas(canvas);
    } catch (error) {
      console.error("Error creating Fabric canvas:", error);
      toast.error("Failed to initialize canvas");
    }

    return () => {
      if (fabricCanvas) {
        console.log("Disposing canvas");
        fabricCanvas.dispose();
      }
    };
  }, [fabricCanvas]);

  // Load PDF image onto canvas
  const handlePDFLoaded = async (imageUrl: string) => {
    console.log("=== handlePDFLoaded called ===");
    console.log("fabricCanvas exists:", !!fabricCanvas);
    console.log("imageUrl length:", imageUrl?.length);
    
    if (!fabricCanvas) {
      console.error("Canvas not initialized yet!");
      toast.error("Canvas not ready. Please refresh the page and try again.");
      return;
    }

    try {
      setPdfImageUrl(imageUrl);
      console.log("Loading image into Fabric canvas...");

      const img = await FabricImage.fromURL(imageUrl, {
        crossOrigin: "anonymous",
      });

      console.log("Image loaded, dimensions:", img.width, "x", img.height);

      if (!fabricCanvas) {
        console.error("Canvas disappeared during image load!");
        return;
      }

      // Scale image to fit canvas
      const scale = Math.min(
        (fabricCanvas.width! - 40) / img.width!,
        (fabricCanvas.height! - 40) / img.height!
      );

      console.log("Calculated scale:", scale);

      img.set({
        scaleX: scale,
        scaleY: scale,
        left: 20,
        top: 20,
        selectable: false,
        evented: false,
      });

      // Clear existing objects and add the image
      fabricCanvas.remove(...fabricCanvas.getObjects());
      fabricCanvas.add(img);
      fabricCanvas.sendObjectToBack(img);
      fabricCanvas.renderAll();

      console.log("Image added to canvas successfully");
      toast.success("Floor plan loaded!");
    } catch (error) {
      console.error("Error adding image to canvas:", error);
      toast.error("Failed to display PDF on canvas");
    }
  };

  const handleToolSelect = (tool: Tool) => {
    if (tool === "rotate") {
      setRotation((prev) => (prev + 45) % 360);
      return;
    }
    setActiveTool(tool);
  };

  const handleToggleSnap = () => {
    setSnapEnabled((prev) => !prev);
  };

  const handleDesignPurposeSelect = (purpose: DesignPurpose) => {
    setDesignPurpose(purpose);
    toast.success(`Design purpose set to: ${purpose.replace(/_/g, " ")}`);
  };

  const handleScaleSet = (metersValue: number) => {
    const metersPerPixel = metersValue / scaleLinePixels;
    setScaleCalibration({
      metersPerPixel,
      isSet: true,
    });
    setScaleDialogOpen(false);
    toast.success(`Scale calibrated: ${metersPerPixel.toFixed(4)} meters per pixel`);
    setActiveTool("select");
  };

  const handleSave = async () => {
    if (!projectId) {
      toast.error("No project selected");
      return;
    }

    toast.success("Saved to project");
  };

  const handleExportPDF = () => {
    toast.info("PDF export functionality coming soon");
  };

  const handleGenerateBoQ = () => {
    toast.info("AI Bill of Quantities generation coming soon");
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") {
        setRotation((prev) => (prev + 45) % 360);
      } else if (e.key === "Escape") {
        setActiveTool("select");
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  if (!projectId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Please select a project first</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Floor Plan Markup Tool</h1>
          <p className="text-muted-foreground">
            {designPurpose
              ? `Design Purpose: ${designPurpose.replace(/_/g, " ").toUpperCase()}`
              : "Upload a floor plan to begin"}
          </p>
        </div>
        <div className="flex gap-2">
          <PDFLoader onPDFLoaded={handlePDFLoaded} />
          <Button variant="outline" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={handleGenerateBoQ}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate BoQ (AI)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Toolbar */}
        <div className="col-span-2">
          {designPurpose && (
            <Toolbar
              activeTool={activeTool}
              onToolSelect={handleToolSelect}
              designPurpose={designPurpose}
              rotation={rotation}
              snapEnabled={snapEnabled}
              onToggleSnap={handleToggleSnap}
            />
          )}
        </div>

        {/* Main Canvas Area */}
        <div className="col-span-7">
          <Card>
            <CardHeader>
              <CardTitle>Canvas</CardTitle>
              {scaleCalibration.isSet && (
                <p className="text-xs text-muted-foreground">
                  Scale: {scaleCalibration.metersPerPixel.toFixed(4)} m/px
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden bg-muted">
                <canvas ref={canvasRef} />
              </div>
              {!pdfImageUrl && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-muted-foreground">Click "Load PDF" to begin</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Project Overview Panel */}
        <div className="col-span-3">
          <ProjectOverview projectData={projectData} />
        </div>
      </div>

      {/* Getting Started Card */}
      {!pdfImageUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">1. Load PDF Floor Plan</h4>
              <p className="text-sm text-muted-foreground">
                Click "Load PDF" to upload your architectural floor plan
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">2. Select Design Purpose</h4>
              <p className="text-sm text-muted-foreground">
                Choose from Budget Markup, PV Design, or Line Shop Measurements
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">3. Set Scale</h4>
              <p className="text-sm text-muted-foreground">
                Calibrate measurements by marking a known distance
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">4. Add Equipment & Routes</h4>
              <p className="text-sm text-muted-foreground">
                Use the toolbar to place equipment, draw cables, and define zones
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Design Purpose Dialog */}
      <DesignPurposeDialog
        open={pdfImageUrl !== null && designPurpose === null}
        onSelect={handleDesignPurposeSelect}
      />

      {/* Scale Calibration Dialog */}
      <ScaleDialog
        open={scaleDialogOpen}
        pixelLength={scaleLinePixels}
        onConfirm={handleScaleSet}
        onCancel={() => {
          setScaleDialogOpen(false);
          setActiveTool("select");
        }}
      />
    </div>
  );
};

export default FloorPlan;
