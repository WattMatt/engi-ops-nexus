import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanySettings } from "@/components/settings/CompanySettings";
import { InvoiceSettings } from "@/components/settings/InvoiceSettings";
import { TemplateManager } from "@/components/settings/TemplateManager";
import { PDFExportSettings } from "@/components/settings/PDFExportSettings";
import { NotificationPreferencesSettings } from "@/components/settings/NotificationPreferencesSettings";
import { PWASettings } from "@/components/settings/PWASettings";
import { ComponentGenerator } from "@/components/ComponentGenerator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarUpload } from "@/components/settings/AvatarUpload";
import { WalkthroughSettings } from "@/components/walkthrough/WalkthroughSettings";
import { CloudStorageSettings } from "@/components/settings/CloudStorageSettings";
import { SessionSecuritySettings } from "@/components/settings/SessionSecuritySettings";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";

const Settings = () => {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  
  // Get tab from URL if specified (e.g., /settings?tab=storage)
  const tabFromUrl = searchParams.get('tab');
  const defaultTab = tabFromUrl === 'storage' ? 'storage' : 'profile';

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserName(profile.full_name);
        setAvatarUrl(profile.avatar_url);
      }
    };

    loadUser();
  }, []);

  // Smart back navigation - go to dashboard if no history
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="h-screen bg-background overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 pb-16 space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">Settings</h1>
            <p className="text-muted-foreground">
              Manage your application settings and preferences
            </p>
          </div>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-4">
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="inline-flex w-auto min-w-full h-auto gap-1 p-1">
              <TabsTrigger value="profile" className="shrink-0">Profile</TabsTrigger>
              <TabsTrigger value="notifications" className="shrink-0">Notifications</TabsTrigger>
              <TabsTrigger value="app" className="shrink-0">App Settings</TabsTrigger>
              <TabsTrigger value="storage" className="shrink-0">Cloud Storage</TabsTrigger>
              {isAdmin && (
                <>
                  <TabsTrigger value="company" className="shrink-0">Company</TabsTrigger>
                  <TabsTrigger value="security" className="shrink-0">Session Security</TabsTrigger>
                  <TabsTrigger value="pdf" className="shrink-0">PDF Quality</TabsTrigger>
                  <TabsTrigger value="templates" className="shrink-0">PDF Templates</TabsTrigger>
                  <TabsTrigger value="invoice" className="shrink-0">Invoice Settings</TabsTrigger>
                  <TabsTrigger value="guides" className="shrink-0">Guides & Tours</TabsTrigger>
                  <TabsTrigger value="tools" className="shrink-0">Developer Tools</TabsTrigger>
                </>
              )}
            </TabsList>
          </div>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>
                  Upload a profile picture to personalize your account
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-8">
                {userId && (
                  <AvatarUpload
                    userId={userId}
                    currentAvatarUrl={avatarUrl}
                    userName={userName}
                    onUploadComplete={(url) => setAvatarUrl(url)}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationPreferencesSettings />
          </TabsContent>

          <TabsContent value="app">
            <PWASettings />
          </TabsContent>

          <TabsContent value="storage">
            <CloudStorageSettings />
          </TabsContent>

          {isAdmin && (
            <>
              <TabsContent value="company">
                <CompanySettings />
              </TabsContent>

              <TabsContent value="security">
                <SessionSecuritySettings />
              </TabsContent>

              <TabsContent value="pdf">
                <PDFExportSettings />
              </TabsContent>

              <TabsContent value="templates">
                <TemplateManager />
              </TabsContent>

              <TabsContent value="invoice">
                <InvoiceSettings />
              </TabsContent>

              <TabsContent value="guides">
                <WalkthroughSettings />
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
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
