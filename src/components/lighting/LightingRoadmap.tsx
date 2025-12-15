import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Lightbulb, 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Check,
  Rocket,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { RoadmapPhaseCard } from './RoadmapPhaseCard';
import { 
  roadmapPhases, 
  growthSuggestions, 
  RoadmapPhase,
  GrowthSuggestion 
} from './roadmapData';

export const LightingRoadmap = () => {
  const [phases, setPhases] = useState<RoadmapPhase[]>(roadmapPhases);
  const [expandedGrowth, setExpandedGrowth] = useState<string | null>(null);
  const [copiedGrowth, setCopiedGrowth] = useState<string | null>(null);

  // Calculate overall progress
  const totalDeliverables = phases.reduce((acc, p) => acc + p.deliverables.length, 0);
  const completedDeliverables = phases.reduce(
    (acc, p) => acc + p.deliverables.filter(d => d.completed).length, 
    0
  );
  const overallProgress = totalDeliverables > 0 
    ? (completedDeliverables / totalDeliverables) * 100 
    : 0;

  const handleDeliverableToggle = (phaseId: string, deliverableId: string, completed: boolean) => {
    setPhases(prev => prev.map(phase => {
      if (phase.id === phaseId) {
        return {
          ...phase,
          deliverables: phase.deliverables.map(d => 
            d.id === deliverableId ? { ...d, completed } : d
          ),
        };
      }
      return phase;
    }));
    
    toast.success(completed ? 'Deliverable marked complete!' : 'Deliverable marked incomplete');
  };

  const handleCopyGrowthPrompt = async (suggestion: GrowthSuggestion) => {
    try {
      await navigator.clipboard.writeText(suggestion.prompt);
      setCopiedGrowth(suggestion.id);
      toast.success('Prompt copied!', {
        description: `${suggestion.title} implementation prompt ready.`,
      });
      setTimeout(() => setCopiedGrowth(null), 2000);
    } catch (err) {
      toast.error('Failed to copy prompt');
    }
  };

  const completedPhases = phases.filter(p => 
    p.deliverables.every(d => d.completed)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header with overall progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Lightbulb className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Lighting Module Development Roadmap</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Track progress across all development phases
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{Math.round(overallProgress)}%</div>
              <div className="text-xs text-muted-foreground">Overall Progress</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={overallProgress} className="h-3" />
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">
                    {completedPhases} phases complete
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <span className="text-muted-foreground">
                    {completedDeliverables}/{totalDeliverables} deliverables
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-500/20 text-green-400">
                  ✅ Complete
                </Badge>
                <Badge variant="outline" className="bg-blue-500/20 text-blue-400">
                  🔄 In Progress
                </Badge>
                <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400">
                  ⏳ Pending
                </Badge>
                <Badge variant="outline" className="bg-muted text-muted-foreground">
                  🔮 Future
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          Development Phases
        </h2>
        {phases.map((phase) => (
          <RoadmapPhaseCard
            key={phase.id}
            phase={phase}
            onDeliverableToggle={handleDeliverableToggle}
          />
        ))}
      </div>

      <Separator />

      {/* Growth suggestions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Growth & Expansion Opportunities
        </h2>
        <p className="text-sm text-muted-foreground">
          Future enhancements to consider after core phases are complete.
        </p>
        
        <div className="grid gap-3">
          {growthSuggestions.map((suggestion) => (
            <Card key={suggestion.id} className="overflow-hidden">
              <Collapsible
                open={expandedGrowth === suggestion.id}
                onOpenChange={(open) => setExpandedGrowth(open ? suggestion.id : null)}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {expandedGrowth === suggestion.id ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <h3 className="font-medium">{suggestion.title}</h3>
                        <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyGrowthPrompt(suggestion);
                      }}
                    >
                      {copiedGrowth === suggestion.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4">
                    <ScrollArea className="h-64 rounded-md border bg-muted/30 p-3">
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                        {suggestion.prompt}
                      </pre>
                    </ScrollArea>
                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => handleCopyGrowthPrompt(suggestion)}
                      >
                        {copiedGrowth === suggestion.id ? (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1" />
                            Copy Full Prompt
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
