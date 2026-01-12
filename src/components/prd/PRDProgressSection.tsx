import { useState } from "react";
import { usePRDProgressLog, useAddProgressEntry, PRDStory, PRDProgressLog } from "@/hooks/usePRDs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Lightbulb, MessageSquare, AlertTriangle, GitCommit } from "lucide-react";
import { format } from "date-fns";

interface PRDProgressSectionProps {
  prdId: string;
  stories: PRDStory[];
}

export function PRDProgressSection({ prdId, stories }: PRDProgressSectionProps) {
  const { data: progressLog, isLoading } = usePRDProgressLog(prdId);
  const addEntry = useAddProgressEntry();
  
  const [newEntry, setNewEntry] = useState('');
  const [entryType, setEntryType] = useState<PRDProgressLog['entry_type']>('note');
  const [selectedStory, setSelectedStory] = useState<string>('');

  const handleAddEntry = async () => {
    if (!newEntry.trim()) return;
    await addEntry.mutateAsync({
      prd_id: prdId,
      story_id: selectedStory || undefined,
      entry: newEntry,
      entry_type: entryType,
    });
    setNewEntry('');
    setSelectedStory('');
  };

  const getEntryIcon = (type: PRDProgressLog['entry_type']) => {
    switch (type) {
      case 'learning': return <Lightbulb className="h-4 w-4 text-yellow-500" />;
      case 'blocker': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'decision': return <GitCommit className="h-4 w-4 text-blue-500" />;
      default: return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEntryBadge = (type: PRDProgressLog['entry_type']) => {
    switch (type) {
      case 'learning': return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Learning</Badge>;
      case 'blocker': return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">Blocker</Badge>;
      case 'decision': return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Decision</Badge>;
      default: return <Badge variant="outline">Note</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Progress Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={entryType} onValueChange={(v) => setEntryType(v as PRDProgressLog['entry_type'])}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="note">Note</SelectItem>
                <SelectItem value="learning">Learning</SelectItem>
                <SelectItem value="blocker">Blocker</SelectItem>
                <SelectItem value="decision">Decision</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedStory} onValueChange={setSelectedStory}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Link to story (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No story</SelectItem>
                {stories.map((story) => (
                  <SelectItem key={story.id} value={story.id}>
                    {story.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder="Document learnings, blockers, or decisions..."
            value={newEntry}
            onChange={(e) => setNewEntry(e.target.value)}
            rows={3}
          />
          <Button onClick={handleAddEntry} disabled={!newEntry.trim() || addEntry.isPending}>
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Progress History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : progressLog?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No progress entries yet. Document your learnings and decisions as you work.
            </p>
          ) : (
            <div className="space-y-4">
              {progressLog?.map((entry) => {
                const linkedStory = stories.find(s => s.id === entry.story_id);
                return (
                  <div key={entry.id} className="flex gap-3 pb-4 border-b last:border-0">
                    <div className="mt-1">{getEntryIcon(entry.entry_type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getEntryBadge(entry.entry_type)}
                        {linkedStory && (
                          <span className="text-xs text-muted-foreground">
                            → {linkedStory.title}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {format(new Date(entry.created_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm">{entry.entry}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
