import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Plus, FileWarning, Move, Zap } from "lucide-react";
import { useDefectPins, useUpdateDefectPin, useCreateDefectPinOptimistic, DefectPin } from "@/hooks/useDefectPins";
import { DefectDrawingViewer } from "./DefectDrawingViewer";
import { DefectSidebar } from "./DefectSidebar";
import { DefectPinDialog } from "./DefectPinDialog";
import { DefectListFilter } from "./DefectListFilter";
import { toast } from "sonner";

interface Props {
  projectId: string;
  contractorName: string;
  contractorEmail?: string;
}

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

  // Standard add: opens dialog
  const handleAddPin = useCallback((coords: { x: number; y: number }) => {
    if (rapidMode && selectedDrawingId) {
      // Rapid mode: drop pin instantly, no dialog
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
      // Stay in rapid mode — don't turn off addMode
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
  };

  const toggleRapidMode = () => {
    const next = !rapidMode;
    setRapidMode(next);
    setAddMode(next);
    if (next) setRelocateMode(false);
  };

  const toggleRelocateMode = () => {
    setRelocateMode(!relocateMode);
    if (!relocateMode) { setAddMode(false); setRapidMode(false); }
  };

  const statusCounts = useMemo(() => {
    if (!allPins) return { open: 0, in_progress: 0, resolved: 0, closed: 0 };
    return allPins.reduce(
      (acc, p) => ({ ...acc, [p.status]: (acc[p.status as keyof typeof acc] || 0) + 1 }),
      { open: 0, in_progress: 0, resolved: 0, closed: 0 }
    );
  }, [allPins]);

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
                  <Badge variant="outline" className="gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />{statusCounts.open}</Badge>
                  <Badge variant="outline" className="gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" />{statusCounts.in_progress}</Badge>
                  <Badge variant="outline" className="gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />{statusCounts.resolved}</Badge>
                  <Badge variant="outline" className="gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />{statusCounts.closed}</Badge>
                </div>
                <Button
                  size="sm"
                  variant={relocateMode ? "secondary" : "outline"}
                  onClick={toggleRelocateMode}
                  title="Drag pins to relocate"
                >
                  <Move className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={rapidMode ? "secondary" : "outline"}
                  onClick={toggleRapidMode}
                  title="Rapid pinning — click to drop pins instantly"
                >
                  <Zap className="h-4 w-4" />
                  {rapidMode && <span className="ml-1">Rapid</span>}
                </Button>
                <Button
                  size="sm"
                  variant={addMode && !rapidMode ? "destructive" : "default"}
                  onClick={toggleAddMode}
                >
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
                <DefectSidebar
                  pins={filteredPins}
                  selectedPinId={selectedPin?.id || null}
                  onPinSelect={handlePinClick}
                />
              </div>
            </div>
          ) : selectedDrawingId ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No PDF file available for this drawing.
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Select a drawing to begin tracking defects</p>
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
