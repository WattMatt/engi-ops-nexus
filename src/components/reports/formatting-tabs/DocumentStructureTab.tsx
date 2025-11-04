import { ReportSettings } from "@/hooks/useReportSettings";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DocumentStructureTabProps {
  settings: ReportSettings;
  updateSettings: (updates: Partial<ReportSettings>) => void;
}

export function DocumentStructureTab({ settings, updateSettings }: DocumentStructureTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Cover Page</CardTitle>
          <CardDescription>Configure the report cover page</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="cover-page">Include Cover Page</Label>
            <Switch
              id="cover-page"
              checked={settings.include_cover_page}
              onCheckedChange={(checked) =>
                updateSettings({ include_cover_page: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Page Numbers</CardTitle>
          <CardDescription>Show page numbering in footer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="page-numbers">Show Page Numbers</Label>
            <Switch
              id="page-numbers"
              checked={settings.show_page_numbers}
              onCheckedChange={(checked) =>
                updateSettings({ show_page_numbers: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Date Display</CardTitle>
          <CardDescription>Show date on the report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="show-date">Show Date</Label>
            <Switch
              id="show-date"
              checked={settings.show_date}
              onCheckedChange={(checked) =>
                updateSettings({ show_date: checked })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}