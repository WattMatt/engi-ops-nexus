import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DefectPin {
  id: string;
  project_id: string;
  drawing_id: string;
  list_id: string | null;
  number_id: number;
  x_percent: number;
  y_percent: number;
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  package: string | null;
  markup_json: any;
  created_by_name: string;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface DefectPhoto {
  id: string;
  pin_id: string;
  storage_path: string;
  file_name: string | null;
  file_size: number | null;
  uploaded_by_name: string | null;
  created_at: string;
}

export interface DefectActivityEntry {
  id: string;
  pin_id: string;
  activity_type: string;
  content: string | null;
  old_value: string | null;
  new_value: string | null;
  user_name: string;
  user_email: string | null;
  created_at: string;
}

export const useDefectPins = (projectId: string, drawingId?: string) => {
  return useQuery({
    queryKey: ["defect-pins", projectId, drawingId],
    queryFn: async () => {
      let query = supabase
        .from("defect_pins")
        .select("*")
        .eq("project_id", projectId)
        .order("number_id", { ascending: true });

      if (drawingId) {
        query = query.eq("drawing_id", drawingId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DefectPin[];
    },
    enabled: !!projectId,
  });
};

export const useDefectPhotos = (pinId: string) => {
  return useQuery({
    queryKey: ["defect-photos", pinId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("defect_photos")
        .select("*")
        .eq("pin_id", pinId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as DefectPhoto[];
    },
    enabled: !!pinId,
  });
};

export const useDefectActivity = (pinId: string) => {
  return useQuery({
    queryKey: ["defect-activity", pinId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("defect_activity")
        .select("*")
        .eq("pin_id", pinId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DefectActivityEntry[];
    },
    enabled: !!pinId,
  });
};

interface CreatePinInput {
  project_id: string;
  drawing_id: string;
  list_id?: string | null;
  x_percent: number;
  y_percent: number;
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "critical";
  package?: string;
  created_by_name: string;
  created_by_email?: string;
}

export const useCreateDefectPin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePinInput) => {
      const { data, error } = await supabase
        .from("defect_pins")
        .insert(input)
        .select()
        .single();
      if (error) throw error;

      // Log creation activity
      await supabase.from("defect_activity").insert({
        pin_id: data.id,
        activity_type: "created",
        content: `Pin #${data.number_id} created: ${input.title}`,
        user_name: input.created_by_name,
        user_email: input.created_by_email || null,
      });

      return data as DefectPin;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["defect-pins", data.project_id] });
      toast.success("Defect pin created");
    },
    onError: (err: Error) => {
      toast.error("Failed to create pin: " + err.message);
    },
  });
};

interface UpdatePinInput {
  id: string;
  project_id: string;
  updates: Partial<Pick<DefectPin, "title" | "description" | "status" | "priority" | "package" | "list_id">>;
  user_name: string;
  user_email?: string;
}

export const useUpdateDefectPin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, project_id, updates, user_name, user_email }: UpdatePinInput) => {
      // Get old values for audit
      const { data: oldPin } = await supabase
        .from("defect_pins")
        .select("*")
        .eq("id", id)
        .single();

      const { data, error } = await supabase
        .from("defect_pins")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // Log status change if applicable
      if (updates.status && oldPin && oldPin.status !== updates.status) {
        await supabase.from("defect_activity").insert({
          pin_id: id,
          activity_type: "status_changed",
          content: `Status changed from ${oldPin.status} to ${updates.status}`,
          old_value: oldPin.status,
          new_value: updates.status,
          user_name,
          user_email: user_email || null,
        });
      }

      // Log other field changes
      const otherChanges = Object.keys(updates).filter((k) => k !== "status");
      if (otherChanges.length > 0 && (!updates.status || (oldPin && oldPin.status === updates.status))) {
        await supabase.from("defect_activity").insert({
          pin_id: id,
          activity_type: "updated",
          content: `Updated: ${otherChanges.join(", ")}`,
          user_name,
          user_email: user_email || null,
        });
      }

      return { ...data, project_id } as DefectPin;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["defect-pins", data.project_id] });
      queryClient.invalidateQueries({ queryKey: ["defect-activity", data.id] });
      toast.success("Pin updated");
    },
    onError: (err: Error) => {
      toast.error("Failed to update pin: " + err.message);
    },
  });
};

export const useAddDefectComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pin_id,
      content,
      user_name,
      user_email,
    }: {
      pin_id: string;
      content: string;
      user_name: string;
      user_email?: string;
    }) => {
      const { data, error } = await supabase
        .from("defect_activity")
        .insert({
          pin_id,
          activity_type: "comment",
          content,
          user_name,
          user_email: user_email || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["defect-activity", data.pin_id] });
    },
  });
};
