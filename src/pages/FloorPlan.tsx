import { Suspense, lazy } from 'react';
import { Loader } from 'lucide-react';

const FloorPlanApp = lazy(() => import('../components/floor-plan/App'));

export default function FloorPlan() {
  return (
    <div className="absolute inset-0 -m-6 flex flex-col">
      <Suspense 
        fallback={
          <div className="flex-1 flex items-center justify-center">
            <Loader className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <FloorPlanApp />
      </Suspense>
    </div>
  );
}
