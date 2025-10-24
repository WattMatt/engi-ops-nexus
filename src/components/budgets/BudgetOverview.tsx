import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Calendar, User } from "lucide-react";
import { format } from "date-fns";

interface BudgetOverviewProps {
  budget: any;
}

export const BudgetOverview = ({ budget }: BudgetOverviewProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Budget Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Budget Number</p>
            <p className="font-medium">{budget.budget_number}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Revision</p>
            <p className="font-medium">{budget.revision}</p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">
                {format(new Date(budget.budget_date), "PPP")}
              </p>
            </div>
          </div>
          {budget.notes && (
            <div>
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="text-sm">{budget.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Prepared For
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {budget.prepared_for_company && (
            <div>
              <p className="text-sm text-muted-foreground">Company</p>
              <p className="font-medium">{budget.prepared_for_company}</p>
            </div>
          )}
          {budget.prepared_for_contact && (
            <div>
              <p className="text-sm text-muted-foreground">Contact</p>
              <p className="font-medium">{budget.prepared_for_contact}</p>
            </div>
          )}
          {budget.prepared_for_tel && (
            <div>
              <p className="text-sm text-muted-foreground">Telephone</p>
              <p className="font-medium">{budget.prepared_for_tel}</p>
            </div>
          )}
          {!budget.prepared_for_company && !budget.prepared_for_contact && (
            <p className="text-sm text-muted-foreground">No client information provided</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
