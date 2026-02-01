import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings, Send, Clock, Calendar, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import type { ReportTypeConfig } from "./reportTypes";

interface ReportTypeCardProps {
  config: ReportTypeConfig;
  isEnabled: boolean;
  scheduleType?: string | null;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  onToggle: (enabled: boolean) => void;
  onConfigure: () => void;
  onSendTest: () => void;
  isSending?: boolean;
}

export function ReportTypeCard({
  config,
  isEnabled,
  scheduleType,
  lastRunAt,
  nextRunAt,
  onToggle,
  onConfigure,
  onSendTest,
  isSending,
}: ReportTypeCardProps) {
  const Icon = config.icon;
  
  const getScheduleLabel = () => {
    if (!scheduleType) return 'Not configured';
    switch (scheduleType) {
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      case 'specific_date': return 'Specific Date';
      default: return scheduleType;
    }
  };

  return (
    <Card className={`relative overflow-hidden transition-all ${isEnabled ? 'ring-2 ring-primary/20' : ''}`}>
      {/* Accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${config.bgColor.replace('bg-', 'bg-')}`} 
           style={{ background: `linear-gradient(90deg, ${config.iconColor.replace('text-', '').replace('-600', '')} 0%, transparent 100%)` }} />
      
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-lg ${config.bgColor}`}>
            <Icon className={`h-6 w-6 ${config.iconColor}`} />
          </div>
          <Switch 
            checked={isEnabled} 
            onCheckedChange={onToggle}
          />
        </div>

        <h3 className="font-semibold text-lg mb-1">{config.name}</h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {config.description}
        </p>

        {/* Schedule Status */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Schedule:</span>
            <Badge variant={isEnabled && scheduleType ? 'default' : 'secondary'} className="text-xs">
              {getScheduleLabel()}
            </Badge>
          </div>

          {lastRunAt && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span>Last sent: {format(new Date(lastRunAt), 'MMM d, yyyy HH:mm')}</span>
            </div>
          )}

          {nextRunAt && isEnabled && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 text-primary" />
              <span>Next run: {format(new Date(nextRunAt), 'MMM d, yyyy HH:mm')}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={onConfigure}
          >
            <Settings className="h-4 w-4 mr-1" />
            Configure
          </Button>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={onSendTest}
            disabled={isSending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
