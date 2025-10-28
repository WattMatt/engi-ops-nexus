import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FloorPlanApp } from "@/components/floor-plan/FloorPlanApp";
import { Loader2 } from "lucide-react";

export default function FloorPlanMarkup() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    setUserId(user.id);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userId) {
    return null;
  }

  return <FloorPlanApp userId={userId} />;
}
