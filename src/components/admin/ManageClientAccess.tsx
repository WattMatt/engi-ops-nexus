import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Trash2, Eye, MessageSquare, CheckCircle, Users, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DocumentTabSelector, DOCUMENT_TABS } from "./DocumentTabSelector";

interface ClientAccess {
  id: string;
  user_id: string;
  project_id: string;
  user_email?: string;
  project_name?: string;
  permissions: {
    report_type: string;
    can_view: boolean;
    can_comment: boolean;
    can_approve: boolean;
  }[];
}

interface ManageClientAccessProps {
  projectId?: string;
}

export const ManageClientAccess = ({ projectId }: ManageClientAccessProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [selectedProject, setSelectedProject] = useState(projectId || "");
  const [permissions, setPermissions] = useState({
    tenant_report: { view: true, comment: true, approve: false },
    generator_report: { view: true, comment: true, approve: false },
    cost_report: { view: true, comment: false, approve: false },
    project_documents: { view: true, comment: false, approve: false }
  });
  const [selectedDocumentTabs, setSelectedDocumentTabs] = useState<string[]>(
    DOCUMENT_TABS.map(t => t.key)
  );

  const queryClient = useQueryClient();

  const { data: projects } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !projectId
  });

  const { data: clientAccess, isLoading } = useQuery({
    queryKey: ['client-access', projectId],
    queryFn: async () => {
      let query = supabase
        .from('client_project_access')
        .select(`
          id,
          user_id,
          project_id,
          projects(name),
          client_report_permissions(
            report_type,
            can_view,
            can_comment,
            can_approve
          )
        `);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    }
  });

  const addClientMutation = useMutation({
    mutationFn: async () => {
      // First, check if user exists or create invitation
      const { data: existingUser, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create the user through auth signup (they'll need to set password via email)
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: email.toLowerCase(),
          email_confirm: false,
          user_metadata: { role: 'client' }
        });

        if (authError) {
          // If we can't create via admin, prompt user to sign up
          throw new Error(`User not found. Please ask ${email} to sign up first, then try again.`);
        }
        
        userId = authData.user.id;
      }

      // Add client role
      await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: 'client' }, { onConflict: 'user_id,role' });

      // Create project access
      const { data: accessData, error: accessError } = await supabase
        .from('client_project_access')
        .insert({
          user_id: userId,
          project_id: selectedProject,
          granted_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (accessError) throw accessError;

      // Create permissions
      const permissionRecords = Object.entries(permissions).map(([reportType, perms]) => ({
        client_access_id: accessData.id,
        report_type: reportType,
        can_view: perms.view,
        can_comment: perms.comment,
        can_approve: perms.approve,
        document_tabs: reportType === 'project_documents' ? selectedDocumentTabs : null
      }));

      const { error: permError } = await supabase
        .from('client_report_permissions')
        .insert(permissionRecords);

      if (permError) throw permError;

      return accessData;
    },
    onSuccess: () => {
      toast.success("Client access granted");
      setIsOpen(false);
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ['client-access'] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const removeAccessMutation = useMutation({
    mutationFn: async (accessId: string) => {
      const { error } = await supabase
        .from('client_project_access')
        .delete()
        .eq('id', accessId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Client access removed");
      queryClient.invalidateQueries({ queryKey: ['client-access'] });
    },
    onError: () => {
      toast.error("Failed to remove access");
    }
  });

  const handleAddClient = () => {
    if (!email || !selectedProject) {
      toast.error("Please enter email and select a project");
      return;
    }
    addClientMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Client Access Management
            </CardTitle>
            <CardDescription>
              Manage which clients can view and comment on project reports
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Grant Client Access</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Client Email</Label>
                  <Input
                    type="email"
                    placeholder="client@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {!projectId && (
                  <div className="space-y-2">
                    <Label>Project</Label>
                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-3">
                  <Label>Report Permissions</Label>
                  
                  {Object.entries(permissions).map(([reportType, perms]) => (
                    <div key={reportType} className="p-3 rounded-lg border bg-muted/50">
                      <div className="font-medium text-sm mb-2 capitalize">
                        {reportType.replace('_', ' ')}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <label className="flex items-center gap-2">
                          <Switch
                            checked={perms.view}
                            onCheckedChange={(v) => setPermissions(p => ({
                              ...p,
                              [reportType]: { ...p[reportType as keyof typeof p], view: v }
                            }))}
                          />
                          <Eye className="h-3 w-3" /> View
                        </label>
                        <label className="flex items-center gap-2">
                          <Switch
                            checked={perms.comment}
                            onCheckedChange={(v) => setPermissions(p => ({
                              ...p,
                              [reportType]: { ...p[reportType as keyof typeof p], comment: v }
                            }))}
                          />
                          <MessageSquare className="h-3 w-3" /> Comment
                        </label>
                        <label className="flex items-center gap-2">
                          <Switch
                            checked={perms.approve}
                            onCheckedChange={(v) => setPermissions(p => ({
                              ...p,
                              [reportType]: { ...p[reportType as keyof typeof p], approve: v }
                            }))}
                          />
                          <CheckCircle className="h-3 w-3" /> Approve
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Document Tabs Selection - only show if project_documents is enabled */}
                {permissions.project_documents.view && (
                  <DocumentTabSelector
                    selectedTabs={selectedDocumentTabs}
                    onTabsChange={setSelectedDocumentTabs}
                  />
                )}

                <Button 
                  className="w-full" 
                  onClick={handleAddClient}
                  disabled={addClientMutation.isPending}
                >
                  {addClientMutation.isPending ? "Adding..." : "Grant Access"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : clientAccess?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No clients have been granted access yet
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  {!projectId && <TableHead>Project</TableHead>}
                  <TableHead>Permissions</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientAccess?.map((access) => (
                  <TableRow key={access.id}>
                    <TableCell className="font-mono text-xs">
                      {access.user_id.substring(0, 8)}...
                    </TableCell>
                    {!projectId && (
                      <TableCell>{access.projects?.name || '-'}</TableCell>
                    )}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {access.client_report_permissions?.map((perm: any) => (
                          perm.can_view && (
                            <Badge key={perm.report_type} variant="secondary" className="text-xs">
                              {perm.report_type.replace('_', ' ')}
                              {perm.can_comment && ' 💬'}
                              {perm.can_approve && ' ✓'}
                            </Badge>
                          )
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAccessMutation.mutate(access.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
