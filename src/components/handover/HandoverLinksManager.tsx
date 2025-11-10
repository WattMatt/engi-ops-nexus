import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Copy, Trash2, Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, isPast } from "date-fns";
import { useState } from "react";

interface HandoverLinksManagerProps {
  projectId: string;
}

export const HandoverLinksManager = ({ projectId }: HandoverLinksManagerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: links, isLoading } = useQuery({
    queryKey: ["handover-links", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handover_links" as any)
        .select(`
          *,
          profiles:created_by(full_name)
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from("handover_links" as any)
        .delete()
        .eq("id", linkId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Link deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["handover-links", projectId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyLink = (token: string, linkId: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/handover/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(linkId);
    toast({
      title: "Copied",
      description: "Link copied to clipboard",
    });
    setTimeout(() => setCopiedId(null), 2000);
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

  if (!links || links.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Client Links</CardTitle>
        <CardDescription>
          Manage shareable links for client access
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Created</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Access Count</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.map((link: any) => {
              const isExpired = link.expires_at && isPast(new Date(link.expires_at));
              return (
                <TableRow key={link.id}>
                  <TableCell>
                    {format(new Date(link.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>{link.profiles?.full_name || "Unknown"}</TableCell>
                  <TableCell>
                    {link.expires_at
                      ? format(new Date(link.expires_at), "MMM d, yyyy")
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={isExpired ? "destructive" : "secondary"}>
                      {isExpired ? "Expired" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell>{link.access_count || 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyLink(link.link_token, link.id)}
                      >
                        {copiedId === link.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(link.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
};
