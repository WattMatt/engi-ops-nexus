import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AISkill {
  id: string;
  name: string;
  description: string;
  category: string;
  instructions: string;
  icon: string;
  is_system: boolean;
  is_active: boolean;
  version: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSkillPreference {
  id: string;
  user_id: string;
  skill_id: string;
  is_favorite: boolean;
  usage_count: number;
  last_used_at: string | null;
}

export interface SkillWithPreference extends AISkill {
  is_favorite?: boolean;
  usage_count?: number;
}

export function useAISkills() {
  const queryClient = useQueryClient();

  const skillsQuery = useQuery({
    queryKey: ["ai-skills"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_skills")
        .select("*")
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return data as AISkill[];
    },
  });

  const preferencesQuery = useQuery({
    queryKey: ["skill-preferences"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_skill_preferences")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data as UserSkillPreference[];
    },
  });

  const skillsWithPreferences: SkillWithPreference[] = (skillsQuery.data || []).map((skill) => {
    const pref = preferencesQuery.data?.find((p) => p.skill_id === skill.id);
    return {
      ...skill,
      is_favorite: pref?.is_favorite || false,
      usage_count: pref?.usage_count || 0,
    };
  });

  const favoriteSkills = skillsWithPreferences.filter((s) => s.is_favorite);
  const categories = [...new Set(skillsQuery.data?.map((s) => s.category) || [])];

  const toggleFavorite = useMutation({
    mutationFn: async ({ skillId, isFavorite }: { skillId: string; isFavorite: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const existingPref = preferencesQuery.data?.find((p) => p.skill_id === skillId);

      if (existingPref) {
        const { error } = await supabase
          .from("user_skill_preferences")
          .update({ is_favorite: isFavorite })
          .eq("id", existingPref.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_skill_preferences")
          .insert({
            user_id: user.id,
            skill_id: skillId,
            is_favorite: isFavorite,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-preferences"] });
    },
    onError: (error) => {
      toast.error("Failed to update favorite: " + error.message);
    },
  });

  const trackUsage = useMutation({
    mutationFn: async (skillId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const existingPref = preferencesQuery.data?.find((p) => p.skill_id === skillId);

      if (existingPref) {
        const { error } = await supabase
          .from("user_skill_preferences")
          .update({
            usage_count: (existingPref.usage_count || 0) + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq("id", existingPref.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_skill_preferences")
          .insert({
            user_id: user.id,
            skill_id: skillId,
            usage_count: 1,
            last_used_at: new Date().toISOString(),
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-preferences"] });
    },
  });

  const createSkill = useMutation({
    mutationFn: async (skill: Omit<AISkill, "id" | "created_at" | "updated_at" | "is_system" | "created_by">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("ai_skills")
        .insert({
          ...skill,
          is_system: false,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-skills"] });
      toast.success("Skill created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create skill: " + error.message);
    },
  });

  const updateSkill = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AISkill> & { id: string }) => {
      const { error } = await supabase
        .from("ai_skills")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-skills"] });
      toast.success("Skill updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update skill: " + error.message);
    },
  });

  const deleteSkill = useMutation({
    mutationFn: async (skillId: string) => {
      const { error } = await supabase
        .from("ai_skills")
        .delete()
        .eq("id", skillId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-skills"] });
      toast.success("Skill deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete skill: " + error.message);
    },
  });

  return {
    skills: skillsWithPreferences,
    favoriteSkills,
    categories,
    isLoading: skillsQuery.isLoading || preferencesQuery.isLoading,
    error: skillsQuery.error || preferencesQuery.error,
    toggleFavorite,
    trackUsage,
    createSkill,
    updateSkill,
    deleteSkill,
    refetch: () => {
      skillsQuery.refetch();
      preferencesQuery.refetch();
    },
  };
}

export function useSkillById(skillId: string | null) {
  return useQuery({
    queryKey: ["ai-skill", skillId],
    queryFn: async () => {
      if (!skillId) return null;
      
      const { data, error } = await supabase
        .from("ai_skills")
        .select("*")
        .eq("id", skillId)
        .single();

      if (error) throw error;
      return data as AISkill;
    },
    enabled: !!skillId,
  });
}
