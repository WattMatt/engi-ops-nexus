import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { ChevronsUpDown, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";

interface ProjectContactAssignmentProps {
  projectId: string;
}

interface GlobalContact {
  id: string;
  contact_type: string;
  organization_name: string;
  contact_person_name: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
}

interface ProjectContact {
  id: string;
  contact_type: string;
  organization_name: string;
  contact_person_name: string | null;
  logo_url: string | null;
  global_contact_id: string | null;
}

// Define contact type categories with labels and required status
const CONTACT_CATEGORIES = [
  { type: "client", label: "Client", required: true },
  { type: "quantity_surveyor", label: "Quantity Surveyor", required: false },
  { type: "architect", label: "Architect", required: false },
  { type: "project_manager", label: "Project Manager", required: false },
  { type: "structural", label: "Structural Engineer", required: false },
  { type: "civil", label: "Civil Engineer", required: false },
  { type: "mechanical", label: "Mechanical Engineer", required: false },
  { type: "electrical_contractor", label: "Electrical Contractor", required: false },
  { type: "contractor", label: "Main Contractor", required: false },
  { type: "fire", label: "Fire Protection", required: false },
  { type: "security__data", label: "Security & Data", required: false },
  { type: "lighting", label: "Lighting", required: false },
  { type: "generator", label: "Generator", required: false },
  { type: "solar", label: "Solar", required: false },
  { type: "supply_authority", label: "Supply Authority", required: false },
  { type: "wet_services", label: "Wet Services", required: false },
  { type: "landscaping", label: "Landscaping", required: false },
  { type: "safety", label: "Health & Safety", required: false },
  { type: "tenant_coordinator", label: "Tenant Coordinator", required: false },
];

export function ProjectContactAssignment({ projectId }: ProjectContactAssignmentProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Fetch global contacts
  const { data: globalContacts = [], isLoading: loadingGlobal } = useQuery({
    queryKey: ["global-contacts-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("global_contacts")
        .select("id, contact_type, organization_name, contact_person_name, email, phone, logo_url")
        .order("organization_name");
      if (error) throw error;
      return data as GlobalContact[];
    },
  });

  // Fetch project contacts
  const { data: projectContacts = [], isLoading: loadingProject, refetch } = useQuery({
    queryKey: ["project-contacts", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_contacts")
        .select("id, contact_type, organization_name, contact_person_name, logo_url, global_contact_id")
        .eq("project_id", projectId)
        .order("organization_name");
      if (error) throw error;
      return data as ProjectContact[];
    },
    enabled: !!projectId,
  });

  // Group global contacts by type
  const contactsByType = useMemo(() => {
    const grouped: Record<string, GlobalContact[]> = {};
    globalContacts.forEach((contact) => {
      if (!grouped[contact.contact_type]) {
        grouped[contact.contact_type] = [];
      }
      grouped[contact.contact_type].push(contact);
    });
    return grouped;
  }, [globalContacts]);

  // Get assigned contacts for a type
  const getAssignedContacts = (type: string): ProjectContact[] => {
    return projectContacts.filter((pc) => pc.contact_type === type);
  };

  // Check if a global contact is already assigned
  const isAssigned = (globalContactId: string): boolean => {
    return projectContacts.some((pc) => pc.global_contact_id === globalContactId);
  };

  // Add contact to project
  const handleAddContact = async (globalContact: GlobalContact) => {
    setSaving(globalContact.id);
    try {
      const { error } = await supabase.from("project_contacts").insert({
        project_id: projectId,
        contact_type: globalContact.contact_type,
        organization_name: globalContact.organization_name,
        contact_person_name: globalContact.contact_person_name,
        email: globalContact.email,
        phone: globalContact.phone,
        logo_url: globalContact.logo_url,
        global_contact_id: globalContact.id,
        is_primary: getAssignedContacts(globalContact.contact_type).length === 0,
      });

      if (error) throw error;

      toast({ title: "Contact added", description: `${globalContact.organization_name} assigned.` });
      queryClient.invalidateQueries({ queryKey: ["project-contacts", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-client-check", projectId] });
      refetch();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(null);
      setOpenPopover(null);
    }
  };

  // Remove contact from project
  const handleRemoveContact = async (projectContact: ProjectContact) => {
    setSaving(projectContact.id);
    try {
      const { error } = await supabase
        .from("project_contacts")
        .delete()
        .eq("id", projectContact.id);

      if (error) throw error;

      toast({ title: "Contact removed", description: `${projectContact.organization_name} removed.` });
      queryClient.invalidateQueries({ queryKey: ["project-contacts", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-client-check", projectId] });
      refetch();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  if (loadingGlobal || loadingProject) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {CONTACT_CATEGORIES.map((category) => {
        const assigned = getAssignedContacts(category.type);
        const available = contactsByType[category.type] || [];
        const unassigned = available.filter((c) => !isAssigned(c.id));

        return (
          <div key={category.type} className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1">
              {category.label}
              {category.required && <span className="text-destructive">*</span>}
            </Label>

            {/* Dropdown selector */}
            <Popover 
              open={openPopover === category.type} 
              onOpenChange={(open) => setOpenPopover(open ? category.type : null)}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm",
                    "bg-background hover:bg-accent/50 transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    category.required && assigned.length === 0 && "border-destructive",
                    assigned.length > 0 ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <span className="truncate">
                    {assigned.length > 0 
                      ? `${assigned.length} selected` 
                      : `Select ${category.label.toLowerCase()}...`
                    }
                  </span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0 z-50 bg-popover border shadow-lg" align="start">
                <Command className="bg-popover">
                  <CommandInput placeholder={`Search ${category.label.toLowerCase()}...`} />
                  <CommandList className="max-h-60">
                    <CommandEmpty className="py-3 text-center text-sm text-muted-foreground">
                      No {category.label.toLowerCase()} in library
                    </CommandEmpty>
                    <CommandGroup>
                      {available.map((contact) => {
                        const alreadyAssigned = isAssigned(contact.id);
                        return (
                          <CommandItem
                            key={contact.id}
                            value={contact.organization_name}
                            onSelect={() => {
                              if (!alreadyAssigned) {
                                handleAddContact(contact);
                              }
                            }}
                            className={cn(
                              "flex items-center gap-3 cursor-pointer",
                              alreadyAssigned && "opacity-50"
                            )}
                            disabled={alreadyAssigned}
                          >
                            <Avatar className="h-7 w-7 shrink-0">
                              {contact.logo_url ? (
                                <AvatarImage src={contact.logo_url} alt={contact.organization_name} />
                              ) : null}
                              <AvatarFallback className="text-[10px] bg-muted">
                                {contact.organization_name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{contact.organization_name}</p>
                              {contact.contact_person_name && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {contact.contact_person_name}
                                </p>
                              )}
                            </div>
                            {alreadyAssigned && (
                              <Badge variant="secondary" className="text-[10px] px-1.5">Added</Badge>
                            )}
                            {saving === contact.id && <Loader2 className="h-4 w-4 animate-spin" />}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Assigned contacts as badges */}
            {assigned.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {assigned.map((contact) => (
                  <Badge
                    key={contact.id}
                    variant="secondary"
                    className="flex items-center gap-1.5 py-1 px-2 text-xs"
                  >
                    <Avatar className="h-4 w-4">
                      {contact.logo_url ? (
                        <AvatarImage src={contact.logo_url} alt={contact.organization_name} />
                      ) : null}
                      <AvatarFallback className="text-[8px]">
                        {contact.organization_name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate max-w-[100px]">{contact.organization_name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveContact(contact)}
                      className="ml-0.5 hover:bg-muted rounded-full p-0.5 transition-colors"
                      disabled={saving === contact.id}
                    >
                      {saving === contact.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}