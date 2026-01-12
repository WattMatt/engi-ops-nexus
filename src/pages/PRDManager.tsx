import { useState } from "react";
import { PRDList } from "@/components/prd/PRDList";
import { PRDDetail } from "@/components/prd/PRDDetail";
import { PRD } from "@/hooks/usePRDs";

export default function PRDManager() {
  const [selectedPRD, setSelectedPRD] = useState<PRD | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 max-w-6xl">
        {selectedPRD ? (
          <PRDDetail prdId={selectedPRD.id} onBack={() => setSelectedPRD(null)} />
        ) : (
          <PRDList onSelectPRD={setSelectedPRD} />
        )}
      </div>
    </div>
  );
}
