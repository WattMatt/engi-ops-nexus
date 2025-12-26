import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { DistributionBoardManager } from '@/components/circuit-schedule/DistributionBoardManager';
import { MapAllToFinalAccountDialog } from '@/components/circuit-schedule/MapAllToFinalAccountDialog';
import { AIScanResultsDialog } from '@/components/circuit-schedule/AIScanResultsDialog';
import { useAICircuitScan } from '@/components/circuit-schedule/hooks/useAICircuitScan';
import { CircuitBoard, ArrowRight, Info, Link2, Sparkles, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface CircuitSchedulePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  floorPlanId: string | null;
  floorPlanName: string | null;
  onCaptureLayout?: () => Promise<string | null>;
}

export function CircuitSchedulePanel({
  open,
  onOpenChange,
  projectId,
  floorPlanId,
  floorPlanName,
  onCaptureLayout,
}: CircuitSchedulePanelProps) {
  const [showMapDialog, setShowMapDialog] = useState(false);
  const [showScanResults, setShowScanResults] = useState(false);
  const { isScanning, scanResult, scanLayout } = useAICircuitScan();
  const queryClient = useQueryClient();

  const handleAIScan = async () => {
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
      setShowScanResults(true);
    }
  };

  const handleScanComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['distribution-boards', projectId] });
  };

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
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      AI Circuit Detection
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Scans layout drawings to detect circuit references (L1, P1, AC3, etc.) where materials will be installed
                    </p>
                  </div>
                  <Button 
                    onClick={handleAIScan} 
                    disabled={isScanning}
                    size="sm"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Scan Layout
                      </>
                    )}
                  </Button>
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
        scanResult={scanResult}
        projectId={projectId}
        floorPlanId={floorPlanId || undefined}
        onComplete={handleScanComplete}
      />
    </>
  );
}
