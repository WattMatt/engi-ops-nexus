import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Settings, Users, Cpu, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectBudget, useProjectTenants, resolveRate } from "@/hooks/useBudgetEngine";
import { BudgetSetupPhase } from "@/components/budget-studio/BudgetSetupPhase";
import { BudgetTenantPhase } from "@/components/budget-studio/BudgetTenantPhase";
import { BudgetInfraPhase } from "@/components/budget-studio/BudgetInfraPhase";
import { BudgetExportPhase } from "@/components/budget-studio/BudgetExportPhase";
import { cn } from "@/lib/utils";
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb";

const PHASES = [
  { id: "setup", label: "Setup & Scope", icon: Settings },
  { id: "tenants", label: "Tenant Schedule", icon: Users },
  { id: "infra", label: "Infrastructure", icon: Cpu },
  { id: "export", label: "Review & Export", icon: FileDown },
] as const;

type Phase = (typeof PHASES)[number]["id"];

export default function BudgetStudio() {
  const { budgetId } = useParams<{ budgetId: string }>();
  const navigate = useNavigate();
  const [activePhase, setActivePhase] = useState<Phase>("setup");

  const { data: budget, isLoading: budgetLoading } = useProjectBudget(budgetId);
  const { data: tenants = [] } = useProjectTenants(budgetId);

  // Live totals
  const totals = useMemo(() => {
    if (!budget) return { totalCost: 0, totalArea: 0, costPerM2: 0 };
    const totalArea = tenants.reduce((s, t) => s + Number(t.area_m2 || 0), 0);
    const totalCost = tenants.reduce((s, t) => {
      const profile = (t as any).master_tenant_profiles;
      const { lineTotal } = resolveRate(
        Number(t.area_m2 || 0),
        Number(budget.base_rate_m2),
        t.override_ti_rate ? Number(t.override_ti_rate) : null,
        profile?.default_ti_rate ? Number(profile.default_ti_rate) : 0
      );
      return s + lineTotal;
    }, 0);
    const costPerM2 = totalArea > 0 ? totalCost / totalArea : 0;
    return { totalCost, totalArea, costPerM2 };
  }, [budget, tenants]);

  if (budgetLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading budget…</div>;
  }

  if (!budget) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Budget not found</div>;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden flex-col">
      <div className="px-4 py-2 border-b">
        <PageBreadcrumb items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Electrical Budgets", href: "/dashboard/budgets/electrical" },
          { label: `Budget Rev ${budget.revision}` },
        ]} />
      </div>
      <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border bg-muted/30 flex flex-col">
        <div className="p-4 border-b border-border">
          <Button variant="ghost" size="sm" className="gap-2 mb-2 w-full justify-start" onClick={() => navigate("/dashboard/budgets/electrical")}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <h2 className="font-semibold text-sm truncate">Budget Rev {budget.revision}</h2>
          <p className="text-xs text-muted-foreground capitalize">{budget.status}</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {PHASES.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePhase(p.id)}
              className={cn(
                "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                activePhase === p.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <p.icon className="h-4 w-4 shrink-0" />
              {p.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          {activePhase === "setup" && <BudgetSetupPhase budgetId={budgetId!} budget={budget} />}
          {activePhase === "tenants" && <BudgetTenantPhase budgetId={budgetId!} budget={budget} />}
          {activePhase === "infra" && <BudgetInfraPhase budgetId={budgetId!} budget={budget} />}
          {activePhase === "export" && <BudgetExportPhase budgetId={budgetId!} budget={budget} tenants={tenants} />}
        </main>

        {/* Sticky Footer */}
        <footer className="border-t border-border bg-muted/50 px-6 py-3 flex items-center justify-between text-sm shrink-0">
          <div className="flex gap-6">
            <div>
              <span className="text-muted-foreground">Total Area:</span>{" "}
              <span className="font-semibold">{totals.totalArea.toLocaleString("en-ZA")} m²</span>
            </div>
            <div>
              <span className="text-muted-foreground">Cost/m²:</span>{" "}
              <span className="font-semibold">R {totals.costPerM2.toFixed(2)}</span>
            </div>
          </div>
          <div className="text-lg font-bold">
            Total: R {totals.totalCost.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
          </div>
        </footer>
      </div>
      </div>
    </div>
  );
}
