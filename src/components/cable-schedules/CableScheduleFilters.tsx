import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { X, Filter, Layers, Search } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface CableFilters {
  search: string;
  cableType: string;
  installationMethod: string;
  cableSize: string;
  voltage: string;
  status: string;
}

export interface CableScheduleFiltersProps {
  filters: CableFilters;
  onFiltersChange: (filters: CableFilters) => void;
  groupByShop: boolean;
  onGroupByShopChange: (grouped: boolean) => void;
  availableOptions: {
    cableTypes: string[];
    installationMethods: string[];
    cableSizes: string[];
    voltages: string[];
  };
}

const EMPTY_FILTERS: CableFilters = {
  search: "",
  cableType: "all",
  installationMethod: "all",
  cableSize: "all",
  voltage: "all",
  status: "all",
};

export function CableScheduleFilters({
  filters,
  onFiltersChange,
  groupByShop,
  onGroupByShopChange,
  availableOptions,
}: CableScheduleFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.cableType !== "all") count++;
    if (filters.installationMethod !== "all") count++;
    if (filters.cableSize !== "all") count++;
    if (filters.voltage !== "all") count++;
    if (filters.status !== "all") count++;
    return count;
  }, [filters]);

  const handleClearFilters = () => {
    onFiltersChange(EMPTY_FILTERS);
  };

  const updateFilter = (key: keyof CableFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="space-y-3">
      {/* Compact bar with search and toggles */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cables..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Filter toggle */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>

        {/* Group by Shop toggle */}
        <div className="flex items-center gap-2">
          <Switch
            id="group-by-shop"
            checked={groupByShop}
            onCheckedChange={onGroupByShopChange}
          />
          <Label htmlFor="group-by-shop" className="text-sm flex items-center gap-1.5 cursor-pointer">
            <Layers className="h-4 w-4" />
            Group by Shop
          </Label>
        </div>

        {/* Clear filters */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Expandable filter panel */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 p-4 bg-muted/30 rounded-lg border">
            {/* Cable Type */}
            <div className="space-y-1.5">
              <Label className="text-xs">Cable Type</Label>
              <Select
                value={filters.cableType}
                onValueChange={(v) => updateFilter("cableType", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {availableOptions.cableTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Installation Method */}
            <div className="space-y-1.5">
              <Label className="text-xs">Installation</Label>
              <Select
                value={filters.installationMethod}
                onValueChange={(v) => updateFilter("installationMethod", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  {availableOptions.installationMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method.charAt(0).toUpperCase() + method.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cable Size */}
            <div className="space-y-1.5">
              <Label className="text-xs">Cable Size</Label>
              <Select
                value={filters.cableSize}
                onValueChange={(v) => updateFilter("cableSize", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All sizes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sizes</SelectItem>
                  {availableOptions.cableSizes.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Voltage */}
            <div className="space-y-1.5">
              <Label className="text-xs">Voltage</Label>
              <Select
                value={filters.voltage}
                onValueChange={(v) => updateFilter("voltage", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All voltages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Voltages</SelectItem>
                  {availableOptions.voltages.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}V
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs">Data Status</Label>
              <Select
                value={filters.status}
                onValueChange={(v) => updateFilter("status", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Default empty filter state
export const DEFAULT_CABLE_FILTERS: CableFilters = EMPTY_FILTERS;
