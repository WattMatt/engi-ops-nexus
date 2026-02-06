import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { toast } from "sonner";
import { useSessionMonitor } from "@/hooks/useSessionMonitor";

const AdminLayout = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Session monitor for automatic logout
  useSessionMonitor();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    console.log("Checking role for user:", session.user.id);

    // Check if user has admin or moderator role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .maybeSingle();

    console.log("Role data:", roleData, "Error:", roleError);

    if (roleError) {
      console.error("Error fetching role:", roleError);
      toast.error("Error checking permissions: " + roleError.message);
      navigate("/");
      return;
    }

    if (!roleData) {
      console.log("No role found for user");
      toast.error("No role assigned. Please contact an administrator.");
      navigate("/");
      return;
    }

    if (roleData.role !== "admin" && roleData.role !== "moderator") {
      console.log("User role is:", roleData.role);
      toast.error("You don't have permission to access the admin area");
      navigate("/");
      return;
    }

    console.log("Access granted. User role:", roleData.role);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    navigate("/auth");
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h1 className="text-xl font-semibold">WM Consulting Admin</h1>
            </div>
            <Button variant="ghost" onClick={handleLogout}>
              Logout
            </Button>
          </header>
          <main className="flex-1 min-h-0 overflow-auto pb-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
