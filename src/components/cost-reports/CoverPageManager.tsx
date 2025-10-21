import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Eye } from "lucide-react";
import { format } from "date-fns";

interface CoverPageManagerProps {
  report: any;
}

export const CoverPageManager = ({ report }: CoverPageManagerProps) => {
  const [previewMode, setPreviewMode] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Cover Page</h3>
        <Button
          variant={previewMode ? "default" : "outline"}
          onClick={() => setPreviewMode(!previewMode)}
        >
          <Eye className="mr-2 h-4 w-4" />
          {previewMode ? "Edit Mode" : "Preview Mode"}
        </Button>
      </div>

      {!previewMode ? (
        <Card>
          <CardHeader>
            <CardTitle>Cover Page Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Report Title</label>
                <div className="p-3 bg-muted rounded-md">
                  <p className="font-semibold">COST REPORT NO. {report.report_number}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Project Name</label>
                <div className="p-3 bg-muted rounded-md">
                  <p>{report.project_name}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Project Number</label>
                <div className="p-3 bg-muted rounded-md">
                  <p>{report.project_number}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Client</label>
                <div className="p-3 bg-muted rounded-md">
                  <p>{report.client_name}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Report Date</label>
                <div className="p-3 bg-muted rounded-md">
                  <p>{format(new Date(report.report_date), "dd MMMM yyyy")}</p>
                </div>
              </div>

              {report.site_handover_date && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Site Handover Date</label>
                  <div className="p-3 bg-muted rounded-md">
                    <p>{format(new Date(report.site_handover_date), "dd MMMM yyyy")}</p>
                  </div>
                </div>
              )}

              {report.practical_completion_date && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Practical Completion Date</label>
                  <div className="p-3 bg-muted rounded-md">
                    <p>{format(new Date(report.practical_completion_date), "dd MMMM yyyy")}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                These fields are automatically populated from the project and cost report settings.
                To modify them, update the project settings or cost report details.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2">
          <CardContent className="p-0">
            <div className="min-h-[842px] bg-white p-16 flex flex-col justify-center items-center text-black">
              <div className="text-center space-y-12 max-w-2xl">
                <div className="space-y-4">
                  <h1 className="text-4xl font-bold tracking-wide">
                    COST REPORT NO. {report.report_number}
                  </h1>
                  <div className="h-1 w-32 bg-primary mx-auto"></div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm uppercase tracking-wider text-gray-600">FOR</p>
                  <h2 className="text-3xl font-bold">{report.project_name}</h2>
                </div>

                <div className="space-y-6 pt-8">
                  <div className="grid grid-cols-2 gap-8 text-left">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 uppercase tracking-wide">Project Number</p>
                      <p className="text-lg font-semibold">{report.project_number}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 uppercase tracking-wide">Client</p>
                      <p className="text-lg font-semibold">{report.client_name}</p>
                    </div>
                    {report.site_handover_date && (
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600 uppercase tracking-wide">Site Handover</p>
                        <p className="text-lg font-semibold">
                          {format(new Date(report.site_handover_date), "dd MMMM yyyy")}
                        </p>
                      </div>
                    )}
                    {report.practical_completion_date && (
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600 uppercase tracking-wide">Practical Completion</p>
                        <p className="text-lg font-semibold">
                          {format(new Date(report.practical_completion_date), "dd MMMM yyyy")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-12">
                  <p className="text-xl">{format(new Date(report.report_date), "dd MMMM yyyy")}</p>
                </div>

                {(report.electrical_contractor || report.earthing_contractor) && (
                  <div className="pt-8 space-y-4 text-sm">
                    <p className="font-semibold uppercase tracking-wide text-gray-600">Contractors</p>
                    <div className="grid grid-cols-2 gap-4">
                      {report.electrical_contractor && (
                        <div>
                          <p className="text-gray-600">Electrical</p>
                          <p className="font-medium">{report.electrical_contractor}</p>
                        </div>
                      )}
                      {report.earthing_contractor && (
                        <div>
                          <p className="text-gray-600">Earthing & Lightning</p>
                          <p className="font-medium">{report.earthing_contractor}</p>
                        </div>
                      )}
                      {report.standby_plants_contractor && (
                        <div>
                          <p className="text-gray-600">Standby Plants</p>
                          <p className="font-medium">{report.standby_plants_contractor}</p>
                        </div>
                      )}
                      {report.cctv_contractor && (
                        <div>
                          <p className="text-gray-600">CCTV & Access</p>
                          <p className="font-medium">{report.cctv_contractor}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};