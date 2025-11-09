import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface CreateProjectOutlineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOutlineCreated: (outlineId: string) => void;
}

interface FormData {
  project_name: string;
  prepared_by: string;
  address_line1: string;
  address_line2: string;
  address_line3: string;
  telephone: string;
  contact_person: string;
  revision: string;
}

export const CreateProjectOutlineDialog = ({
  open,
  onOpenChange,
  onOutlineCreated,
}: CreateProjectOutlineDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const currentProjectId = localStorage.getItem("currentProjectId");
  
  const { register, handleSubmit, reset, setValue } = useForm<FormData>({
    defaultValues: {
      revision: "Rev 0",
    },
  });

  // Fetch project details
  const { data: project } = useQuery({
    queryKey: ["project", currentProjectId],
    queryFn: async () => {
      if (!currentProjectId) return null;
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", currentProjectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentProjectId && open,
  });

  // Fetch company settings
  const { data: companySettings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch current user's employee details
  const { data: employee } = useQuery({
    queryKey: ["current-employee"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: open,
  });

  // Auto-populate form when data is loaded
  useEffect(() => {
    if (project && open) {
      setValue("project_name", project.name || "");
    }
    if (companySettings && open) {
      setValue("prepared_by", companySettings.company_name || "");
    }
    if (employee && open) {
      const fullName = `${employee.first_name} ${employee.last_name}`;
      setValue("contact_person", fullName);
      if (employee.phone) {
        setValue("telephone", employee.phone);
      }
    }
  }, [project, companySettings, employee, open, setValue]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const currentProjectId = localStorage.getItem("currentProjectId");
      if (!currentProjectId) {
        throw new Error("No project selected");
      }

      const { data: user } = await supabase.auth.getUser();

      const { data: outline, error } = await supabase
        .from("project_outlines")
        .insert({
          project_id: currentProjectId,
          ...data,
          created_by: user?.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create default sections based on baseline document
      const defaultSections = [
        { title: "Bulk Electrical Supply", number: 1 },
        { title: "Site Connection Point", number: 2 },
        { title: "Internal Medium Voltage Distribution", number: 3 },
        { title: "Low Voltage Distribution", number: 4 },
        { title: "Standby Systems", number: 5 },
        { title: "Metering", number: 6 },
        { title: "Electronic Services", number: 7 },
        { title: "Earthing and Lightning Protection", number: 8 },
      ];

      const sectionsToInsert = defaultSections.map((section, index) => ({
        outline_id: outline.id,
        section_number: section.number,
        section_title: section.title,
        content: "",
        sort_order: index + 1,
      }));

      const { error: sectionsError } = await supabase
        .from("project_outline_sections")
        .insert(sectionsToInsert);

      if (sectionsError) throw sectionsError;

      toast({
        title: "Success",
        description: "Project outline created successfully",
      });

      reset();
      onOutlineCreated(outline.id);
    } catch (error) {
      console.error("Error creating outline:", error);
      toast({
        title: "Error",
        description: "Failed to create project outline",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Project Outline</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="project_name">Project Name *</Label>
            <Input
              id="project_name"
              {...register("project_name", { required: true })}
              placeholder="e.g., CASTLE GATE LIFESTYLE"
            />
          </div>

          <div>
            <Label htmlFor="prepared_by">Prepared By</Label>
            <Input
              id="prepared_by"
              {...register("prepared_by")}
              placeholder="e.g., WATSON MATTHEUS CONSULTING ELECTRICAL ENGINEERS (PTY) LTD"
            />
          </div>

          <div>
            <Label htmlFor="address_line1">Address Line 1</Label>
            <Input
              id="address_line1"
              {...register("address_line1")}
              placeholder="e.g., 141 Witch Hazel ave, TM"
            />
          </div>

          <div>
            <Label htmlFor="address_line2">Address Line 2</Label>
            <Input
              id="address_line2"
              {...register("address_line2")}
              placeholder="e.g., Highveld Techno Park"
            />
          </div>

          <div>
            <Label htmlFor="address_line3">Address Line 3</Label>
            <Input
              id="address_line3"
              {...register("address_line3")}
              placeholder="e.g., Building 1A"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="telephone">Telephone</Label>
              <Input
                id="telephone"
                {...register("telephone")}
                placeholder="e.g., (012) 665 3487"
              />
            </div>

            <div>
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input
                id="contact_person"
                {...register("contact_person")}
                placeholder="e.g., Mr Arno Mattheus"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="revision">Revision</Label>
            <Input
              id="revision"
              {...register("revision")}
              placeholder="Rev 0"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Outline
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
