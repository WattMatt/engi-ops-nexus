import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Users, Store } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { RetailerRateDialog } from "./RetailerRateDialog";

interface Retailer {
  id: string;
  retailer_name: string;
  category_id: string | null;
  typical_area_min: number | null;
  typical_area_max: number | null;
  is_active: boolean;
  retailer_categories?: {
    category_code: string;
    category_name: string;
    typical_base_rate: number | null;
    typical_ti_rate: number | null;
  };
}

interface Rate {
  id: string;
  retailer_id: string | null;
  item_type: string;
  item_code: string | null;
  item_description: string;
  base_rate: number;
  ti_rate: number;
  unit: string;
  is_current: boolean;
  usage_count: number;
  retailer_master?: {
    retailer_name: string;
  };
}

export const RetailerRatesTab = () => {
  const [search, setSearch] = useState("");
  const [selectedRate, setSelectedRate] = useState<Rate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [view, setView] = useState<"retailers" | "rates">("retailers");
  const queryClient = useQueryClient();

  const { data: retailers, isLoading: loadingRetailers } = useQuery({
    queryKey: ["retailers", search],
    queryFn: async () => {
      let query = supabase
        .from("retailer_master")
        .select(`
          *,
          retailer_categories (
            category_code,
            category_name,
            typical_base_rate,
            typical_ti_rate
          )
        `)
        .eq("is_active", true)
        .order("retailer_name");

      if (search) {
        query = query.ilike("retailer_name", `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Retailer[];
    },
    enabled: view === "retailers",
  });

  const { data: rates, isLoading: loadingRates } = useQuery({
    queryKey: ["master-rates", search],
    queryFn: async () => {
      let query = supabase
        .from("master_rate_library")
        .select(`
          *,
          retailer_master (
            retailer_name
          )
        `)
        .eq("is_current", true)
        .order("item_description");

      if (search) {
        query = query.ilike("item_description", `%${search}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as Rate[];
    },
    enabled: view === "rates",
  });

  const handleNew = () => {
    setSelectedRate(null);
    setDialogOpen(true);
  };

  const handleEdit = (rate: Rate) => {
    setSelectedRate(rate);
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Retailer Rates Library
            </CardTitle>
            <CardDescription>
              Manage retailer-specific rates for base building and tenant improvements
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={view === "retailers" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("retailers")}
            >
              <Store className="h-4 w-4 mr-2" />
              Retailers
            </Button>
            <Button
              variant={view === "rates" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("rates")}
            >
              Rates
            </Button>
            {view === "rates" && (
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add Rate
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={view === "retailers" ? "Search retailers..." : "Search rates..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {view === "retailers" ? (
          loadingRetailers ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Retailer</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Typical Area</TableHead>
                    <TableHead className="text-right">Base Rate</TableHead>
                    <TableHead className="text-right">TI Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {retailers?.map((retailer) => (
                    <TableRow key={retailer.id}>
                      <TableCell className="font-medium">{retailer.retailer_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {retailer.retailer_categories?.category_name || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {retailer.typical_area_min && retailer.typical_area_max
                          ? `${retailer.typical_area_min} - ${retailer.typical_area_max} m²`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {retailer.retailer_categories?.typical_base_rate
                          ? formatCurrency(retailer.retailer_categories.typical_base_rate) + "/m²"
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {retailer.retailer_categories?.typical_ti_rate
                          ? formatCurrency(retailer.retailer_categories.typical_ti_rate) + "/m²"
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        ) : loadingRates ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Retailer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Base Rate</TableHead>
                  <TableHead className="text-right">TI Rate</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-center">Uses</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates?.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {rate.item_description}
                    </TableCell>
                    <TableCell>
                      {rate.retailer_master?.retailer_name || (
                        <Badge variant="secondary">Generic</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{rate.item_type}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(rate.base_rate)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(rate.ti_rate)}
                    </TableCell>
                    <TableCell>{rate.unit}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{rate.usage_count}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(rate)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <RetailerRateDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          rate={selectedRate}
        />
      </CardContent>
    </Card>
  );
};
