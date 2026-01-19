import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, Download, Eye, 
  FolderOpen, File, Image, FileSpreadsheet
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface ProjectDocumentsProps {
  projectId: string;
}

export function ProjectDocuments({ projectId }: ProjectDocumentsProps) {
  // Fetch cost reports for this project
  const { data: costReports, isLoading } = useQuery({
    queryKey: ["project-cost-reports", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_reports")
        .select("id, project_name, report_date, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Fetch site diary entries as documents
  const { data: diaryEntries } = useQuery({
    queryKey: ["project-diary-documents", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_diary_entries")
        .select("id, entry_date, site_progress, notes, created_at")
        .eq("project_id", projectId)
        .order("entry_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  const hasNoDocuments = (!costReports || costReports.length === 0) && (!diaryEntries || diaryEntries.length === 0);

  if (hasNoDocuments) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Documents</h3>
          <p className="text-muted-foreground">
            No documents or reports have been created for this project yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Project Documents</h2>
        <p className="text-muted-foreground">
          Access and manage project documents and reports
        </p>
      </div>

      {/* Cost Reports */}
      {costReports && costReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cost Reports</CardTitle>
            <CardDescription>Financial reports for this project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {costReports.map((report) => (
                <div 
                  key={report.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">{report.project_name || "Cost Report"}</p>
                      <p className="text-xs text-muted-foreground">
                        {report.report_date 
                          ? format(new Date(report.report_date), "MMM d, yyyy")
                          : format(new Date(report.created_at), "MMM d, yyyy")
                        }
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Site Diary Entries */}
      {diaryEntries && diaryEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Site Diary Entries</CardTitle>
            <CardDescription>Recent site diary records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {diaryEntries.map((entry) => (
                <div 
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">
                        Diary Entry - {format(new Date(entry.entry_date), "MMM d, yyyy")}
                      </p>
                      {entry.site_progress && (
                        <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                          {entry.site_progress}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
