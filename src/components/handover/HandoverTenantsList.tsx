import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Store, Loader2 } from "lucide-react";

interface HandoverTenantsListProps {
  projectId: string;
}

export const HandoverTenantsList = ({ projectId }: HandoverTenantsListProps) => {
  const { data: tenants, isLoading } = useQuery({
    queryKey: ["handover-tenants", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, shop_number, shop_name, created_at")
        .eq("project_id", projectId)
        .order("shop_number", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Tenants</CardTitle>
        <CardDescription>
          All tenants associated with this project for handover documentation
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!tenants || tenants.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tenants found for this project</p>
            <p className="text-sm">Add tenants in the Tenant Tracker</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop Number</TableHead>
                <TableHead>Shop Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-muted-foreground" />
                      {tenant.shop_number}
                    </div>
                  </TableCell>
                  <TableCell>{tenant.shop_name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
