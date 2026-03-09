import { TakeoffSheet } from "@/components/takeoff/TakeoffSheet";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Takeoffs = () => {
  const projectId = localStorage.getItem("selectedProjectId") || "";
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", user.id)
          .maybeSingle();
        if (profile) {
          setUserName(`${profile.first_name || ""} ${profile.last_name || ""}`.trim());
        }
      }
    };
    loadUser();
  }, []);

  if (!projectId) return null;

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
