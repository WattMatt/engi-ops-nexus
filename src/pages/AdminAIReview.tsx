import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { ApplicationReviewDialog } from "@/components/admin/ApplicationReviewDialog";
import { ReviewHistoryDashboard } from "@/components/admin/ReviewHistoryDashboard";
import { ReviewComparisonView } from "@/components/admin/ReviewComparisonView";
import { ProgressTrackingView } from "@/components/admin/ProgressTrackingView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitCompare, BarChart3, ListTodo } from "lucide-react";

const AdminAIReview = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Application Review</h1>
          <p className="text-muted-foreground">
            Get AI-powered insights and track your application's health over time
          </p>
        </div>
        <ApplicationReviewDialog />
      </div>

      {/* New Review Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Run New Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Analyze your application's performance, security, UX, and code quality using AI.
            Reviews are saved automatically and contribute to the trend analysis below.
          </p>
        </CardContent>
      </Card>

      {/* Tabbed View */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="progress" className="gap-2">
            <ListTodo className="h-4 w-4" />
            Progress
          </TabsTrigger>
          <TabsTrigger value="compare" className="gap-2">
            <GitCompare className="h-4 w-4" />
            Compare
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <ReviewHistoryDashboard />
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <ProgressTrackingView />
        </TabsContent>

        <TabsContent value="compare">
          <ReviewComparisonView />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAIReview;
