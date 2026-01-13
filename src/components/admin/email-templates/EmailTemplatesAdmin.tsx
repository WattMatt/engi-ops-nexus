import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Users, LayoutTemplate, BarChart3, Sparkles } from "lucide-react";
import { EmailSendersManager } from "./EmailSendersManager";
import { EmailTemplatesList } from "./EmailTemplatesList";
import { EmailAnalyticsDashboard } from "./EmailAnalyticsDashboard";

export function EmailTemplatesAdmin() {
  const [activeTab, setActiveTab] = useState("templates");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Email Templates</h1>
        <p className="text-muted-foreground mt-1">
          Manage email senders, create templates, and optimize with AI-powered personalization
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="templates" className="gap-2">
            <LayoutTemplate className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="senders" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Senders</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">AI Optimization</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <EmailTemplatesList />
        </TabsContent>

        <TabsContent value="senders" className="space-y-6">
          <EmailSendersManager />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <EmailAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI-Powered Email Optimization
              </CardTitle>
              <CardDescription>
                Get smart suggestions for subject lines, content improvements, and A/B testing recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Sparkles className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">Coming Soon</h3>
                <p className="text-muted-foreground mt-1 max-w-md">
                  AI optimization features are being developed. You'll be able to generate subject lines, 
                  improve content, and get data-driven A/B testing recommendations.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
