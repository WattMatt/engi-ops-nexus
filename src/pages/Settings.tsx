import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanySettings } from "@/components/settings/CompanySettings";
import { InvoiceSettings } from "@/components/settings/InvoiceSettings";
import { CoverPageTemplates } from "@/components/settings/CoverPageTemplates";
import { ComponentGenerator } from "@/components/ComponentGenerator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Settings = () => {
  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application settings and preferences
        </p>
      </div>

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="templates">Cover Page Templates</TabsTrigger>
          <TabsTrigger value="invoice">Invoice Settings</TabsTrigger>
          <TabsTrigger value="tools">Developer Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <CompanySettings />
        </TabsContent>

        <TabsContent value="templates">
          <CoverPageTemplates />
        </TabsContent>

        <TabsContent value="invoice">
          <InvoiceSettings />
        </TabsContent>

        <TabsContent value="tools">
          <Card>
            <CardHeader>
              <CardTitle>AI Component Generator</CardTitle>
              <CardDescription>
                Generate React components from GitHub repositories using AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ComponentGenerator />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
