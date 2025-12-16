import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FittingSpec {
  id: string;
  manufacturer: string;
  model_number: string;
  wattage: number;
  lumens: number | null;
  color_temperature: number | null;
  cri: number | null;
  ip_rating: string | null;
  beam_angle: number | null;
  supply_cost: number;
  install_cost: number;
  spec_sheet_url: string | null;
  fitting_type: string;
  quantity_used: number;
}

interface SpecificationSummarySectionProps {
  projectId: string | null;
}

export const SpecificationSummarySection: React.FC<SpecificationSummarySectionProps> = ({
  projectId,
}) => {
  const [fittings, setFittings] = useState<FittingSpec[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      fetchFittingSpecs();
    }
  }, [projectId]);

  const fetchFittingSpecs = async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    try {
      // Fetch unique fittings used in this project
      const { data: schedules, error: schedulesError } = await supabase
        .from('project_lighting_schedules')
        .select(`
          fitting_id,
          quantity,
          lighting_fittings (
            id,
            manufacturer,
            model_number,
            wattage,
            lumens,
            color_temperature,
            cri,
            ip_rating,
            beam_angle,
            supply_cost,
            install_cost,
            spec_sheet_url,
            fitting_type
          )
        `)
        .eq('project_id', projectId);

      if (schedulesError) throw schedulesError;

      // Aggregate by fitting
      const fittingMap = new Map<string, FittingSpec>();
      
      (schedules || []).forEach(schedule => {
        const fitting = schedule.lighting_fittings as any;
        if (!fitting) return;

        const existing = fittingMap.get(fitting.id);
        if (existing) {
          existing.quantity_used += schedule.quantity || 1;
        } else {
          fittingMap.set(fitting.id, {
            id: fitting.id,
            manufacturer: fitting.manufacturer,
            model_number: fitting.model_number,
            wattage: fitting.wattage,
            lumens: fitting.lumens,
            color_temperature: fitting.color_temperature,
            cri: fitting.cri,
            ip_rating: fitting.ip_rating,
            beam_angle: fitting.beam_angle,
            supply_cost: fitting.supply_cost || 0,
            install_cost: fitting.install_cost || 0,
            spec_sheet_url: fitting.spec_sheet_url,
            fitting_type: fitting.fitting_type || 'General',
            quantity_used: schedule.quantity || 1,
          });
        }
      });

      setFittings(Array.from(fittingMap.values()));
    } catch (error) {
      console.error('Error fetching fitting specs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const groupedFittings = fittings.reduce((acc, fitting) => {
    const type = fitting.fitting_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(fitting);
    return acc;
  }, {} as Record<string, FittingSpec[]>);

  const calculateEfficiency = (lumens: number | null, wattage: number): string => {
    if (!lumens || wattage === 0) return 'N/A';
    return `${Math.round(lumens / wattage)} lm/W`;
  };

  if (isLoading) {
    return (
      <Card className="py-12">
        <CardContent className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (fittings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Specification Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No fittings found in this project. Add fittings to see specifications.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Specification Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            {fittings.length} unique fitting types used in this project
          </p>
        </CardContent>
      </Card>

      {Object.entries(groupedFittings).map(([type, typeFittings]) => (
        <Card key={type}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg capitalize">{type}</CardTitle>
              <Badge variant="secondary">{typeFittings.length} types</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Wattage</TableHead>
                  <TableHead className="text-right">Lumens</TableHead>
                  <TableHead className="text-right">Efficiency</TableHead>
                  <TableHead className="text-right">CCT</TableHead>
                  <TableHead className="text-right">CRI</TableHead>
                  <TableHead className="text-center">IP</TableHead>
                  <TableHead className="text-right">Qty Used</TableHead>
                  <TableHead className="text-center">Spec Sheet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typeFittings.map(fitting => (
                  <TableRow key={fitting.id}>
                    <TableCell className="font-medium">{fitting.manufacturer}</TableCell>
                    <TableCell className="font-mono text-sm">{fitting.model_number}</TableCell>
                    <TableCell className="text-right">{fitting.wattage}W</TableCell>
                    <TableCell className="text-right">
                      {fitting.lumens ? `${fitting.lumens.toLocaleString()} lm` : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      {calculateEfficiency(fitting.lumens, fitting.wattage)}
                    </TableCell>
                    <TableCell className="text-right">
                      {fitting.color_temperature ? `${fitting.color_temperature}K` : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      {fitting.cri ? `${fitting.cri}` : 'N/A'}
                    </TableCell>
                    <TableCell className="text-center">
                      {fitting.ip_rating || 'N/A'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {fitting.quantity_used}
                    </TableCell>
                    <TableCell className="text-center">
                      {fitting.spec_sheet_url ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(fitting.spec_sheet_url!, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
