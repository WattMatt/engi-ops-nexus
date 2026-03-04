import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget push of a single roadmap item to its linked Planner task.
 * Only triggers if the item has a `planner://task/...` link_url.
 * Errors are logged but never thrown — this must not block UI.
 */
export async function pushToPlanner(roadmapItemId: string): Promise<void> {
  try {
    // Quick check: does this item even have a Planner link?
    const { data: item } = await supabase
      .from("project_roadmap_items")
      .select("link_url")
      .eq("id", roadmapItemId)
      .single();

    if (!item?.link_url?.startsWith("planner://task/")) return;

    const { error } = await supabase.functions.invoke("planner-push", {
      body: { roadmapItemId },
    });

    if (error) {
      console.warn("[planner-push] sync failed:", error.message);
    } else {
      console.log("[planner-push] synced item", roadmapItemId);
    }
  } catch (err) {
    console.warn("[planner-push] unexpected error:", err);
  }
}
