import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { PageLoadingSpinner } from "@/components/common/PageLoadingSpinner";

// ProtectedRoute — fail-closed client route guard (Onboarding Standard A9).
// Modeled on the kit reference (insight-linker ProtectedRoute/useAuthSession):
//   - no session       => redirect to /auth carrying the intended destination
//   - session unknown  => loading state (never render children speculatively)
//   - session read err => treated as signed out (fail CLOSED, never open)
// Client-side only: RLS remains the hard security boundary (A10, SPA profile).
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Subscribe FIRST so no auth transition is missed, then read the
    // current session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setIsLoading(false);
      }
    );
    supabase.auth.getSession()
      .then(({ data }) => {
        setSession(data.session);
        setIsLoading(false);
      })
      .catch((err) => {
        // Fail CLOSED: if the session can't be read, treat as signed out
        // (redirect to login) rather than hanging or rendering content.
        console.error("Failed to read auth session:", err);
        setSession(null);
        setIsLoading(false);
      });
    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) return <PageLoadingSpinner />;

  if (!session) {
    const redirect = encodeURIComponent(
      location.pathname + (location.search || "")
    );
    return <Navigate to={`/auth?redirect=${redirect}`} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
