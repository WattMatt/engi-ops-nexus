import { Suspense, lazy, useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useParams } from 'react-router-dom';

const FloorPlanApp = lazy(() => import('../components/floor-plan/App'));

export default function FloorPlan() {
  const [user, setUser] = useState<User | null>(null);
  const { projectId } = useParams();

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="h-[calc(100vh-8rem)] w-full overflow-hidden rounded-lg border border-border bg-background">
      <Suspense 
        fallback={
          <div className="h-full w-full flex items-center justify-center">
            <Loader className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <FloorPlanApp user={user} projectId={projectId} />
      </Suspense>
    </div>
  );
}
