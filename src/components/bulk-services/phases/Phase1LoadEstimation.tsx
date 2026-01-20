/**
 * Phase 1: Load Estimation & Demand Analysis
 * Identify and calculate all electrical loads to determine peak demand requirements
 */

import { PhaseContentWrapper } from './PhaseContentWrapper';
import { BulkServicesKPICard } from '../BulkServicesKPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Zap, TrendingUp, Activity } from 'lucide-react';

interface Phase1LoadEstimationProps {
  documentId: string;
  phaseId: string;
  document: any;
  mapSelectedZone?: string | null;
}

export function Phase1LoadEstimation({ 
  documentId, 
  phaseId, 
  document,
  mapSelectedZone 
}: Phase1LoadEstimationProps) {
  return (
    <PhaseContentWrapper
      phaseId={phaseId}
      phaseName="Load Estimation & Demand Analysis"
      phaseDescription="Identify and calculate all electrical loads to determine peak demand requirements"
    >
      {/* KPI Card for load calculations */}
      <BulkServicesKPICard documentId={documentId} mapSelectedZone={mapSelectedZone} />
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Connected Load
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {document?.total_connected_load ? `${document.total_connected_load} kVA` : 'Not set'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total installed capacity</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-500" />
              Maximum Demand
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {document?.maximum_demand ? `${document.maximum_demand} kVA` : 'Not set'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Peak simultaneous usage</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              Diversity Factor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {document?.diversity_factor || 'Not set'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Load reduction factor</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              Future Expansion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {document?.future_expansion_factor ? `${((document.future_expansion_factor - 1) * 100).toFixed(0)}%` : 'Not set'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Growth allowance</p>
          </CardContent>
        </Card>
      </div>
    </PhaseContentWrapper>
  );
}
