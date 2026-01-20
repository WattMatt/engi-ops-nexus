/**
 * Phase 2: Bulk Services Requirements
 * Determine supply voltage levels, substation needs, and infrastructure requirements
 */

import { PhaseContentWrapper } from './PhaseContentWrapper';
import { BulkServicesHeader } from '../BulkServicesHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Gauge, Cable, Shield } from 'lucide-react';

interface Phase2BulkRequirementsProps {
  documentId: string;
  phaseId: string;
  document: any;
}

export function Phase2BulkRequirements({ 
  documentId, 
  phaseId, 
  document 
}: Phase2BulkRequirementsProps) {
  const getVoltageLevel = (voltage: string | null) => {
    if (!voltage) return { level: 'Unknown', type: 'LV' };
    const v = parseFloat(voltage);
    if (v <= 1000) return { level: 'Low Voltage (LV)', type: 'LV' };
    if (v <= 33000) return { level: 'Medium Voltage (MV)', type: 'MV' };
    return { level: 'High Voltage (HV)', type: 'HV' };
  };

  const voltageInfo = getVoltageLevel(document?.primary_voltage);

  return (
    <PhaseContentWrapper
      phaseId={phaseId}
      phaseName="Bulk Services Requirements"
      phaseDescription="Determine supply voltage levels, substation needs, and infrastructure requirements"
    >
      {/* Document Header with editable fields */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Specifications</CardTitle>
        </CardHeader>
        <CardContent>
          <BulkServicesHeader document={document} />
        </CardContent>
      </Card>

      {/* Infrastructure Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gauge className="h-4 w-4 text-blue-500" />
              Supply Voltage Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {document?.primary_voltage ? `${document.primary_voltage} V` : 'Not specified'}
              </div>
              <Badge variant="outline" className="text-xs">
                {voltageInfo.level}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                {voltageInfo.type === 'LV' && 'Suitable for small commercial/residential applications'}
                {voltageInfo.type === 'MV' && 'Recommended for larger facilities (11-33kV)'}
                {voltageInfo.type === 'HV' && 'Required for industrial/municipal bulk supply'}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-green-500" />
              Connection Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {document?.connection_size || 'Not specified'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Transformer/substation capacity rating
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-500" />
              Protection & Metering
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {document?.electrical_standard || 'SANS 10142'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Applicable electrical standard
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Cable className="h-4 w-4 text-purple-500" />
              Supply Authority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {document?.supply_authority || 'Not specified'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Utility provider for the area
            </p>
          </CardContent>
        </Card>
      </div>
    </PhaseContentWrapper>
  );
}
