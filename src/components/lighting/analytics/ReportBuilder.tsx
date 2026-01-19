import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Download, Calendar, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { generateAnalyticsReportPDF, type ReportConfig } from './reportBuilderPdfExport';

// ReportConfig type is now imported from reportBuilderPdfExport

export const ReportBuilder: React.FC = () => {
  const [config, setConfig] = useState<ReportConfig>({
    name: 'Lighting Analytics Report',
    timeframe: 'all',
    metrics: {
      portfolio: true,
      benchmarks: true,
      trends: false,
      manufacturers: true,
      efficiency: true,
      costs: true
    }
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: reportData } = useQuery({
    queryKey: ['report-data', config.timeframe],
    queryFn: async () => {
      const { data: fittings } = await supabase
        .from('lighting_fittings')
        .select('*');
      
      const { data: schedules } = await supabase
        .from('project_lighting_schedules')
        .select('*, lighting_fittings(*)');
      
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name');

      return { fittings, schedules, projects };
    }
  });

  const handleMetricToggle = (metric: keyof typeof config.metrics) => {
    setConfig(prev => ({
      ...prev,
      metrics: { ...prev.metrics, [metric]: !prev.metrics[metric] }
    }));
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      await generateAnalyticsReportPDF(config, {
        fittings: reportData?.fittings || null,
        schedules: reportData?.schedules || null,
        projects: reportData?.projects || null,
      });
      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportToExcel = () => {
    if (!reportData?.fittings) return;

    // Create CSV content
    const headers = ['Model', 'Manufacturer', 'Type', 'Wattage', 'Lumens', 'Efficacy', 'Supply Cost', 'Install Cost'];
    const rows = reportData.fittings.map(f => [
      f.model_name || '',
      f.manufacturer || '',
      f.fitting_type || '',
      f.wattage || '',
      f.lumen_output || '',
      f.wattage && f.lumen_output ? (f.lumen_output / f.wattage).toFixed(1) : '',
      f.supply_cost || '',
      f.install_cost || ''
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lighting_data_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported to CSV');
  };

  const metricOptions = [
    { key: 'portfolio' as const, label: 'Portfolio Summary', icon: BarChart3 },
    { key: 'benchmarks' as const, label: 'Project Benchmarks', icon: BarChart3 },
    { key: 'trends' as const, label: 'Price Trends', icon: BarChart3 },
    { key: 'manufacturers' as const, label: 'Manufacturer Analysis', icon: BarChart3 },
    { key: 'efficiency' as const, label: 'Efficiency Metrics', icon: BarChart3 },
    { key: 'costs' as const, label: 'Cost Breakdown', icon: BarChart3 }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Custom Report Builder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Name */}
          <div className="space-y-2">
            <Label>Report Name</Label>
            <Input
              value={config.name}
              onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter report name"
            />
          </div>

          {/* Timeframe */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timeframe
            </Label>
            <Select 
              value={config.timeframe} 
              onValueChange={(v: ReportConfig['timeframe']) => setConfig(prev => ({ ...prev, timeframe: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="12months">Last 12 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Metrics Selection */}
          <div className="space-y-2">
            <Label>Include Metrics</Label>
            <div className="grid grid-cols-2 gap-4">
              {metricOptions.map(({ key, label }) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={config.metrics[key]}
                    onCheckedChange={() => handleMetricToggle(key)}
                  />
                  <Label htmlFor={key} className="cursor-pointer">{label}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={generatePDF} disabled={isGenerating}>
              <Download className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate PDF'}
            </Button>
            <Button variant="outline" onClick={exportToExcel}>
              <Download className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
