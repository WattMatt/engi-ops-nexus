/**
 * Meter-Shop Linking Component
 * Shows tenant schedule with profile linking dropdowns
 */

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Zap, 
  Activity,
  Search,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MeterShopLinkage } from './useLoadProfile';

// Define types locally until schema regenerates
interface StandardLoadProfile {
  id: string;
  name: string;
  description: string | null;
  category: string;
  va_per_sqm: number;
  diversity_factor: number;
  power_factor: number;
  typical_breaker_size: string | null;
  peak_hours_start: number;
  peak_hours_end: number;
  base_load_factor: number;
  is_active: boolean;
}

interface TenantScheduleEntry {
  id: string;
  project_id: string;
  shop_number: string | null;
  shop_name: string | null;
  shop_category: string | null;
  area: number | null;
  db_size_allowance: string | null;
  manual_kw_override: number | null;
  exclude_from_totals: boolean;
}

interface MeterShopLinkingProps {
  profileId: string;
  projectId: string;
  linkages: MeterShopLinkage[];
  onAddLinkage: (linkage: Omit<MeterShopLinkage, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateLinkage: (data: Partial<MeterShopLinkage> & { id: string }) => void;
  onDeleteLinkage: (id: string) => void;
}

// Parse breaker size to get amps (e.g., "60A TP" -> 60)
function parseDbSizeToAmps(dbSize: string | null): number | null {
  if (!dbSize) return null;
  const match = dbSize.match(/(\d+)A/i);
  return match ? parseInt(match[1], 10) : null;
}

// Parse breaker size to kVA
function parseDbSizeToKva(dbSize: string | null): number {
  if (!dbSize) return 0;
  const match = dbSize.match(/(\d+)A\s*(TP|SP)?/i);
  if (!match) return 0;
  const amps = parseInt(match[1], 10);
  const phase = match[2]?.toUpperCase();
  if (phase === 'TP') {
    return (amps * 400 * 1.732) / 1000;
  }
  return (amps * 230) / 1000;
}

export function MeterShopLinking({
  profileId,
  projectId,
  linkages,
}: MeterShopLinkingProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingChanges, setPendingChanges] = useState<Map<string, string | null>>(new Map());
  const [isSaving, setIsSaving] = useState(false);

