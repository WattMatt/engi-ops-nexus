import { useState } from "react";
import { PRDList } from "@/components/prd/PRDList";
import { PRDDetail } from "@/components/prd/PRDDetail";
import { PRD } from "@/hooks/usePRDs";

export default function PRDManager() {
  const [selectedPRD, setSelectedPRD] = useState<PRD | null>(null);

  return (
    <div className="p-6 space-y-6">
      <div className="max-w-6xl mx-auto">
        {selectedPRD ? (
          <PRDDetail prdId={selectedPRD.id} onBack={() => setSelectedPRD(null)} />
        ) : (
          <PRDList onSelectPRD={setSelectedPRD} />
        )}
      </div>
    </div>
  );
}
