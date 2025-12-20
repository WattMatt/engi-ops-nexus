import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Check, Upload, Layers, Columns, Sparkles, ClipboardCheck, ArrowLeft, ArrowRight, X } from "lucide-react";
import { BOQWizardStep1Upload } from "./wizard/BOQWizardStep1Upload";
import { BOQWizardStep2Sheets } from "./wizard/BOQWizardStep2Sheets";
import { BOQWizardStep3Columns } from "./wizard/BOQWizardStep3Columns";
import { BOQWizardStep4Match } from "./wizard/BOQWizardStep4Match";
import { BOQWizardStep5Review } from "./wizard/BOQWizardStep5Review";
import type { ParsedSheet } from "@/utils/excelParser";

// Wizard state that flows through all steps
export interface BOQWizardState {
  // Step 1: Upload
  file: File | null;
  uploadId: string | null;
  metadata: {
    sourceDescription: string;
    contractorName: string;
    projectId: string;
    province: string;
    buildingType: string;
    tenderDate: Date | undefined;
  };
  
  // Step 2: Sheets
  parsedSheets: ParsedSheet[];
  selectedSheets: Set<string>;
  
  // Step 3: Columns
  columnMappings: Record<string, ColumnMapping>;
  
  // Step 4: Match (after AI processing)
  matchingStatus: 'idle' | 'processing' | 'completed' | 'error';
  matchingError: string | null;
  extractedItemsCount: number;
  matchedItemsCount: number;
  
  // Step 5: Review
  reviewComplete: boolean;
}

export interface ColumnMapping {
  sheetName: string;
  itemCode: number | null;
  description: number | null;
  quantity: number | null;
  unit: number | null;
  supplyRate: number | null;
  installRate: number | null;
  totalRate: number | null;
  amount: number | null;
}

const STEPS = [
  { id: 1, title: "Upload", icon: Upload, description: "Upload BOQ file" },
  { id: 2, title: "Sheets", icon: Layers, description: "Select sheets" },
  { id: 3, title: "Columns", icon: Columns, description: "Map columns" },
  { id: 4, title: "Match", icon: Sparkles, description: "AI matching" },
  { id: 5, title: "Review", icon: ClipboardCheck, description: "Final review" },
];

interface BOQProcessingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

const initialState: BOQWizardState = {
  file: null,
  uploadId: null,
  metadata: {
    sourceDescription: "",
    contractorName: "",
    projectId: "",
    province: "",
    buildingType: "",
    tenderDate: undefined,
  },
  parsedSheets: [],
  selectedSheets: new Set(),
  columnMappings: {},
  matchingStatus: 'idle',
  matchingError: null,
  extractedItemsCount: 0,
  matchedItemsCount: 0,
  reviewComplete: false,
};

export function BOQProcessingWizard({ open, onOpenChange, onComplete }: BOQProcessingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [state, setState] = useState<BOQWizardState>(() => ({
    ...initialState,
    selectedSheets: new Set<string>(),
  }));
  
  // Reset state when dialog opens
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setState({
        ...initialState,
        selectedSheets: new Set<string>(),
      });
      setCurrentStep(1);
    }
    onOpenChange(isOpen);
  }, [onOpenChange]);
  
  const updateState = useCallback((updates: Partial<BOQWizardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  
  const canGoNext = useCallback(() => {
    switch (currentStep) {
      case 1:
        return state.file !== null;
      case 2:
        return state.selectedSheets.size > 0;
      case 3:
        // At least one sheet must have description mapped
        return Object.values(state.columnMappings).some(m => m.description !== null);
      case 4:
        return state.matchingStatus === 'completed';
      case 5:
        return state.reviewComplete;
      default:
        return false;
    }
  }, [currentStep, state]);
  
  const handleNext = useCallback(() => {
    if (currentStep < 5 && canGoNext()) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, canGoNext]);
  
  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);
  
  const handleClose = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);
  
  const handleComplete = useCallback(() => {
    onComplete?.();
    handleClose();
  }, [onComplete, handleClose]);
  
  const progressPercent = (currentStep / 5) * 100;
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header with step indicator */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">Process BOQ</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Step {currentStep} of 5: {STEPS[currentStep - 1].description}
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Step indicators */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              {STEPS.map((step, index) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                const Icon = step.icon;
                
                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                          isCompleted && "bg-primary border-primary text-primary-foreground",
                          isActive && "border-primary text-primary bg-primary/10",
                          !isCompleted && !isActive && "border-muted-foreground/30 text-muted-foreground"
                        )}
                      >
                        {isCompleted ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>
                      <span className={cn(
                        "text-xs mt-1 font-medium",
                        isActive && "text-primary",
                        !isActive && "text-muted-foreground"
                      )}>
                        {step.title}
                      </span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className={cn(
                        "flex-1 h-0.5 mx-2 mt-[-16px]",
                        isCompleted ? "bg-primary" : "bg-muted-foreground/30"
                      )} />
                    )}
                  </div>
                );
              })}
            </div>
            <Progress value={progressPercent} className="h-1" />
          </div>
        </DialogHeader>
        
        {/* Step content */}
        <div className="flex-1 overflow-auto p-6">
          {currentStep === 1 && (
            <BOQWizardStep1Upload state={state} updateState={updateState} />
          )}
          {currentStep === 2 && (
            <BOQWizardStep2Sheets state={state} updateState={updateState} />
          )}
          {currentStep === 3 && (
            <BOQWizardStep3Columns state={state} updateState={updateState} />
          )}
          {currentStep === 4 && (
            <BOQWizardStep4Match state={state} updateState={updateState} />
          )}
          {currentStep === 5 && (
            <BOQWizardStep5Review state={state} updateState={updateState} />
          )}
        </div>
        
        {/* Footer with navigation */}
        <div className="px-6 py-4 border-t flex items-center justify-between bg-muted/30">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="text-sm text-muted-foreground">
            {state.file && (
              <span className="inline-flex items-center gap-1">
                <Upload className="h-3 w-3" />
                {state.file.name}
              </span>
            )}
          </div>
          
          {currentStep < 5 ? (
            <Button
              onClick={handleNext}
              disabled={!canGoNext()}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={!state.reviewComplete}
            >
              <Check className="h-4 w-4 mr-2" />
              Complete
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
