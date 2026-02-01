import { useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { PaginationControls } from "@/components/common/PaginationControls";
import { Loader2 } from "lucide-react";

interface AllCableEntriesViewProps {
  projectId: string;
}

const PAGE_SIZE_OPTIONS = [50, 100, 200, 500];
const DEFAULT_PAGE_SIZE = 100;

export const AllCableEntriesView = ({ projectId }: AllCableEntriesViewProps) => {
  const navigate = useNavigate();
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // First, get the schedules for this project
  const { data: schedules = [] } = useQuery({
    queryKey: ["cable-schedules-list", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cable_schedules")
        .select("id, schedule_name, revision")
        .eq("project_id", projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
    staleTime: 60000, // Cache for 1 minute
  });

  const scheduleIds = schedules.map(s => s.id);

  // Get total count for pagination
  const { data: totalCount = 0 } = useQuery({
    queryKey: ["all-cable-entries-count", projectId, scheduleIds],
    queryFn: async () => {
      if (scheduleIds.length === 0) return 0;
      
      const { count, error } = await supabase
        .from("cable_entries")
        .select("*", { count: 'exact', head: true })
        .in("schedule_id", scheduleIds);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: scheduleIds.length > 0,
    staleTime: 30000, // Cache count for 30 seconds
  });

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Get paginated cable entries
  const { data: entries = [], isLoading, isFetching } = useQuery({
    queryKey: ["all-cable-entries", projectId, scheduleIds, page, pageSize],
    queryFn: async () => {
      if (scheduleIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("cable_entries")
        .select("*")
        .in("schedule_id", scheduleIds)
        .order("display_order")
        .range(from, to);
      
      if (error) throw error;
      
      // Combine entries with schedule info
      return (data || []).map(entry => {
        const schedule = schedules.find(s => s.id === entry.schedule_id);
        return {
          ...entry,
          schedule_name: schedule?.schedule_name,
          revision: schedule?.revision,
        };
      });
    },
    enabled: scheduleIds.length > 0,
    staleTime: 10000, // Cache for 10 seconds
  });

  // Get total cost (from all entries, not just current page)
  const { data: totalCostData } = useQuery({
    queryKey: ["all-cable-entries-total-cost", projectId, scheduleIds],
    queryFn: async () => {
      if (scheduleIds.length === 0) return 0;
      
      // For large datasets, we sum on the server
      const { data, error } = await supabase
        .from("cable_entries")
        .select("total_cost")
        .in("schedule_id", scheduleIds);
      
      if (error) throw error;
      return (data || []).reduce((sum, entry) => sum + (entry.total_cost || 0), 0);
    },
    enabled: scheduleIds.length > 0,
    staleTime: 30000,
  });

  const totalCost = totalCostData || 0;

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "R 0.00";
    return `R ${value.toFixed(2)}`;
  };

  // Reset to page 1 when page size changes
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  // Virtualizer for current page entries
  const rowVirtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 53,
    overscan: 10,
  });

  // Reset virtualizer scroll when page changes
  useEffect(() => {
    if (parentRef.current) {
      parentRef.current.scrollTop = 0;
    }
  }, [page]);

  if (isLoading && entries.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>All Cable Entries</span>
          {isFetching && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {totalCount === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No cable entries found across all schedules.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Pagination Controls - Top */}
            <PaginationControls
              pagination={{
                page,
                pageSize,
                totalCount,
                totalPages,
              }}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              isLoading={isFetching}
            />

            {/* Virtualized Table */}
            <div 
              ref={parentRef}
              className="rounded-md border overflow-auto"
              style={{ height: '500px' }}
            >
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Revision</TableHead>
                    <TableHead>Cable #</TableHead>
                    <TableHead>Cable Tag</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Voltage</TableHead>
                    <TableHead>Load (A)</TableHead>
                    <TableHead>Cable Type</TableHead>
                    <TableHead>Cable Size</TableHead>
                    <TableHead>Length (m)</TableHead>
                    <TableHead>Supply Cost</TableHead>
                    <TableHead>Install Cost</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <tr style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
                    <td style={{ position: 'relative' }}>
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const entry = entries[virtualRow.index];
                        return (
                          <TableRow 
                            key={entry.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/dashboard/cable-schedules/${entry.schedule_id}`)}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                          >
                            <TableCell className="font-medium">{entry.revision}</TableCell>
                            <TableCell className="font-medium">{entry.cable_number || "1"}</TableCell>
                            <TableCell>{entry.cable_tag}</TableCell>
                            <TableCell>{entry.from_location}</TableCell>
                            <TableCell>{entry.to_location}</TableCell>
                            <TableCell>{entry.voltage || "-"}</TableCell>
                            <TableCell>{entry.load_amps || "-"}</TableCell>
                            <TableCell>{entry.cable_type || "-"}</TableCell>
                            <TableCell>{entry.cable_size || "-"}</TableCell>
                            <TableCell>{entry.total_length?.toFixed(2) || "0.00"}</TableCell>
                            <TableCell>{formatCurrency(entry.supply_cost)}</TableCell>
                            <TableCell>{formatCurrency(entry.install_cost)}</TableCell>
                            <TableCell>{formatCurrency(entry.total_cost)}</TableCell>
                            <TableCell>{entry.notes || "-"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </td>
                  </tr>
                </TableBody>
              </Table>
            </div>

            {/* Summary Footer */}
            <div className="flex items-center justify-between">
              {/* Pagination Controls - Bottom */}
              <PaginationControls
                pagination={{
                  page,
                  pageSize,
                  totalCount,
                  totalPages,
                }}
                onPageChange={setPage}
                showPageSizeSelector={false}
                isLoading={isFetching}
              />

              {/* Total Cost */}
              <Card className="w-64">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">Total Cost (All Pages):</span>
                    <span className="text-lg font-bold">{formatCurrency(totalCost)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
