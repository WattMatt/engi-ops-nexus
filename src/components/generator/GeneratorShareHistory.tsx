import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ExternalLink, Ban, Eye, Clock, Mail, Users } from "lucide-react";

interface GeneratorShareHistoryProps {
  projectId: string;
}

export function GeneratorShareHistory({ projectId }: GeneratorShareHistoryProps) {
  const queryClient = useQueryClient();

  const { data: shares = [], isLoading } = useQuery({
    queryKey: ["generator-report-shares", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generator_report_shares")
        .select(`
          *,
          shared_by_profile:profiles!generator_report_shares_shared_by_fkey(full_name, email)
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const revokeMutation = useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await supabase
        .from("generator_report_shares")
        .update({ status: "revoked" })
        .eq("id", shareId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Access revoked successfully");
      queryClient.invalidateQueries({ queryKey: ["generator-report-shares"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to revoke access: ${error.message}`);
    },
  });

  const getStatusBadge = (share: any) => {
    const now = new Date();
    const expiresAt = new Date(share.expires_at);

    if (share.status === "revoked") {
      return <Badge variant="destructive">Revoked</Badge>;
    }
    if (expiresAt < now) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    return <Badge className="bg-green-500 text-white">Active</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">Loading share history...</p>
        </CardContent>
      </Card>
    );
  }

  if (shares.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-1">No shares yet</h3>
          <p className="text-sm text-muted-foreground">
            Share this report with clients to see history here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5" />
          Share History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recipient</TableHead>
              <TableHead>Shared By</TableHead>
              <TableHead>Sections</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shares.map((share: any) => {
              const isActive = share.status === "active" && new Date(share.expires_at) > new Date();
              const sharedByProfile = share.shared_by_profile;

              return (
                <TableRow key={share.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{share.recipient_name || share.recipient_email}</p>
                      <p className="text-xs text-muted-foreground">{share.recipient_email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {sharedByProfile?.full_name || sharedByProfile?.email || "Unknown"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(share.shared_sections || []).slice(0, 2).map((section: string) => (
                        <Badge key={section} variant="outline" className="text-xs">
                          {section}
                        </Badge>
                      ))}
                      {(share.shared_sections?.length || 0) > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{share.shared_sections.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(share)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3 text-muted-foreground" />
                      <span>{share.view_count || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {format(new Date(share.expires_at), "MMM d, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isActive && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const url = `${window.location.origin}/generator-report/${share.token}`;
                              navigator.clipboard.writeText(url);
                              toast.success("Link copied to clipboard");
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive">
                                <Ban className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke Access?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will immediately prevent {share.recipient_email} from accessing
                                  this report. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => revokeMutation.mutate(share.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Revoke Access
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
