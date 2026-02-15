import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Calendar, User, Building } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { SpecificationExportPDFButton } from "./SpecificationExportPDFButton";
import { ReportHistoryPanel } from "@/components/shared/ReportHistoryPanel";

interface SpecificationOverviewProps {
  specification: any;
}

export const SpecificationOverview = ({ specification }: SpecificationOverviewProps) => {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Specification Information
            </CardTitle>
            <SpecificationExportPDFButton specification={specification} />
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium">{specification.spec_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Specification Number</p>
              <p className="font-medium">{specification.spec_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Revision</p>
              <p className="font-medium">{specification.revision}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={specification.status === 'draft' ? 'secondary' : 'default'}>
                {specification.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">
                  {format(new Date(specification.spec_date), "PPP")}
                </p>
              </div>
            </div>
            {specification.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="text-sm">{specification.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="h-5 w-5" />
              Client Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {specification.prepared_for_company && (
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="font-medium">{specification.prepared_for_company}</p>
              </div>
            )}
            {specification.prepared_for_contact && (
              <div>
                <p className="text-sm text-muted-foreground">Contact Person</p>
                <p className="font-medium">{specification.prepared_for_contact}</p>
              </div>
            )}
            {specification.prepared_for_tel && (
              <div>
                <p className="text-sm text-muted-foreground">Telephone</p>
                <p className="font-medium">{specification.prepared_for_tel}</p>
              </div>
            )}
            {specification.prepared_for_email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{specification.prepared_for_email}</p>
              </div>
            )}
            {!specification.prepared_for_company && !specification.prepared_for_contact && (
              <p className="text-sm text-muted-foreground">No client information provided</p>
            )}
          </CardContent>
        </Card>

        {(specification.consultant_logo_url || specification.client_logo_url) && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Logos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {specification.consultant_logo_url && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Consultant Logo</p>
                    <img
                      src={specification.consultant_logo_url}
                      alt="Consultant Logo"
                      className="h-24 object-contain border rounded"
                    />
                  </div>
                )}
                {specification.client_logo_url && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Client Logo</p>
                    <img
                      src={specification.client_logo_url}
                      alt="Client Logo"
                      className="h-24 object-contain border rounded"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <ReportHistoryPanel
        dbTable="specification_reports"
        foreignKeyColumn="specification_id"
        foreignKeyValue={specification.id}
        storageBucket="specification-reports"
        title="Specification Reports"
      />
    </div>
  );
};
