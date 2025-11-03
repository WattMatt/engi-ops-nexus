import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, FileCheck, Calendar, DollarSign } from "lucide-react";
import { CreateFinalAccountDialog } from "@/components/final-accounts/CreateFinalAccountDialog";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const FinalAccounts = () => {
  const navigate = useNavigate();
  const projectId = localStorage.getItem("selectedProjectId");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: accounts = [], refetch } = useQuery({
    queryKey: ["final-accounts", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("final_accounts")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500/10 text-green-500";
      case "submitted":
        return "bg-blue-500/10 text-blue-500";
      case "rejected":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Final Accounts</h2>
          <p className="text-muted-foreground">
            Manage project final accounts and track contract variations
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Final Account
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <Card
            key={account.id}
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => navigate(`/dashboard/final-accounts/${account.id}`)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {account.account_number}
              </CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{account.account_name}</div>
              <div className="space-y-2 mt-3">
                <Badge className={getStatusColor(account.status)}>
                  {account.status}
                </Badge>
                {account.submission_date && (
                  <p className="text-xs text-muted-foreground flex items-center">
                    <Calendar className="mr-1 h-3 w-3" />
                    {format(new Date(account.submission_date), "dd MMM yyyy")}
                  </p>
                )}
                {account.final_value && (
                  <p className="text-sm font-medium flex items-center text-primary">
                    <DollarSign className="mr-1 h-3 w-3" />
                    {account.final_value.toLocaleString()}
                  </p>
                )}
                {account.client_name && (
                  <p className="text-xs text-muted-foreground">
                    Client: {account.client_name}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {accounts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No final accounts yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first final account to track project completion
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Final Account
            </Button>
          </CardContent>
        </Card>
      )}

      <CreateFinalAccountDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectId!}
        onSuccess={() => {
          refetch();
          setCreateDialogOpen(false);
        }}
      />
    </div>
  );
};

export default FinalAccounts;
