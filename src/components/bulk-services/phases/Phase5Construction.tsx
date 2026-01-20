/**
 * Phase 5: Construction & Installation
 * Build infrastructure, install equipment, and complete testing
 */

import { PhaseContentWrapper } from './PhaseContentWrapper';
import { BulkServicesSections } from '../BulkServicesSections';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wrench, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';

interface Phase5ConstructionProps {
  documentId: string;
  phaseId: string;
  document: any;
  sections: any[];
}

export function Phase5Construction({ 
  documentId, 
  phaseId, 
  document,
  sections 
}: Phase5ConstructionProps) {
  return (
    <PhaseContentWrapper
      phaseId={phaseId}
      phaseName="Construction & Installation"
      phaseDescription="Build infrastructure, install equipment, and complete testing"
    >
      {/* Construction Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wrench className="h-4 w-4 text-blue-500" />
              Internal Infrastructure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-amber-600 bg-amber-50">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Pending
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              Switchgear, cabling, transformers
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Specification Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {document?.electrical_standard || 'SANS 10142'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Equipment must meet utility specs
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Grid Extension
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-amber-600 bg-amber-50">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Pending
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              Utility extends grid to point of supply
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-purple-500" />
              Testing & Commissioning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-amber-600 bg-amber-50">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Pending
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              Safety, protection, metering verification
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Construction Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Construction Documentation & Progress</CardTitle>
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
