import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Lock, Unlock, Trash2 } from "lucide-react";
import { useProjectTenants, useMasterTenantProfiles, resolveRate, autoSizeDb } from "@/hooks/useBudgetEngine";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Props {
  budgetId: string;
  budget: any;
}

export const BudgetTenantPhase = ({ budgetId, budget }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tenants = [] } = useProjectTenants(budgetId);
  const { data: profiles = [] } = useMasterTenantProfiles();
  const [adding, setAdding] = useState(false);
  const [newShop, setNewShop] = useState({ shop_no: "", shop_name: "", area_m2: "" });

  const baseRate = Number(budget.base_rate_m2);

  const findProfile = (name: string) => {
    const lower = name.toLowerCase().trim();
    return profiles.find((p) => p.tenant_name.toLowerCase() === lower) || null;
  };

  const handleAdd = async () => {
    if (!newShop.shop_no || !newShop.shop_name || !newShop.area_m2) return;
    setAdding(true);
    const profile = findProfile(newShop.shop_name);
    const area = parseFloat(newShop.area_m2);
    const { error } = await supabase.from("project_tenants").insert({
      budget_id: budgetId,
      shop_no: newShop.shop_no,
      shop_name: newShop.shop_name,
      area_m2: area,
      matched_profile_id: profile?.id || null,
      snapshotted_ti_rate: profile?.default_ti_rate ? Number(profile.default_ti_rate) : 0,
      snapshotted_base_rate: baseRate,
      display_order: tenants.length,
    });
    setAdding(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewShop({ shop_no: "", shop_name: "", area_m2: "" });
      queryClient.invalidateQueries({ queryKey: ["project-tenants", budgetId] });
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("project_tenants").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["project-tenants", budgetId] });
  };

  const handleOverrideTi = async (id: string, value: string) => {
    const v = value === "" ? null : parseFloat(value);
    await supabase.from("project_tenants").update({ override_ti_rate: v }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["project-tenants", budgetId] });
  };

  const handleStandbyChange = async (id: string, val: "centre_generator" | "tenant_own_supply") => {
    await supabase.from("project_tenants").update({ standby_source: val }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["project-tenants", budgetId] });
  };

  const formatR = (v: number) => `R ${v.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tenant Schedule</h1>
          <p className="text-muted-foreground text-sm">{tenants.length} shops · Base rate: {formatR(baseRate)}/m²</p>
        </div>
      </div>

      {/* Add Row */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-2 items-end">
            <div className="w-24">
              <label className="text-xs font-medium">Shop No</label>
              <Input value={newShop.shop_no} onChange={(e) => setNewShop({ ...newShop, shop_no: e.target.value })} placeholder="S01" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium">Name</label>
              <Input value={newShop.shop_name} onChange={(e) => setNewShop({ ...newShop, shop_name: e.target.value })} placeholder="Tenant name" list="profile-list" />
              <datalist id="profile-list">
                {profiles.map((p) => <option key={p.id} value={p.tenant_name} />)}
              </datalist>
            </div>
            <div className="w-28">
              <label className="text-xs font-medium">Area (m²)</label>
              <Input type="number" value={newShop.area_m2} onChange={(e) => setNewShop({ ...newShop, area_m2: e.target.value })} placeholder="0" />
            </div>
            <Button onClick={handleAdd} disabled={adding} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      {tenants.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Shop</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right w-20">Area</TableHead>
                  <TableHead className="text-right w-24">DB Size</TableHead>
                  <TableHead className="text-right w-28">TI Rate</TableHead>
                  <TableHead className="text-right w-32">Total</TableHead>
                  <TableHead className="w-36">Standby</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((t: any) => {
                  const profile = t.master_tenant_profiles;
                  const tiRate = t.override_ti_rate != null ? Number(t.override_ti_rate) : (profile?.default_ti_rate ? Number(profile.default_ti_rate) : 0);
                  const { lineTotal } = resolveRate(Number(t.area_m2), baseRate, t.override_ti_rate ? Number(t.override_ti_rate) : null, profile?.default_ti_rate ? Number(profile.default_ti_rate) : 0);
                  const isOverridden = t.override_ti_rate != null;

                  return (
                    <TableRow key={t.id} className="group">
                      <TableCell className="font-medium">{t.shop_no}</TableCell>
                      <TableCell>
                        <div>
                          {t.shop_name}
                          {profile && <span className="text-xs text-muted-foreground ml-1">({profile.category})</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{Number(t.area_m2).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-xs">{t.db_size || autoSizeDb(Number(t.area_m2))}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isOverridden ? (
                            <Unlock className="h-3 w-3 text-accent-foreground" />
                          ) : (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          )}
                          <Input
                            type="number"
                            className="w-20 h-7 text-xs text-right"
                            value={t.override_ti_rate ?? (profile?.default_ti_rate || 0)}
                            onChange={(e) => handleOverrideTi(t.id, e.target.value)}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatR(lineTotal)}</TableCell>
                      <TableCell>
                        <Select value={t.standby_source} onValueChange={(v: "centre_generator" | "tenant_own_supply") => handleStandbyChange(t.id, v)}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tenant_own_supply">Own</SelectItem>
                            <SelectItem value="centre_generator">Centre</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                          onClick={() => handleDelete(t.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
