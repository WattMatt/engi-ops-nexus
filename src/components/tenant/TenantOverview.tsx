import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2, Calculator, CheckCircle2, Package, Lightbulb, FileText, LayoutGrid, DollarSign, TrendingUp, PercentIcon, AlertCircle } from "lucide-react";

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
}

export const TenantOverview = ({ tenants }: TenantOverviewProps) => {
  const totalTenants = tenants.length;
  const totalArea = tenants.reduce((sum, t) => sum + (t.area || 0), 0);
  
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
      {/* Overall Progress Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Overall Project Completion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Project Progress</span>
              <span className="text-2xl font-bold text-primary">{overallProgress.toFixed(1)}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">SOW</p>
              <p className="text-lg font-semibold">{sowProgress.toFixed(0)}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Layouts</p>
              <p className="text-lg font-semibold">{layoutProgress.toFixed(0)}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">DB Orders</p>
              <p className="text-lg font-semibold">{dbProgress.toFixed(0)}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Lighting</p>
              <p className="text-lg font-semibold">{lightingProgress.toFixed(0)}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Costing</p>
              <p className="text-lg font-semibold">{costProgress.toFixed(0)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTenants}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {Object.keys(categoryCounts).length} categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Area</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalArea.toLocaleString()} m²</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg {totalTenants > 0 ? (totalArea / totalTenants).toFixed(1) : 0} m² per tenant
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Project Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{totalCost.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {tenantsWithCosts}/{totalTenants} tenants costed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost/Tenant</CardTitle>
            <PercentIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{avgCostPerTenant.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <p className="text-xs text-muted-foreground mt-1">
              R{avgCostPerSqm.toFixed(2)}/m²
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Distribution Boards</span>
                </div>
                <span className="font-bold">R{totalDbCost.toLocaleString()}</span>
              </div>
              <Progress 
                value={totalCost > 0 ? (totalDbCost / totalCost) * 100 : 0} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {totalCost > 0 ? ((totalDbCost / totalCost) * 100).toFixed(1) : 0}% of total cost
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Lighting</span>
                </div>
                <span className="font-bold">R{totalLightingCost.toLocaleString()}</span>
              </div>
              <Progress 
                value={totalCost > 0 ? (totalLightingCost / totalCost) * 100 : 0} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {totalCost > 0 ? ((totalLightingCost / totalCost) * 100).toFixed(1) : 0}% of total cost
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Pending Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingSOW > 0 && (
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <span className="text-sm">SOW Documents</span>
                <Badge variant="secondary">{pendingSOW} pending</Badge>
              </div>
            )}
            {pendingLayouts > 0 && (
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <span className="text-sm">Layout Drawings</span>
                <Badge variant="secondary">{pendingLayouts} pending</Badge>
              </div>
            )}
            {pendingDBOrders > 0 && (
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <span className="text-sm">DB Orders</span>
                <Badge variant="secondary">{pendingDBOrders} pending</Badge>
              </div>
            )}
            {pendingLightingOrders > 0 && (
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <span className="text-sm">Lighting Orders</span>
                <Badge variant="secondary">{pendingLightingOrders} pending</Badge>
              </div>
            )}
            {pendingSOW === 0 && pendingLayouts === 0 && pendingDBOrders === 0 && pendingLightingOrders === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-sm">All actions completed!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Category Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(categoryCounts).map(([category, count]) => (
              <div key={category} className="text-center p-3 bg-muted/30 rounded-lg">
                <Badge variant="outline" className={`${getCategoryColor(category)} mb-2`}>
                  {getCategoryLabel(category)}
                </Badge>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">
                  {totalTenants > 0 ? ((count / totalTenants) * 100).toFixed(1) : 0}% of total
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
