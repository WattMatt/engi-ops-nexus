/**
 * Meter-Shop Linking Component
 * Shows tenant schedule with profile linking dropdowns from external wm-solar database
 */

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { 
  Zap, 
  Activity,
  Search,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Database,
  ChevronsUpDown,
  Check,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MeterShopLinkage } from './useLoadProfile';

// External meter profile from wm-solar
interface ExternalMeterProfile {
  id: string;
  name: string;
  area_sqm: number;
  kva: number;
  monthly_kwh: number;
}

// Local tenant schedule entry
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
  onAddLinkage?: (linkage: Omit<MeterShopLinkage, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateLinkage?: (data: Partial<MeterShopLinkage> & { id: string }) => void;
  onDeleteLinkage?: (id: string) => void;
}

// Parse breaker size to get amps
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

// Searchable combobox for meter profiles
interface MeterProfileComboboxProps {
  profiles: ExternalMeterProfile[];
  value: string | null;
  onChange: (value: string | null) => void;
  tenantName: string | null;
  tenantArea: number | null;
}

function MeterProfileCombobox({ profiles, value, onChange, tenantName, tenantArea }: MeterProfileComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const selectedProfile = profiles.find(p => p.id === value);
  
  // Filter profiles based on search
  const filteredProfiles = useMemo(() => {
    if (!search) return profiles;
    const term = search.toLowerCase();
    return profiles.filter(p => 
      p.name.toLowerCase().includes(term) ||
      p.kva.toFixed(1).includes(term) ||
      p.area_sqm.toString().includes(term)
    );
  }, [profiles, search]);
  
  // Sort by relevance - prioritize matches to tenant name/area
  const sortedProfiles = useMemo(() => {
    return [...filteredProfiles].sort((a, b) => {
      // If tenant name provided, boost matching names
      if (tenantName) {
        const aMatch = a.name.toLowerCase().includes(tenantName.toLowerCase().slice(0, 5));
        const bMatch = b.name.toLowerCase().includes(tenantName.toLowerCase().slice(0, 5));
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
      }
      // Sort by similar area
      if (tenantArea) {
        const aDiff = Math.abs(a.area_sqm - tenantArea);
        const bDiff = Math.abs(b.area_sqm - tenantArea);
        return aDiff - bDiff;
      }
      return a.name.localeCompare(b.name);
    });
  }, [filteredProfiles, tenantName, tenantArea]);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-background"
        >
          <span className="truncate">
            {selectedProfile ? (
              <span>{selectedProfile.name} ({selectedProfile.kva.toFixed(1)} kVA)</span>
            ) : (
              <span className="text-muted-foreground">Select meter profile...</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search meters by name, kVA, or area..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No meters found.</CommandEmpty>
            <CommandGroup heading={`${sortedProfiles.length} meters available`}>
              <CommandItem
                value="none"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                  setSearch('');
                }}
              >
                <X className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                <span className="text-muted-foreground">No profile</span>
              </CommandItem>
              {sortedProfiles.slice(0, 100).map((profile) => (
                <CommandItem
                  key={profile.id}
                  value={profile.id}
                  onSelect={() => {
                    onChange(profile.id);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === profile.id ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <span className="truncate">{profile.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {profile.kva.toFixed(1)} kVA · {profile.area_sqm}m² · {profile.monthly_kwh.toLocaleString()} kWh/mo
                    </span>
                  </div>
                </CommandItem>
              ))}
              {sortedProfiles.length > 100 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
                  Showing 100 of {sortedProfiles.length} - refine search
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
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

  // Fetch tenant schedule from local database
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

  // Fetch meter profiles from external wm-solar database
  const { data: externalProfiles = [], isLoading: profilesLoading, refetch: refetchProfiles } = useQuery({
    queryKey: ['external-meter-profiles'],
    queryFn: async (): Promise<ExternalMeterProfile[]> => {
      const { data, error } = await supabase.functions.invoke('fetch-external-meters');
      
      if (error) throw error;
      return data?.profiles || [];
    },
  });

  // Create a map of tenant to existing linkage
  const tenantLinkageMap = useMemo(() => {
    const map = new Map<string, MeterShopLinkage>();
    linkages.forEach(linkage => {
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
    return (linkage as any)?.external_meter_id || null;
  };

  // Handle profile selection change
  const handleProfileChange = (tenantId: string, meterProfileId: string | null) => {
    setPendingChanges(prev => {
      const newMap = new Map(prev);
      newMap.set(tenantId, meterProfileId);
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
        const profile = externalProfiles.find(p => p.id === selectedProfileId);

        if (existingLinkage) {
          if (selectedProfileId && profile) {
            // Use profile's kVA, adjust by area ratio if sizes differ significantly
            const areaRatio = tenant.area && profile.area_sqm > 0 ? tenant.area / profile.area_sqm : 1;
            const adjustedKva = profile.kva * Math.min(Math.max(areaRatio, 0.5), 2);
            
            const { error } = await (supabase as any).from('meter_shop_linkages').update({
              external_meter_id: selectedProfileId,
              external_meter_name: profile.name,
              connected_load_kva: adjustedKva,
              max_demand_kva: adjustedKva * 0.8,
              notes: `Linked to: ${profile.name} (${profile.kva.toFixed(1)} kVA, ${profile.area_sqm}m²)`,
            }).eq('id', existingLinkage.id);
            if (error) throw error;
          } else if (!selectedProfileId) {
            const { error } = await (supabase as any).from('meter_shop_linkages').update({
              external_meter_id: null,
              external_meter_name: null,
            }).eq('id', existingLinkage.id);
            if (error) throw error;
          }
        } else if (selectedProfileId && profile) {
          const areaRatio = tenant.area && profile.area_sqm > 0 ? tenant.area / profile.area_sqm : 1;
          const adjustedKva = profile.kva * Math.min(Math.max(areaRatio, 0.5), 2);
          
          const { error } = await (supabase as any).from('meter_shop_linkages').insert({
            profile_id: profileId,
            project_id: projectId,
            meter_id: `M-${tenant.shop_number?.replace(/\s+/g, '') || tenantId.slice(0, 8)}`,
            meter_name: `${tenant.shop_name || 'Unknown'} Meter`,
            meter_type: 'sub',
            shop_number: tenant.shop_number,
            shop_name: tenant.shop_name,
            shop_category: tenant.shop_category,
            connected_load_kva: adjustedKva,
            max_demand_kva: adjustedKva * 0.8,
            power_factor: 0.9,
            diversity_factor: 0.8,
            external_meter_id: selectedProfileId,
            external_meter_name: profile.name,
            is_active: true,
            external_linkage_id: tenantId,
            notes: `Linked to: ${profile.name} (${profile.kva.toFixed(1)} kVA, ${profile.area_sqm}m²)`,
          });
          if (error) throw error;
        }
      }

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
        <span className="ml-2 text-sm text-muted-foreground">Loading meter profiles from wm-solar...</span>
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
          <Badge variant="outline" className="gap-1">
            <Database className="h-3 w-3" />
            {externalProfiles.length} wm-solar meters
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchProfiles()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tenants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>

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
                  <TableHead className="w-[100px] text-right">kVA</TableHead>
                  <TableHead className="w-[300px]">Link to Meter (wm-solar)</TableHead>
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
                    const linkedProfile = externalProfiles.find(p => p.id === selectedProfileId);

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
                          <MeterProfileCombobox
                            profiles={externalProfiles}
                            value={selectedProfileId}
                            onChange={(value) => handleProfileChange(tenant.id, value)}
                            tenantName={tenant.shop_name}
                            tenantArea={tenant.area}
                          />
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

      {/* External profiles info */}
      {externalProfiles.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              wm-solar Meter Profiles ({externalProfiles.length} available)
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="flex flex-wrap gap-2">
              {externalProfiles.slice(0, 12).map((profile) => (
                <Badge key={profile.id} variant="outline" className="text-xs">
                  {profile.name}: {profile.kva.toFixed(1)} kVA
                </Badge>
              ))}
              {externalProfiles.length > 12 && (
                <Badge variant="secondary" className="text-xs">
                  +{externalProfiles.length - 12} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
