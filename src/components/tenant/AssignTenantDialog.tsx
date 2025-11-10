import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Trash2, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { sortTenantsByShopNumber } from "@/utils/tenantSorting";

interface Tenant {
  id: string;
  shop_name: string;
  shop_number: string;
  shop_category: string;
}

interface AssignTenantDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  zoneId: string;
  currentTenantId: string | null;
  onAssign: (tenantId: string, tenantName: string, category: string) => void;
  onRedraw?: () => void;
  onReassign?: () => void;
  onDelete?: () => void;
  assignedTenantIds: string[]; // List of already assigned tenant IDs
}

export const AssignTenantDialog = ({ 
  isOpen, 
  onClose, 
  projectId, 
  zoneId,
  currentTenantId,
  onAssign,
  onRedraw,
  onReassign,
  onDelete,
  assignedTenantIds
}: AssignTenantDialogProps) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(currentTenantId || "");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchTenants();
    }
  }, [isOpen, projectId, assignedTenantIds]);

  useEffect(() => {
    if (currentTenantId) {
      setSelectedTenantId(currentTenantId);
    }
  }, [currentTenantId]);

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, shop_name, shop_number, shop_category')
        .eq('project_id', projectId);

      if (error) throw error;
      
      // Filter out already assigned tenants (except current tenant for this zone)
      const filteredTenants = (data || []).filter(tenant => {
        const isAssigned = assignedTenantIds.includes(tenant.id);
        const isCurrent = tenant.id === currentTenantId;
        const shouldShow = !isAssigned || isCurrent;
        return shouldShow;
      });
      
      // Sort by shop_number numerically using utility function
      const sortedTenants = sortTenantsByShopNumber(filteredTenants);
      
      setTenants(sortedTenants);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast.error('Failed to load tenants');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = () => {
    if (!selectedTenantId) {
      toast.error('Please select a tenant');
      return;
    }

    const tenant = tenants.find(t => t.id === selectedTenantId);
    if (tenant) {
      onAssign(tenant.id, `${tenant.shop_number} - ${tenant.shop_name}`, tenant.shop_category);
      onClose();
    }
  };

  const handleRedraw = () => {
    onRedraw?.();
    onClose();
  };

  const handleReassign = () => {
    onReassign?.();
    onClose();
  };

  const handleDelete = () => {
    onDelete?.();
    onClose();
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      standard: "bg-blue-500",
      fast_food: "bg-red-500",
      restaurant: "bg-emerald-500",
      national: "bg-purple-600"
    };
    return colors[category as keyof typeof colors] || "bg-gray-500";
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      standard: "Standard",
      fast_food: "Fast Food",
      restaurant: "Restaurant",
      national: "National"
    };
    return labels[category as keyof typeof labels] || category;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Tenant to Zone</DialogTitle>
          <DialogDescription>
            Select a tenant to assign to this zone. The zone color will be updated based on the tenant's category.
          </DialogDescription>
        </DialogHeader>
        
        
        {/* Zone Actions */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Zone Actions</h3>
          <div className="grid grid-cols-3 gap-2">
            {onRedraw && (
              <Button
                type="button"
                variant="outline"
                onClick={handleRedraw}
                className="flex items-center gap-2"
              >
                <Pencil className="h-4 w-4" />
                Re-draw
              </Button>
            )}
            {onReassign && (
              <Button
                type="button"
                variant="outline"
                onClick={handleReassign}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Re-assign
              </Button>
            )}
            {onDelete && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                className="flex items-center gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Tenant Assignment */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Assign Tenant</label>
            <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a tenant" />
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : tenants.length === 0 ? (
                  <SelectItem value="none" disabled>No tenants available</SelectItem>
                ) : (
                  tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      <div className="flex items-center gap-2">
                        <span>{tenant.shop_number} - {tenant.shop_name}</span>
                        <Badge 
                          variant="outline" 
                          className={`${getCategoryColor(tenant.shop_category)} text-white border-none`}
                        >
                          {getCategoryLabel(tenant.shop_category)}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleAssign} disabled={!selectedTenantId}>
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
