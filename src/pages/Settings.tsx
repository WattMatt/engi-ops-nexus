import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanySettings } from "@/components/settings/CompanySettings";
import { InvoiceSettings } from "@/components/settings/InvoiceSettings";
import { CoverPageTemplates } from "@/components/settings/CoverPageTemplates";
import { CoverPageUpload } from "@/components/settings/CoverPageUpload";
import { PDFExportSettings } from "@/components/settings/PDFExportSettings";
import { ComponentGenerator } from "@/components/ComponentGenerator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarUpload } from "@/components/settings/AvatarUpload";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="pdf">PDF Quality</TabsTrigger>
          <TabsTrigger value="templates">PDF Templates</TabsTrigger>
          <TabsTrigger value="invoice">Invoice Settings</TabsTrigger>
          <TabsTrigger value="tools">Developer Tools</TabsTrigger>
        </TabsList>

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

        <TabsContent value="company">
          <CompanySettings />
        </TabsContent>

        <TabsContent value="pdf">
          <PDFExportSettings />
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <CoverPageUpload />
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
