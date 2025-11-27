import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { ApplicationReviewDialog } from "@/components/admin/ApplicationReviewDialog";

const AdminAIReview = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Application Review</h1>
        <p className="text-muted-foreground">
          Get AI-powered insights and recommendations for your application
        </p>
      </div>

      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Application Optimization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Get AI-powered insights and recommendations to improve your application's performance, security, and user experience.
          </p>
          <ApplicationReviewDialog />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAIReview;
