import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Save, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Canvas as FabricCanvas, Image as FabricImage, Point } from "fabric";
import { supabase } from "@/integrations/supabase/client";
import { PDFLoader } from "@/components/floorplan/PDFLoader";
import { Toolbar } from "@/components/floorplan/Toolbar";
import { ProjectOverview } from "@/components/floorplan/ProjectOverview";
import { DesignPurposeDialog } from "@/components/floorplan/DesignPurposeDialog";
import { ScaleDialog } from "@/components/floorplan/ScaleDialog";
import { DesignPurpose, Tool, ProjectData, ScaleCalibration } from "@/components/floorplan/types";

const FloorPlan = () => {
  const [projectId] = useState(localStorage.getItem("selectedProjectId"));
  const [floorPlanId, setFloorPlanId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
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
    if (!canvasRef.current || fabricCanvas) return;

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
      
      if (zoom > 20) zoom = 20;
      if (zoom < 0.1) zoom = 0.1;
      
      const point = new Point(opt.e.offsetX, opt.e.offsetY);
      canvas.zoomToPoint(point, zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // Enable panning
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

    setFabricCanvas(canvas);

    return () => {
      if (fabricCanvas) {
        fabricCanvas.dispose();
      }
    };
  }, [fabricCanvas]);

  const handlePDFLoaded = async (imageUrl: string, uploadedPdfUrl?: string) => {
    if (!fabricCanvas || !projectId) {
      toast.error("Canvas not ready. Please refresh the page and try again.");
      return;
    }

    try {
      setPdfImageUrl(imageUrl);
      const img = await FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" });

      const scale = Math.min(
        (fabricCanvas.width! - 40) / img.width!,
        (fabricCanvas.height! - 40) / img.height!
      );

      img.set({
        scaleX: scale,
        scaleY: scale,
        left: 20,
        top: 20,
        selectable: false,
        evented: false,
      });

      fabricCanvas.remove(...fabricCanvas.getObjects());
      fabricCanvas.add(img);
      fabricCanvas.sendObjectToBack(img);
      fabricCanvas.renderAll();

      // Create or get floor plan record
      if (uploadedPdfUrl) {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) {
          toast.error("User not authenticated");
          return;
        }

        const { data: floorPlan, error: createError } = await supabase
          .from("floor_plans")
          .insert({
            project_id: projectId,
            name: `Floor Plan ${new Date().toLocaleDateString()}`,
            pdf_url: uploadedPdfUrl,
            design_purpose: "budget_markup",
            created_by: user.user.id,
          })
          .select()
          .single();

        if (createError) {
          console.error("Error creating floor plan:", createError);
          toast.error("Failed to create floor plan record");
        } else {
          setFloorPlanId(floorPlan.id);
          toast.success("Floor plan loaded!");
        }
      }
    } catch (error) {
      toast.error("Failed to display PDF on canvas");
    }
  };

  const loadExistingMarkups = async (fpId: string) => {
    setLoading(true);
    try {
      // Load equipment
      const { data: equipment } = await supabase
        .from("equipment_placements")
        .select("*")
        .eq("floor_plan_id", fpId);

      // Load cables (excluding containment routes stored as 'tray')
      const { data: cables } = await supabase
        .from("cable_routes")
        .select("*")
        .eq("floor_plan_id", fpId)
        .neq("route_type", "tray");

      // Load zones (may not exist yet in types)
      let zonesQuery: any[] = [];
      try {
        const { data } = await supabase
          .from("zones" as any)
          .select("*")
          .eq("floor_plan_id", fpId);
        zonesQuery = data || [];
      } catch (e) {
        console.log("Zones table not ready yet");
      }

      // Load PV arrays (may not exist yet in types)
      let pvQuery: any[] = [];
      try {
        const { data } = await supabase
          .from("pv_arrays" as any)
          .select("*")
          .eq("floor_plan_id", fpId);
        pvQuery = data || [];
      } catch (e) {
        console.log("PV arrays table not ready yet");
      }

      // Load containment from cable_routes with type 'tray'
      const { data: containmentQuery } = await supabase
        .from("cable_routes")
        .select("*")
        .eq("floor_plan_id", fpId)
        .eq("route_type", "tray");

      // Update project data
      setProjectData({
        equipment: equipment?.map((item: any) => ({
          id: item.id,
          type: item.equipment_type as any,
          x: Number(item.x_position),
          y: Number(item.y_position),
          rotation: item.rotation || 0,
          properties: item.properties as any,
        })) || [],
        cables: cables?.map((cable: any) => ({
          id: cable.id,
          type: cable.route_type === "lv_ac" ? "lv" : cable.route_type,
          points: cable.points as any,
          cableType: cable.cable_spec as any,
          supplyFrom: cable.supply_from,
          supplyTo: cable.supply_to,
          color: cable.color,
          lengthMeters: Number(cable.length_meters),
        })) || [],
        zones: zonesQuery?.map((zone: any) => ({
          id: zone.id,
          type: zone.zone_type as any,
          name: zone.name,
          points: zone.points as any,
          color: zone.color,
          areaSqm: Number(zone.area_sqm),
          roofPitch: Number(zone.roof_pitch),
          roofAzimuth: Number(zone.roof_azimuth),
        })) || [],
        containment: containmentQuery?.map((route: any) => ({
          id: route.id,
          type: route.name || "cable-tray",
          points: route.points as any,
          size: route.size as any,
          lengthMeters: Number(route.length_meters),
        })) || [],
        pvArrays: pvQuery?.map((array: any) => ({
          id: array.id,
          x: Number(array.x_position),
          y: Number(array.y_position),
          rows: array.rows,
          columns: array.columns,
          rotation: array.rotation || 0,
          orientation: array.orientation as any,
        })) || [],
      });

      toast.success("Loaded existing markups");
    } catch (error: any) {
      console.error("Load error:", error);
      toast.error("Failed to load existing markups");
    } finally {
      setLoading(false);
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
    setScaleCalibration({ metersPerPixel, isSet: true });
    setScaleDialogOpen(false);
    toast.success(`Scale calibrated: ${metersPerPixel.toFixed(4)} meters per pixel`);
    setActiveTool("select");
  };

  const handleSave = async () => {
    if (!projectId || !floorPlanId) {
      toast.error("No project or floor plan selected");
      return;
    }

    setSaving(true);
    try {
      // Save equipment placements
      const { error: equipmentError } = await supabase
        .from("equipment_placements")
        .delete()
        .eq("floor_plan_id", floorPlanId);

      if (equipmentError) throw equipmentError;

      if (projectData.equipment.length > 0) {
        const { error: insertEquipmentError } = await supabase
          .from("equipment_placements")
          .insert(
            projectData.equipment.map((item) => ({
              floor_plan_id: floorPlanId,
              equipment_type: item.type,
              x_position: item.x,
              y_position: item.y,
              rotation: item.rotation,
              properties: item.properties || {},
              name: item.properties?.name,
            }))
          );

        if (insertEquipmentError) throw insertEquipmentError;
      }

      // Save cable routes
      const { error: cablesError } = await supabase
        .from("cable_routes")
        .delete()
        .eq("floor_plan_id", floorPlanId);

      if (cablesError) throw cablesError;

      if (projectData.cables.length > 0) {
        const { error: insertCablesError } = await supabase
          .from("cable_routes")
          .insert(
            projectData.cables.map((cable) => ({
              floor_plan_id: floorPlanId,
              route_type: (cable.type === "lv" ? "lv_ac" : cable.type) as "dc" | "lv_ac" | "mv",
              points: cable.points as any,
              cable_spec: cable.cableType,
              supply_from: cable.supplyFrom,
              supply_to: cable.supplyTo,
              color: cable.color,
              length_meters: cable.lengthMeters,
            }))
          );

        if (insertCablesError) throw insertCablesError;
      }

      // Save zones
      const { error: zonesError } = await supabase
        .from("zones")
        .delete()
        .eq("floor_plan_id", floorPlanId);

      if (zonesError) throw zonesError;

      if (projectData.zones.length > 0) {
        const { error: insertZonesError } = await supabase
          .from("zones")
          .insert(
            projectData.zones.map((zone) => ({
              floor_plan_id: floorPlanId,
              zone_type: zone.type,
              name: zone.name,
              points: zone.points,
              color: zone.color,
              area_sqm: zone.areaSqm,
              roof_pitch: zone.roofPitch,
              roof_azimuth: zone.roofAzimuth,
            }))
          );

        if (insertZonesError) throw insertZonesError;
      }

      // Save containment routes
      if (projectData.containment.length > 0) {
        // Save as cable_routes with tray type since containment_routes table may not be in types yet
        for (const route of projectData.containment) {
          await supabase.from("cable_routes").insert({
            floor_plan_id: floorPlanId,
            route_type: "tray" as const,
            points: route.points as any,
            size: route.size,
            length_meters: route.lengthMeters,
            name: route.type,
          });
        }
      }

      // Save PV arrays
      const { error: pvError } = await supabase
        .from("pv_arrays")
        .delete()
        .eq("floor_plan_id", floorPlanId);

      if (pvError) throw pvError;

      if (projectData.pvArrays.length > 0) {
        const { error: insertPvError } = await supabase
          .from("pv_arrays")
          .insert(
            projectData.pvArrays.map((array) => ({
              floor_plan_id: floorPlanId,
              x_position: array.x,
              y_position: array.y,
              rows: array.rows,
              columns: array.columns,
              rotation: array.rotation,
              orientation: array.orientation,
              total_panels: array.rows * array.columns,
            }))
          );

        if (insertPvError) throw insertPvError;
      }

      // Update floor plan scale
      const { error: updateError } = await supabase
        .from("floor_plans")
        .update({
          scale_meters_per_pixel: scaleCalibration.metersPerPixel,
        })
        .eq("id", floorPlanId);

      if (updateError) throw updateError;

      toast.success("All markups saved successfully!");
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error.message || "Failed to save markups");
    } finally {
      setSaving(false);
    }
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
          <Button variant="outline" onClick={handleSave} disabled={saving || !floorPlanId}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
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

        <div className="col-span-3">
          <ProjectOverview projectData={projectData} />
        </div>
      </div>

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

      <DesignPurposeDialog
        open={pdfImageUrl !== null && designPurpose === null}
        onSelect={handleDesignPurposeSelect}
      />

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
