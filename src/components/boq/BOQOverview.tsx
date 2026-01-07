import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";

interface BOQOverviewProps {
  boq: any;
}

export function BOQOverview({ boq }: BOQOverviewProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>BOQ Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">BOQ Number</p>
              <p className="text-lg font-semibold">{boq.boq_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">BOQ Name</p>
              <p className="text-lg font-semibold">{boq.boq_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Version</p>
              <p className="text-lg font-semibold">{boq.version || '1.0'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={boq.status === 'active' ? 'default' : 'secondary'}>
                {boq.status || 'draft'}
              </Badge>
            </div>
          </div>
          {boq.description && (
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="text-sm">{boq.description}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold">{formatCurrency(boq.total_amount || 0)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

