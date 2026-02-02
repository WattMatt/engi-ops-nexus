/**
 * Cable Verification List Component
 * Displays all cables for verification with filtering and search
 */
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, CheckCircle2, AlertTriangle, XCircle, Cable } from "lucide-react";
import { CableVerificationItem } from "./CableVerificationItem";
import { CableEntryForVerification, VerificationItemStatus } from "@/types/cableVerification";
import { cn } from "@/lib/utils";

interface CableVerificationListProps {
  cables: CableEntryForVerification[];
  onStatusChange: (cableId: string, status: VerificationItemStatus, notes?: string, measuredLength?: number) => Promise<void>;
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
  onPhotoUpload,
  onPhotoRemove,
  updatingCableId,
}: CableVerificationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterOption>('all');

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
            <CableVerificationItem
              key={cable.id}
              cable={cable}
              onStatusChange={onStatusChange}
              onPhotoUpload={onPhotoUpload}
              onPhotoRemove={onPhotoRemove}
              isUpdating={updatingCableId === cable.id}
            />
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
