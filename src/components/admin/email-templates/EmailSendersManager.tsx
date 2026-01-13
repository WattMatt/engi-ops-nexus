import { useState } from "react";
import { useEmailSenders, useCreateEmailSender, useUpdateEmailSender, useDeleteEmailSender, EmailSender } from "@/hooks/useEmailTemplates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Mail, Shield } from "lucide-react";

export function EmailSendersManager() {
  const { data: senders, isLoading } = useEmailSenders();
  const createSender = useCreateEmailSender();
  const updateSender = useUpdateEmailSender();
  const deleteSender = useDeleteEmailSender();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSender, setEditingSender] = useState<EmailSender | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email_prefix: "",
    display_name: "",
    description: "",
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email_prefix: "",
      display_name: "",
      description: "",
      is_active: true,
    });
  };

  const handleCreate = async () => {
    await createSender.mutateAsync(formData);
    resetForm();
    setIsCreateOpen(false);
  };

  const handleUpdate = async () => {
    if (!editingSender) return;
    await updateSender.mutateAsync({ id: editingSender.id, ...formData });
    setEditingSender(null);
    resetForm();
  };

  const handleEdit = (sender: EmailSender) => {
    setEditingSender(sender);
    setFormData({
      name: sender.name,
      email_prefix: sender.email_prefix,
      display_name: sender.display_name,
      description: sender.description || "",
      is_active: sender.is_active,
    });
  };

  const handleDelete = async (id: string) => {
    await deleteSender.mutateAsync(id);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const SenderForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Sender Name</Label>
          <Input
            id="name"
            placeholder="e.g., Support Team"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email_prefix">Email Prefix</Label>
          <div className="flex">
            <Input
              id="email_prefix"
              placeholder="e.g., support"
              value={formData.email_prefix}
              onChange={(e) => setFormData({ ...formData, email_prefix: e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, '') })}
              className="rounded-r-none"
            />
            <div className="flex items-center px-3 border border-l-0 bg-muted text-muted-foreground text-sm rounded-r-md">
              @watsonmattheus.com
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="display_name">Display Name</Label>
        <Input
          id="display_name"
          placeholder="e.g., Watson Mattheus Support"
          value={formData.display_name}
          onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          This appears as the "From" name in email clients
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="What is this sender used for?"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label>Active</Label>
      </div>
      <DialogFooter>
        <Button onClick={onSubmit} disabled={!formData.name || !formData.email_prefix || !formData.display_name}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Senders
          </CardTitle>
          <CardDescription>
            Manage sender addresses for your outgoing emails
          </CardDescription>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Sender
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Email Sender</DialogTitle>
              <DialogDescription>
                Add a new sender address for your emails. All senders use the @watsonmattheus.com domain.
              </DialogDescription>
            </DialogHeader>
            <SenderForm onSubmit={handleCreate} submitLabel="Create Sender" />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sender</TableHead>
              <TableHead>Email Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {senders?.map((sender) => (
              <TableRow key={sender.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="font-medium">{sender.name}</div>
                      <div className="text-sm text-muted-foreground">{sender.display_name}</div>
                    </div>
                    {sender.is_predefined && (
                      <Badge variant="secondary" className="gap-1">
                        <Shield className="h-3 w-3" />
                        System
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {sender.full_email}
                  </code>
                </TableCell>
                <TableCell>
                  <Badge variant={sender.is_active ? "default" : "secondary"}>
                    {sender.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Dialog open={editingSender?.id === sender.id} onOpenChange={(open) => !open && setEditingSender(null)}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(sender)}
                          disabled={sender.is_predefined}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Email Sender</DialogTitle>
                          <DialogDescription>
                            Update the sender details
                          </DialogDescription>
                        </DialogHeader>
                        <SenderForm onSubmit={handleUpdate} submitLabel="Save Changes" />
                      </DialogContent>
                    </Dialog>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={sender.is_predefined}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Sender?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the sender "{sender.name}". Templates using this sender will need to be updated.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(sender.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
