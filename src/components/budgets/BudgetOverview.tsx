import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Calendar, User, FileImage } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BudgetOverviewProps {
  budget: any;
}

interface ReferenceDrawing {
  id: string;
  file_name: string;
  drawing_number: string | null;
  revision: string | null;
}

export const BudgetOverview = ({ budget }: BudgetOverviewProps) => {
  // Fetch reference drawings for this budget
  const { data: drawings } = useQuery({
    queryKey: ['budget-reference-drawings', budget.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_reference_drawings')
        .select('id, file_name, drawing_number, revision')
        .eq('budget_id', budget.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ReferenceDrawing[];
    },
    enabled: !!budget.id,
  });

  const hasDrawings = drawings && drawings.length > 0;

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

      {hasDrawings && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileImage className="h-5 w-5" />
              Reference Drawings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">No.</th>
                    <th className="text-left px-4 py-2 font-medium">Drawing Number</th>
                    <th className="text-left px-4 py-2 font-medium">File Name</th>
                    <th className="text-left px-4 py-2 font-medium">Revision</th>
                  </tr>
                </thead>
                <tbody>
                  {drawings.map((drawing, index) => (
                    <tr key={drawing.id} className="border-t">
                      <td className="px-4 py-2 text-muted-foreground">{index + 1}</td>
                      <td className="px-4 py-2 font-medium">
                        {drawing.drawing_number || '—'}
                      </td>
                      <td className="px-4 py-2">{drawing.file_name}</td>
                      <td className="px-4 py-2">{drawing.revision || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {drawings.length} reference drawing{drawings.length !== 1 ? 's' : ''} attached to this budget
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
