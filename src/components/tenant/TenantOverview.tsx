import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2, Calculator, CheckCircle2, Package, Lightbulb, FileText, LayoutGrid, DollarSign, TrendingUp, PercentIcon, AlertCircle, FolderSymlink } from "lucide-react";
import { useHandoverLinkStatus } from "@/hooks/useHandoverLinkStatus";

interface Tenant {
  id: string;
  shop_category: string;
  area: number | null;
  db_ordered: boolean;
  db_cost: number | null;
  lighting_ordered: boolean;
  lighting_cost: number | null;
  sow_received: boolean;
  layout_received: boolean;
  cost_reported: boolean;
}

interface TenantOverviewProps {
  tenants: Tenant[];
  projectId: string;
}

export const TenantOverview = ({ tenants, projectId }: TenantOverviewProps) => {
  const totalTenants = tenants.length;
  const totalArea = tenants.reduce((sum, t) => sum + (t.area || 0), 0);
  
  // Fetch handover link status
  const { data: handoverLinkStatus } = useHandoverLinkStatus(projectId);
  const tenantsLinkedToHandover = handoverLinkStatus?.totalLinked || 0;
  const handoverLinkProgress = totalTenants > 0 ? (tenantsLinkedToHandover / totalTenants) * 100 : 0;
  
  const categoryCounts = tenants.reduce((acc, t) => {
    acc[t.shop_category] = (acc[t.shop_category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dbOrdered = tenants.filter(t => t.db_ordered).length;
  const lightingOrdered = tenants.filter(t => t.lighting_ordered).length;
  const sowReceived = tenants.filter(t => t.sow_received).length;
  const layoutReceived = tenants.filter(t => t.layout_received).length;
  const costReported = tenants.filter(t => t.cost_reported).length;

  const totalDbCost = tenants.reduce((sum, t) => sum + (t.db_cost || 0), 0);
  const totalLightingCost = tenants.reduce((sum, t) => sum + (t.lighting_cost || 0), 0);
  const totalCost = totalDbCost + totalLightingCost;

  // Calculate completion percentages
  const sowProgress = totalTenants > 0 ? (sowReceived / totalTenants) * 100 : 0;
  const layoutProgress = totalTenants > 0 ? (layoutReceived / totalTenants) * 100 : 0;
  const dbProgress = totalTenants > 0 ? (dbOrdered / totalTenants) * 100 : 0;
  const lightingProgress = totalTenants > 0 ? (lightingOrdered / totalTenants) * 100 : 0;
  const costProgress = totalTenants > 0 ? (costReported / totalTenants) * 100 : 0;
  const overallProgress = (sowProgress + layoutProgress + dbProgress + lightingProgress + costProgress) / 5;

  // Calculate financial metrics
  const avgCostPerTenant = totalTenants > 0 ? totalCost / totalTenants : 0;
  const avgCostPerSqm = totalArea > 0 ? totalCost / totalArea : 0;
  const tenantsWithCosts = tenants.filter(t => (t.db_cost || 0) > 0 || (t.lighting_cost || 0) > 0).length;

  // Identify pending items
  const pendingSOW = totalTenants - sowReceived;
  const pendingLayouts = totalTenants - layoutReceived;
  const pendingDBOrders = totalTenants - dbOrdered;
  const pendingLightingOrders = totalTenants - lightingOrdered;

  const getCategoryColor = (category: string) => {
    const colors = {
      standard: "bg-blue-500 text-white border-blue-600",
      fast_food: "bg-red-500 text-white border-red-600",
      restaurant: "bg-emerald-500 text-white border-emerald-600",
      national: "bg-purple-600 text-white border-purple-700"
    };
    return colors[category as keyof typeof colors] || "bg-gray-500 text-white";
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      standard: "Standard",
      fast_food: "Fast Food",
      restaurant: "Restaurant",
      national: "National"
    };
    return labels[category as keyof typeof labels] || category;
  };

  return (
    <div className="space-y-6">
      {/* Hero Stats Row */}
      <div id="tenant-hero-stats" className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Tenants - Large Metric Card */}
        <Card className="relative overflow-hidden border-l-4 border-l-primary shadow-md">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Total Tenants</p>
                <p className="text-4xl font-bold text-foreground">{totalTenants}</p>
                <p className="text-xs text-muted-foreground">
                  {Object.keys(categoryCounts).length} categories
                </p>
              </div>
              <div className="bg-primary/10 p-3 rounded-lg">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Area - Large Metric Card */}
        <Card className="relative overflow-hidden border-l-4 border-l-blue-500 shadow-md">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16" />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Total Area</p>
                <p className="text-4xl font-bold text-foreground">{totalArea.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  {totalTenants > 0 ? (totalArea / totalTenants).toFixed(1) : 0} m² avg
                </p>
              </div>
              <div className="bg-blue-500/10 p-3 rounded-lg">
                <Calculator className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Cost - Large Metric Card */}
        <Card className="relative overflow-hidden border-l-4 border-l-emerald-500 shadow-md">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16" />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                <p className="text-4xl font-bold text-foreground">R{(totalCost / 1000).toFixed(0)}k</p>
                <p className="text-xs text-muted-foreground">
                  {tenantsWithCosts}/{totalTenants} costed
                </p>
              </div>
              <div className="bg-emerald-500/10 p-3 rounded-lg">
                <DollarSign className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall Progress - Circular Card */}
        <Card className="relative overflow-hidden border-l-4 border-l-amber-500 shadow-md">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16" />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Completion</p>
                <p className="text-4xl font-bold text-foreground">{overallProgress.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">
                  Overall progress
                </p>
              </div>
              <div className="bg-amber-500/10 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Tracker Grid */}
      <Card id="tenant-progress-tracker" className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            Task Progress Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* SOW Progress */}
            <div className="space-y-3 p-4 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-md bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium text-sm">SOW Documents</span>
                </div>
                <Badge variant={sowProgress === 100 ? "default" : "secondary"}>
                  {sowReceived}/{totalTenants}
                </Badge>
              </div>
              <Progress value={sowProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">{sowProgress.toFixed(0)}% complete</p>
            </div>

            {/* Layout Progress */}
            <div className="space-y-3 p-4 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-md bg-blue-500/10">
                    <LayoutGrid className="h-4 w-4 text-blue-500" />
                  </div>
                  <span className="font-medium text-sm">Layout Plans</span>
                </div>
                <Badge variant={layoutProgress === 100 ? "default" : "secondary"}>
                  {layoutReceived}/{totalTenants}
                </Badge>
              </div>
              <Progress value={layoutProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">{layoutProgress.toFixed(0)}% complete</p>
            </div>

            {/* DB Orders Progress */}
            <div className="space-y-3 p-4 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-md bg-emerald-500/10">
                    <Package className="h-4 w-4 text-emerald-500" />
                  </div>
                  <span className="font-medium text-sm">DB Orders</span>
                </div>
                <Badge variant={dbProgress === 100 ? "default" : "secondary"}>
                  {dbOrdered}/{totalTenants}
                </Badge>
              </div>
              <Progress value={dbProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">{dbProgress.toFixed(0)}% complete</p>
            </div>

            {/* Lighting Progress */}
            <div className="space-y-3 p-4 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-md bg-amber-500/10">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                  </div>
                  <span className="font-medium text-sm">Lighting Orders</span>
                </div>
                <Badge variant={lightingProgress === 100 ? "default" : "secondary"}>
                  {lightingOrdered}/{totalTenants}
                </Badge>
              </div>
              <Progress value={lightingProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">{lightingProgress.toFixed(0)}% complete</p>
            </div>

            {/* Cost Reports Progress */}
            <div className="space-y-3 p-4 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-md bg-purple-500/10">
                    <Calculator className="h-4 w-4 text-purple-500" />
                  </div>
                  <span className="font-medium text-sm">Cost Reports</span>
                </div>
                <Badge variant={costProgress === 100 ? "default" : "secondary"}>
                  {costReported}/{totalTenants}
                </Badge>
              </div>
              <Progress value={costProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">{costProgress.toFixed(0)}% complete</p>
            </div>

            {/* Handover Links Progress */}
            <div className="space-y-3 p-4 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-md bg-rose-500/10">
                    <FolderSymlink className="h-4 w-4 text-rose-500" />
                  </div>
                  <span className="font-medium text-sm">Handover Links</span>
                </div>
                <Badge variant={handoverLinkProgress === 100 ? "default" : "secondary"}>
                  {tenantsLinkedToHandover}/{totalTenants}
                </Badge>
              </div>
              <Progress value={handoverLinkProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">{handoverLinkProgress.toFixed(0)}% complete</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Breakdown & Category Distribution */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Cost Breakdown Card */}
        <Card id="tenant-financial-breakdown" className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Financial Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {/* Distribution Boards */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-sm font-medium">Distribution Boards</span>
                  </div>
                  <span className="text-lg font-bold">R{(totalDbCost / 1000).toFixed(0)}k</span>
                </div>
                <Progress 
                  value={totalCost > 0 ? (totalDbCost / totalCost) * 100 : 0} 
                  className="h-2 bg-emerald-500/20"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{totalCost > 0 ? ((totalDbCost / totalCost) * 100).toFixed(1) : 0}% of total</span>
                  <span>R{totalDbCost.toLocaleString()}</span>
                </div>
              </div>

              {/* Lighting */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-sm font-medium">Lighting</span>
                  </div>
                  <span className="text-lg font-bold">R{(totalLightingCost / 1000).toFixed(0)}k</span>
                </div>
                <Progress 
                  value={totalCost > 0 ? (totalLightingCost / totalCost) * 100 : 0} 
                  className="h-2 bg-amber-500/20"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{totalCost > 0 ? ((totalLightingCost / totalCost) * 100).toFixed(1) : 0}% of total</span>
                  <span>R{totalLightingCost.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Cost Per Metrics */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Per Tenant</p>
                <p className="text-xl font-bold">R{(avgCostPerTenant / 1000).toFixed(1)}k</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Per m²</p>
                <p className="text-xl font-bold">R{avgCostPerSqm.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card id="tenant-category-distribution" className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              Category Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(categoryCounts).map(([category, count]) => {
                const percentage = totalTenants > 0 ? ((count / totalTenants) * 100) : 0;
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getCategoryColor(category)}>
                          {getCategoryLabel(category)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</span>
                        <span className="text-lg font-bold">{count}</span>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>

            {/* Total Summary */}
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Total Units</span>
                <span className="text-2xl font-bold text-primary">{totalTenants}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Actions Alert */}
      {(pendingSOW > 0 || pendingLayouts > 0 || pendingDBOrders > 0 || pendingLightingOrders > 0) && (
        <Card className="border-amber-500/50 bg-amber-500/5 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-5 w-5" />
              Outstanding Actions Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {pendingSOW > 0 && (
                <div className="flex items-center gap-2 p-3 bg-background rounded-lg">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">SOW Docs</p>
                    <p className="text-xs text-muted-foreground">{pendingSOW} pending</p>
                  </div>
                </div>
              )}
              {pendingLayouts > 0 && (
                <div className="flex items-center gap-2 p-3 bg-background rounded-lg">
                  <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Layouts</p>
                    <p className="text-xs text-muted-foreground">{pendingLayouts} pending</p>
                  </div>
                </div>
              )}
              {pendingDBOrders > 0 && (
                <div className="flex items-center gap-2 p-3 bg-background rounded-lg">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">DB Orders</p>
                    <p className="text-xs text-muted-foreground">{pendingDBOrders} pending</p>
                  </div>
                </div>
              )}
              {pendingLightingOrders > 0 && (
                <div className="flex items-center gap-2 p-3 bg-background rounded-lg">
                  <Lightbulb className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Lighting</p>
                    <p className="text-xs text-muted-foreground">{pendingLightingOrders} pending</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
