import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sparkles, 
  Zap, 
  DollarSign, 
  AlertTriangle, 
  Lightbulb,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Info,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AILightingRecommendationsProps {
  projectId?: string | null;
}

interface ZoneRecommendation {
  zoneName: string;
  zoneType: string;
  currentStatus: 'compliant' | 'warning' | 'non-compliant';
  recommendedFittings: {
    fittingId: string;
    fittingName: string;
    quantity: number;
    rationale: string;
  }[];
  estimatedLux: number;
  notes: string;
}

interface Optimization {
  title: string;
  description: string;
  potentialSavings?: string;
  estimatedSaving?: string;
  tradeoffs?: string;
  priority?: 'high' | 'medium' | 'low';
}

interface ComplianceAlert {
  zone: string;
  issue: string;
  recommendation: string;
  severity: 'critical' | 'warning' | 'info';
}

interface QuickWin {
  title: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
}

interface Recommendations {
  zoneRecommendations: ZoneRecommendation[];
  energyOptimizations: Optimization[];
  costSavings: Optimization[];
  complianceAlerts: ComplianceAlert[];
  quickWins: QuickWin[];
  summary: string;
}

export const AILightingRecommendations = ({ projectId }: AILightingRecommendationsProps) => {
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch zones for the project
  const { data: zones } = useQuery({
    queryKey: ['lighting-zones', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('lighting_zones')
        .select('*')
        .eq('project_id', projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId
  });

  // Fetch all fittings from library
  const { data: fittings } = useQuery({
    queryKey: ['lighting-fittings-library'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lighting_fittings')
        .select('id, manufacturer, model_number, wattage, lumens, color_temperature, beam_angle, ip_rating, supply_cost, install_cost')
        .limit(50);
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch project settings
  const { data: projectSettings } = useQuery({
    queryKey: ['lighting-settings', projectId],
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
    enabled: !!projectId
  });

  const analyzeProject = async () => {
    if (!zones?.length) {
      toast.error('No lighting zones defined for this project');
      return;
    }

    if (!fittings?.length) {
      toast.error('No fittings in library to recommend from');
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('lighting-recommendations', {
        body: {
          zones,
          fittings,
          projectSettings: projectSettings || {
            electricity_rate: 2.50,
            operating_hours_per_day: 12,
            analysis_period_years: 5
          }
        }
      });

      if (error) throw error;
      setRecommendations(data.recommendations);
      toast.success('Analysis complete');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze project');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'non-compliant': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400';
      case 'warning': return 'bg-yellow-500/20 text-yellow-400';
      case 'info': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'low': return 'bg-green-500/20 text-green-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'low': return 'bg-green-500/20 text-green-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'high': return 'bg-red-500/20 text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI Lighting Recommendations</CardTitle>
          </div>
          <Button onClick={analyzeProject} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Analyze Project
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!recommendations ? (
          <div className="text-center py-12 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Click "Analyze Project" to get AI-powered recommendations</p>
            <p className="text-sm mt-2">
              Based on your zones, fittings library, and SANS 10114 standards
            </p>
          </div>
        ) : (
          <Tabs defaultValue="zones" className="space-y-4">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="zones" className="flex items-center gap-1">
                <Lightbulb className="h-4 w-4" />
                <span className="hidden sm:inline">Zones</span>
              </TabsTrigger>
              <TabsTrigger value="energy" className="flex items-center gap-1">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Energy</span>
              </TabsTrigger>
              <TabsTrigger value="cost" className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Cost</span>
              </TabsTrigger>
              <TabsTrigger value="compliance" className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">Compliance</span>
              </TabsTrigger>
              <TabsTrigger value="quickwins" className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                <span className="hidden sm:inline">Quick Wins</span>
              </TabsTrigger>
            </TabsList>

            {/* Summary */}
            {recommendations.summary && (
              <Card className="bg-muted/30">
                <CardContent className="py-3">
                  <p className="text-sm">{recommendations.summary}</p>
                </CardContent>
              </Card>
            )}

            {/* Zone Recommendations */}
            <TabsContent value="zones">
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {recommendations.zoneRecommendations?.map((zone, idx) => (
                    <Card key={idx} className="bg-muted/20">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(zone.currentStatus)}
                            <span className="font-medium">{zone.zoneName}</span>
                            <Badge variant="outline" className="text-xs">
                              {zone.zoneType}
                            </Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            Est. {zone.estimatedLux} lux
                          </span>
                        </div>
                        
                        {zone.recommendedFittings?.length > 0 && (
                          <div className="space-y-2 mt-3">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">
                              Recommended Fittings
                            </p>
                            {zone.recommendedFittings.map((fitting, fIdx) => (
                              <div key={fIdx} className="flex items-center justify-between bg-background/50 rounded p-2">
                                <div>
                                  <span className="text-sm font-medium">{fitting.fittingName}</span>
                                  <p className="text-xs text-muted-foreground">{fitting.rationale}</p>
                                </div>
                                <Badge>{fitting.quantity}x</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {zone.notes && (
                          <p className="text-sm text-muted-foreground mt-3">{zone.notes}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {!recommendations.zoneRecommendations?.length && (
                    <p className="text-center text-muted-foreground py-8">
                      No zone-specific recommendations available
                    </p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Energy Optimizations */}
            <TabsContent value="energy">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {recommendations.energyOptimizations?.map((opt, idx) => (
                    <Card key={idx} className="bg-muted/20">
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <Zap className="h-5 w-5 text-yellow-500 mt-0.5" />
                            <div>
                              <p className="font-medium">{opt.title}</p>
                              <p className="text-sm text-muted-foreground mt-1">{opt.description}</p>
                              {opt.potentialSavings && (
                                <p className="text-sm text-green-500 mt-2">
                                  Potential savings: {opt.potentialSavings}
                                </p>
                              )}
                            </div>
                          </div>
                          {opt.priority && (
                            <Badge className={getPriorityColor(opt.priority)}>
                              {opt.priority}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {!recommendations.energyOptimizations?.length && (
                    <p className="text-center text-muted-foreground py-8">
                      No energy optimization recommendations available
                    </p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Cost Savings */}
            <TabsContent value="cost">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {recommendations.costSavings?.map((saving, idx) => (
                    <Card key={idx} className="bg-muted/20">
                      <CardContent className="py-4">
                        <div className="flex items-start gap-3">
                          <DollarSign className="h-5 w-5 text-green-500 mt-0.5" />
                          <div>
                            <p className="font-medium">{saving.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">{saving.description}</p>
                            {saving.estimatedSaving && (
                              <p className="text-sm text-green-500 mt-2">
                                Estimated saving: {saving.estimatedSaving}
                              </p>
                            )}
                            {saving.tradeoffs && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Trade-offs: {saving.tradeoffs}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {!recommendations.costSavings?.length && (
                    <p className="text-center text-muted-foreground py-8">
                      No cost saving recommendations available
                    </p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Compliance Alerts */}
            <TabsContent value="compliance">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {recommendations.complianceAlerts?.map((alert, idx) => (
                    <Card key={idx} className="bg-muted/20">
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                              alert.severity === 'critical' ? 'text-red-500' :
                              alert.severity === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                            }`} />
                            <div>
                              <p className="font-medium">{alert.zone}</p>
                              <p className="text-sm text-muted-foreground mt-1">{alert.issue}</p>
                              <div className="flex items-center gap-1 mt-2 text-sm text-primary">
                                <ArrowRight className="h-3 w-3" />
                                {alert.recommendation}
                              </div>
                            </div>
                          </div>
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {!recommendations.complianceAlerts?.length && (
                    <div className="text-center py-8">
                      <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
                      <p className="text-muted-foreground">No compliance issues detected</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Quick Wins */}
            <TabsContent value="quickwins">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {recommendations.quickWins?.map((win, idx) => (
                    <Card key={idx} className="bg-muted/20">
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                              <p className="font-medium">{win.title}</p>
                              <p className="text-sm text-muted-foreground mt-1">{win.impact}</p>
                            </div>
                          </div>
                          <Badge className={getEffortColor(win.effort)}>
                            {win.effort} effort
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {!recommendations.quickWins?.length && (
                    <p className="text-center text-muted-foreground py-8">
                      No quick wins identified
                    </p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default AILightingRecommendations;
