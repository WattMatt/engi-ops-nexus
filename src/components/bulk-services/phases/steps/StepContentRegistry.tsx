/**
 * Step Content Registry - Maps workflow tasks to their form components
 */

import React from 'react';
import { ConnectedLoadsStep } from './phase1/ConnectedLoadsStep';
import { PeakDemandStep } from './phase1/PeakDemandStep';
import { DiversityFactorStep } from './phase1/DiversityFactorStep';
import { FutureGrowthStep } from './phase1/FutureGrowthStep';
import { LoadProfileStep } from './phase1/LoadProfileStep';
import { SupplyVoltageStep } from './phase2/SupplyVoltageStep';
import { SubstationRequirementsStep } from './phase2/SubstationRequirementsStep';
import { TransformerSizingStep } from './phase2/TransformerSizingStep';
import { ProtectionMeteringStep } from './phase2/ProtectionMeteringStep';
import { CableInfrastructureStep } from './phase2/CableInfrastructureStep';
import { SwitchgearPanelsStep } from './phase2/SwitchgearPanelsStep';
import { 
  PrepareApplicationStep, 
  DocumentMaxDemandStep, 
  LoadProfileDocStep, 
  VoltageRequestStep, 
  SubmitApplicationStep, 
  TariffSelectionStep 
} from './phase3';
import { 
  UtilityReviewStep, 
  NetworkAssessmentStep, 
  TechnicalDrawingsStep, 
  ConnectionAgreementStep 
} from './phase4';
import { 
  InternalInfrastructureStep, 
  SpecificationComplianceStep, 
  GridExtensionStep, 
  TestingCommissioningStep 
} from './phase5';
import { 
  PowerFactorStep, 
  DemandManagementStep, 
  EquipmentMaintenanceStep, 
  ReportingProceduresStep 
} from './phase6';

export interface StepContentProps {
  document: any;
  documentId: string;
  onUpdate?: () => void;
}

const STEP_CONTENT_MAP: Record<string, React.ComponentType<StepContentProps>> = {
  // Phase 1: Load Estimation
  'Identify connected loads': ConnectedLoadsStep,
  'Calculate peak demand': PeakDemandStep,
  'Apply diversity factor': DiversityFactorStep,
  'Plan for future growth': FutureGrowthStep,
  'Develop load profile': LoadProfileStep,
  
  // Phase 2: Bulk Requirements
  'Determine supply voltage level': SupplyVoltageStep,
  'Assess substation requirements': SubstationRequirementsStep,
  'Specify transformer sizing': TransformerSizingStep,
  'Define protection & metering requirements': ProtectionMeteringStep,
  'Plan cable infrastructure': CableInfrastructureStep,
  'Specify switchgear and panels': SwitchgearPanelsStep,
  
  // Phase 3: Utility Application
  'Prepare formal application': PrepareApplicationStep,
  'Document maximum demand (kVA/MW)': DocumentMaxDemandStep,
  'Prepare load profile documentation': LoadProfileDocStep,
  'Specify requested voltage level': VoltageRequestStep,
  'Submit application to utility': SubmitApplicationStep,
  'Select tariff structure': TariffSelectionStep,
  'Review connection fees and tariffs': TariffSelectionStep,
  
  // Phase 4: Design & Approval
  'Utility technical review': UtilityReviewStep,
  'Network reinforcement assessment': NetworkAssessmentStep,
  'Submit technical drawings': TechnicalDrawingsStep,
  'Sign connection agreement': ConnectionAgreementStep,
  'Protection scheme approval': UtilityReviewStep,
  
  // Phase 5: Construction
  'Build internal electrical infrastructure': InternalInfrastructureStep,
  'Ensure utility specification compliance': SpecificationComplianceStep,
  'Coordinate grid extension': GridExtensionStep,
  'Complete testing & commissioning': TestingCommissioningStep,
  'Install metering equipment': TestingCommissioningStep,
  'Conduct joint inspection': TestingCommissioningStep,
  'Initial energization': TestingCommissioningStep,
  
  // Phase 6: Operations
  'Maintain power factor': PowerFactorStep,
  'Implement demand-side management': DemandManagementStep,
  'Routine equipment maintenance': EquipmentMaintenanceStep,
  'Establish reporting procedures': ReportingProceduresStep,
  'Set up smart metering integration': ReportingProceduresStep,
};

export function getStepContent(taskTitle: string): React.ComponentType<StepContentProps> | null {
  return STEP_CONTENT_MAP[taskTitle] || null;
}

export function renderStepContent(taskTitle: string, props: StepContentProps): React.ReactNode {
  const Component = getStepContent(taskTitle);
  if (!Component) return null;
  return <Component {...props} />;
}
