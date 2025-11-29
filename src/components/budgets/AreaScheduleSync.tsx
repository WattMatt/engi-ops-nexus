import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, RefreshCw, AlertTriangle, CheckCircle, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AreaScheduleItem {
  shop_number: string;
  tenant_name: string;
  area: number;
  area_unit: string;
  category: string;
}

interface AreaScheduleSyncProps {
  projectId: string;
  areaSchedule: AreaScheduleItem[];
  onSyncComplete: () => void;
}

interface TenantMatch {
  budgetItem: AreaScheduleItem;
  existingTenant: any | null;
  areaDifference: number | null;
  action: 'match' | 'create' | 'update_budget' | 'update_tenant' | 'skip';
}

export const AreaScheduleSync = ({ projectId, areaSchedule, onSyncComplete }: AreaScheduleSyncProps) => {
  const [matches, setMatches] = useState<TenantMatch[]>([]);
  const [selectedActions, setSelectedActions] = useState<Record<string, string>>({});
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: existingTenants = [] } = useQuery({
    queryKey: ["tenants-for-sync", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data || [];
    },
  });

  // Match budget items to existing tenants when data loads
  useState(() => {
    if (areaSchedule.length > 0 && existingTenants) {
      const newMatches: TenantMatch[] = areaSchedule.map(item => {
        // Try to find matching tenant by shop number
        const normalizedShopNumber = normalizeShopNumber(item.shop_number);
        const existingTenant = existingTenants.find(t => 
          normalizeShopNumber(t.shop_number) === normalizedShopNumber
        );

        let areaDifference: number | null = null;
        if (existingTenant) {
          areaDifference = Math.abs(item.area - (existingTenant.area || 0));
        }

        return {
          budgetItem: item,
          existingTenant,
          areaDifference,
          action: existingTenant 
            ? (areaDifference && areaDifference > 0.1 ? 'update_tenant' : 'match')
            : 'create'
        };
      });

      setMatches(newMatches);
      
      // Set default actions
      const defaultActions: Record<string, string> = {};
      newMatches.forEach((match, idx) => {
        defaultActions[idx.toString()] = match.action;
      });
      setSelectedActions(defaultActions);
    }
  });

  const normalizeShopNumber = (shopNumber: string): string => {
    // Extract numeric portion for comparison
    // "Shop 77" -> "77", "SHOP 1" -> "1", "Shop 27/28" -> "27/28"
    const match = shopNumber.match(/(\d+(?:\/\d+)?[A-Za-z]?)/);
    return match ? match[1].toLowerCase() : shopNumber.toLowerCase();
  };

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'fast food': return 'bg-red-500 text-white';
      case 'restaurant': return 'bg-emerald-500 text-white';
      case 'national': return 'bg-purple-600 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const handleActionChange = (index: number, action: string) => {
    setSelectedActions(prev => ({
      ...prev,
      [index.toString()]: action
    }));
  };

  const handleSync = async () => {
    setSyncing(true);
    let created = 0;
    let updated = 0;

    try {
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const action = selectedActions[i.toString()];

        if (action === 'create') {
          // Create new tenant
          const categoryMap: Record<string, string> = {
            'standard': 'standard',
            'fast food': 'fast_food',
            'restaurant': 'restaurant',
            'national': 'national',
          };
          const shopCategory = categoryMap[match.budgetItem.category.toLowerCase()] || 'standard';
          
          const { error } = await supabase
            .from('tenants')
            .insert({
              project_id: projectId,
              shop_number: `Shop ${match.budgetItem.shop_number}`,
              shop_name: match.budgetItem.tenant_name,
              area: match.budgetItem.area,
              shop_category: shopCategory,
            });
          if (error) throw error;
          created++;
        } else if (action === 'update_tenant' && match.existingTenant) {
          // Update tenant area from budget
          const { error } = await supabase
            .from('tenants')
            .update({ area: match.budgetItem.area })
            .eq('id', match.existingTenant.id);
          if (error) throw error;
          updated++;
        }
      }

      toast({
        title: "Sync Complete",
        description: `Created ${created} tenants, updated ${updated} tenant areas`,
      });

      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      onSyncComplete();
    } catch (error: any) {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const hasChanges = Object.values(selectedActions).some(
    action => action === 'create' || action === 'update_tenant' || action === 'update_budget'
  );

  if (areaSchedule.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Area Schedule Sync
        </CardTitle>
        <CardDescription>
          Compare extracted tenant areas with Tenant Tracker and sync discrepancies
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop #</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Budget Area</TableHead>
                <TableHead>Tracker Area</TableHead>
                <TableHead>Difference</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((match, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {match.budgetItem.shop_number}
                  </TableCell>
                  <TableCell>{match.budgetItem.tenant_name}</TableCell>
                  <TableCell>
                    {match.budgetItem.area.toFixed(1)} {match.budgetItem.area_unit}
                  </TableCell>
                  <TableCell>
                    {match.existingTenant 
                      ? `${match.existingTenant.area?.toFixed(1) || '—'} m²`
                      : <span className="text-muted-foreground">Not in tracker</span>
                    }
                  </TableCell>
                  <TableCell>
                    {match.areaDifference !== null && match.areaDifference > 0.1 ? (
                      <Badge variant="outline" className="text-amber-600 border-amber-600">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {match.areaDifference.toFixed(1)} m²
                      </Badge>
                    ) : match.existingTenant ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Match
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge className={getCategoryColor(match.budgetItem.category)}>
                      {match.budgetItem.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <select
                      value={selectedActions[index.toString()] || 'skip'}
                      onChange={(e) => handleActionChange(index, e.target.value)}
                      className="text-sm border rounded px-2 py-1 bg-background"
                    >
                      {!match.existingTenant && (
                        <option value="create">Create Tenant</option>
                      )}
                      {match.existingTenant && match.areaDifference && match.areaDifference > 0.1 && (
                        <>
                          <option value="update_tenant">Use Budget Area</option>
                          <option value="update_budget">Keep Tracker Area</option>
                        </>
                      )}
                      {match.existingTenant && (!match.areaDifference || match.areaDifference <= 0.1) && (
                        <option value="match">Already Matched</option>
                      )}
                      <option value="skip">Skip</option>
                    </select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-muted-foreground">
            {matches.filter(m => !m.existingTenant).length} new tenants,{" "}
            {matches.filter(m => m.areaDifference && m.areaDifference > 0.1).length} with area differences
          </p>
          <Button 
            onClick={handleSync} 
            disabled={syncing || !hasChanges}
          >
            {syncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4 mr-2" />
                Apply Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
