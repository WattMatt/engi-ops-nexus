import { useState, useEffect } from 'react';
import { FloorPlanProvider } from '@/contexts/FloorPlanContext';
import { PDFLoader } from '@/components/floor-plan/PDFLoader';
import { DesignPurposeSelector } from '@/components/floor-plan/DesignPurposeSelector';
import { LeftToolbar } from '@/components/floor-plan/LeftToolbar';
import { MarkupCanvas } from '@/components/floor-plan/MarkupCanvas';
import { RightPanel } from '@/components/floor-plan/RightPanel';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { KeyboardShortcuts } from '@/components/floor-plan/KeyboardShortcuts';

function FloorPlanContent() {
  const { state } = useFloorPlan();

  // Show PDF loader if no PDF loaded
  if (!state.pdfDataUrl) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <PDFLoader />
      </div>
    );
  }

  // Show design purpose selector if no purpose selected
  if (!state.designPurpose) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <DesignPurposeSelector />
      </div>
    );
  }

  // Main three-column layout
  return (
    <div className="flex h-full bg-background">
      <KeyboardShortcuts />
      
      {/* Left Toolbar */}
      <div className="w-20 border-r border-border bg-surface flex-shrink-0">
        <LeftToolbar />
      </div>

      {/* Center Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <MarkupCanvas />
      </div>

      {/* Right Panel */}
      <div className="w-96 border-l border-border bg-surface flex-shrink-0 overflow-y-auto">
        <RightPanel />
      </div>
    </div>
  );
}

export default function FloorPlanMarkup() {
  return (
    <FloorPlanProvider>
      <div className="h-screen flex flex-col">
        <FloorPlanContent />
      </div>
    </FloorPlanProvider>
  );
}
