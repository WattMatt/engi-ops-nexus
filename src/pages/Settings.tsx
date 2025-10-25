import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanySettings } from "@/components/settings/CompanySettings";
import { InvoiceSettings } from "@/components/settings/InvoiceSettings";

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
          <TabsTrigger value="invoice">Invoice Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <CompanySettings />
        </TabsContent>

        <TabsContent value="invoice">
          <InvoiceSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
