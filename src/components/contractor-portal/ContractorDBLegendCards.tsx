import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowLeft, CircuitBoard, Search, Filter, ChevronsUpDown, Layers } from "lucide-react";
import { DBLegendCardForm } from "./DBLegendCardForm";
import { toast } from "sonner";

interface ContractorDBLegendCardsProps {
  projectId: string;
  projectName: string;
  projectNumber: string;
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

type StatusFilter = "all" | "draft" | "submitted" | "approved" | "rejected" | "no_cards";

export function ContractorDBLegendCards({ projectId, projectName, projectNumber, contractorName, contractorEmail }: ContractorDBLegendCardsProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [creatingForTenantId, setCreatingForTenantId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [jumpToTenant, setJumpToTenant] = useState("");
  const tenantRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  const getCardsForTenant = (tenantId: string) =>
    legendCards.filter((c) => c.tenant_id === tenantId);

  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      // Search filter
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        tenant.shop_name.toLowerCase().includes(query) ||
        tenant.shop_number.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter === "all") return true;
      const cards = getCardsForTenant(tenant.id);
      if (statusFilter === "no_cards") return cards.length === 0;
      return cards.some((c) => c.status === statusFilter);
    });
  }, [tenants, legendCards, searchQuery, statusFilter]);

  // Summary counts
  const summary = useMemo(() => {
    const total = tenants.length;
    const withCards = tenants.filter((t) => getCardsForTenant(t.id).length > 0).length;
    const withoutCards = total - withCards;
    const allCards = legendCards.length;
    return { total, withCards, withoutCards, allCards };
  }, [tenants, legendCards]);

  const handleCreateCard = async (tenantId: string, shopName: string) => {
    const { data, error } = await supabase
      .from("db_legend_cards" as any)
      .insert({
        project_id: projectId,
        tenant_id: tenantId,
        db_name: `DB-${shopName}`,
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

  const [bulkCreating, setBulkCreating] = useState(false);

  const tenantsWithoutCards = useMemo(() => {
    return tenants.filter((t) => getCardsForTenant(t.id).length === 0);
  }, [tenants, legendCards]);

  const handleBulkCreate = async () => {
    if (tenantsWithoutCards.length === 0) {
      toast.info("All tenants already have at least one card.");
      return;
    }
    setBulkCreating(true);
    try {
      const rows = tenantsWithoutCards.map((t) => ({
        project_id: projectId,
        tenant_id: t.id,
        db_name: `DB-${t.shop_name}`,
        status: "draft",
      }));
      const { error } = await supabase
        .from("db_legend_cards" as any)
        .insert(rows as any);
      if (error) throw error;
      toast.success(`Created ${rows.length} legend card${rows.length !== 1 ? "s" : ""} successfully.`);
      refetch();
    } catch (err) {
      console.error("Bulk create error:", err);
      toast.error("Failed to create cards. Please try again.");
    } finally {
      setBulkCreating(false);
    }
  };

  const handleBack = () => {
    setSelectedCardId(null);
    setCreatingForTenantId(null);
    refetch();
  };

  const handleJumpTo = (tenantId: string) => {
    setJumpToTenant(tenantId);
    const el = tenantRefs.current[tenantId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary", "ring-offset-2");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-primary", "ring-offset-2");
      }, 2000);
    }
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
          projectName={projectName}
          projectNumber={projectNumber}
          contractorName={contractorName}
          contractorEmail={contractorEmail}
          onBack={handleBack}
        />
      </div>
    );
  }

  const isLoading = tenantsLoading || cardsLoading;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <CircuitBoard className="h-5 w-5" />
            DB Legend Cards
          </CardTitle>
          {!isLoading && tenantsWithoutCards.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkCreate}
              disabled={bulkCreating}
            >
              <Layers className="h-4 w-4 mr-1" />
              {bulkCreating ? "Creating..." : `Create All (${tenantsWithoutCards.length})`}
            </Button>
          )}
        </div>
        <CardDescription>
          Complete distribution board legend cards for each tenant. Add multiple boards per tenant as needed.
        </CardDescription>

        {/* Summary badges */}
        {!isLoading && tenants.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="outline" className="text-xs">
              {summary.total} tenants
            </Badge>
            <Badge variant="outline" className="text-xs bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
              {summary.withCards} with cards
            </Badge>
            <Badge variant="outline" className="text-xs bg-amber-100/50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
              {summary.withoutCards} pending
            </Badge>
            <Badge variant="outline" className="text-xs">
              {summary.allCards} total cards
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading tenants...</p>
        ) : tenants.length === 0 ? (
          <p className="text-muted-foreground text-sm">No tenants found for this project.</p>
        ) : (
          <div className="space-y-4">
            {/* Search, filter & jump-to bar */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by shop name or number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tenants</SelectItem>
                  <SelectItem value="no_cards">No Cards Yet</SelectItem>
                  <SelectItem value="draft">Has Drafts</SelectItem>
                  <SelectItem value="submitted">Has Submitted</SelectItem>
                  <SelectItem value="approved">Has Approved</SelectItem>
                  <SelectItem value="rejected">Has Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={jumpToTenant} onValueChange={handleJumpTo}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <ChevronsUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Jump to tenant..." />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.shop_number} — {t.shop_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Results count */}
            {searchQuery || statusFilter !== "all" ? (
              <p className="text-xs text-muted-foreground">
                Showing {filteredTenants.length} of {tenants.length} tenants
                {searchQuery && <> matching "<span className="font-medium">{searchQuery}</span>"</>}
              </p>
            ) : null}

            {/* Tenant list */}
            <div className="space-y-3">
              {filteredTenants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No tenants match your search or filter criteria.
                </p>
              ) : (
                filteredTenants.map((tenant, index) => {
                  const cards = getCardsForTenant(tenant.id);
                  return (
                    <div
                      key={tenant.id}
                      ref={(el) => { tenantRefs.current[tenant.id] = el; }}
                      className="border rounded-lg p-4 space-y-3 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium">{tenant.shop_number} — {tenant.shop_name}</p>
                            <p className="text-xs text-muted-foreground">{cards.length} legend card{cards.length !== 1 ? "s" : ""}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => handleCreateCard(tenant.id, tenant.shop_name)}>
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
                })
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
