/**
 * Phase 6: Operation & Monitoring
 * Ongoing requirements for maintaining electrical supply connection
 */

import { PhaseContentWrapper } from './PhaseContentWrapper';
import { BulkServicesSavedReportsList } from '../BulkServicesSavedReportsList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Gauge, Wrench, BarChart3 } from 'lucide-react';

interface Phase6OperationProps {
  documentId: string;
  phaseId: string;
  document: any;
  reportsRefreshTrigger: number;
}

export function Phase6Operation({ 
  documentId, 
  phaseId, 
  document,
  reportsRefreshTrigger 
}: Phase6OperationProps) {
  return (
    <PhaseContentWrapper
      phaseId={phaseId}
      phaseName="Operation & Monitoring"
      phaseDescription="Ongoing requirements for maintaining electrical supply connection"
    >
      {/* Operational KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gauge className="h-4 w-4 text-green-500" />
              Power Factor Target
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">&gt; 0.95</div>
            <p className="text-xs text-muted-foreground mt-1">
              Maintain to avoid penalties
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              Demand Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-blue-600 bg-blue-50">
              Active
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              Load optimization strategies
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wrench className="h-4 w-4 text-amber-500" />
              Equipment Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-amber-600 bg-amber-50">
              Scheduled
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              Customer-owned equipment
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              SCADA Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-muted-foreground">
              Optional
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              Smart metering and monitoring
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Saved Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Reports & Documentation</CardTitle>
        </CardHeader>
        <CardContent>
          <BulkServicesSavedReportsList 
            key={reportsRefreshTrigger}
            documentId={documentId} 
          />
        </CardContent>
      </Card>
    </PhaseContentWrapper>
  );
}
