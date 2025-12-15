import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Copy, Check, Clock, Target } from 'lucide-react';
import { toast } from 'sonner';
import { RoadmapPhase, getStatusColor, getStatusIcon, getPriorityColor } from './roadmapData';

interface RoadmapPhaseCardProps {
  phase: RoadmapPhase;
  onDeliverableToggle?: (phaseId: string, deliverableId: string, completed: boolean) => void;
}

export const RoadmapPhaseCard = ({ phase, onDeliverableToggle }: RoadmapPhaseCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const completedCount = phase.deliverables.filter(d => d.completed).length;
  const totalCount = phase.deliverables.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(phase.prompt);
      setCopied(true);
      toast.success('Prompt copied to clipboard!', {
        description: `Phase ${phase.phase} implementation prompt ready to paste.`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy prompt');
    }
  };

  return (
    <Card className={`transition-all duration-200 ${isOpen ? 'ring-1 ring-primary/20' : ''}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {isOpen ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-2xl">{getStatusIcon(phase.status)}</span>
                    <CardTitle className="text-lg">
                      Phase {phase.phase}: {phase.title}
                    </CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground">{phase.description}</p>
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <Badge variant="outline" className={getStatusColor(phase.status)}>
                      {phase.status.replace('-', ' ')}
                    </Badge>
                    <Badge variant="outline" className={getPriorityColor(phase.priority)}>
                      {phase.priority}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {phase.duration}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Target className="h-3 w-3" />
                      {completedCount}/{totalCount} deliverables
                    </div>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyPrompt();
                }}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy Prompt
                  </>
                )}
              </Button>
            </div>
            
            {/* Progress bar */}
            <div className="mt-3 ml-8">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="ml-8 space-y-4">
              {/* Deliverables */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Deliverables</h4>
                <div className="space-y-2">
                  {phase.deliverables.map((deliverable) => (
                    <div
                      key={deliverable.id}
                      className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={deliverable.id}
                        checked={deliverable.completed}
                        onCheckedChange={(checked) => {
                          onDeliverableToggle?.(phase.id, deliverable.id, checked as boolean);
                        }}
                        className="mt-0.5"
                      />
                      <label
                        htmlFor={deliverable.id}
                        className={`text-sm cursor-pointer ${
                          deliverable.completed ? 'text-muted-foreground line-through' : ''
                        }`}
                      >
                        {deliverable.title}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prompt preview */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Implementation Prompt Preview</h4>
                <div className="bg-muted/50 rounded-md p-3 max-h-48 overflow-y-auto">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                    {phase.prompt.slice(0, 500)}...
                  </pre>
                </div>
                <p className="text-xs text-muted-foreground">
                  Click "Copy Prompt" to get the full implementation instructions.
                </p>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
