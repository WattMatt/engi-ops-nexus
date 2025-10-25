import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings as SettingsIcon, Building2, Save, Image } from "lucide-react";
import { LogoUpload } from "@/components/LogoUpload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    application_logo_url: "",
    company_name: "WM Consulting",
    company_address: "",
    company_phone: "",
    company_email: "",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    // Load settings from localStorage or database
    const savedSettings = localStorage.getItem("app_settings");
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save to localStorage
      localStorage.setItem("app_settings", JSON.stringify(settings));
      toast.success("Settings saved successfully");
    } catch (error: any) {
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application settings and preferences
        </p>
      </div>

      <div className="grid gap-6">
        {/* Application Branding */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Image className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Application Branding</CardTitle>
                <CardDescription>
                  Customize the application logo and appearance
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <LogoUpload
              currentUrl={settings.application_logo_url}
              onUrlChange={(url) => updateField("application_logo_url", url)}
              label="Application Logo"
              id="app_logo"
            />
            <p className="text-sm text-muted-foreground">
              This logo will appear in the application header and on reports
            </p>
          </CardContent>
        </Card>

        {/* Company Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>
                  Configure company details for reports and documents
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={settings.company_name}
                onChange={(e) => updateField("company_name", e.target.value)}
                placeholder="WM Consulting"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="company_address">Address</Label>
              <Textarea
                id="company_address"
                value={settings.company_address}
                onChange={(e) => updateField("company_address", e.target.value)}
                placeholder="Enter company address"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="company_phone">Phone</Label>
                <Input
                  id="company_phone"
                  value={settings.company_phone}
                  onChange={(e) => updateField("company_phone", e.target.value)}
                  placeholder="+27 XX XXX XXXX"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="company_email">Email</Label>
                <Input
                  id="company_email"
                  type="email"
                  value={settings.company_email}
                  onChange={(e) => updateField("company_email", e.target.value)}
                  placeholder="info@wmconsulting.co.za"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <SettingsIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Configure general application settings
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Additional settings coming soon...
            </p>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
