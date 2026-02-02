/**
 * Cable Verification List Component
 * Displays all cables for verification with filtering and search
 * Includes batch verification actions for marking multiple cables at once
 */
import { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Cable,
  CheckCheck,
  Square,
  Loader2
} from "lucide-react";
import { CableVerificationItem } from "./CableVerificationItem";
import { CableEntryForVerification, VerificationItemStatus } from "@/types/cableVerification";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface CableVerificationListProps {
  cables: CableEntryForVerification[];
  onStatusChange: (cableId: string, status: VerificationItemStatus, notes?: string, measuredLength?: number) => Promise<void>;
  onBatchStatusChange?: (cableIds: string[], status: VerificationItemStatus) => Promise<void>;
  onPhotoUpload: (cableId: string, file: File) => Promise<string>;
  onPhotoRemove: (cableId: string, photoUrl: string) => Promise<void>;
  updatingCableId?: string | null;
}

type FilterOption = 'all' | VerificationItemStatus;

const filterOptions: { value: FilterOption; label: string; icon: typeof Cable }[] = [
  { value: 'all', label: 'All', icon: Cable },
  { value: 'pending', label: 'Pending', icon: Cable },
  { value: 'verified', label: 'Verified', icon: CheckCircle2 },
  { value: 'issue', label: 'Issues', icon: AlertTriangle },
  { value: 'not_installed', label: 'Not Installed', icon: XCircle },
];

export function CableVerificationList({
  cables,
  onStatusChange,
  onBatchStatusChange,
  onPhotoUpload,
  onPhotoRemove,
  updatingCableId,
}: CableVerificationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [selectedCables, setSelectedCables] = useState<Set<string>>(new Set());
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);
  const { toast } = useToast();

  // Compute counts for each filter
  const counts = useMemo(() => {
    const result: Record<FilterOption, number> = {
      all: cables.length,
      pending: 0,
      verified: 0,
      issue: 0,
      not_installed: 0,
    };

    cables.forEach(cable => {
      const status = cable.verification_status || 'pending';
      result[status]++;
    });

    return result;
  }, [cables]);

  // Filter and search cables
  const filteredCables = useMemo(() => {
    return cables.filter(cable => {
      // Apply status filter
      if (filter !== 'all') {
        const status = cable.verification_status || 'pending';
        if (status !== filter) return false;
      }

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const searchable = [
          cable.cable_tag,
          cable.from_location,
          cable.to_location,
          cable.cable_size,
          cable.cable_type,
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (!searchable.includes(query)) return false;
      }

      return true;
    });
  }, [cables, filter, searchQuery]);

  // Get pending cables from current filter for batch actions
  const pendingInView = useMemo(() => {
    return filteredCables.filter(c => (c.verification_status || 'pending') === 'pending');
  }, [filteredCables]);

  // Toggle single cable selection
  const toggleSelection = useCallback((cableId: string) => {
    setSelectedCables(prev => {
      const next = new Set(prev);
      if (next.has(cableId)) {
        next.delete(cableId);
      } else {
        next.add(cableId);
      }
      return next;
    });
  }, []);

  // Select all pending in view
  const selectAllPending = useCallback(() => {
    setSelectedCables(new Set(pendingInView.map(c => c.id)));
  }, [pendingInView]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedCables(new Set());
  }, []);

  // Handle batch verification
  const handleBatchVerify = useCallback(async (status: VerificationItemStatus) => {
    if (selectedCables.size === 0) return;

    setIsBatchUpdating(true);
    try {
      const cableIds = Array.from(selectedCables);
      
      if (onBatchStatusChange) {
        await onBatchStatusChange(cableIds, status);
      } else {
        // Fallback: update one by one
        for (const cableId of cableIds) {
          await onStatusChange(cableId, status);
        }
      }

      toast({
        title: "Batch Update Complete",
        description: `${cableIds.length} cable(s) marked as ${status === 'verified' ? 'verified' : status === 'issue' ? 'having issues' : 'not installed'}.`,
      });

      setSelectedCables(new Set());
    } catch (err) {
      console.error('Batch update failed:', err);
      toast({
        title: "Error",
        description: "Failed to update some cables. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBatchUpdating(false);
    }
  }, [selectedCables, onBatchStatusChange, onStatusChange, toast]);

  const hasSelection = selectedCables.size > 0;
  const allPendingSelected = pendingInView.length > 0 && 
    pendingInView.every(c => selectedCables.has(c.id));

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cables by tag, location, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {filterOptions.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant={filter === value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(value)}
              className={cn(
                "gap-1.5",
                filter === value && value === 'verified' && "bg-green-600 hover:bg-green-700",
                filter === value && value === 'issue' && "bg-amber-600 hover:bg-amber-700",
                filter === value && value === 'not_installed' && "bg-red-600 hover:bg-red-700"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              <Badge 
                variant="secondary" 
                className={cn(
                  "ml-1 h-5 px-1.5 text-xs",
                  filter === value && "bg-background/20 text-inherit"
                )}
              >
                {counts[value]}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* Batch Actions Bar */}
      {pendingInView.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-2 mr-2">
            <Checkbox
              checked={allPendingSelected}
              onCheckedChange={(checked) => {
                if (checked) {
                  selectAllPending();
                } else {
                  clearSelection();
                }
              }}
              aria-label="Select all pending cables"
            />
            <span className="text-sm text-muted-foreground">
              {hasSelection 
                ? `${selectedCables.size} selected`
                : `${pendingInView.length} pending`
              }
            </span>
          </div>

          {hasSelection && (
            <>
              <div className="h-4 w-px bg-border" />
              
              <Button
                size="sm"
                onClick={() => handleBatchVerify('verified')}
                disabled={isBatchUpdating}
                className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
              >
                {isBatchUpdating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5" />
                )}
                Mark Verified
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBatchVerify('issue')}
                disabled={isBatchUpdating}
                className="gap-1.5 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Mark Issue
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBatchVerify('not_installed')}
                disabled={isBatchUpdating}
                className="gap-1.5 border-destructive/50 text-destructive hover:bg-destructive/10"
              >
                <XCircle className="h-3.5 w-3.5" />
                Not Installed
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={clearSelection}
                disabled={isBatchUpdating}
                className="gap-1.5 ml-auto"
              >
                <Square className="h-3.5 w-3.5" />
                Clear
              </Button>
            </>
          )}
        </div>
      )}

      {/* Cable List */}
      {filteredCables.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Filter className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No cables found</p>
          <p className="text-sm">
            {searchQuery 
              ? "Try adjusting your search query"
              : "No cables match the selected filter"
            }
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCables.map(cable => (
            <div key={cable.id} className="flex gap-2 items-start">
              {/* Selection checkbox for pending cables */}
              {(cable.verification_status || 'pending') === 'pending' && (
                <Checkbox
                  checked={selectedCables.has(cable.id)}
                  onCheckedChange={() => toggleSelection(cable.id)}
                  className="mt-4"
                  aria-label={`Select ${cable.cable_tag}`}
                />
              )}
              <div className="flex-1">
                <CableVerificationItem
                  cable={cable}
                  onStatusChange={onStatusChange}
                  onPhotoUpload={onPhotoUpload}
                  onPhotoRemove={onPhotoRemove}
                  isUpdating={updatingCableId === cable.id}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results summary */}
      {filteredCables.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredCables.length} of {cables.length} cables
        </p>
      )}
    </div>
  );
}
