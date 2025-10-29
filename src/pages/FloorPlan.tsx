import { Suspense, lazy } from 'react';
import { Loader } from 'lucide-react';

const FloorPlanApp = lazy(() => import('../components/floor-plan/App'));

export default function FloorPlan() {
  return (
    <div className="h-[calc(100vh-8rem)] w-full rounded-lg overflow-hidden border border-border bg-background">
      <Suspense 
        fallback={
          <div className="h-full w-full flex items-center justify-center">
            <Loader className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <FloorPlanApp />
      </Suspense>
    </div>
  );
}
