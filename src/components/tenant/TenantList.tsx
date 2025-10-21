import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle2, Circle } from "lucide-react";
import { TenantDialog } from "./TenantDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Tenant {
  id: string;
  shop_name: string;
  shop_number: string;
  area: number | null;
  db_size: string | null;
  sow_received: boolean;
  layout_received: boolean;
  db_ordered: boolean;
  db_cost: number | null;
  lighting_ordered: boolean;
  lighting_cost: number | null;
}

interface TenantListProps {
  tenants: Tenant[];
  projectId: string;
  onUpdate: () => void;
}

export const TenantList = ({ tenants, projectId, onUpdate }: TenantListProps) => {
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tenant?")) return;

    try {
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;
      toast.success("Tenant deleted");
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to delete tenant");
    }
  };

  const StatusIcon = ({ checked }: { checked: boolean }) => (
    checked ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-muted-foreground" />
  );

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Shop #</TableHead>
            <TableHead>Shop Name</TableHead>
            <TableHead>Area (sqm)</TableHead>
            <TableHead>DB Size</TableHead>
            <TableHead className="text-center">SOW</TableHead>
            <TableHead className="text-center">Layout</TableHead>
            <TableHead className="text-center">DB Order</TableHead>
            <TableHead className="text-right">DB Cost</TableHead>
            <TableHead className="text-center">Lighting</TableHead>
            <TableHead className="text-right">Light Cost</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center text-muted-foreground">
                No tenants added yet
              </TableCell>
            </TableRow>
          ) : (
            tenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell className="font-medium">{tenant.shop_number}</TableCell>
                <TableCell>{tenant.shop_name}</TableCell>
                <TableCell>{tenant.area?.toFixed(2) || "-"}</TableCell>
                <TableCell>{tenant.db_size || "-"}</TableCell>
                <TableCell className="text-center">
                  <StatusIcon checked={tenant.sow_received} />
                </TableCell>
                <TableCell className="text-center">
                  <StatusIcon checked={tenant.layout_received} />
                </TableCell>
                <TableCell className="text-center">
                  <StatusIcon checked={tenant.db_ordered} />
                </TableCell>
                <TableCell className="text-right">
                  {tenant.db_cost ? `R${tenant.db_cost.toFixed(2)}` : "-"}
                </TableCell>
                <TableCell className="text-center">
                  <StatusIcon checked={tenant.lighting_ordered} />
                </TableCell>
                <TableCell className="text-right">
                  {tenant.lighting_cost ? `R${tenant.lighting_cost.toFixed(2)}` : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <TenantDialog projectId={projectId} tenant={tenant} onSuccess={onUpdate} />
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(tenant.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
