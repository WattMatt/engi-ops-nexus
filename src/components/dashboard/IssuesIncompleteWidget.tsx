import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle2, Info, ArrowRight } from "lucide-react";
import { useProjectIssues, ProjectIssue } from "@/hooks/useProjectIssues";
import { useNavigate } from "react-router-dom";

interface IssuesIncompleteWidgetProps {
  projectId: string;
}

export const IssuesIncompleteWidget = ({ projectId }: IssuesIncompleteWidgetProps) => {
  const { data: issues = [], isLoading } = useProjectIssues(projectId);
  const navigate = useNavigate();

  const criticalIssues = issues.filter(issue => issue.severity === 'critical');
  const warningIssues = issues.filter(issue => issue.severity === 'warning');
  const infoIssues = issues.filter(issue => issue.severity === 'info');

  const getSeverityIcon = (severity: ProjectIssue['severity']) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadgeVariant = (severity: ProjectIssue['severity']) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'info':
        return 'outline';
    }
  };

  const renderIssue = (issue: ProjectIssue) => (
    <div key={issue.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
      <div className="mt-0.5">
        {getSeverityIcon(issue.severity)}
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-medium text-sm">{issue.title}</h4>
          {issue.count && (
            <Badge variant={getSeverityBadgeVariant(issue.severity)} className="text-xs">
              {issue.count}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{issue.description}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(issue.navigationPath)}
        className="shrink-0"
      >
        {issue.actionLabel}
        <ArrowRight className="ml-1 h-3 w-3" />
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Issues & Incomplete Items</CardTitle>
          <CardDescription>Loading project issues...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (issues.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            All Clear!
          </CardTitle>
          <CardDescription>
            No issues or incomplete items found. Great work!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Issues & Incomplete Items</CardTitle>
            <CardDescription>
              {issues.length} item(s) requiring attention
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {criticalIssues.length > 0 && (
              <Badge variant="destructive">{criticalIssues.length} Critical</Badge>
            )}
            {warningIssues.length > 0 && (
              <Badge variant="secondary">{warningIssues.length} Warning</Badge>
            )}
            {infoIssues.length > 0 && (
              <Badge variant="outline">{infoIssues.length} Info</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All ({issues.length})</TabsTrigger>
            <TabsTrigger value="critical">Critical ({criticalIssues.length})</TabsTrigger>
            <TabsTrigger value="warning">Warning ({warningIssues.length})</TabsTrigger>
            <TabsTrigger value="info">Info ({infoIssues.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {issues.map((issue, index) => (
                  <div key={issue.id}>
                    {renderIssue(issue)}
                    {index < issues.length - 1 && <Separator className="my-2" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="critical" className="mt-4">
            {criticalIssues.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p>No critical issues</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {criticalIssues.map((issue, index) => (
                    <div key={issue.id}>
                      {renderIssue(issue)}
                      {index < criticalIssues.length - 1 && <Separator className="my-2" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="warning" className="mt-4">
            {warningIssues.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p>No warning issues</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {warningIssues.map((issue, index) => (
                    <div key={issue.id}>
                      {renderIssue(issue)}
                      {index < warningIssues.length - 1 && <Separator className="my-2" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="info" className="mt-4">
            {infoIssues.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p>No info items</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {infoIssues.map((issue, index) => (
                    <div key={issue.id}>
                      {renderIssue(issue)}
                      {index < infoIssues.length - 1 && <Separator className="my-2" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
