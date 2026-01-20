/**
 * Phase 3: Utility Application & Requirements
 * Prepare and submit formal application to utility with all required documentation
 */

import { PhaseContentWrapper } from './PhaseContentWrapper';
import { BulkServicesSections } from '../BulkServicesSections';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Building, Clipboard, DollarSign } from 'lucide-react';

interface Phase3UtilityApplicationProps {
  documentId: string;
  phaseId: string;
  document: any;
  sections: any[];
}

export function Phase3UtilityApplication({ 
  documentId, 
  phaseId, 
  document,
  sections 
}: Phase3UtilityApplicationProps) {
  return (
    <PhaseContentWrapper
      phaseId={phaseId}
      phaseName="Utility Application & Requirements"
      phaseDescription="Prepare and submit formal application to utility with all required documentation"
    >
      {/* Application Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building className="h-4 w-4 text-blue-500" />
              Supply Authority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {document?.supply_authority || 'Not specified'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Target utility</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clipboard className="h-4 w-4 text-green-500" />
              Maximum Demand
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {document?.maximum_demand ? `${document.maximum_demand} kVA` : 'Not calculated'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">For application form</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-500" />
              Voltage Requested
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {document?.primary_voltage ? `${document.primary_voltage} V` : 'Not specified'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Requested supply voltage</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-500" />
              Tariff Structure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {document?.tariff_structure || 'Not selected'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Billing arrangement</p>
          </CardContent>
        </Card>
      </div>

      {/* Document Sections for application content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Application Documentation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BulkServicesSections
            documentId={documentId}
            sections={sections}
          />
        </CardContent>
      </Card>
    </PhaseContentWrapper>
  );
}
