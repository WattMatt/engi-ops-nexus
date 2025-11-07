import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface DeleteTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: {
    id: string;
    shop_name: string;
    shop_number: string;
    shop_category: string;
  };
  onConfirm: () => void;
}

export function DeleteTenantDialog({
  open,
  onOpenChange,
  tenant,
  onConfirm,
}: DeleteTenantDialogProps) {
  const { data: auditLogCount, isLoading } = useQuery({
    queryKey: ["audit-log-count", tenant.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("tenant_change_audit_log")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id);

      if (error) throw error;
      return count || 0;
    },
    enabled: open,
  });

  const getCategoryLabel = (category: string) => {
    const labels = {
      standard: "Standard",
      fast_food: "Fast Food",
      restaurant: "Restaurant",
      national: "National",
    };
    return labels[category as keyof typeof labels] || category;
  };

  const getCategoryVariant = (category: string) => {
    const variants = {
      standard: "bg-blue-500 text-white border-blue-600",
      fast_food: "bg-red-500 text-white border-red-600",
      restaurant: "bg-emerald-500 text-white border-emerald-600",
      national: "bg-purple-600 text-white border-purple-700",
    };
    return variants[category as keyof typeof variants] || "bg-gray-100 text-gray-800";
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Delete Tenant</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4 pt-4">
            <p className="text-foreground font-medium">
              Are you sure you want to delete this tenant?
            </p>

            <div className="space-y-3 rounded-lg border p-4 bg-muted/50">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Shop Number</p>
                <p className="font-semibold text-foreground">{tenant.shop_number}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Shop Name</p>
                <p className="font-semibold text-foreground">{tenant.shop_name}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Category</p>
                <Badge variant="outline" className={getCategoryVariant(tenant.shop_category)}>
                  {getCategoryLabel(tenant.shop_category)}
                </Badge>
              </div>

              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking change history...</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Change History Records</p>
                  <p className="font-semibold text-foreground">
                    {auditLogCount} {auditLogCount === 1 ? "record" : "records"} will be deleted
                  </p>
                </div>
              )}
            </div>

            <p className="text-sm text-destructive font-medium">
              This action cannot be undone. All tenant data and change history will be permanently deleted.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              "Delete Tenant"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
