import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VirtualizedTable, Column } from "@/components/common/VirtualizedTable";
import { compareShopNumbers } from "@/utils/tenantSorting";
import { useMemo } from "react";

interface CableTagScheduleProps {
  scheduleId: string;
}

interface CableTagEntry {
  id: string;
  cable_tag: string;
  base_cable_tag: string | null;
  cable_number: number | null;
  parallel_group_id: string | null;
  parallel_total_count: number | null;
  cable_size: string | null;
  cable_type: string | null;
}

export const CableTagSchedule = ({ scheduleId }: CableTagScheduleProps) => {
  const { data: entries, isLoading } = useQuery({
    queryKey: ["cable-tags", scheduleId],
    queryFn: async () => {
      // First get the schedule to get project_id
      const { data: schedule } = await supabase
        .from("cable_schedules")
        .select("project_id")
        .eq("id", scheduleId)
        .single();

      // Get all floor plan IDs for this project
      const { data: floorPlans } = await supabase
        .from("floor_plan_projects")
        .select("id")
        .eq("project_id", schedule?.project_id || "");

      const floorPlanIds = floorPlans?.map(fp => fp.id) || [];

      // Get cable entries linked to this schedule OR to floor plans in this project
      let query = supabase
        .from("cable_entries")
        .select("id, cable_tag, base_cable_tag, cable_number, parallel_group_id, parallel_total_count, cable_size, cable_type");

      if (floorPlanIds.length > 0) {
        query = query.or(`schedule_id.eq.${scheduleId},floor_plan_id.in.(${floorPlanIds.join(',')})`);
      } else {
        query = query.eq("schedule_id", scheduleId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Extract shop number from cable tag for sorting
      // Tags follow pattern like "Main Board 1.2-Shop 1-Alu-185mm"
      const extractShopNumber = (tag: string): string => {
        // Look for "Shop X" pattern in the tag
        const shopMatch = tag.match(/Shop\s*(\d+[A-Za-z]*)/i);
        return shopMatch ? `Shop ${shopMatch[1]}` : '';
      };

      // Sort by shop number first, then by cable number within each shop
      return (data || []).sort((a, b) => {
        const tagA = a.base_cable_tag || a.cable_tag;
        const tagB = b.base_cable_tag || b.cable_tag;
        
        const shopA = extractShopNumber(tagA);
        const shopB = extractShopNumber(tagB);
        
        // If both have shop numbers, compare them using natural sorting
        if (shopA && shopB) {
          const shopCompare = compareShopNumbers(shopA, shopB);
          if (shopCompare !== 0) return shopCompare;
        } else if (shopA && !shopB) {
          return 1; // Entries with shop numbers come after general entries
        } else if (!shopA && shopB) {
          return -1; // General entries come first
        }
        
        // Within same shop (or both without shop), sort by cable number
        return (a.cable_number || 0) - (b.cable_number || 0);
      }) as CableTagEntry[];
    },
    enabled: !!scheduleId,
  });

  // Build display tag for each entry
  const getDisplayTag = (entry: CableTagEntry) => {
    const baseTag = entry.base_cable_tag || entry.cable_tag;
    const cableNumber = entry.cable_number || 1;
    const isParallel = entry.parallel_group_id && entry.parallel_total_count && entry.parallel_total_count > 1;
    
    // Build display tag: BaseTag-Material-Size
    const materialShort = entry.cable_type === 'Aluminium' ? 'Alu' : 
                          entry.cable_type === 'Copper' ? 'Cu' : 
                          entry.cable_type || '';
    const sizeShort = entry.cable_size?.replace('mm²', 'mm') || '';
    
    let displayTag = baseTag;
    if (materialShort) displayTag += `-${materialShort}`;
    if (sizeShort) displayTag += `-${sizeShort}`;
    
    if (isParallel) {
      displayTag += ` (${cableNumber}/${entry.parallel_total_count})`;
    }
    
    return displayTag;
  };

  // Define virtualized table columns
  const columns: Column<CableTagEntry>[] = useMemo(() => [
    {
      key: 'cable_number',
      header: 'Cable Number',
      width: '120px',
      align: 'center' as const,
      render: (entry) => (
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg">
          {entry.cable_number || 1}
        </span>
      ),
    },
    {
      key: 'cable_tag',
      header: 'Cable Tag',
      render: (entry) => (
        <span className="font-medium text-lg">{getDisplayTag(entry)}</span>
      ),
    },
    {
      key: 'cable_size',
      header: 'Cable Size',
      width: '160px',
      render: (entry) => (
        <span className="font-medium">{entry.cable_size || '-'}</span>
      ),
    },
    {
      key: 'cable_type',
      header: 'Type',
      width: '120px',
      render: (entry) => (
        <span className="text-muted-foreground">{entry.cable_type || '-'}</span>
      ),
    },
  ], []);

  if (isLoading) {
    return <div>Loading cable tags...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Cable Tag Schedule - All Tags</span>
          {entries && entries.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              {entries.length} cable{entries.length !== 1 ? 's' : ''}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!entries || entries.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No cable entries found in this schedule.
          </p>
        ) : (
          <VirtualizedTable
            data={entries}
            columns={columns}
            getRowKey={(entry) => entry.id}
            rowHeight={72}
            maxHeight={600}
            emptyMessage="No cable entries found in this schedule."
          />
        )}
      </CardContent>
    </Card>
  );
};
