import { useState } from "react";
import { usePRD, usePRDStories, useUpdatePRD, useCreateStory, useUpdateStory, useDeleteStory, PRD, PRDStory } from "@/hooks/usePRDs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Copy, CheckCircle2, Circle, AlertCircle, Clock, Trash2, GripVertical } from "lucide-react";
import { PRDProgressSection } from "./PRDProgressSection";
import { toast } from "sonner";

interface PRDDetailProps {
  prdId: string;
  onBack: () => void;
}

export function PRDDetail({ prdId, onBack }: PRDDetailProps) {
  const { data: prd, isLoading: prdLoading } = usePRD(prdId);
  const { data: stories, isLoading: storiesLoading } = usePRDStories(prdId);
  const updatePRD = useUpdatePRD();
  const createStory = useCreateStory();
  const updateStory = useUpdateStory();
  const deleteStory = useDeleteStory();
  
  const [isAddStoryOpen, setIsAddStoryOpen] = useState(false);
  const [newStory, setNewStory] = useState({ title: '', description: '', acceptance_criteria: '' });

  const handleAddStory = async () => {
    if (!newStory.title.trim()) return;
    await createStory.mutateAsync({
      prd_id: prdId,
      title: newStory.title,
      description: newStory.description || undefined,
      acceptance_criteria: newStory.acceptance_criteria.split('\n').filter(Boolean),
    });
    setNewStory({ title: '', description: '', acceptance_criteria: '' });
    setIsAddStoryOpen(false);
  };

  const handleStatusChange = (storyId: string, status: PRDStory['status']) => {
    updateStory.mutate({ id: storyId, prd_id: prdId, status });
  };

  const handlePRDStatusChange = (status: PRD['status']) => {
    updatePRD.mutate({ id: prdId, status });
  };

  const generatePrompt = () => {
    if (!prd || !stories) return '';
    
    const todoStories = stories.filter(s => s.status !== 'done');
    const currentStory = todoStories[0];
    
    if (!currentStory) return 'All stories completed! 🎉';
    
    let prompt = `## Current Task: ${currentStory.title}\n\n`;
    if (currentStory.description) {
      prompt += `**Description:** ${currentStory.description}\n\n`;
    }
    if (currentStory.acceptance_criteria?.length) {
      prompt += `**Acceptance Criteria:**\n${currentStory.acceptance_criteria.map(c => `- ${c}`).join('\n')}\n\n`;
    }
    prompt += `---\n\n**PRD Context:** ${prd.title}\n${prd.description || ''}\n\n`;
    prompt += `**Remaining Stories:** ${todoStories.length - 1}\n`;
    
    return prompt;
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(generatePrompt());
    toast.success('Prompt copied to clipboard');
  };

  const getStatusIcon = (status: PRDStory['status']) => {
    switch (status) {
      case 'done': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'blocked': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (prdLoading || storiesLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  if (!prd) {
    return <div className="flex items-center justify-center p-8">PRD not found</div>;
  }

  const completedCount = stories?.filter(s => s.status === 'done').length || 0;
  const totalCount = stories?.length || 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{prd.title}</h2>
          <p className="text-muted-foreground">{prd.description}</p>
        </div>
        <Select value={prd.status} onValueChange={(v) => handlePRDStatusChange(v as PRD['status'])}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">{completedCount} / {totalCount} stories</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300" 
              style={{ width: `${progress}%` }} 
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="stories">
        <TabsList>
          <TabsTrigger value="stories">Stories</TabsTrigger>
          <TabsTrigger value="prompt">AI Prompt</TabsTrigger>
          <TabsTrigger value="progress">Progress Log</TabsTrigger>
        </TabsList>

        <TabsContent value="stories" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={isAddStoryOpen} onOpenChange={setIsAddStoryOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Story
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add User Story</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      placeholder="As a user, I want to..."
                      value={newStory.title}
                      onChange={(e) => setNewStory({ ...newStory, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      placeholder="Detailed description..."
                      value={newStory.description}
                      onChange={(e) => setNewStory({ ...newStory, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Acceptance Criteria (one per line)</label>
                    <Textarea
                      placeholder="User can login with email&#10;Error messages are shown&#10;Session persists on refresh"
                      value={newStory.acceptance_criteria}
                      onChange={(e) => setNewStory({ ...newStory, acceptance_criteria: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <Button onClick={handleAddStory} disabled={!newStory.title.trim() || createStory.isPending} className="w-full">
                    Add Story
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {stories?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">No stories yet. Add your first user story to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {stories?.map((story) => (
                <Card key={story.id} className="group">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <GripVertical className="h-5 w-5 text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 cursor-grab" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(story.status)}
                          <span className={`font-medium ${story.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                            {story.title}
                          </span>
                        </div>
                        {story.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{story.description}</p>
                        )}
                        {story.acceptance_criteria && story.acceptance_criteria.length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {story.acceptance_criteria.length} acceptance criteria
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={story.status} onValueChange={(v) => handleStatusChange(story.id, v as PRDStory['status'])}>
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todo">To Do</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                            <SelectItem value="blocked">Blocked</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 opacity-0 group-hover:opacity-100"
                          onClick={() => deleteStory.mutate({ id: story.id, prd_id: prdId })}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="prompt" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Generated AI Prompt</CardTitle>
                <Button variant="outline" size="sm" onClick={copyPrompt}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Prompt
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap font-mono">
                {generatePrompt()}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="mt-4">
          <PRDProgressSection prdId={prdId} stories={stories || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
