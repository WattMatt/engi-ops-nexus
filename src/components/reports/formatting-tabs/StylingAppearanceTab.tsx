import { ReportSettings } from "@/hooks/useReportSettings";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StylingAppearanceTabProps {
  settings: ReportSettings;
  updateSettings: (updates: Partial<ReportSettings>) => void;
}

export function StylingAppearanceTab({ settings, updateSettings }: StylingAppearanceTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Typography</CardTitle>
          <CardDescription>Configure fonts and text styling</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="font-family">Font Family</Label>
            <Select
              value={settings.font_family}
              onValueChange={(value) => updateSettings({ font_family: value })}
            >
              <SelectTrigger id="font-family">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Helvetica">Helvetica</SelectItem>
                <SelectItem value="Times">Times New Roman</SelectItem>
                <SelectItem value="Courier">Courier</SelectItem>
                <SelectItem value="Arial">Arial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="font-size">Base Font Size (pt)</Label>
            <Input
              id="font-size"
              type="number"
              min="8"
              max="16"
              value={settings.font_size}
              onChange={(e) => updateSettings({ font_size: parseInt(e.target.value) })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Colors</CardTitle>
          <CardDescription>Customize color scheme</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="primary-color">Primary Color</Label>
            <div className="flex gap-2">
              <Input
                id="primary-color"
                type="color"
                value={settings.primary_color}
                onChange={(e) => updateSettings({ primary_color: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={settings.primary_color}
                onChange={(e) => updateSettings({ primary_color: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondary-color">Secondary Color</Label>
            <div className="flex gap-2">
              <Input
                id="secondary-color"
                type="color"
                value={settings.secondary_color}
                onChange={(e) => updateSettings({ secondary_color: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={settings.secondary_color}
                onChange={(e) => updateSettings({ secondary_color: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Table Styling</CardTitle>
          <CardDescription>Configure table appearance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="table-header-bg">Header Background</Label>
            <div className="flex gap-2">
              <Input
                id="table-header-bg"
                type="color"
                value={settings.table_style.headerBg}
                onChange={(e) => updateSettings({
                  table_style: { ...settings.table_style, headerBg: e.target.value }
                })}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={settings.table_style.headerBg}
                onChange={(e) => updateSettings({
                  table_style: { ...settings.table_style, headerBg: e.target.value }
                })}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cell-padding">Cell Padding (mm)</Label>
            <Input
              id="cell-padding"
              type="number"
              min="1"
              max="10"
              value={settings.table_style.cellPadding}
              onChange={(e) => updateSettings({
                table_style: { ...settings.table_style, cellPadding: parseFloat(e.target.value) }
              })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}