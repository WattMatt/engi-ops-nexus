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
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Building2, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { sortTenantsByShopNumber } from "@/utils/tenantSorting";

const ClientTenantReport = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { isClient, hasReportAccess, loading: accessLoading } = useClientAccess();

  useEffect(() => {
    if (!accessLoading && projectId) {
      if (!isClient || !hasReportAccess(projectId, 'tenant_report', 'view')) {
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
    queryKey: ['client-tenants', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          id,
          shop_number,
          shop_name,
          area,
          shop_category,
          opening_date,
          layout_received,
          sow_received,
          db_ordered,
          lighting_ordered
        `)
        .eq('project_id', projectId)
        .order('shop_number');
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId
  });

  const canComment = projectId ? hasReportAccess(projectId, 'tenant_report', 'comment') : false;
  const canApprove = projectId ? hasReportAccess(projectId, 'tenant_report', 'approve') : false;

  const isComplete = (tenant: any) => {
    return tenant.layout_received && tenant.sow_received && tenant.db_ordered && tenant.lighting_ordered;
  };

  const getStatusBadge = (tenant: any) => {
    if (isComplete(tenant)) {
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Complete</Badge>;
    }
    if (tenant.layout_received || tenant.sow_received) {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
    }
    return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  const calculateProgress = () => {
    if (!tenants?.length) return 0;
    const completed = tenants.filter((t: any) => isComplete(t)).length;
    return Math.round((completed / tenants.length) * 100);
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
            <h1 className="text-xl font-semibold">Tenant Report</h1>
            <p className="text-sm text-muted-foreground">{project?.name}</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Area</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tenants?.reduce((sum: number, t: any) => sum + (t.area || 0), 0).toLocaleString()} m²
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tenants?.filter((t: any) => isComplete(t)).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">{calculateProgress()}%</div>
                <Progress value={calculateProgress()} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tenant Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Tenant Schedule
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
                    <TableHead>Opening Date</TableHead>
                    <TableHead>Status</TableHead>
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
                        {tenant.opening_date 
                          ? new Date(tenant.opening_date).toLocaleDateString() 
                          : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(tenant)}</TableCell>
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
                reportType="tenant_report" 
                canComment={canComment}
              />
              <ClientApproval 
                projectId={projectId} 
                reportType="tenant_report" 
                canApprove={canApprove}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ClientTenantReport;
