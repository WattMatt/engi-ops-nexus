/**
 * Hook for real-time milestone progress notifications
 * Monitors linked tasks and notifies when milestones approach completion
 */

import { useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface MilestoneProgress {
  id: string;
  title: string;
  phase: string | null;
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
  isCompleted: boolean;
}

interface UseMilestoneNotificationsOptions {
  projectId: string;
  enabled?: boolean;
  thresholds?: {
    nearComplete: number; // Default 80%
    almostThere: number;  // Default 95%
  };
}

export function useMilestoneNotifications({
  projectId,
  enabled = true,
  thresholds = { nearComplete: 80, almostThere: 95 },
}: UseMilestoneNotificationsOptions) {
  const queryClient = useQueryClient();
  const notifiedMilestones = useRef<Set<string>>(new Set());
  const previousProgress = useRef<Record<string, number>>({});

  // Fetch milestone progress
  const { data: milestones } = useQuery({
    queryKey: ["milestone-notifications", projectId],
    queryFn: async () => {
      const { data: roadmapItems, error: roadmapError } = await supabase
        .from("project_roadmap_items")
        .select("id, title, phase, is_completed")
        .eq("project_id", projectId);

      if (roadmapError) throw roadmapError;

      const { data: tasks, error: tasksError } = await supabase
        .from("site_diary_tasks")
        .select("id, status, roadmap_item_id")
        .eq("project_id", projectId)
        .not("roadmap_item_id", "is", null);

      if (tasksError) throw tasksError;

      const milestoneProgress: MilestoneProgress[] = (roadmapItems || [])
        .map((item) => {
          const linkedTasks = tasks?.filter((t) => t.roadmap_item_id === item.id) || [];
          const completedTasks = linkedTasks.filter((t) => t.status === "completed").length;
          const totalTasks = linkedTasks.length;
          const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

          return {
            id: item.id,
            title: item.title,
            phase: item.phase,
            totalTasks,
            completedTasks,
            progressPercent,
            isCompleted: item.is_completed,
          };
        })
        .filter((m) => m.totalTasks > 0); // Only track milestones with linked tasks

      return milestoneProgress;
    },
    enabled,
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Check for progress notifications
  const checkNotifications = useCallback(() => {
    if (!milestones) return;

    milestones.forEach((milestone) => {
      const prevProgress = previousProgress.current[milestone.id] || 0;
      const notificationKey = `${milestone.id}-${milestone.progressPercent}`;

      // Skip if already notified for this progress level
      if (notifiedMilestones.current.has(notificationKey)) return;

      // 100% completion - big celebration!
      if (milestone.progressPercent === 100 && prevProgress < 100 && !milestone.isCompleted) {
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.6 },
          colors: ["#22c55e", "#16a34a", "#4ade80"],
        });
        
        toast.success(`🎉 All tasks complete for "${milestone.title}"!`, {
          description: "Ready to mark this milestone as complete",
          duration: 8000,
        });
        
        notifiedMilestones.current.add(notificationKey);
      }
      // Almost there (95%+)
      else if (
        milestone.progressPercent >= thresholds.almostThere &&
        prevProgress < thresholds.almostThere
      ) {
        toast.info(`📍 Almost there! "${milestone.title}" is ${milestone.progressPercent}% complete`, {
          description: `${milestone.totalTasks - milestone.completedTasks} task(s) remaining`,
          duration: 5000,
        });
        
        notifiedMilestones.current.add(notificationKey);
      }
      // Approaching completion (80%+)
      else if (
        milestone.progressPercent >= thresholds.nearComplete &&
        prevProgress < thresholds.nearComplete
      ) {
        toast(`🚀 Great progress! "${milestone.title}" is ${milestone.progressPercent}% complete`, {
          duration: 4000,
        });
        
        notifiedMilestones.current.add(notificationKey);
      }

      // Update previous progress
      previousProgress.current[milestone.id] = milestone.progressPercent;
    });
  }, [milestones, thresholds.almostThere, thresholds.nearComplete]);

  // Run notification check when milestones update
  useEffect(() => {
    checkNotifications();
  }, [checkNotifications]);

  // Subscribe to real-time task updates
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(`milestone-tasks-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "site_diary_tasks",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          // Refetch milestone progress when tasks change
          queryClient.invalidateQueries({ queryKey: ["milestone-notifications", projectId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, enabled, queryClient]);

  return {
    milestones,
    nearCompleteMilestones: milestones?.filter(
      (m) => m.progressPercent >= thresholds.nearComplete && m.progressPercent < 100
    ) || [],
    completedMilestones: milestones?.filter((m) => m.progressPercent === 100) || [],
  };
}
