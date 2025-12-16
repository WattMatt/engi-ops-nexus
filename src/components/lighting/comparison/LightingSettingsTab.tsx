import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { DEFAULT_SETTINGS } from './comparisonTypes';

interface LightingSettingsTabProps {
  projectId?: string | null;
}

interface AnalysisSettings {
  id?: string;
  project_id: string;
  electricity_rate: number;
  operating_hours_per_day: number;
  analysis_period_years: number;
  include_vat: boolean;
  vat_rate: number;
}

export const LightingSettingsTab = ({ projectId }: LightingSettingsTabProps) => {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<AnalysisSettings>({
    project_id: projectId || '',
    electricity_rate: DEFAULT_SETTINGS.electricity_rate,
    operating_hours_per_day: DEFAULT_SETTINGS.operating_hours_per_day,
    analysis_period_years: DEFAULT_SETTINGS.analysis_period_years,
    include_vat: DEFAULT_SETTINGS.include_vat,
    vat_rate: DEFAULT_SETTINGS.vat_rate,
  });
  const [hasChanges, setHasChanges] = useState(false);

  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ['lighting-analysis-settings', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from('lighting_analysis_settings')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  useEffect(() => {
    if (savedSettings) {
      setSettings({
        id: savedSettings.id,
        project_id: savedSettings.project_id,
        electricity_rate: Number(savedSettings.electricity_rate),
        operating_hours_per_day: Number(savedSettings.operating_hours_per_day),
        analysis_period_years: savedSettings.analysis_period_years,
        include_vat: savedSettings.include_vat,
        vat_rate: Number(savedSettings.vat_rate),
      });
    }
  }, [savedSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('No project selected');

      const payload = {
        project_id: projectId,
        electricity_rate: settings.electricity_rate,
        operating_hours_per_day: settings.operating_hours_per_day,
        analysis_period_years: settings.analysis_period_years,
        include_vat: settings.include_vat,
        vat_rate: settings.vat_rate,
      };

      if (settings.id) {
        const { error } = await supabase
          .from('lighting_analysis_settings')
          .update(payload)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lighting_analysis_settings')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Settings saved');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['lighting-analysis-settings'] });
    },
    onError: (error) => {
      toast.error('Failed to save settings', { description: error.message });
    },
  });

  const updateSetting = <K extends keyof AnalysisSettings>(
    key: K,
    value: AnalysisSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const resetToDefaults = () => {
    setSettings({
      ...settings,
      electricity_rate: DEFAULT_SETTINGS.electricity_rate,
      operating_hours_per_day: DEFAULT_SETTINGS.operating_hours_per_day,
      analysis_period_years: DEFAULT_SETTINGS.analysis_period_years,
      include_vat: DEFAULT_SETTINGS.include_vat,
      vat_rate: DEFAULT_SETTINGS.vat_rate,
    });
    setHasChanges(true);
  };

  if (!projectId) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Please select a project to configure analysis settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <div>
                <CardTitle className="text-lg">Analysis Settings</CardTitle>
                <CardDescription>
                  Configure default settings for energy and cost analysis
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resetToDefaults}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={() => saveMutation.mutate()}
                disabled={!hasChanges || saveMutation.isPending}
              >
                <Save className="h-4 w-4 mr-1" />
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <p className="text-muted-foreground">Loading settings...</p>
          ) : (
            <>
              {/* Energy Settings */}
              <div className="space-y-4">
                <h3 className="font-medium">Energy Settings</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="electricity_rate">
                      Electricity Rate (R/kWh)
                    </Label>
                    <Input
                      id="electricity_rate"
                      type="number"
                      value={settings.electricity_rate}
                      onChange={(e) =>
                        updateSetting('electricity_rate', parseFloat(e.target.value) || 0)
                      }
                      step={0.01}
                      min={0}
                    />
                    <p className="text-xs text-muted-foreground">
                      Average electricity tariff for calculations
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="operating_hours">
                      Default Operating Hours per Day
                    </Label>
                    <Input
                      id="operating_hours"
                      type="number"
                      value={settings.operating_hours_per_day}
                      onChange={(e) =>
                        updateSetting('operating_hours_per_day', parseFloat(e.target.value) || 0)
                      }
                      min={0}
                      max={24}
                    />
                    <p className="text-xs text-muted-foreground">
                      Typical daily usage for energy calculations
                    </p>
                  </div>
                </div>
              </div>

              {/* Analysis Period */}
              <div className="space-y-4">
                <h3 className="font-medium">Analysis Period</h3>
                <div className="space-y-2 max-w-xs">
                  <Label htmlFor="analysis_period">
                    Analysis Period (Years)
                  </Label>
                  <Input
                    id="analysis_period"
                    type="number"
                    value={settings.analysis_period_years}
                    onChange={(e) =>
                      updateSetting('analysis_period_years', parseInt(e.target.value) || 1)
                    }
                    min={1}
                    max={20}
                  />
                  <p className="text-xs text-muted-foreground">
                    Period for total cost of ownership calculations
                  </p>
                </div>
              </div>

              {/* VAT Settings */}
              <div className="space-y-4">
                <h3 className="font-medium">VAT Settings</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="include_vat"
                      checked={settings.include_vat}
                      onCheckedChange={(checked) => updateSetting('include_vat', checked)}
                    />
                    <Label htmlFor="include_vat">Include VAT in calculations</Label>
                  </div>
                </div>
                {settings.include_vat && (
                  <div className="space-y-2 max-w-xs">
                    <Label htmlFor="vat_rate">VAT Rate (%)</Label>
                    <Input
                      id="vat_rate"
                      type="number"
                      value={settings.vat_rate}
                      onChange={(e) =>
                        updateSetting('vat_rate', parseFloat(e.target.value) || 0)
                      }
                      min={0}
                      max={100}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            These settings are used as defaults for energy and cost analysis in the Fitting Comparison tool. 
            You can override these values when performing individual comparisons.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
