import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Package, FileSpreadsheet, MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const MaterialAnalyticsTab = () => {
  // Fetch summary statistics
  const { data: stats } = useQuery({
    queryKey: ["material-stats"],
    queryFn: async () => {
      // Materials count
      const { count: materialsCount } = await supabase
        .from("master_materials")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);


      // BOQ uploads count
      const { count: uploadsCount } = await supabase
        .from("boq_uploads")
        .select("*", { count: "exact", head: true });

      // Categories count
      const { count: categoriesCount } = await supabase
        .from("material_categories")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      return {
        materials: materialsCount || 0,
        uploads: uploadsCount || 0,
        categories: categoriesCount || 0,
      };
    },
  });

  // Fetch top used materials
  const { data: topMaterials } = useQuery({
    queryKey: ["top-materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("master_materials")
        .select("material_code, material_name, usage_count, standard_supply_cost, standard_install_cost")
        .eq("is_active", true)
        .order("usage_count", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Fetch materials by category
  const { data: categoryBreakdown } = useQuery({
    queryKey: ["category-breakdown"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("master_materials")
        .select(`
          category_id,
          material_categories (
            category_code,
            category_name
          )
        `)
        .eq("is_active", true);

      if (error) throw error;

      // Group by category
      const counts: Record<string, { code: string; name: string; count: number }> = {};
      data?.forEach((m) => {
        const cat = m.material_categories as { category_code: string; category_name: string } | null;
        if (cat) {
          if (!counts[cat.category_code]) {
            counts[cat.category_code] = { code: cat.category_code, name: cat.category_name, count: 0 };
          }
          counts[cat.category_code].count++;
        }
      });

      return Object.values(counts).sort((a, b) => b.count - a.count);
    },
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Materials</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.materials || 0}</div>
            <p className="text-xs text-muted-foreground">In master library</p>
          </CardContent>
        </Card>


        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">BOQ Uploads</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.uploads || 0}</div>
            <p className="text-xs text-muted-foreground">Documents processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.categories || 0}</div>
            <p className="text-xs text-muted-foreground">Material categories</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Used Materials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Most Used Materials
            </CardTitle>
            <CardDescription>Materials frequently used across projects</CardDescription>
          </CardHeader>
          <CardContent>
            {topMaterials?.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No usage data yet. Materials will appear here as they're used in projects.
              </p>
            ) : (
              <div className="space-y-3">
                {topMaterials?.map((material, index) => (
                  <div
                    key={material.material_code}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-6 h-6 flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <div className="font-medium text-sm">{material.material_name}</div>
                        <div className="text-xs text-muted-foreground">{material.material_code}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm">
                        {formatCurrency(material.standard_supply_cost + material.standard_install_cost)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {material.usage_count} uses
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Materials by Category
            </CardTitle>
            <CardDescription>Distribution of materials across categories</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryBreakdown?.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No categories with materials yet.
              </p>
            ) : (
              <div className="space-y-3">
                {categoryBreakdown?.map((cat) => {
                  const total = categoryBreakdown.reduce((sum, c) => sum + c.count, 0);
                  const percent = total > 0 ? (cat.count / total) * 100 : 0;

                  return (
                    <div key={cat.code} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {cat.code} - {cat.name}
                        </span>
                        <span className="text-muted-foreground">{cat.count} items</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Regional Price Comparison Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Regional Price Analysis
          </CardTitle>
          <CardDescription>
            Compare material costs across South African provinces
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-4">
            {[
              { name: "Gauteng", modifier: 1.0 },
              { name: "KZN", modifier: 1.05 },
              { name: "Western Cape", modifier: 1.03 },
              { name: "Eastern Cape", modifier: 1.08 },
              { name: "Limpopo", modifier: 1.1 },
              { name: "Mpumalanga", modifier: 1.07 },
              { name: "Free State", modifier: 1.06 },
              { name: "North West", modifier: 1.09 },
              { name: "Northern Cape", modifier: 1.12 },
            ].map((province) => (
              <div
                key={province.name}
                className="text-center p-3 rounded-lg bg-muted/50"
              >
                <div className="text-xs text-muted-foreground mb-1">{province.name}</div>
                <div className="font-mono font-bold">
                  {province.modifier === 1 ? "Base" : `+${((province.modifier - 1) * 100).toFixed(0)}%`}
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Regional modifiers are applied automatically when creating project-specific BOQs
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
