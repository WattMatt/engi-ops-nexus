import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, Building2 } from "lucide-react";

interface GlobalContact {
  id: string;
  contact_type: string;
  organization_name: string;
  contact_person_name: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  logo_url: string | null;
  notes: string | null;
}

const CONTACT_TYPES = [
  { value: "client", label: "Client" },
  { value: "quantity_surveyor", label: "Quantity Surveyor" },
  { value: "architect", label: "Architect" },
  { value: "contractor", label: "Contractor" },
  { value: "engineer", label: "Engineer" },
  { value: "consultant", label: "Consultant" },
  { value: "other", label: "Other" },
];

export function GlobalContactsManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<GlobalContact | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    contact_type: "client",
    organization_name: "",
    contact_person_name: "",
    email: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    logo_url: "",
    notes: "",
  });

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["global-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("global_contacts")
        .select("*")
        .order("contact_type")
        .order("organization_name");
      
      if (error) throw error;
      return data as GlobalContact[];
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `contact-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('project-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project-logos')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, logo_url: publicUrl }));

      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingContact) {
        const { error } = await supabase
          .from('global_contacts')
          .update({
            contact_type: formData.contact_type,
            organization_name: formData.organization_name,
            contact_person_name: formData.contact_person_name || null,
            email: formData.email || null,
            phone: formData.phone || null,
            address_line1: formData.address_line1 || null,
            address_line2: formData.address_line2 || null,
            logo_url: formData.logo_url || null,
            notes: formData.notes || null,
          })
          .eq('id', editingContact.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Contact updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('global_contacts')
          .insert({
            contact_type: formData.contact_type,
            organization_name: formData.organization_name,
            contact_person_name: formData.contact_person_name || null,
            email: formData.email || null,
            phone: formData.phone || null,
            address_line1: formData.address_line1 || null,
            address_line2: formData.address_line2 || null,
            logo_url: formData.logo_url || null,
            notes: formData.notes || null,
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Contact added to library",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["global-contacts"] });
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save contact",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm("Are you sure you want to delete this contact from the library? It will still remain linked to existing projects.")) return;

    try {
      const { error } = await supabase
        .from('global_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contact removed from library",
      });

      queryClient.invalidateQueries({ queryKey: ["global-contacts"] });
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete contact",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (contact: GlobalContact) => {
    setEditingContact(contact);
    setFormData({
      contact_type: contact.contact_type,
      organization_name: contact.organization_name,
      contact_person_name: contact.contact_person_name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      address_line1: contact.address_line1 || "",
      address_line2: contact.address_line2 || "",
      logo_url: contact.logo_url || "",
      notes: contact.notes || "",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingContact(null);
    setFormData({
      contact_type: "client",
      organization_name: "",
      contact_person_name: "",
      email: "",
      phone: "",
      address_line1: "",
      address_line2: "",
      logo_url: "",
      notes: "",
    });
  };

  const getContactTypeLabel = (type: string) => {
    return CONTACT_TYPES.find(t => t.value === type)?.label || type;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Global Contacts Library</CardTitle>
            <CardDescription>
              Manage your contacts library for quick selection across all projects
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingContact ? "Edit Contact" : "Add New Contact"}</DialogTitle>
                <DialogDescription>
                  Add a contact to your global library for easy reuse across projects
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_type">Contact Type *</Label>
                    <Select
                      value={formData.contact_type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, contact_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTACT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="organization_name">Organization Name *</Label>
                    <Input
                      id="organization_name"
                      value={formData.organization_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, organization_name: e.target.value }))}
                      placeholder="ABC Company (Pty) Ltd"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Organization Logo</Label>
                  <div className="flex items-center gap-4">
                    {formData.logo_url && (
                      <img
                        src={formData.logo_url}
                        alt="Logo"
                        className="h-16 w-auto object-contain border rounded p-2"
                      />
                    )}
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploading}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG or SVG recommended
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_person_name">Contact Person</Label>
                    <Input
                      id="contact_person_name"
                      value={formData.contact_person_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_person_name: e.target.value }))}
                      placeholder="John Smith"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="contact@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(012) 345 6789"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address_line1">Address Line 1</Label>
                  <Input
                    id="address_line1"
                    value={formData.address_line1}
                    onChange={(e) => setFormData(prev => ({ ...prev, address_line1: e.target.value }))}
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address_line2">Address Line 2</Label>
                  <Input
                    id="address_line2"
                    value={formData.address_line2}
                    onChange={(e) => setFormData(prev => ({ ...prev, address_line2: e.target.value }))}
                    placeholder="City, Province, Postal Code"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional information..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      editingContact ? "Update Contact" : "Add Contact"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!contacts || contacts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No contacts in library yet</p>
            <p className="text-sm">Add contacts to quickly assign them to projects</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {contacts.map((contact) => (
              <div key={contact.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {contact.logo_url && (
                      <img
                        src={contact.logo_url}
                        alt={contact.organization_name}
                        className="h-10 w-auto object-contain"
                      />
                    )}
                    <div>
                      <h4 className="font-semibold">{contact.organization_name}</h4>
                      <p className="text-sm text-muted-foreground">{getContactTypeLabel(contact.contact_type)}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(contact)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(contact.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-1 text-sm">
                  {contact.contact_person_name && (
                    <p className="text-muted-foreground">Contact: {contact.contact_person_name}</p>
                  )}
                  {contact.email && (
                    <p className="text-muted-foreground">Email: {contact.email}</p>
                  )}
                  {contact.phone && (
                    <p className="text-muted-foreground">Phone: {contact.phone}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
