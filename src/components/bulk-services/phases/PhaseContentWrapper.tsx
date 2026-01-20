/**
 * Phase Content Wrapper
 * Wraps phase-specific content with the task checklist
 */

import { ReactNode } from 'react';
import { PhaseTaskList } from './PhaseTaskList';

interface PhaseContentWrapperProps {
  phaseId: string;
  phaseName: string;
  phaseDescription?: string;
  children: ReactNode;
  onPhaseComplete?: () => void;
}

export function PhaseContentWrapper({ 
  phaseId, 
  phaseName, 
  phaseDescription, 
  children,
  onPhaseComplete 
}: PhaseContentWrapperProps) {
  return (
    <div className="space-y-6">
      {/* Phase Tasks Checklist */}
      <PhaseTaskList 
        phaseId={phaseId}
        phaseName={phaseName}
        phaseDescription={phaseDescription}
        onPhaseComplete={onPhaseComplete}
      />
      
      {/* Phase-specific content */}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}
