import { Suspense, lazy } from 'react';
import { Loader } from 'lucide-react';

const FloorPlanApp = lazy(() => import('../components/floor-plan/App'));

export default function FloorPlan() {
  return (
    <div className="h-full w-full">
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
