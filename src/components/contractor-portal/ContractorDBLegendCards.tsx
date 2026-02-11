import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, CircuitBoard } from "lucide-react";
import { DBLegendCardForm } from "./DBLegendCardForm";

interface ContractorDBLegendCardsProps {
  projectId: string;
  contractorName: string;
  contractorEmail: string;
}

interface LegendCard {
  id: string;
  tenant_id: string | null;
  db_name: string;
  status: string;
  updated_at: string;
  created_at: string;
}

interface Tenant {
  id: string;
  shop_name: string;
  shop_number: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function ContractorDBLegendCards({ projectId, contractorName, contractorEmail }: ContractorDBLegendCardsProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [creatingForTenantId, setCreatingForTenantId] = useState<string | null>(null);

  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ["portal-tenants", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, shop_name, shop_number")
        .eq("project_id", projectId)
        .order("shop_number");
      if (error) throw error;
      return data as Tenant[];
    },
  });

  const { data: legendCards = [], isLoading: cardsLoading, refetch } = useQuery({
    queryKey: ["db-legend-cards", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("db_legend_cards" as any)
        .select("id, tenant_id, db_name, status, updated_at, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as LegendCard[];
    },
  });

  const handleCreateCard = async (tenantId: string) => {
    const { data, error } = await supabase
      .from("db_legend_cards" as any)
      .insert({
        project_id: projectId,
        tenant_id: tenantId,
        db_name: "DB-1",
        status: "draft",
      } as any)
      .select("id")
      .single();
    if (error) {
      console.error("Error creating legend card:", error);
      return;
    }
    setSelectedCardId((data as any).id);
    refetch();
  };

  const handleBack = () => {
    setSelectedCardId(null);
    setCreatingForTenantId(null);
    refetch();
  };

  if (selectedCardId) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to List
        </Button>
        <DBLegendCardForm
          cardId={selectedCardId}
          projectId={projectId}
          contractorName={contractorName}
          contractorEmail={contractorEmail}
          onBack={handleBack}
        />
      </div>
    );
  }

  const isLoading = tenantsLoading || cardsLoading;

  const getCardsForTenant = (tenantId: string) =>
    legendCards.filter((c) => c.tenant_id === tenantId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircuitBoard className="h-5 w-5" />
          DB Legend Cards
        </CardTitle>
        <CardDescription>
          Complete distribution board legend cards for each tenant. Add multiple boards per tenant as needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading tenants...</p>
        ) : tenants.length === 0 ? (
          <p className="text-muted-foreground text-sm">No tenants found for this project.</p>
        ) : (
          <div className="space-y-3">
            {tenants.map((tenant) => {
              const cards = getCardsForTenant(tenant.id);
              return (
                <div
                  key={tenant.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{tenant.shop_number} — {tenant.shop_name}</p>
                      <p className="text-xs text-muted-foreground">{cards.length} legend card{cards.length !== 1 ? "s" : ""}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleCreateCard(tenant.id)}>
                      <Plus className="h-4 w-4 mr-1" /> Add Board
                    </Button>
                  </div>
                  {cards.length > 0 && (
                    <div className="space-y-2">
                      {cards.map((card) => (
                        <div key={card.id} className="flex items-center justify-between bg-muted/50 rounded p-2 px-3">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">{card.db_name}</span>
                            <Badge className={statusColors[card.status] || ""}>
                              {card.status}
                            </Badge>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => setSelectedCardId(card.id)}>
                            View / Edit
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
