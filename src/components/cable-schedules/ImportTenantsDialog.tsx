import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sortTenantsByShopNumber } from "@/utils/tenantSorting";
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
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  zone_name: string | null;
  auto_populated: boolean;
  manually_edited: boolean;
}

export const ImportTenantsDialog = ({
  open,
  onOpenChange,
  scheduleId,
  projectId,
  onSuccess,
}: ImportTenantsDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [tenantRows, setTenantRows] = useState<TenantRow[]>([]);
  const [defaultFrom, setDefaultFrom] = useState("");

  const { data: tenants } = useQuery({
    queryKey: ["tenants-for-import", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select(`
          id, 
          shop_number, 
          shop_name, 
          db_size_allowance,
          generator_zone_id,
          generator_zones:generator_zone_id (
            zone_name
          )
        `)
        .eq("project_id", projectId);

      if (error) throw error;
      return data ? sortTenantsByShopNumber(data) : [];
    },
    enabled: !!projectId && open,
  });

  // Initialize tenant rows when tenants are loaded
  useEffect(() => {
    if (tenants) {
      setTenantRows(
        tenants.map((tenant: any) => {
          const zoneName = tenant.generator_zones?.zone_name || null;
          return {
            id: tenant.id,
            shop_number: tenant.shop_number,
            shop_name: tenant.shop_name,
            db_size_allowance: tenant.db_size_allowance,
            selected: true,
            from_location: zoneName || "",
            zone_name: zoneName,
            auto_populated: !!zoneName,
            manually_edited: false,
          };
        })
      );
    }
  }, [tenants]);

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
        row.id === tenantId 
          ? { ...row, from_location: value, manually_edited: true } 
          : row
      )
    );
  };

  const handleApplyDefaultFrom = () => {
    setTenantRows((prev) =>
      prev.map((row) => ({ 
        ...row, 
        from_location: defaultFrom,
        manually_edited: true 
      }))
    );
  };

  const handleRestoreFromZones = () => {
    setTenantRows((prev) =>
      prev.map((row) => ({
        ...row,
        from_location: row.zone_name || "",
        auto_populated: !!row.zone_name,
        manually_edited: false,
      }))
    );
    toast({
      title: "Restored from zones",
      description: "All 'From' locations have been restored from generator zones",
    });
  };

  const handleApplyToUnassigned = () => {
    if (!defaultFrom.trim()) {
      toast({
        title: "No default location",
        description: "Please enter a default 'From' location first",
        variant: "destructive",
      });
      return;
    }
    
    setTenantRows((prev) =>
      prev.map((row) =>
        !row.from_location.trim()
          ? { ...row, from_location: defaultFrom, manually_edited: true }
          : row
      )
    );
    
    toast({
      title: "Applied to unassigned",
      description: "Default location applied to tenants without a 'From' location",
    });
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
      const missingShops = missingFrom.map(t => t.shop_number).join(", ");
      toast({
        title: "Missing 'From' location",
        description: `These tenants need a 'From' location: ${missingShops}. Assign zones in Tenant Tracker or enter manually.`,
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
          cable_type: "Aluminium", // Default to Aluminium
          quantity: 1,
        };
      });

      const { error } = await supabase.from("cable_entries").insert(entries);

      if (error) throw error;

      // Invalidate all cable-entries queries to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: ["cable-entries"] });

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
  
  const tenantsWithZones = tenantRows.filter(t => t.zone_name).length;
  const tenantsWithoutZones = tenantRows.length - tenantsWithZones;

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
          {/* Zone Assignment Summary */}
          {tenantsWithoutZones > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{tenantsWithoutZones} tenant{tenantsWithoutZones !== 1 ? 's' : ''}</strong> don't have a zone assigned. 
                Assign zones in Tenant Tracker or enter "From" locations manually below.
              </AlertDescription>
            </Alert>
          )}
          
          {tenantsWithZones > 0 && tenantsWithoutZones === 0 && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                All {tenantsWithZones} tenants have generator zones assigned! "From" locations are auto-populated.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="default_from">Default "From" Location (Optional)</Label>
            <div className="flex gap-2 flex-wrap">
              <Input
                id="default_from"
                value={defaultFrom}
                onChange={(e) => setDefaultFrom(e.target.value)}
                placeholder="e.g., Main DB"
                className="flex-1 min-w-[200px]"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleApplyDefaultFrom}
                disabled={!defaultFrom.trim()}
              >
                Apply to All
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleApplyToUnassigned}
                disabled={!defaultFrom.trim()}
              >
                Apply to Unassigned
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleRestoreFromZones}
                disabled={tenantsWithZones === 0}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Restore from Zones
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
                  <TableHead>Zone</TableHead>
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
                      {row.zone_name ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                          {row.zone_name}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
                          No Zone
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          value={row.from_location}
                          onChange={(e) =>
                            handleFromLocationChange(row.id, e.target.value)
                          }
                          placeholder="e.g., Main DB"
                          disabled={!row.selected}
                          required={row.selected}
                          className={
                            row.auto_populated && !row.manually_edited
                              ? "border-green-300 dark:border-green-700"
                              : row.manually_edited
                              ? "border-blue-300 dark:border-blue-700"
                              : ""
                          }
                        />
                        {row.auto_populated && !row.manually_edited && (
                          <Badge variant="outline" className="text-xs whitespace-nowrap border-green-300 text-green-700 dark:border-green-700 dark:text-green-300">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Auto
                          </Badge>
                        )}
                        {row.manually_edited && (
                          <Badge variant="outline" className="text-xs whitespace-nowrap border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300">
                            Manual
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {tenantRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
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
