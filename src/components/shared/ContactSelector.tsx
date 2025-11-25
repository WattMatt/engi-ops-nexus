import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ContactSelectorProps {
  projectId: string;
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
}

export function ContactSelector({ projectId, value, onValueChange, label = "Prepared For Contact" }: ContactSelectorProps) {
  const { data: contacts = [] } = useQuery({
    queryKey: ["project-contacts", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_contacts")
        .select("*")
        .eq("project_id", projectId)
        .order("is_primary", { ascending: false })
        .order("organization_name");
      
      if (error) throw error;
      return data || [];
    },
  });

  const getContactTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      client: "Client",
      quantity_surveyor: "Quantity Surveyor",
      architect: "Architect",
      contractor: "Contractor",
      engineer: "Engineer",
      consultant: "Consultant",
      other: "Other",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select contact for cover page" />
        </SelectTrigger>
        <SelectContent>
          {contacts.map((contact) => (
            <SelectItem key={contact.id} value={contact.id}>
              {contact.organization_name} ({getContactTypeLabel(contact.contact_type)})
              {contact.is_primary && " ⭐"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {contacts.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No contacts available. Add contacts in Project Settings.
        </p>
      )}
    </div>
  );
}
