import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

interface ImportTenantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  projectId: string;
  onSuccess: () => void;
}

interface TenantRow {
  id: string;
  shop_number: string;
  shop_name: string;
  db_size_allowance: string | null;
  selected: boolean;
  from_location: string;
}

export const ImportTenantsDialog = ({
  open,
  onOpenChange,
  scheduleId,
  projectId,
  onSuccess,
}: ImportTenantsDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tenantRows, setTenantRows] = useState<TenantRow[]>([]);
  const [defaultFrom, setDefaultFrom] = useState("");

  const { data: tenants } = useQuery({
    queryKey: ["tenants-for-import", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, shop_number, shop_name, db_size_allowance")
        .eq("project_id", projectId)
        .order("shop_number");

      if (error) throw error;
      return data;
    },
    enabled: !!projectId && open,
  });

  // Initialize tenant rows when tenants are loaded
  useState(() => {
    if (tenants) {
      setTenantRows(
        tenants.map((tenant) => ({
          id: tenant.id,
          shop_number: tenant.shop_number,
          shop_name: tenant.shop_name,
          db_size_allowance: tenant.db_size_allowance,
          selected: true,
          from_location: defaultFrom,
        }))
      );
    }
  });

  const handleToggleAll = (checked: boolean) => {
    setTenantRows((prev) =>
      prev.map((row) => ({ ...row, selected: checked }))
    );
  };

  const handleToggleRow = (tenantId: string, checked: boolean) => {
    setTenantRows((prev) =>
      prev.map((row) =>
        row.id === tenantId ? { ...row, selected: checked } : row
      )
    );
  };

  const handleFromLocationChange = (tenantId: string, value: string) => {
    setTenantRows((prev) =>
      prev.map((row) =>
        row.id === tenantId ? { ...row, from_location: value } : row
      )
    );
  };

  const handleApplyDefaultFrom = () => {
    setTenantRows((prev) =>
      prev.map((row) => ({ ...row, from_location: defaultFrom }))
    );
  };

  const handleImport = async () => {
    const selectedTenants = tenantRows.filter((row) => row.selected);
    
    if (selectedTenants.length === 0) {
      toast({
        title: "No tenants selected",
        description: "Please select at least one tenant to import",
        variant: "destructive",
      });
      return;
    }

    // Check if all selected tenants have a from_location
    const missingFrom = selectedTenants.filter((row) => !row.from_location.trim());
    if (missingFrom.length > 0) {
      toast({
        title: "Missing 'From' location",
        description: "Please fill in the 'From' location for all selected tenants",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const entries = selectedTenants.map((row) => {
        // Extract amperage from DB allowance (e.g., "80A TP" -> 80)
        let loadAmps = null;
        if (row.db_size_allowance) {
          const match = row.db_size_allowance.match(/(\d+)\s*A/);
          if (match) {
            loadAmps = parseFloat(match[1]);
          }
        }

        return {
          schedule_id: scheduleId,
          from_location: row.from_location,
          to_location: `${row.shop_number} - ${row.shop_name}`,
          cable_tag: `${row.from_location}-${row.shop_number}`,
          notes: row.db_size_allowance ? `DB Allowance: ${row.db_size_allowance}` : null,
          voltage: 400,
          load_amps: loadAmps,
          quantity: 1,
        };
      });

      const { error } = await supabase.from("cable_entries").insert(entries);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Imported ${entries.length} cable entries from tenants`,
      });

      onSuccess();
      onOpenChange(false);
      setTenantRows([]);
      setDefaultFrom("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const allSelected = tenantRows.length > 0 && tenantRows.every((row) => row.selected);
  const someSelected = tenantRows.some((row) => row.selected) && !allSelected;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Tenants as Cable Entries</DialogTitle>
          <DialogDescription>
            Select tenants to create cable entries. Each tenant will be set as
            the "To" location with their DB allowance in notes. Specify the "From"
            location for each entry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default_from">Default "From" Location (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="default_from"
                value={defaultFrom}
                onChange={(e) => setDefaultFrom(e.target.value)}
                placeholder="e.g., Main DB"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleApplyDefaultFrom}
                disabled={!defaultFrom.trim()}
              >
                Apply to All
              </Button>
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleToggleAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Shop Number</TableHead>
                  <TableHead>Tenant Name</TableHead>
                  <TableHead>DB Allowance</TableHead>
                  <TableHead>From Location *</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenantRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Checkbox
                        checked={row.selected}
                        onCheckedChange={(checked) =>
                          handleToggleRow(row.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell>{row.shop_number}</TableCell>
                    <TableCell>{row.shop_name}</TableCell>
                    <TableCell>{row.db_size_allowance || "-"}</TableCell>
                    <TableCell>
                      <Input
                        value={row.from_location}
                        onChange={(e) =>
                          handleFromLocationChange(row.id, e.target.value)
                        }
                        placeholder="e.g., Main DB"
                        disabled={!row.selected}
                        required={row.selected}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {tenantRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No tenants found for this project
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              disabled={loading || tenantRows.filter((r) => r.selected).length === 0}
            >
              {loading ? "Importing..." : `Import ${tenantRows.filter((r) => r.selected).length} Entries`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
