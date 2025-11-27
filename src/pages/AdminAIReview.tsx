import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { ApplicationReviewDialog } from "@/components/admin/ApplicationReviewDialog";
import { ReviewHistoryDashboard } from "@/components/admin/ReviewHistoryDashboard";

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
          <p className="text-sm text-muted-foreground mb-4">
            Analyze your application's performance, security, UX, and code quality using AI.
            Reviews are saved automatically and contribute to the trend analysis below.
          </p>
        </CardContent>
      </Card>

      {/* Review History Dashboard */}
      <ReviewHistoryDashboard />
    </div>
  );
};

export default AdminAIReview;
