import { CompanySettings } from "@/components/settings/CompanySettings";

const Settings = () => {
  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application settings and preferences
        </p>
      </div>

      <CompanySettings />
    </div>
  );
};

export default Settings;
