import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Database } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";
import { toast } from "sonner";

interface RestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RestoreDialog = ({ open, onOpenChange }: RestoreDialogProps) => {
  const [selectedBackup, setSelectedBackup] = useState<string>("");
  const [recoveryType, setRecoveryType] = useState<"full" | "selective">("full");
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const { data: backups } = useQuery({
    queryKey: ["available-backups"],
    queryFn: async () => {
      const { data } = await supabase
        .from("backup_history")
        .select("*")
        .eq("status", "completed")
        .order("completed_at", { ascending: false });

      return data || [];
    },
    enabled: open,
  });

  const selectedBackupData = backups?.find((b) => b.id === selectedBackup);

  const handleRestore = async () => {
    if (!selectedBackup) {
      toast.error("Please select a backup to restore");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("restore-backup", {
        body: {
          backup_id: selectedBackup,
          recovery_type: recoveryType,
          tables_to_restore: recoveryType === "selective" ? selectedTables : undefined,
        },
      });

      if (error) throw error;

      toast.success(`Successfully restored ${data.tables_restored} tables`);
      onOpenChange(false);
    } catch (error) {
      console.error("Restore error:", error);
      toast.error("Failed to restore backup");
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Restore from Backup</DialogTitle>
          <DialogDescription>
            Select a backup point and choose what to restore
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            Restoring will overwrite existing data. This action cannot be undone.
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {/* Backup Selection */}
          <div className="space-y-2">
            <Label>Select Backup Point</Label>
            <ScrollArea className="h-48 border rounded-lg">
              <div className="p-4 space-y-2">
                {backups?.map((backup) => (
                  <div
                    key={backup.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedBackup === backup.id
                        ? "border-primary bg-accent"
                        : "hover:bg-accent/50"
                    }`}
                    onClick={() => setSelectedBackup(backup.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Database className="h-4 w-4" />
                        <div>
                          <p className="font-medium">
                            {format(new Date(backup.completed_at), "MMM d, yyyy HH:mm:ss")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {backup.tables_included?.length || 0} tables •{" "}
                            {formatBytes(backup.file_size_bytes || 0)}
                          </p>
                        </div>
                      </div>
                      <Badge>{backup.backup_type}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Recovery Type */}
          <div className="space-y-2">
            <Label>Recovery Type</Label>
            <RadioGroup value={recoveryType} onValueChange={(v: any) => setRecoveryType(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full" className="font-normal cursor-pointer">
                  Full Restore - Restore all data from backup
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="selective" id="selective" />
                <Label htmlFor="selective" className="font-normal cursor-pointer">
                  Selective Restore - Choose specific tables to restore
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Table Selection (for selective restore) */}
          {recoveryType === "selective" && selectedBackupData && (
            <div className="space-y-2">
              <Label>Select Tables to Restore</Label>
              <ScrollArea className="h-32 border rounded-lg">
                <div className="p-4 space-y-2">
                  {selectedBackupData.tables_included?.map((table) => (
                    <div key={table} className="flex items-center space-x-2">
                      <Checkbox
                        id={table}
                        checked={selectedTables.includes(table)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTables([...selectedTables, table]);
                          } else {
                            setSelectedTables(selectedTables.filter((t) => t !== table));
                          }
                        }}
                      />
                      <Label htmlFor={table} className="font-normal cursor-pointer">
                        {table} ({selectedBackupData.records_count?.[table] || 0} records)
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleRestore} disabled={!selectedBackup || loading}>
            {loading ? "Restoring..." : "Restore Backup"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
