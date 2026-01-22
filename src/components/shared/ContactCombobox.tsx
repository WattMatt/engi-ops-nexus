import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronsUpDown, Search, X, Upload } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Contact {
  id: string;
  organization_name: string | null;
  contact_type: string;
  contact_person_name: string | null;
  phone: string | null;
  logo_url: string | null;
  is_primary?: boolean | null;
}

interface ContactComboboxProps {
  projectId?: string;
  value: string;
  onValueChange: (value: string) => void;
  onContactSelect?: (contact: Contact | null) => void;
  label?: string;
  includeCustomOption?: boolean;
  /** Use global_contacts instead of project_contacts */
  useGlobalContacts?: boolean;
  /** Filter by contact type */
  filterByType?: string;
}

const getContactTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    client: "Client",
    quantity_surveyor: "Quantity Surveyor",
    architect: "Architect",
    contractor: "Contractor",
    engineer: "Engineer",
    consultant: "Consultant",
    civil: "Civil",
    other: "Other",
  };
  return labels[type] || type;
};

export function ContactCombobox({
  projectId,
  value,
  onValueChange,
  onContactSelect,
  label = "Select Contact",
  includeCustomOption = true,
  useGlobalContacts = false,
  filterByType,
}: ContactComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch from global_contacts
  const { data: globalContacts = [], isLoading: isLoadingGlobal } = useQuery({
    queryKey: ["global-contacts-combobox", filterByType],
    queryFn: async () => {
      let query = supabase
        .from("global_contacts")
        .select("*")
        .order("organization_name");

      if (filterByType) {
        query = query.eq("contact_type", filterByType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Contact[];
    },
    enabled: useGlobalContacts,
  });

  // Fetch from project_contacts
  const { data: projectContacts = [], isLoading: isLoadingProject } = useQuery({
    queryKey: ["project-contacts", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_contacts")
        .select("*")
        .eq("project_id", projectId)
        .order("is_primary", { ascending: false })
        .order("organization_name");

      if (error) throw error;
      return (data || []) as Contact[];
    },
    enabled: !useGlobalContacts && !!projectId,
  });

  const contacts = useGlobalContacts ? globalContacts : projectContacts;
  const isLoading = useGlobalContacts ? isLoadingGlobal : isLoadingProject;

  // Filter contacts based on search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    
    const query = searchQuery.toLowerCase();
    return contacts.filter(
      (contact) =>
        contact.organization_name?.toLowerCase().includes(query) ||
        contact.contact_person_name?.toLowerCase().includes(query) ||
        getContactTypeLabel(contact.contact_type).toLowerCase().includes(query)
    );
  }, [contacts, searchQuery]);

  // Get selected contact display text
  const selectedContact = contacts.find((c) => c.id === value);
  const displayValue = value === "custom" 
    ? "Custom upload..." 
    : selectedContact 
      ? `${selectedContact.organization_name} (${getContactTypeLabel(selectedContact.contact_type)})`
      : null;

  const handleSelect = (contactId: string) => {
    onValueChange(contactId);
    if (contactId === "custom") {
      onContactSelect?.(null);
    } else {
      const contact = contacts.find((c) => c.id === contactId);
      onContactSelect?.(contact || null);
    }
    setOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange("");
    onContactSelect?.(null);
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className={cn("truncate", !displayValue && "text-muted-foreground")}>
              {displayValue || "Select from project contacts..."}
            </span>
            <div className="flex items-center gap-1 ml-2 shrink-0">
              {value && (
                <X
                  className="h-4 w-4 opacity-50 hover:opacity-100"
                  onClick={handleClear}
                />
              )}
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0 bg-popover" align="start">
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <ScrollArea className="max-h-[300px]">
            <div className="p-1">
              {includeCustomOption && (
                <button
                  type="button"
                  onClick={() => handleSelect("custom")}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                    value === "custom" && "bg-accent text-accent-foreground"
                  )}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  <span>Custom upload...</span>
                  {value === "custom" && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </button>
              )}
              
              {isLoading ? (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  Loading contacts...
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  {contacts.length === 0
                    ? "No contacts available. Add contacts in Project Settings."
                    : "No contacts match your search."}
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <button
                    type="button"
                    key={contact.id}
                    onClick={() => handleSelect(contact.id)}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                      value === contact.id && "bg-accent text-accent-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {contact.logo_url ? (
                        <img
                          src={contact.logo_url}
                          alt=""
                          className="h-6 w-6 rounded object-contain bg-muted shrink-0"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded bg-muted flex items-center justify-center shrink-0">
                          <span className="text-xs font-medium">
                            {contact.organization_name?.charAt(0) || "?"}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col items-start min-w-0">
                        <span className="truncate font-medium">
                          {contact.organization_name}
                          {contact.is_primary && " ⭐"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {getContactTypeLabel(contact.contact_type)}
                          {contact.contact_person_name && ` • ${contact.contact_person_name}`}
                        </span>
                      </div>
                    </div>
                    {value === contact.id && (
                      <Check className="ml-2 h-4 w-4 shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
