import { ReportSettings } from "@/hooks/useReportSettings";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface MetadataBrandingTabProps {
  settings: ReportSettings;
  updateSettings: (updates: Partial<ReportSettings>) => void;
}

export function MetadataBrandingTab({ settings, updateSettings }: MetadataBrandingTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>Add your company details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Company Name</Label>
            <Input
              id="company-name"
              placeholder="Your Company Name"
              value={settings.company_name || ""}
              onChange={(e) => updateSettings({ company_name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-tagline">Tagline</Label>
            <Input
              id="company-tagline"
              placeholder="Your company tagline"
              value={settings.company_tagline || ""}
              onChange={(e) => updateSettings({ company_tagline: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-contact">Contact Information</Label>
            <Textarea
              id="company-contact"
              placeholder="Address, phone, email, website..."
              value={typeof settings.company_contact === 'string' ? settings.company_contact : JSON.stringify(settings.company_contact, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  updateSettings({ company_contact: parsed });
                } catch {
                  updateSettings({ company_contact: e.target.value });
                }
              }}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Report Metadata</CardTitle>
          <CardDescription>Add report author and version info</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="author-name">Author Name</Label>
            <Input
              id="author-name"
              placeholder="Report author"
              value={settings.author_name || ""}
              onChange={(e) => updateSettings({ author_name: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}