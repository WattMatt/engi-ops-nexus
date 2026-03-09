import { TakeoffSheet } from "@/components/takeoff/TakeoffSheet";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/common/FeedbackStates";
import { Ruler } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Takeoffs = () => {
  const projectId = localStorage.getItem("selectedProjectId") || "";
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();
        if (profile) {
          setUserName(profile.full_name || "");
        }
      }
    };
    loadUser();
  }, []);

  if (!projectId) {
    return (
      <div className="flex-1 p-6">
        <EmptyState
          icon={Ruler}
          title="No project selected"
          description="Select a project to start creating takeoff sheets"
          action={{ label: "Select Project", onClick: () => navigate("/projects") }}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <TakeoffSheet
        projectId={projectId}
        contractorName={userName}
      />
    </div>
  );
};

export default Takeoffs;
