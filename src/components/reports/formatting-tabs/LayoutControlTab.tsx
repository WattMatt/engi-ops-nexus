import { ReportSettings } from "@/hooks/useReportSettings";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface LayoutControlTabProps {
  settings: ReportSettings;
  updateSettings: (updates: Partial<ReportSettings>) => void;
}

export function LayoutControlTab({ settings, updateSettings }: LayoutControlTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Page Orientation</CardTitle>
          <CardDescription>Choose page orientation</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={settings.page_orientation}
            onValueChange={(value: "portrait" | "landscape") => 
              updateSettings({ page_orientation: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="portrait">Portrait</SelectItem>
              <SelectItem value="landscape">Landscape</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Margins</CardTitle>
          <CardDescription>Set page margins in millimeters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="margin-top">Top</Label>
              <Input
                id="margin-top"
                type="number"
                min="5"
                max="50"
                value={settings.margins.top}
                onChange={(e) => updateSettings({
                  margins: { ...settings.margins, top: parseFloat(e.target.value) }
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="margin-bottom">Bottom</Label>
              <Input
                id="margin-bottom"
                type="number"
                min="5"
                max="50"
                value={settings.margins.bottom}
                onChange={(e) => updateSettings({
                  margins: { ...settings.margins, bottom: parseFloat(e.target.value) }
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="margin-left">Left</Label>
              <Input
                id="margin-left"
                type="number"
                min="5"
                max="50"
                value={settings.margins.left}
                onChange={(e) => updateSettings({
                  margins: { ...settings.margins, left: parseFloat(e.target.value) }
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="margin-right">Right</Label>
              <Input
                id="margin-right"
                type="number"
                min="5"
                max="50"
                value={settings.margins.right}
                onChange={(e) => updateSettings({
                  margins: { ...settings.margins, right: parseFloat(e.target.value) }
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spacing</CardTitle>
          <CardDescription>Configure line and paragraph spacing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="line-spacing">Line Spacing</Label>
            <Input
              id="line-spacing"
              type="number"
              step="0.05"
              min="1"
              max="2"
              value={settings.line_spacing}
              onChange={(e) => updateSettings({ line_spacing: parseFloat(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paragraph-spacing">Paragraph Spacing (mm)</Label>
            <Input
              id="paragraph-spacing"
              type="number"
              min="0"
              max="20"
              value={settings.paragraph_spacing}
              onChange={(e) => updateSettings({ paragraph_spacing: parseFloat(e.target.value) })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}