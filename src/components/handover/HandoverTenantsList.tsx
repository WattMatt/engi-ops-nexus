import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { sortTenantsByShopNumber } from "@/utils/tenantSorting";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Store, Loader2, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TenantDocumentUpload } from "./TenantDocumentUpload";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface HandoverTenantsListProps {
  projectId: string;
}

export const HandoverTenantsList = ({ projectId }: HandoverTenantsListProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedTenants, setExpandedTenants] = useState<Set<string>>(new Set());

  const { data: tenants, isLoading, refetch } = useQuery({
    queryKey: ["handover-tenants", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, shop_number, shop_name, created_at")
        .eq("project_id", projectId);

      if (error) throw error;
      // Apply natural numeric sorting
      return data ? sortTenantsByShopNumber(data) : [];
    },
  });

  // Set up real-time subscription for live tracking
  useEffect(() => {
    const channel = supabase
      .channel('tenant-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'tenants',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          console.log('Tenant change detected:', payload);
          
          // Invalidate and refetch the tenants query
          queryClient.invalidateQueries({ queryKey: ["handover-tenants", projectId] });
          
          // Show notification based on event type
          if (payload.eventType === 'INSERT') {
            toast({
              title: "Tenant Added",
              description: "A new tenant has been added to the schedule",
            });
          } else if (payload.eventType === 'UPDATE') {
            toast({
              title: "Tenant Updated",
              description: "Tenant information has been updated",
            });
          } else if (payload.eventType === 'DELETE') {
            toast({
              title: "Tenant Removed",
              description: "A tenant has been removed from the schedule",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient, toast]);

  const handleRecreateSchedule = async () => {
    toast({
      title: "Refreshing schedule",
      description: "Syncing tenant data from tracker...",
    });
    
    await refetch();
    
    toast({
      title: "Success",
      description: "Tenant schedule refreshed successfully",
    });
  };

  const toggleTenant = (tenantId: string) => {
    setExpandedTenants((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tenantId)) {
        newSet.delete(tenantId);
      } else {
        newSet.add(tenantId);
      }
      return newSet;
    });
  };

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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Project Tenants</CardTitle>
            <CardDescription>
              All tenants associated with this project for handover documentation
            </CardDescription>
          </div>
          <Button
            onClick={handleRecreateSchedule}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Re-create Tenant Schedule
          </Button>
        </div>
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
                <TableHead className="w-12"></TableHead>
                <TableHead>Shop Number</TableHead>
                <TableHead>Shop Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => {
                const isExpanded = expandedTenants.has(tenant.id);
                return (
                  <Collapsible
                    key={tenant.id}
                    open={isExpanded}
                    onOpenChange={() => toggleTenant(tenant.id)}
                    asChild
                  >
                    <>
                      <TableRow>
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4 text-muted-foreground" />
                            {tenant.shop_number}
                          </div>
                        </TableCell>
                        <TableCell>{tenant.shop_name}</TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow>
                          <TableCell colSpan={3} className="p-4 bg-muted/50">
                            <TenantDocumentUpload
                              tenantId={tenant.id}
                              projectId={projectId}
                              shopNumber={tenant.shop_number}
                              shopName={tenant.shop_name}
                            />
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
