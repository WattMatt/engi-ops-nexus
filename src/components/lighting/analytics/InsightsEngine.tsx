import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, RefreshCw, Lightbulb, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface Insight {
  type: 'opportunity' | 'recommendation' | 'anomaly' | 'trend';
  title: string;
  description: string;
  impact?: string;
}

export const InsightsEngine: React.FC = () => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: portfolioData } = useQuery({
    queryKey: ['insights-portfolio-data'],
    queryFn: async () => {
      const { data: fittings } = await supabase
        .from('lighting_fittings')
        .select('*');
      
      const { data: schedules } = await supabase
        .from('project_lighting_schedules')
        .select('*, lighting_fittings(*)');

      return { fittings, schedules };
    }
  });

  const generateInsights = async () => {
    if (!portfolioData?.fittings) {
      toast.error('No data available for analysis');
      return;
    }

    setIsGenerating(true);
    try {
      // Prepare analytics summary for AI
      const fittings = portfolioData.fittings;
      const totalFittings = fittings.length;
      const totalCost = fittings.reduce((s, f) => s + (f.supply_cost || 0) + (f.install_cost || 0), 0);
      
      const manufacturerCounts: Record<string, number> = {};
      const typeCounts: Record<string, number> = {};
      let totalWattage = 0;
      let totalLumens = 0;
      let efficacySum = 0;
      let efficacyCount = 0;

      fittings.forEach(f => {
        if (f.manufacturer) manufacturerCounts[f.manufacturer] = (manufacturerCounts[f.manufacturer] || 0) + 1;
        if (f.fitting_type) typeCounts[f.fitting_type] = (typeCounts[f.fitting_type] || 0) + 1;
        totalWattage += f.wattage || 0;
        totalLumens += f.lumen_output || 0;
        if (f.wattage && f.lumen_output) {
          efficacySum += f.lumen_output / f.wattage;
          efficacyCount++;
        }
      });

      const topManufacturers = Object.entries(manufacturerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const avgEfficacy = efficacyCount ? (efficacySum / efficacyCount).toFixed(1) : 'N/A';

      const analyticsPayload = {
        totalFittings,
        totalCost,
        avgEfficacy,
        topManufacturers: topManufacturers.map(([name, count]) => ({ name, count, share: ((count / totalFittings) * 100).toFixed(1) })),
        fittingTypes: Object.entries(typeCounts).map(([type, count]) => ({ type, count })),
        avgWattage: totalFittings ? (totalWattage / totalFittings).toFixed(1) : 0
      };

      // Call AI edge function
      const { data, error } = await supabase.functions.invoke('lighting-insights', {
        body: { analytics: analyticsPayload }
      });

      if (error) throw error;

      if (data?.insights) {
        setInsights(data.insights);
        toast.success('Insights generated successfully');
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      
      // Fallback to rule-based insights
      const fallbackInsights = generateRuleBasedInsights();
      setInsights(fallbackInsights);
      toast.info('Generated rule-based insights');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateRuleBasedInsights = (): Insight[] => {
    if (!portfolioData?.fittings) return [];

    const fittings = portfolioData.fittings;
    const insights: Insight[] = [];

    // Check for low efficacy fittings
    const lowEfficacy = fittings.filter(f => 
      f.wattage && f.lumen_output && (f.lumen_output / f.wattage) < 80
    );
    if (lowEfficacy.length > 0) {
      insights.push({
        type: 'opportunity',
        title: 'Low Efficacy Fittings Detected',
        description: `${lowEfficacy.length} fittings have efficacy below 80 lm/W. Consider upgrading to more efficient LED alternatives.`,
        impact: `Potential 20-40% energy savings`
      });
    }

    // Check manufacturer concentration
    const manufacturerCounts: Record<string, number> = {};
    fittings.forEach(f => {
      if (f.manufacturer) manufacturerCounts[f.manufacturer] = (manufacturerCounts[f.manufacturer] || 0) + 1;
    });
    const topMfr = Object.entries(manufacturerCounts).sort((a, b) => b[1] - a[1])[0];
    if (topMfr && (topMfr[1] / fittings.length) > 0.5) {
      insights.push({
        type: 'recommendation',
        title: 'High Manufacturer Concentration',
        description: `${topMfr[0]} accounts for ${((topMfr[1] / fittings.length) * 100).toFixed(0)}% of your fittings. Consider diversifying suppliers for better pricing leverage.`,
        impact: 'Reduced supply chain risk'
      });
    }

    // Check for price outliers
    const costs = fittings.map(f => (f.supply_cost || 0) + (f.install_cost || 0)).filter(c => c > 0);
    if (costs.length > 5) {
      const avg = costs.reduce((a, b) => a + b, 0) / costs.length;
      const outliers = fittings.filter(f => {
        const cost = (f.supply_cost || 0) + (f.install_cost || 0);
        return cost > avg * 2;
      });
      if (outliers.length > 0) {
        insights.push({
          type: 'anomaly',
          title: 'Price Outliers Detected',
          description: `${outliers.length} fittings are priced significantly above portfolio average. Review for potential cost optimization.`,
          impact: 'Potential cost savings'
        });
      }
    }

    // Standardization opportunity
    const uniqueModels = new Set(fittings.map(f => f.model_name)).size;
    if (uniqueModels > fittings.length * 0.7) {
      insights.push({
        type: 'recommendation',
        title: 'Standardization Opportunity',
        description: `High variety in fitting models (${uniqueModels} unique models). Standardizing on fewer models could reduce inventory costs and simplify maintenance.`,
        impact: 'Reduced complexity & costs'
      });
    }

    return insights;
  };

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'opportunity': return <DollarSign className="h-5 w-5 text-green-500" />;
      case 'recommendation': return <Lightbulb className="h-5 w-5 text-blue-500" />;
      case 'anomaly': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'trend': return <TrendingUp className="h-5 w-5 text-purple-500" />;
    }
  };

  const getInsightBg = (type: Insight['type']) => {
    switch (type) {
      case 'opportunity': return 'bg-green-500/10 border-green-500/30';
      case 'recommendation': return 'bg-blue-500/10 border-blue-500/30';
      case 'anomaly': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'trend': return 'bg-purple-500/10 border-purple-500/30';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              AI-Powered Insights
            </CardTitle>
            <Button onClick={generateInsights} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Insights
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isGenerating ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : insights.length > 0 ? (
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg border ${getInsightBg(insight.type)}`}
                >
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <h4 className="font-medium">{insight.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {insight.description}
                      </p>
                      {insight.impact && (
                        <p className="text-sm font-medium mt-2 text-primary">
                          Impact: {insight.impact}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Click "Generate Insights" to analyze your lighting portfolio</p>
              <p className="text-sm mt-2">AI will identify cost-saving opportunities, anomalies, and recommendations</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
