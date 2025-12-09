import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientAccess } from "@/hooks/useClientAccess";
import { ClientComments } from "@/components/client-portal/ClientComments";
import { ClientApproval } from "@/components/client-portal/ClientApproval";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Zap, Building2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { sortTenantsByShopNumber } from "@/utils/tenantSorting";

const ClientGeneratorReport = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { isClient, hasReportAccess, loading: accessLoading } = useClientAccess();

  useEffect(() => {
    if (!accessLoading && projectId) {
      if (!isClient || !hasReportAccess(projectId, 'generator_report', 'view')) {
        toast.error("Access denied");
        navigate("/client-portal");
      }
    }
  }, [accessLoading, isClient, projectId, hasReportAccess, navigate]);

  const { data: project } = useQuery({
    queryKey: ['client-project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId
  });

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['client-generator-tenants', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          id,
          shop_number,
          shop_name,
          area,
          shop_category,
          generator_zone_id,
          generator_loading_sector_1,
          generator_loading_sector_2,
          manual_kw_override
        `)
        .eq('project_id', projectId)
        .order('shop_number');
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId
  });

  const { data: zones } = useQuery({
    queryKey: ['client-generator-zones', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generator_zones')
        .select('id, zone_name, zone_number, generator_size, num_generators')
        .eq('project_id', projectId)
        .order('display_order');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId
  });

  const { data: generatorSettings } = useQuery({
    queryKey: ['client-generator-settings', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generator_settings')
        .select('*')
        .eq('project_id', projectId);
      
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!projectId
  });

  const canComment = projectId ? hasReportAccess(projectId, 'generator_report', 'comment') : false;
  const canApprove = projectId ? hasReportAccess(projectId, 'generator_report', 'approve') : false;

  // Calculate tenant loading - must match GeneratorTenantList exactly
  const getTenantLoading = (tenant: any) => {
    if (tenant.own_generator_provided) return 0;
    
    // Use manual override if set
    if (tenant.manual_kw_override !== null && tenant.manual_kw_override !== undefined) {
      return Number(tenant.manual_kw_override);
    }
    
    // Otherwise calculate based on area and category
    if (!tenant.area) return 0;
    
    const kwPerSqm = {
      standard: generatorSettings?.standard_kw_per_sqm || 0.03,
      fast_food: generatorSettings?.fast_food_kw_per_sqm || 0.045,
      restaurant: generatorSettings?.restaurant_kw_per_sqm || 0.045,
      national: generatorSettings?.national_kw_per_sqm || 0.03,
    };
    
    const category = tenant.shop_category?.toLowerCase() || 'standard';
    const rate = kwPerSqm[category as keyof typeof kwPerSqm] || kwPerSqm.standard;
    
    return tenant.area * rate;
  };

  // Calculate zone loading
  const getZoneLoading = (zoneId: string) => {
    const zoneTenants = tenants?.filter((t: any) => t.generator_zone_id === zoneId) || [];
    return zoneTenants.reduce((sum: number, t: any) => sum + getTenantLoading(t), 0);
  };

  const getTotalLoading = () => {
    return tenants?.reduce((sum: number, t: any) => sum + getTenantLoading(t), 0) || 0;
  };

  if (accessLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client-portal")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Generator Report</h1>
            <p className="text-sm text-muted-foreground">{project?.name}</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tenants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tenants?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Generator Zones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{zones?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Load (kW)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getTotalLoading().toFixed(1)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Zone Summary */}
        {zones && zones.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Generator Zone Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {zones.map((zone: any) => (
                  <div key={zone.id} className="p-4 rounded-lg border bg-muted/50">
                    <div className="font-medium">{zone.zone_name}</div>
                    <div className="text-sm text-muted-foreground mb-1">
                      {zone.num_generators}x {zone.generator_size}
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {getZoneLoading(zone.id).toFixed(1)} kW
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tenants?.filter((t: any) => t.generator_zone_id === zone.id).length || 0} tenants
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tenant Loading Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Tenant Loading Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shop #</TableHead>
                    <TableHead>Tenant Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Area (m²)</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead className="text-right">Load (kW)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortTenantsByShopNumber(tenants || []).map((tenant: any) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.shop_number}</TableCell>
                      <TableCell>{tenant.shop_name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{tenant.shop_category || 'Retail'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{tenant.area?.toLocaleString() || '-'}</TableCell>
                      <TableCell>
                        {zones?.find((z: any) => z.id === tenant.generator_zone_id)?.zone_name || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {getTenantLoading(tenant).toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Comments and Approval */}
        <div className="grid gap-6 lg:grid-cols-2">
          {projectId && (
            <>
              <ClientComments 
                projectId={projectId} 
                reportType="generator_report" 
                canComment={canComment}
              />
              <ClientApproval 
                projectId={projectId} 
                reportType="generator_report" 
                canApprove={canApprove}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ClientGeneratorReport;
