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
  location_area: string | null;
  assignee_names: string[];
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
  annotation_json: any;
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
  location_area?: string;
  assignee_names?: string[];
  created_by_name: string;
  created_by_email?: string;
}

export const useCreateDefectPin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePinInput) => {
      const { data, error } = await supabase
        .from("defect_pins")
        .insert({
          ...input,
          assignee_names: input.assignee_names || [],
        })
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

/** Optimistic rapid pin creation — adds pin to cache immediately */
export const useCreateDefectPinOptimistic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePinInput) => {
      const { data, error } = await supabase
        .from("defect_pins")
        .insert({
          ...input,
          assignee_names: input.assignee_names || [],
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("defect_activity").insert({
        pin_id: data.id,
        activity_type: "created",
        content: `Pin #${data.number_id} created: ${input.title}`,
        user_name: input.created_by_name,
        user_email: input.created_by_email || null,
      });

      return data as DefectPin;
    },
    onMutate: async (input) => {
      const qk = ["defect-pins", input.project_id, input.drawing_id];
      await queryClient.cancelQueries({ queryKey: qk });
      const previous = queryClient.getQueryData<DefectPin[]>(qk);

      // Create optimistic pin
      const optimisticPin: DefectPin = {
        id: `temp-${Date.now()}`,
        project_id: input.project_id,
        drawing_id: input.drawing_id,
        list_id: input.list_id || null,
        number_id: (previous?.length || 0) + 1,
        x_percent: input.x_percent,
        y_percent: input.y_percent,
        title: input.title,
        description: input.description || null,
        status: "open",
        priority: input.priority || "medium",
        package: input.package || null,
        location_area: input.location_area || null,
        assignee_names: input.assignee_names || [],
        markup_json: null,
        created_by_name: input.created_by_name,
        created_by_email: input.created_by_email || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData<DefectPin[]>(qk, (old) => [...(old || []), optimisticPin]);
      return { previous, qk };
    },
    onError: (_err, _input, context) => {
      if (context) {
        queryClient.setQueryData(context.qk, context.previous);
      }
      toast.error("Failed to create pin");
    },
    onSettled: (_data, _err, input) => {
      queryClient.invalidateQueries({ queryKey: ["defect-pins", input.project_id] });
    },
    onSuccess: () => {
      toast.success("Pin saved");
    },
  });
};

interface UpdatePinInput {
  id: string;
  project_id: string;
  updates: Partial<Pick<DefectPin, "title" | "description" | "status" | "priority" | "package" | "list_id" | "x_percent" | "y_percent" | "location_area" | "assignee_names" | "markup_json">>;
  user_name: string;
  user_email?: string;
}

export const useUpdateDefectPin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, project_id, updates, user_name, user_email }: UpdatePinInput) => {
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

      // Log status change
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

      // Log position change
      if ((updates.x_percent !== undefined || updates.y_percent !== undefined) && oldPin) {
        await supabase.from("defect_activity").insert({
          pin_id: id,
          activity_type: "updated",
          content: "Pin relocated on drawing",
          user_name,
          user_email: user_email || null,
        });
      }

      // Log other field changes
      const otherChanges = Object.keys(updates).filter((k) => !["status", "x_percent", "y_percent", "markup_json"].includes(k));
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

export const useDeleteDefectPin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      const { data: photos } = await supabase
        .from("defect_photos")
        .select("storage_path")
        .eq("pin_id", id);

      if (photos && photos.length > 0) {
        await supabase.storage
          .from("defect-photos")
          .remove(photos.map((p) => p.storage_path));
      }

      const { error } = await supabase
        .from("defect_pins")
        .delete()
        .eq("id", id);
      if (error) throw error;

      return { project_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["defect-pins", data.project_id] });
      toast.success("Pin deleted");
    },
    onError: (err: Error) => {
      toast.error("Failed to delete pin: " + err.message);
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

export const useUpdateDefectPhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, pin_id, annotation_json }: { id: string; pin_id: string; annotation_json: any }) => {
      const { data, error } = await supabase
        .from("defect_photos")
        .update({ annotation_json })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, pin_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["defect-photos", data.pin_id] });
      toast.success("Annotation saved");
    },
    onError: (err: Error) => {
      toast.error("Failed to save annotation: " + err.message);
    },
  });
};
