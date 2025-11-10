import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileText, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Activity {
  id: string;
  document_name: string;
  document_type: string;
  created_at: string;
  tenants?: {
    shop_number: string;
    shop_name: string;
  };
}

interface RecentActivityTimelineProps {
  activities: Activity[];
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  electrical_coc: "Electrical COC",
  as_built_drawing: "As Built Drawing",
  line_diagram: "Line Diagram",
  qc_inspection_report: "QC Inspection Report",
  lighting_guarantee: "Lighting Guarantee",
  db_guarantee: "DB Guarantee",
};

export const RecentActivityTimeline = ({ activities }: RecentActivityTimelineProps) => {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest document uploads</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent activity</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest document uploads and changes</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex gap-4 pb-4 border-b last:border-0"
              >
                <div className="mt-1">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Upload className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-none">
                        {activity.tenants?.shop_number} - {activity.tenants?.shop_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Uploaded {DOCUMENT_TYPE_LABELS[activity.document_type] || activity.document_type}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    <span className="truncate font-mono">{activity.document_name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
