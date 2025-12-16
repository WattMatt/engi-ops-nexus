import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ScheduleItem {
  id: string;
  fitting_code: string;
  description: string;
  quantity: number;
  wattage: number;
  total_wattage: number;
  status: string;
  supply_cost: number;
  install_cost: number;
}

interface TenantSchedule {
  tenant_id: string;
  tenant_name: string;
  shop_number: string;
  area: number;
  zone: string;
  items: ScheduleItem[];
  total_fittings: number;
  total_wattage: number;
  total_cost: number;
}

interface LightingScheduleSectionProps {
  projectId: string | null;
  viewMode: 'tenant' | 'zone';
}

export const LightingScheduleSection: React.FC<LightingScheduleSectionProps> = ({
  projectId,
  viewMode,
}) => {
  const [schedules, setSchedules] = useState<TenantSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      fetchScheduleData();
    }
  }, [projectId]);

  const fetchScheduleData = async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    try {
      // Fetch tenants for the project
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, shop_name, shop_number, area')
        .eq('project_id', projectId);

      if (tenantsError) throw tenantsError;

      // Fetch lighting schedules
      const { data: lightingSchedules, error: schedulesError } = await supabase
        .from('project_lighting_schedules')
        .select(`
          id,
          tenant_id,
          zone_name,
          fitting_id,
          quantity,
          approval_status,
          lighting_fittings (
            id,
            manufacturer,
            model_number,
            wattage,
            supply_cost,
            install_cost
          )
        `)
        .eq('project_id', projectId);

      if (schedulesError) throw schedulesError;

      // Group by tenant
      const tenantSchedules: TenantSchedule[] = (tenants || []).map(tenant => {
        const tenantItems = (lightingSchedules || [])
          .filter(s => s.tenant_id === tenant.id)
          .map(s => {
            const fitting = s.lighting_fittings as any;
            const wattage = fitting?.wattage || 0;
            const quantity = s.quantity || 1;
            return {
              id: s.id,
              fitting_code: fitting?.model_number || 'N/A',
              description: fitting ? `${fitting.manufacturer} ${fitting.model_number}` : 'Unknown Fitting',
              quantity,
              wattage,
              total_wattage: wattage * quantity,
              status: s.approval_status || 'pending',
              supply_cost: (fitting?.supply_cost || 0) * quantity,
              install_cost: (fitting?.install_cost || 0) * quantity,
            };
          });

        return {
          tenant_id: tenant.id,
          tenant_name: tenant.shop_name || 'Unnamed Tenant',
          shop_number: tenant.shop_number || '',
          area: tenant.area || 0,
          zone: 'Sales Floor', // Default zone
          items: tenantItems,
          total_fittings: tenantItems.reduce((sum, item) => sum + item.quantity, 0),
          total_wattage: tenantItems.reduce((sum, item) => sum + item.total_wattage, 0),
          total_cost: tenantItems.reduce((sum, item) => sum + item.supply_cost + item.install_cost, 0),
        };
      });

      setSchedules(tenantSchedules.filter(s => s.items.length > 0));
    } catch (error) {
      console.error('Error fetching schedule data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400">Pending</Badge>;
      case 'changes_requested':
        return <Badge className="bg-red-500/20 text-red-400">Changes Requested</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
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

  if (schedules.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lighting Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No lighting schedules found. Add fittings to tenants to see the schedule.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {schedules.map(schedule => (
        <Card key={schedule.tenant_id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  TENANT: {schedule.shop_number} - {schedule.tenant_name} ({schedule.area}m²)
                </CardTitle>
                <p className="text-sm text-muted-foreground">Zone: {schedule.zone}</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold">{schedule.total_fittings} fittings</p>
                <p className="text-muted-foreground">{schedule.total_wattage}W total</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Item</TableHead>
                  <TableHead>Fitting Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Wattage</TableHead>
                  <TableHead className="text-right">Total W</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-mono text-sm">{item.fitting_code}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{item.wattage}W</TableCell>
                    <TableCell className="text-right">{item.total_wattage}W</TableCell>
                    <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="text-sm font-medium">SUBTOTAL:</span>
              <span className="text-sm">
                {schedule.total_fittings} fittings | {schedule.total_wattage}W | 
                <span className="font-semibold"> R{schedule.total_cost.toLocaleString()}</span>
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
