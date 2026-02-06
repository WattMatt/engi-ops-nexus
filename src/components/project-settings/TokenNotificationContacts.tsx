/**
 * Token Notification Contacts Manager
 * Allows admins to manage email notification recipients per token
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Trash2, Mail, UserPlus, Bell, BellOff, Users } from "lucide-react";

interface TokenNotificationContactsProps {
  tokenId: string;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NotificationContact {
  id: string;
  token_id: string;
  name: string;
  email: string;
  role: string | null;
  receives_rfi_notifications: boolean;
  receives_status_updates: boolean;
  created_at: string;
}

const ROLE_OPTIONS = [
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'site_engineer', label: 'Site Engineer' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'quantity_surveyor', label: 'Quantity Surveyor' },
  { value: 'client', label: 'Client Representative' },
  { value: 'other', label: 'Other' },
];

export function TokenNotificationContacts({
  tokenId,
  projectId,
  open,
  onOpenChange,
}: TokenNotificationContactsProps) {
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    role: 'contractor',
    receives_rfi_notifications: true,
    receives_status_updates: true,
  });

  const queryClient = useQueryClient();

  // Fetch existing contacts for this token
  const { data: contacts, isLoading } = useQuery({
    queryKey: ['token-notification-contacts', tokenId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('token_notification_contacts')
        .select('*')
        .eq('token_id', tokenId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as NotificationContact[];
    },
    enabled: open && !!tokenId,
  });

  // Fetch registered portal users for this token (to import)
  const { data: portalUsers } = useQuery({
    queryKey: ['portal-users-for-token', tokenId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_user_sessions')
        .select('*')
        .eq('token_id', tokenId);

      if (error) throw error;
      return data;
    },
    enabled: open && !!tokenId,
  });

  // Add contact mutation
  const addContactMutation = useMutation({
    mutationFn: async (contact: typeof newContact) => {
      const { data, error } = await supabase
        .from('token_notification_contacts')
        .insert({
          token_id: tokenId,
          name: contact.name,
          email: contact.email,
          role: contact.role,
          receives_rfi_notifications: contact.receives_rfi_notifications,
          receives_status_updates: contact.receives_status_updates,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['token-notification-contacts', tokenId] });
      toast.success('Contact added');
      setAddContactOpen(false);
      setNewContact({
        name: '',
        email: '',
        role: 'contractor',
        receives_rfi_notifications: true,
        receives_status_updates: true,
      });
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error('This email is already in the contact list');
      } else {
        toast.error('Failed to add contact');
      }
    },
  });

  // Update contact mutation
  const updateContactMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<NotificationContact> }) => {
      const { error } = await supabase
        .from('token_notification_contacts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['token-notification-contacts', tokenId] });
    },
  });

  // Delete contact mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from('token_notification_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['token-notification-contacts', tokenId] });
      toast.success('Contact removed');
    },
    onError: () => {
      toast.error('Failed to remove contact');
    },
  });

  // Import portal user as contact
  const importPortalUser = (user: { user_name: string; user_email: string }) => {
    // Check if already exists
    const exists = contacts?.some(c => c.email === user.user_email);
    if (exists) {
      toast.error('This user is already in the contact list');
      return;
    }

    setNewContact({
      name: user.user_name,
      email: user.user_email,
      role: 'contractor',
      receives_rfi_notifications: true,
      receives_status_updates: true,
    });
    setAddContactOpen(true);
  };

  const getRoleLabel = (role: string | null) => {
    const found = ROLE_OPTIONS.find(r => r.value === role);
    return found?.label || role || 'Unknown';
  };

  // Filter portal users that aren't already contacts
  const availablePortalUsers = portalUsers?.filter(
    user => !contacts?.some(c => c.email === user.user_email)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Contacts
          </DialogTitle>
          <DialogDescription>
            Manage who receives email notifications (RFI submissions, status updates) for this access link.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Import from portal users */}
          {availablePortalUsers && availablePortalUsers.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Import Registered Portal Users
              </p>
              <div className="flex flex-wrap gap-2">
                {availablePortalUsers.map((user, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => importPortalUser(user)}
                    className="text-xs"
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    {user.user_name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Contacts table */}
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : contacts && contacts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-center">RFI</TableHead>
                  <TableHead className="text-center">Updates</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-sm">{contact.email}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getRoleLabel(contact.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={contact.receives_rfi_notifications}
                        onCheckedChange={(checked) =>
                          updateContactMutation.mutate({
                            id: contact.id,
                            updates: { receives_rfi_notifications: !!checked },
                          })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={contact.receives_status_updates}
                        onCheckedChange={(checked) =>
                          updateContactMutation.mutate({
                            id: contact.id,
                            updates: { receives_status_updates: !!checked },
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteContactMutation.mutate(contact.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <BellOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notification contacts configured</p>
              <p className="text-xs mt-1">Add contacts to receive RFI and status notifications</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button variant="outline" onClick={() => setAddContactOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </DialogFooter>

        {/* Add Contact Sub-Dialog */}
        <Dialog open={addContactOpen} onOpenChange={setAddContactOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Notification Contact</DialogTitle>
              <DialogDescription>
                This person will receive email notifications for this access link.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Name</Label>
                  <Input
                    id="contact-name"
                    placeholder="John Smith"
                    value={newContact.name}
                    onChange={(e) => setNewContact((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="john@company.com"
                    value={newContact.email}
                    onChange={(e) => setNewContact((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={newContact.role}
                  onValueChange={(value) => setNewContact((prev) => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label>Notification Preferences</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="rfi-notifications"
                      checked={newContact.receives_rfi_notifications}
                      onCheckedChange={(checked) =>
                        setNewContact((prev) => ({ ...prev, receives_rfi_notifications: !!checked }))
                      }
                    />
                    <Label htmlFor="rfi-notifications" className="text-sm font-normal cursor-pointer">
                      Receive RFI notifications
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="status-updates"
                      checked={newContact.receives_status_updates}
                      onCheckedChange={(checked) =>
                        setNewContact((prev) => ({ ...prev, receives_status_updates: !!checked }))
                      }
                    />
                    <Label htmlFor="status-updates" className="text-sm font-normal cursor-pointer">
                      Receive status update notifications
                    </Label>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddContactOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => addContactMutation.mutate(newContact)}
                disabled={!newContact.name || !newContact.email || addContactMutation.isPending}
              >
                {addContactMutation.isPending ? 'Adding...' : 'Add Contact'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
