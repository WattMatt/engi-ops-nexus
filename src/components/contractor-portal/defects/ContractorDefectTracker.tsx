import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Plus, FileWarning, Move, Zap, List, Map, Filter, Camera } from "lucide-react";
import { useDefectPins, useUpdateDefectPin, useCreateDefectPinOptimistic, DefectPin } from "@/hooks/useDefectPins";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { DefectDrawingViewer } from "./DefectDrawingViewer";
import { DefectSidebar } from "./DefectSidebar";
import { DefectPinDialog } from "./DefectPinDialog";
import { DefectListFilter } from "./DefectListFilter";
import { StatusTrackingFAB, FABAction } from "./StatusTrackingFAB";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

interface Props {
  projectId: string;
  contractorName: string;
  contractorEmail?: string;
}

type MobileView = "drawing" | "list" | "filters";

export function ContractorDefectTracker({ projectId, contractorName, contractorEmail }: Props) {
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [rapidMode, setRapidMode] = useState(false);
  const [relocateMode, setRelocateMode] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<DefectPin | null>(null);
  const [clickCoords, setClickCoords] = useState<{ x: number; y: number } | null>(null);
  const [filterListId, setFilterListId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterPackage, setFilterPackage] = useState<string | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null);

  // Mobile-specific state
  const [mobileView, setMobileView] = useState<MobileView>("drawing");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const updatePin = useUpdateDefectPin();
  const createPinOptimistic = useCreateDefectPinOptimistic();

  const { data: drawings, isLoading: drawingsLoading } = useQuery({
    queryKey: ["project-drawings-defects", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_drawings")
        .select("id, drawing_title, drawing_number, file_url, category")
        .eq("project_id", projectId)
        .order("drawing_number", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: allPins } = useDefectPins(projectId, selectedDrawingId || undefined);

  const filteredPins = useMemo(() => {
    if (!allPins) return [];
    return allPins.filter((pin) => {
      if (filterListId && pin.list_id !== filterListId) return false;
      if (filterStatus && pin.status !== filterStatus) return false;
      if (filterPackage && pin.package !== filterPackage) return false;
      if (filterAssignee) {
        if (filterAssignee === "__mine") {
          if (!pin.assignee_names?.includes(contractorName)) return false;
        } else {
          if (!pin.assignee_names?.includes(filterAssignee)) return false;
        }
      }
      return true;
    });
  }, [allPins, filterListId, filterStatus, filterPackage, filterAssignee, contractorName]);

  const selectedDrawing = drawings?.find((d) => d.id === selectedDrawingId);

  const handleAddPin = useCallback((coords: { x: number; y: number }) => {
    if (rapidMode && selectedDrawingId) {
      const pinCount = allPins?.length || 0;
      createPinOptimistic.mutate({
        project_id: projectId,
        drawing_id: selectedDrawingId,
        x_percent: coords.x,
        y_percent: coords.y,
        title: `Snag ${pinCount + 1}`,
        priority: "medium",
        created_by_name: contractorName,
        created_by_email: contractorEmail,
      });
      return;
    }
    setClickCoords(coords);
    setSelectedPin(null);
    setDialogOpen(true);
    setAddMode(false);
  }, [rapidMode, selectedDrawingId, allPins, projectId, contractorName, contractorEmail, createPinOptimistic]);

  const handlePinClick = (pin: DefectPin) => {
    setSelectedPin(pin);
    setClickCoords(null);
    setDialogOpen(true);
  };

  const handlePinRelocate = (pin: DefectPin, coords: { x: number; y: number }) => {
    updatePin.mutate({
      id: pin.id,
      project_id: projectId,
      updates: { x_percent: coords.x, y_percent: coords.y },
      user_name: contractorName,
      user_email: contractorEmail,
    });
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedPin(null);
    setClickCoords(null);
  };

  const toggleAddMode = () => {
    setAddMode(!addMode);
    setRapidMode(false);
    if (!addMode) setRelocateMode(false);
    // Switch to drawing view on mobile when entering add mode
    if (!addMode && !isDesktop) setMobileView("drawing");
  };

  const toggleRapidMode = () => {
    const next = !rapidMode;
    setRapidMode(next);
    setAddMode(next);
    if (next) setRelocateMode(false);
    if (next && !isDesktop) setMobileView("drawing");
  };

  const toggleRelocateMode = () => {
    setRelocateMode(!relocateMode);
    if (!relocateMode) { setAddMode(false); setRapidMode(false); }
    if (!relocateMode && !isDesktop) setMobileView("drawing");
  };

  const statusCounts = useMemo(() => {
    if (!allPins) return { open: 0, in_progress: 0, resolved: 0, closed: 0 };
    return allPins.reduce(
      (acc, p) => ({ ...acc, [p.status]: (acc[p.status as keyof typeof acc] || 0) + 1 }),
      { open: 0, in_progress: 0, resolved: 0, closed: 0 }
    );
  }, [allPins]);

  // Active filter count for badge
  const activeFilterCount = [filterListId, filterStatus, filterPackage, filterAssignee].filter(Boolean).length;

  // FAB actions for mobile
  const fabActions: FABAction[] = useMemo(() => {
    if (!selectedDrawingId) return [];
    return [
      {
        icon: <Plus className="h-5 w-5" />,
        label: "Add Pin",
        onClick: toggleAddMode,
        active: addMode && !rapidMode,
      },
      {
        icon: <Zap className="h-5 w-5" />,
        label: "Rapid Mode",
        onClick: toggleRapidMode,
        active: rapidMode,
      },
      {
        icon: <Move className="h-5 w-5" />,
        label: "Relocate",
        onClick: toggleRelocateMode,
        active: relocateMode,
      },
    ];
  }, [selectedDrawingId, addMode, rapidMode, relocateMode]);

  // ── Loading / Empty states ───────────────────────────────────────

  if (drawingsLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-[400px] w-full" /></CardContent>
      </Card>
    );
  }

  if (!drawings || drawings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileWarning className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No drawings available for status tracking.</p>
          <p className="text-sm text-muted-foreground mt-1">Drawings must be uploaded to the project first.</p>
        </CardContent>
      </Card>
    );
  }

  // ── Desktop layout ───────────────────────────────────────────────

  if (isDesktop) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Status Tracking
                </CardTitle>
                <CardDescription>
                  Drop pins on drawings to log observations, snag items, and track status
                </CardDescription>
              </div>
              {selectedDrawingId && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex gap-1.5 text-xs">
                    <Badge variant="outline" className="gap-1"><span className="w-2 h-2 rounded-full bg-destructive" />{statusCounts.open}</Badge>
                    <Badge variant="outline" className="gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" />{statusCounts.in_progress}</Badge>
                    <Badge variant="outline" className="gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />{statusCounts.resolved}</Badge>
                    <Badge variant="outline" className="gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />{statusCounts.closed}</Badge>
                  </div>
                  <Button size="sm" variant={relocateMode ? "secondary" : "outline"} onClick={toggleRelocateMode} title="Drag pins to relocate">
                    <Move className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant={rapidMode ? "secondary" : "outline"} onClick={toggleRapidMode} title="Rapid pinning">
                    <Zap className="h-4 w-4" />
                    {rapidMode && <span className="ml-1">Rapid</span>}
                  </Button>
                  <Button size="sm" variant={addMode && !rapidMode ? "destructive" : "default"} onClick={toggleAddMode}>
                    {addMode && !rapidMode ? "Cancel" : <><Plus className="h-4 w-4 mr-1" /> Add Pin</>}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={selectedDrawingId || ""}
                onValueChange={(v) => { setSelectedDrawingId(v); setAddMode(false); setRelocateMode(false); setRapidMode(false); }}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select a drawing..." />
                </SelectTrigger>
                <SelectContent>
                  {drawings.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.drawing_number} — {d.drawing_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedDrawingId && (
                <DefectListFilter
                  projectId={projectId}
                  selectedListId={filterListId}
                  onListChange={setFilterListId}
                  selectedStatus={filterStatus}
                  onStatusChange={setFilterStatus}
                  selectedPackage={filterPackage}
                  onPackageChange={setFilterPackage}
                  selectedAssignee={filterAssignee}
                  onAssigneeChange={setFilterAssignee}
                  pins={allPins || []}
                  userName={contractorName}
                  userEmail={contractorEmail}
                />
              )}
            </div>

            {selectedDrawingId && selectedDrawing?.file_url ? (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
                <DefectDrawingViewer
                  pdfUrl={selectedDrawing.file_url}
                  pins={filteredPins}
                  addMode={addMode}
                  relocateMode={relocateMode}
                  onAddPin={handleAddPin}
                  onPinClick={handlePinClick}
                  onPinRelocate={handlePinRelocate}
                  selectedPinId={selectedPin?.id || null}
                />
                <div className="border rounded-lg">
                  <div className="p-2 border-b bg-muted/50">
                    <h4 className="text-sm font-medium">Pins ({filteredPins.length})</h4>
                  </div>
                  <DefectSidebar pins={filteredPins} selectedPinId={selectedPin?.id || null} onPinSelect={handlePinClick} />
                </div>
              </div>
            ) : selectedDrawingId ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No PDF file available for this drawing.</div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Select a drawing to begin tracking</p>
              </div>
            )}
          </CardContent>
        </Card>

        {dialogOpen && selectedDrawingId && (
          <DefectPinDialog
            open={dialogOpen}
            onClose={handleDialogClose}
            projectId={projectId}
            drawingId={selectedDrawingId}
            pin={selectedPin}
            clickCoords={clickCoords}
            userName={contractorName}
            userEmail={contractorEmail}
          />
        )}
      </div>
    );
  }

  // ── Mobile layout ────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] relative">
      {/* Top bar: Drawing selector + status summary */}
      <div className="px-3 py-2 border-b bg-background shrink-0">
        <Select
          value={selectedDrawingId || ""}
          onValueChange={(v) => { setSelectedDrawingId(v); setAddMode(false); setRelocateMode(false); setRapidMode(false); setMobileView("drawing"); }}
        >
          <SelectTrigger className="w-full h-9 text-sm">
            <SelectValue placeholder="Select a drawing…" />
          </SelectTrigger>
          <SelectContent>
            {drawings.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.drawing_number} — {d.drawing_title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status summary chips */}
        {selectedDrawingId && (
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
            <Badge variant="outline" className="gap-1 shrink-0 text-xs"><span className="w-2 h-2 rounded-full bg-destructive" />{statusCounts.open} Open</Badge>
            <Badge variant="outline" className="gap-1 shrink-0 text-xs"><span className="w-2 h-2 rounded-full bg-orange-500" />{statusCounts.in_progress} Active</Badge>
            <Badge variant="outline" className="gap-1 shrink-0 text-xs"><span className="w-2 h-2 rounded-full bg-green-500" />{statusCounts.resolved + statusCounts.closed} Done</Badge>
            {/* Active mode indicator */}
            {addMode && (
              <Badge className="shrink-0 text-xs bg-orange-500 text-white">
                {rapidMode ? "⚡ Rapid" : "📌 Placing…"}
              </Badge>
            )}
            {relocateMode && (
              <Badge className="shrink-0 text-xs" variant="secondary">
                ↔ Relocate
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Main content area — switches between views */}
      <div className="flex-1 overflow-hidden">
        {!selectedDrawingId ? (
          <div className="flex items-center justify-center h-full text-center px-6">
            <div>
              <MapPin className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground font-medium">Select a drawing</p>
              <p className="text-sm text-muted-foreground mt-1">Choose a drawing above to start tracking</p>
            </div>
          </div>
        ) : mobileView === "drawing" && selectedDrawing?.file_url ? (
          <div className="h-full overflow-auto">
            <DefectDrawingViewer
              pdfUrl={selectedDrawing.file_url}
              pins={filteredPins}
              addMode={addMode}
              relocateMode={relocateMode}
              onAddPin={handleAddPin}
              onPinClick={handlePinClick}
              onPinRelocate={handlePinRelocate}
              selectedPinId={selectedPin?.id || null}
            />
          </div>
        ) : mobileView === "list" ? (
          <div className="h-full">
            <div className="p-3 border-b bg-muted/30">
              <h4 className="text-sm font-medium">All Observations ({filteredPins.length})</h4>
            </div>
            <DefectSidebar pins={filteredPins} selectedPinId={selectedPin?.id || null} onPinSelect={handlePinClick} />
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No PDF file available for this drawing.
          </div>
        )}
      </div>

      {/* Mobile bottom navigation bar */}
      {selectedDrawingId && (
        <div className="shrink-0 border-t bg-background flex">
          <button
            onClick={() => setMobileView("drawing")}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs transition-colors",
              mobileView === "drawing" ? "text-primary font-medium" : "text-muted-foreground"
            )}
          >
            <Map className="h-5 w-5" />
            Drawing
          </button>
          <button
            onClick={() => setMobileView("list")}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs transition-colors relative",
              mobileView === "list" ? "text-primary font-medium" : "text-muted-foreground"
            )}
          >
            <List className="h-5 w-5" />
            Pins
            {filteredPins.length > 0 && (
              <span className="absolute top-1.5 right-1/4 bg-primary text-primary-foreground text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {filteredPins.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileFilterOpen(true)}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs transition-colors relative",
              "text-muted-foreground"
            )}
          >
            <Filter className="h-5 w-5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute top-1.5 right-1/4 bg-primary text-primary-foreground text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* FAB for quick actions on mobile */}
      {selectedDrawingId && mobileView === "drawing" && (
        <StatusTrackingFAB actions={fabActions} />
      )}

      {/* Filters drawer (mobile) */}
      <Drawer open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <DrawerContent className="max-h-[70vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Filters</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-4">
            <DefectListFilter
              projectId={projectId}
              selectedListId={filterListId}
              onListChange={setFilterListId}
              selectedStatus={filterStatus}
              onStatusChange={setFilterStatus}
              selectedPackage={filterPackage}
              onPackageChange={setFilterPackage}
              selectedAssignee={filterAssignee}
              onAssigneeChange={setFilterAssignee}
              pins={allPins || []}
              userName={contractorName}
              userEmail={contractorEmail}
            />
            <Button className="w-full" onClick={() => setMobileFilterOpen(false)}>
              Apply Filters
            </Button>
            {activeFilterCount > 0 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setFilterListId(null);
                  setFilterStatus(null);
                  setFilterPackage(null);
                  setFilterAssignee(null);
                }}
              >
                Clear All Filters
              </Button>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Pin detail dialog/drawer */}
      {dialogOpen && selectedDrawingId && (
        <DefectPinDialog
          open={dialogOpen}
          onClose={handleDialogClose}
          projectId={projectId}
          drawingId={selectedDrawingId}
          pin={selectedPin}
          clickCoords={clickCoords}
          userName={contractorName}
          userEmail={contractorEmail}
        />
      )}
    </div>
  );
}
