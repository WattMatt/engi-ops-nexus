import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { DistributionBoardManager } from '@/components/circuit-schedule/DistributionBoardManager';
import { CircuitBoard, ArrowRight, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CircuitSchedulePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  floorPlanId: string | null;
  floorPlanName: string | null;
}

export function CircuitSchedulePanel({
  open,
  onOpenChange,
  projectId,
  floorPlanId,
  floorPlanName,
}: CircuitSchedulePanelProps) {
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
          {/* Workflow Guide */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <h4 className="text-sm font-semibold text-foreground mb-3">Workflow</h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
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

          {/* Distribution Board Manager */}
          <DistributionBoardManager 
            projectId={projectId} 
            floorPlanId={floorPlanId || undefined} 
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
