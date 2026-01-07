import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";

interface BOQOverviewProps {
  boq: any;
}

export function BOQOverview({ boq }: BOQOverviewProps) {
  return (
    <div className="space-y-6">
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">BOQ Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">BOQ Number</p>
              <p className="text-lg font-semibold text-foreground">{boq.boq_number}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">BOQ Name</p>
              <p className="text-lg font-semibold text-foreground">{boq.boq_name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Version</p>
              <p className="text-lg font-semibold text-foreground">{boq.version || '1.0'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</p>
              <Badge variant={boq.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                {boq.status || 'draft'}
              </Badge>
            </div>
          </div>
          {boq.description && (
            <div className="pt-4 border-t space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
              <p className="text-sm text-foreground leading-relaxed">{boq.description}</p>
            </div>
          )}
          <div className="pt-4 border-t space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Amount</p>
            <p className="text-3xl font-bold text-foreground">{formatCurrency(boq.total_amount || 0)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

