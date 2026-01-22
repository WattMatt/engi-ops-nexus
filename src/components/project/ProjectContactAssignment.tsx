import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { Check, ChevronsUpDown, X, Building2, Loader2, Plus, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";

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
  { type: "client", label: "Client", required: true, description: "The project client/owner" },
  { type: "quantity_surveyor", label: "Quantity Surveyor", required: false, description: "QS consultants" },
  { type: "architect", label: "Architect", required: false, description: "Architectural consultants" },
  { type: "project_manager", label: "Project Manager", required: false, description: "PM consultants" },
  { type: "structural", label: "Structural Engineer", required: false, description: "Structural consultants" },
  { type: "civil", label: "Civil Engineer", required: false, description: "Civil engineering consultants" },
  { type: "mechanical", label: "Mechanical Engineer", required: false, description: "HVAC/mechanical consultants" },
  { type: "electrical_contractor", label: "Electrical Contractor", required: false, description: "Electrical subcontractors" },
  { type: "contractor", label: "Main Contractor", required: false, description: "Principal contractor" },
  { type: "fire", label: "Fire Protection", required: false, description: "Fire systems consultants" },
  { type: "security__data", label: "Security & Data", required: false, description: "Security/IT consultants" },
  { type: "lighting", label: "Lighting", required: false, description: "Lighting specialists" },
  { type: "generator", label: "Generator", required: false, description: "Generator suppliers" },
  { type: "solar", label: "Solar", required: false, description: "Solar/renewable energy" },
  { type: "supply_authority", label: "Supply Authority", required: false, description: "Utility provider" },
  { type: "wet_services", label: "Wet Services", required: false, description: "Plumbing consultants" },
  { type: "landscaping", label: "Landscaping", required: false, description: "Landscape architects" },
  { type: "safety", label: "Health & Safety", required: false, description: "H&S consultants" },
  { type: "tenant_coordinator", label: "Tenant Coordinator", required: false, description: "Tenant liaison" },
];

export function ProjectContactAssignment({ projectId }: ProjectContactAssignmentProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
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

      toast({ title: "Contact added", description: `${globalContact.organization_name} has been assigned to the project.` });
      queryClient.invalidateQueries({ queryKey: ["project-contacts", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-client-check", projectId] });
      refetch();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(null);
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

      toast({ title: "Contact removed", description: `${projectContact.organization_name} has been removed from the project.` });
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with link to global library */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Assign contacts from your global library to this project. Required fields are marked with *.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/contact-library")}
          className="gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Manage Global Library
        </Button>
      </div>

      {/* Contact assignment cards */}
      <div className="grid gap-4">
        {CONTACT_CATEGORIES.map((category) => {
          const assigned = getAssignedContacts(category.type);
          const available = contactsByType[category.type] || [];
          const unassigned = available.filter((c) => !isAssigned(c.id));

          return (
            <Card key={category.type} className={cn(
              "transition-all",
              category.required && assigned.length === 0 && "border-destructive/50 bg-destructive/5"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {category.label}
                      {category.required && <span className="text-destructive">*</span>}
                    </CardTitle>
                    <CardDescription className="text-xs">{category.description}</CardDescription>
                  </div>
                  
                  {/* Add contact popover */}
                  <Popover 
                    open={openPopover === category.type} 
                    onOpenChange={(open) => setOpenPopover(open ? category.type : null)}
                  >
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2" disabled={unassigned.length === 0}>
                        <Plus className="h-4 w-4" />
                        Add
                        <ChevronsUpDown className="h-3 w-3 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="end">
                      <Command>
                        <CommandInput placeholder={`Search ${category.label.toLowerCase()}...`} />
                        <CommandList>
                          <CommandEmpty>
                            No contacts found. Add one in the Global Library.
                          </CommandEmpty>
                          <CommandGroup>
                            {unassigned.map((contact) => (
                              <CommandItem
                                key={contact.id}
                                value={contact.organization_name}
                                onSelect={() => {
                                  handleAddContact(contact);
                                  setOpenPopover(null);
                                }}
                                className="flex items-center gap-3 cursor-pointer"
                              >
                                <Avatar className="h-8 w-8">
                                  {contact.logo_url ? (
                                    <AvatarImage src={contact.logo_url} alt={contact.organization_name} />
                                  ) : null}
                                  <AvatarFallback className="text-xs">
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
                                {saving === contact.id && <Loader2 className="h-4 w-4 animate-spin" />}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {assigned.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic py-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    No {category.label.toLowerCase()} assigned
                    {available.length === 0 && (
                      <span className="text-xs">— add one in the Global Library first</span>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {assigned.map((contact) => (
                      <Badge
                        key={contact.id}
                        variant="secondary"
                        className="flex items-center gap-2 py-1.5 px-3 text-sm"
                      >
                        <Avatar className="h-5 w-5">
                          {contact.logo_url ? (
                            <AvatarImage src={contact.logo_url} alt={contact.organization_name} />
                          ) : null}
                          <AvatarFallback className="text-[10px]">
                            {contact.organization_name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate max-w-[150px]">{contact.organization_name}</span>
                        <button
                          onClick={() => handleRemoveContact(contact)}
                          className="ml-1 hover:bg-muted rounded-full p-0.5 transition-colors"
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
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}