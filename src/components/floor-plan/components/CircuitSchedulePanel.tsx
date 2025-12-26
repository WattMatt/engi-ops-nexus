import { useState, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { DistributionBoardManager } from '@/components/circuit-schedule/DistributionBoardManager';
import { MapAllToFinalAccountDialog } from '@/components/circuit-schedule/MapAllToFinalAccountDialog';
import { AIScanResultsDialog } from '@/components/circuit-schedule/AIScanResultsDialog';
import { useAICircuitScan } from '@/components/circuit-schedule/hooks/useAICircuitScan';
import { useMultiScanAccumulator } from '@/components/circuit-schedule/hooks/useMultiScanAccumulator';
import { CircuitBoard, ArrowRight, Info, Link2, Sparkles, Loader2, Target, Layers, Check, X, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface CircuitSchedulePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  floorPlanId: string | null;
  floorPlanName: string | null;
  onCaptureLayout?: () => Promise<string | null>;
  onCaptureRegion?: (region: { x: number; y: number; width: number; height: number }) => Promise<string | null>;
  onStartRegionSelect?: () => void;
  isSelectingRegion?: boolean;
  selectedRegion?: { x: number; y: number; width: number; height: number } | null;
}

export function CircuitSchedulePanel({
  open,
  onOpenChange,
  projectId,
  floorPlanId,
  floorPlanName,
  onCaptureLayout,
  onCaptureRegion,
  onStartRegionSelect,
  isSelectingRegion,
  selectedRegion,
}: CircuitSchedulePanelProps) {
  const [showMapDialog, setShowMapDialog] = useState(false);
  const [showScanResults, setShowScanResults] = useState(false);
  const { isScanning, scanResult, scanLayout } = useAICircuitScan();
  const { 
    accumulatedResults, 
    addScanResults, 
    confirmDB, 
    confirmCircuit,
    removeDB,
    removeCircuit,
    clearResults,
  } = useMultiScanAccumulator();
  const queryClient = useQueryClient();

  // Full layout scan
  const handleFullScan = async () => {
    if (!onCaptureLayout) {
      toast.error('No layout loaded to scan');
      return;
    }

    const imageBase64 = await onCaptureLayout();
    if (!imageBase64) {
      toast.error('Failed to capture layout image');
      return;
    }

    const result = await scanLayout(imageBase64, 'image/png');
    if (result && result.distribution_boards?.length > 0) {
      addScanResults(result);
      toast.success(`Added ${result.distribution_boards.length} DB(s) to accumulated results`);
    }
  };

  // Region scan
  const handleRegionScan = async () => {
    if (!onCaptureRegion || !selectedRegion) {
      toast.error('No region selected');
      return;
    }

    const imageBase64 = await onCaptureRegion(selectedRegion);
    if (!imageBase64) {
      toast.error('Failed to capture selected region');
      return;
    }

    const result = await scanLayout(imageBase64, 'image/png');
    if (result && result.distribution_boards?.length > 0) {
      addScanResults(result);
      toast.success(`Added ${result.distribution_boards.length} DB(s) from region scan`);
    }
  };

  const handleScanComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['distribution-boards', projectId] });
  };

  // Convert accumulated results to scan result format for dialog
  const handleCreateFromAccumulated = () => {
    if (accumulatedResults.distribution_boards.length === 0) {
      toast.error('No accumulated results to create');
      return;
    }
    setShowScanResults(true);
  };

  const totalCircuits = accumulatedResults.distribution_boards.reduce(
    (sum, db) => sum + db.circuits.length, 
    0
  );

  if (!projectId) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <CircuitBoard className="h-5 w-5 text-primary" />
              Circuit Schedule
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Please select a project from the dashboard to access circuit schedules.
              </AlertDescription>
            </Alert>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <CircuitBoard className="h-5 w-5 text-primary" />
              Circuit Schedule
            </SheetTitle>
            <SheetDescription>
              {floorPlanName ? (
                <span>Layout: <strong>{floorPlanName}</strong></span>
              ) : (
                <span>Create distribution boards, add circuits, and assign materials</span>
              )}
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {/* AI Scan Feature */}
            {onCaptureLayout && (
              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      AI Circuit Detection
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Scans layout drawings to detect circuit references (L1, P1, AC3, etc.) where materials will be installed
                    </p>
                  </div>
                  
                  {/* Scan Options */}
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      onClick={handleFullScan} 
                      disabled={isScanning}
                      size="sm"
                      variant="outline"
                    >
                      {isScanning ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Scanning...
                        </>
                      ) : (
                        <>
                          <Layers className="h-4 w-4 mr-2" />
                          Scan Full Layout
                        </>
                      )}
                    </Button>
                    
                    {onStartRegionSelect && (
                      <Button 
                        onClick={onStartRegionSelect}
                        disabled={isScanning || isSelectingRegion}
                        size="sm"
                        variant={isSelectingRegion ? "default" : "outline"}
                      >
                        <Target className="h-4 w-4 mr-2" />
                        {isSelectingRegion ? 'Selecting Region...' : 'Select Region'}
                      </Button>
                    )}
                    
                    {selectedRegion && onCaptureRegion && (
                      <Button 
                        onClick={handleRegionScan}
                        disabled={isScanning}
                        size="sm"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Scan Selected Region
                      </Button>
                    )}
                  </div>
                  
                  {/* Accumulated Results */}
                  {accumulatedResults.scanCount > 0 && (
                    <div className="mt-4 p-3 rounded-lg bg-background/50 border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium flex items-center gap-2">
                          Accumulated Results
                          <Badge variant="secondary" className="text-xs">
                            {accumulatedResults.scanCount} scan(s)
                          </Badge>
                        </h5>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={clearResults}
                            className="h-7 text-xs text-muted-foreground"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Clear
                          </Button>
                          <Button 
                            size="sm"
                            onClick={handleCreateFromAccumulated}
                            className="h-7 text-xs"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Create All
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-2">
                        {accumulatedResults.distribution_boards.length} DB(s) with {totalCircuits} circuit(s) detected
                      </p>
                      
                      {/* Compact list of detected items */}
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {accumulatedResults.distribution_boards.map((db) => (
                          <div key={db.name} className="flex items-start justify-between gap-2 p-2 rounded bg-muted/50">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">{db.name}</span>
                                {db.confirmed && (
                                  <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {db.circuits.map((circuit) => (
                                  <Badge 
                                    key={circuit.ref}
                                    variant={circuit.confirmed ? "default" : "outline"}
                                    className="text-xs cursor-pointer"
                                    onClick={() => confirmCircuit(db.name, circuit.ref)}
                                  >
                                    {circuit.ref}
                                    {!circuit.confirmed && (
                                      <X 
                                        className="h-2 w-2 ml-1 hover:text-destructive"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeCircuit(db.name, circuit.ref);
                                        }}
                                      />
                                    )}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => confirmDB(db.name)}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => removeDB(db.name)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Workflow Guide */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <h4 className="text-sm font-semibold text-foreground mb-3">Workflow</h4>
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">1</span>
                  Create DB
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                <span className="flex items-center gap-1">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">2</span>
                  Add Circuits
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                <span className="flex items-center gap-1">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">3</span>
                  Assign Materials
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                <span className="flex items-center gap-1">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">4</span>
                  Link to Final Account
                </span>
              </div>
            </div>

            {/* Map All to Final Account Button */}
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowMapDialog(true)}
                className="gap-2"
              >
                <Link2 className="h-4 w-4" />
                Map All to Final Account
              </Button>
            </div>

            {/* Distribution Board Manager */}
            <DistributionBoardManager 
              projectId={projectId} 
              floorPlanId={floorPlanId || undefined} 
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Map All Dialog */}
      <MapAllToFinalAccountDialog
        open={showMapDialog}
        onOpenChange={setShowMapDialog}
        projectId={projectId}
      />

      {/* AI Scan Results Dialog */}
      <AIScanResultsDialog
        open={showScanResults}
        onOpenChange={setShowScanResults}
        scanResult={{
          distribution_boards: accumulatedResults.distribution_boards,
          confidence: accumulatedResults.lastScanConfidence,
          notes: `Accumulated from ${accumulatedResults.scanCount} scan(s)`,
        }}
        projectId={projectId}
        floorPlanId={floorPlanId || undefined}
        onComplete={() => {
          handleScanComplete();
          clearResults();
        }}
      />
    </>
  );
}