  // Fetch tenant schedule
  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ['tenant-schedule', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, project_id, shop_number, shop_name, shop_category, area, db_size_allowance, manual_kw_override, exclude_from_totals')
        .eq('project_id', projectId)
        .order('shop_number');

      if (error) throw error;
      return data as TenantScheduleEntry[];
    },
    enabled: !!projectId,
  });

  // Fetch standard load profiles
  const { data: standardProfiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['standard-load-profiles'],
    queryFn: async (): Promise<StandardLoadProfile[]> => {
      const { data, error } = await (supabase as any)
        .from('standard_load_profiles')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return (data || []) as StandardLoadProfile[];
    },
  });

  // Create a map of tenant to existing linkage
  const tenantLinkageMap = useMemo(() => {
    const map = new Map<string, MeterShopLinkage>();
    linkages.forEach(linkage => {
      // Match by shop_number or external_linkage_id
      if (linkage.shop_number) {
        map.set(linkage.shop_number, linkage);
      }
      if (linkage.external_linkage_id) {
        map.set(linkage.external_linkage_id, linkage);
      }
    });
    return map;
  }, [linkages]);

  // Filter tenants based on search
  const filteredTenants = useMemo(() => {
    if (!searchTerm) return tenants;
    const term = searchTerm.toLowerCase();
    return tenants.filter(t => 
      t.shop_number?.toLowerCase().includes(term) ||
      t.shop_name?.toLowerCase().includes(term) ||
      t.shop_category?.toLowerCase().includes(term)
    );
  }, [tenants, searchTerm]);

  // Get current profile selection for a tenant
  const getProfileSelection = (tenant: TenantScheduleEntry): string | null => {
    if (pendingChanges.has(tenant.id)) {
      return pendingChanges.get(tenant.id) || null;
    }
    const linkage = tenantLinkageMap.get(tenant.shop_number || '') || tenantLinkageMap.get(tenant.id);
    return (linkage as any)?.standard_profile_id || null;
  };

  // Handle profile selection change
  const handleProfileChange = (tenantId: string, profileId: string | null) => {
    setPendingChanges(prev => {
      const newMap = new Map(prev);
      newMap.set(tenantId, profileId);
      return newMap;
    });
  };

  // Save all pending changes
  const saveChanges = async () => {
    if (pendingChanges.size === 0) {
      toast.info('No changes to save');
      return;
    }

    setIsSaving(true);
    const changeCount = pendingChanges.size;
    
    try {
      for (const [tenantId, selectedProfileId] of pendingChanges) {
        const tenant = tenants.find(t => t.id === tenantId);
        if (!tenant) continue;

        const existingLinkage = tenantLinkageMap.get(tenant.shop_number || '') || tenantLinkageMap.get(tenantId);
        const profile = standardProfiles.find(p => p.id === selectedProfileId);

        if (existingLinkage) {
          // Update existing linkage
          if (selectedProfileId && profile) {
            const connectedKva = tenant.manual_kw_override || parseDbSizeToKva(tenant.db_size_allowance) || (tenant.area || 0) * profile.va_per_sqm / 1000;
            const { error } = await (supabase as any).from('meter_shop_linkages').update({
              standard_profile_id: selectedProfileId,
              diversity_factor: profile.diversity_factor,
              power_factor: profile.power_factor,
              connected_load_kva: connectedKva,
              max_demand_kva: connectedKva * profile.diversity_factor,
            }).eq('id', existingLinkage.id);
            if (error) throw error;
          } else if (!selectedProfileId) {
            // Clear profile link
            const { error } = await (supabase as any).from('meter_shop_linkages').update({
              standard_profile_id: null,
            }).eq('id', existingLinkage.id);
            if (error) throw error;
          }
        } else if (selectedProfileId && profile) {
          // Create new linkage
          const connectedKva = tenant.manual_kw_override || parseDbSizeToKva(tenant.db_size_allowance) || (tenant.area || 0) * profile.va_per_sqm / 1000;
          const { error } = await (supabase as any).from('meter_shop_linkages').insert({
            profile_id: profileId,
            project_id: projectId,
            meter_id: `M-${tenant.shop_number?.replace(/\s+/g, '') || tenantId.slice(0, 8)}`,
            meter_name: `${tenant.shop_name || 'Unknown'} Meter`,
            meter_type: 'sub',
            shop_number: tenant.shop_number,
            shop_name: tenant.shop_name,
            shop_category: tenant.shop_category,
            connected_load_kva: connectedKva,
            max_demand_kva: connectedKva * profile.diversity_factor,
            power_factor: profile.power_factor,
            diversity_factor: profile.diversity_factor,
            standard_profile_id: selectedProfileId,
            is_active: true,
            external_linkage_id: tenantId,
          });
          if (error) throw error;
        }
      }
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['meter-shop-linkages'] });
      
      setPendingChanges(new Map());
      toast.success(`Saved ${changeCount} profile assignments`);
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate summary stats
  const stats = useMemo(() => {
    let linkedCount = 0;
    let unlinkedCount = 0;
    let totalKva = 0;

    tenants.forEach(tenant => {
      const hasProfile = getProfileSelection(tenant);
      if (hasProfile) {
        linkedCount++;
        totalKva += tenant.manual_kw_override || parseDbSizeToKva(tenant.db_size_allowance) || 0;
      } else {
        unlinkedCount++;
      }
    });

    return { linkedCount, unlinkedCount, totalKva };
  }, [tenants, pendingChanges, tenantLinkageMap]);

  if (tenantsLoading || profilesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats and actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>{stats.linkedCount} Linked</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span>{stats.unlinkedCount} Unlinked</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-accent-foreground" />
            <span>{stats.totalKva.toFixed(1)} kVA</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tenants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>

          {/* Save button */}
          <Button 
            onClick={saveChanges} 
            disabled={pendingChanges.size === 0 || isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save ({pendingChanges.size})
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[100px]">Shop #</TableHead>
                  <TableHead>Shop Name</TableHead>
                  <TableHead className="w-[100px] text-right">Area (m²)</TableHead>
                  <TableHead className="w-[100px] text-right">Current</TableHead>
                  <TableHead className="w-[120px] text-right">kVA</TableHead>
                  <TableHead className="w-[220px]">Load Profile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Activity className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-muted-foreground">
                        {searchTerm ? 'No tenants match your search' : 'No tenants in schedule'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTenants.map((tenant) => {
                    const currentAmps = parseDbSizeToAmps(tenant.db_size_allowance);
                    const kva = tenant.manual_kw_override || parseDbSizeToKva(tenant.db_size_allowance);
                    const selectedProfileId = getProfileSelection(tenant);
                    const hasPendingChange = pendingChanges.has(tenant.id);

                    return (
                      <TableRow 
                        key={tenant.id}
                        className={hasPendingChange ? 'bg-muted/50' : ''}
                      >
                        <TableCell className="font-mono font-medium">
                          {tenant.shop_number || '-'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{tenant.shop_name || 'Unknown'}</p>
                            {tenant.shop_category && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {tenant.shop_category}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {tenant.area?.toFixed(0) || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {currentAmps ? (
                            <Badge variant="secondary" className="font-mono">
                              {currentAmps}A {tenant.db_size_allowance?.includes('TP') ? 'TP' : 'SP'}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {kva > 0 ? (
                            <span className="font-medium">{kva.toFixed(1)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={selectedProfileId || 'none'}
                            onValueChange={(value) => handleProfileChange(tenant.id, value === 'none' ? null : value)}
                          >
                            <SelectTrigger className="w-full bg-background">
                              <SelectValue placeholder="Select profile..." />
                            </SelectTrigger>
                            <SelectContent className="bg-popover z-50">
                              <SelectItem value="none">
                                <span className="text-muted-foreground">No profile</span>
                              </SelectItem>
                              {standardProfiles.map((profile) => (
                                <SelectItem key={profile.id} value={profile.id}>
                                  <div className="flex items-center gap-2">
                                    <span>{profile.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      ({profile.va_per_sqm} VA/m²)
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Profile legend */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Available Load Profiles</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex flex-wrap gap-2">
            {standardProfiles.slice(0, 8).map((profile) => (
              <Badge key={profile.id} variant="outline" className="text-xs">
                {profile.name}: {profile.va_per_sqm} VA/m², DF={profile.diversity_factor}
              </Badge>
            ))}
            {standardProfiles.length > 8 && (
              <Badge variant="secondary" className="text-xs">
                +{standardProfiles.length - 8} more
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
