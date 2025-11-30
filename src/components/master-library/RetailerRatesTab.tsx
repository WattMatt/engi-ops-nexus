import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Store, Building2, Filter } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BudgetTenant {
  id: string;
  description: string;
  shop_number: string | null;
  area: number | null;
  base_rate: number | null;
  ti_rate: number | null;
  total: number;
  section_name: string;
  budget_number: string;
  project_name: string;
  project_id: string;
}

export const RetailerRatesTab = () => {
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  // Fetch all projects for filter dropdown
  const { data: projects } = useQuery({
    queryKey: ["projects-for-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch tenant items from budgets across all projects
  const { data: budgetTenants, isLoading } = useQuery({
    queryKey: ["budget-tenants", search, projectFilter],
    queryFn: async () => {
      let query = supabase
        .from("budget_line_items")
        .select(`
          id,
          description,
          shop_number,
          area,
          base_rate,
          ti_rate,
          total,
          budget_sections!inner (
            section_name,
            budget_id,
            electrical_budgets!inner (
              budget_number,
              project_id,
              projects!inner (
                id,
                name
              )
            )
          )
        `)
        .or('is_tenant_item.eq.true,shop_number.neq.null')
        .order("description");

      if (search) {
        query = query.ilike("description", `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Transform the nested data
      const transformed = data?.map((item: any) => ({
        id: item.id,
        description: item.description,
        shop_number: item.shop_number,
        area: item.area,
        base_rate: item.base_rate,
        ti_rate: item.ti_rate,
        total: item.total,
        section_name: item.budget_sections?.section_name || '',
        budget_number: item.budget_sections?.electrical_budgets?.budget_number || '',
        project_name: item.budget_sections?.electrical_budgets?.projects?.name || '',
        project_id: item.budget_sections?.electrical_budgets?.project_id || '',
      })) || [];

      // Filter by project if selected
      if (projectFilter !== "all") {
        return transformed.filter((t: BudgetTenant) => t.project_id === projectFilter);
      }

      return transformed as BudgetTenant[];
    },
  });

  // Calculate summary stats
  const stats = budgetTenants ? {
    totalTenants: budgetTenants.length,
    uniqueProjects: new Set(budgetTenants.map(t => t.project_id)).size,
    avgBaseRate: budgetTenants.filter(t => t.base_rate).length > 0
      ? budgetTenants.reduce((sum, t) => sum + (t.base_rate || 0), 0) / budgetTenants.filter(t => t.base_rate).length
      : 0,
    avgTiRate: budgetTenants.filter(t => t.ti_rate).length > 0
      ? budgetTenants.reduce((sum, t) => sum + (t.ti_rate || 0), 0) / budgetTenants.filter(t => t.ti_rate).length
      : 0,
  } : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Budget Tenant Rates
            </CardTitle>
            <CardDescription>
              View tenant rates from all uploaded budgets across projects
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-2xl font-bold">{stats.totalTenants}</div>
              <div className="text-xs text-muted-foreground">Total Tenants</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-2xl font-bold">{stats.uniqueProjects}</div>
              <div className="text-xs text-muted-foreground">Projects</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-2xl font-bold">{formatCurrency(stats.avgBaseRate)}</div>
              <div className="text-xs text-muted-foreground">Avg Base Rate/m²</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-2xl font-bold">{formatCurrency(stats.avgTiRate)}</div>
              <div className="text-xs text-muted-foreground">Avg TI Rate/m²</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tenants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : budgetTenants && budgetTenants.length > 0 ? (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shop</TableHead>
                  <TableHead>Tenant Name</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      Project
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Area (m²)</TableHead>
                  <TableHead className="text-right">Base Rate</TableHead>
                  <TableHead className="text-right">TI Rate</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgetTenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <Badge variant="outline">{tenant.shop_number || "—"}</Badge>
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px]">
                      {tenant.description}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {tenant.project_name}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {tenant.area?.toFixed(2) || "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {tenant.base_rate ? formatCurrency(tenant.base_rate) + "/m²" : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {tenant.ti_rate ? formatCurrency(tenant.ti_rate) + "/m²" : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatCurrency(tenant.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tenant data found in budgets</p>
            <p className="text-sm">Upload budgets with retail sections to see tenant rates here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
