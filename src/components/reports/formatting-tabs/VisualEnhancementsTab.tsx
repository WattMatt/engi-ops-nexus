import { ReportSettings } from "@/hooks/useReportSettings";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoUpload } from "@/components/LogoUpload";

interface VisualEnhancementsTabProps {
  settings: ReportSettings;
  updateSettings: (updates: Partial<ReportSettings>) => void;
}

export function VisualEnhancementsTab({ settings, updateSettings }: VisualEnhancementsTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Company Logo</CardTitle>
          <CardDescription>Upload your company logo for reports</CardDescription>
        </CardHeader>
        <CardContent>
          <LogoUpload
            currentUrl={settings.company_logo_url}
            onUrlChange={(url) => updateSettings({ company_logo_url: url })}
            label="Company Logo"
            id="report-logo"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Watermark</CardTitle>
          <CardDescription>Add a watermark to your reports</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="watermark-text">Watermark Text</Label>
            <Input
              id="watermark-text"
              placeholder="CONFIDENTIAL, DRAFT, etc."
              value={settings.watermark_text || ""}
              onChange={(e) => updateSettings({ watermark_text: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="watermark-opacity">Opacity</Label>
            <Input
              id="watermark-opacity"
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={settings.watermark_opacity}
              onChange={(e) => updateSettings({ watermark_opacity: parseFloat(e.target.value) })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}