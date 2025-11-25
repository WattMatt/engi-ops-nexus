import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CostTemplate } from './types';
import { Plus, Trash2, Save } from 'lucide-react';
import { useState, useEffect } from 'react';

const DEFAULT_TEMPLATES: CostTemplate[] = [
  {
    id: 'residential',
    name: 'Residential',
    laborRate: 40,
    materialMultiplier: 1.0,
    installationMultiplier: 1.0,
    supportsMultiplier: 1.0,
  },
  {
    id: 'commercial',
    name: 'Commercial',
    laborRate: 55,
    materialMultiplier: 1.2,
    installationMultiplier: 1.3,
    supportsMultiplier: 1.25,
  },
  {
    id: 'industrial',
    name: 'Industrial',
    laborRate: 70,
    materialMultiplier: 1.4,
    installationMultiplier: 1.6,
    supportsMultiplier: 1.5,
  },
];

interface CostTemplateManagerProps {
  onTemplateChange?: (template: CostTemplate) => void;
}

export function CostTemplateManager({ onTemplateChange }: CostTemplateManagerProps) {
  const [templates, setTemplates] = useState<CostTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string>('residential');
  const [editingTemplate, setEditingTemplate] = useState<CostTemplate | null>(null);

  useEffect(() => {
    // Load templates from localStorage
    const saved = localStorage.getItem('cable-route-cost-templates');
    if (saved) {
      setTemplates(JSON.parse(saved));
    } else {
      setTemplates(DEFAULT_TEMPLATES);
      localStorage.setItem('cable-route-cost-templates', JSON.stringify(DEFAULT_TEMPLATES));
    }
  }, []);

  useEffect(() => {
    const activeTemplate = templates.find((t) => t.id === activeTemplateId);
    if (activeTemplate && onTemplateChange) {
      onTemplateChange(activeTemplate);
    }
  }, [activeTemplateId, templates, onTemplateChange]);

  const handleSaveTemplates = (newTemplates: CostTemplate[]) => {
    setTemplates(newTemplates);
    localStorage.setItem('cable-route-cost-templates', JSON.stringify(newTemplates));
  };

  const handleCreateTemplate = () => {
    const newTemplate: CostTemplate = {
      id: `custom-${Date.now()}`,
      name: 'New Template',
      laborRate: 50,
      materialMultiplier: 1.0,
      installationMultiplier: 1.0,
      supportsMultiplier: 1.0,
    };
    handleSaveTemplates([...templates, newTemplate]);
    setEditingTemplate(newTemplate);
  };

  const handleUpdateTemplate = (updated: CostTemplate) => {
    const newTemplates = templates.map((t) => (t.id === updated.id ? updated : t));
    handleSaveTemplates(newTemplates);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (id: string) => {
    if (templates.length <= 1) {
      alert('Cannot delete the last template');
      return;
    }
    const newTemplates = templates.filter((t) => t.id !== id);
    handleSaveTemplates(newTemplates);
    if (activeTemplateId === id) {
      setActiveTemplateId(newTemplates[0].id);
    }
  };

  const activeTemplate = templates.find((t) => t.id === activeTemplateId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Template Manager</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Selection */}
        <div className="space-y-2">
          <Label>Active Template</Label>
          <div className="flex gap-2">
            <Select value={activeTemplateId} onValueChange={setActiveTemplateId}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleCreateTemplate}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Active Template Details */}
        {activeTemplate && !editingTemplate && (
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">{activeTemplate.name}</h3>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingTemplate(activeTemplate)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTemplate(activeTemplate.id)}
                  disabled={templates.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Labor Rate:</span>
                <span className="ml-2 font-medium">{activeTemplate.laborRate}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Material:</span>
                <span className="ml-2 font-medium">{activeTemplate.materialMultiplier}x</span>
              </div>
              <div>
                <span className="text-muted-foreground">Installation:</span>
                <span className="ml-2 font-medium">{activeTemplate.installationMultiplier}x</span>
              </div>
              <div>
                <span className="text-muted-foreground">Supports:</span>
                <span className="ml-2 font-medium">{activeTemplate.supportsMultiplier}x</span>
              </div>
            </div>
          </div>
        )}

        {/* Template Editor */}
        {editingTemplate && (
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={editingTemplate.name}
                onChange={(e) =>
                  setEditingTemplate({ ...editingTemplate, name: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Labor Rate (%)</Label>
                <Input
                  type="number"
                  value={editingTemplate.laborRate}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      laborRate: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Material Multiplier</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editingTemplate.materialMultiplier}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      materialMultiplier: parseFloat(e.target.value) || 1,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Installation Multiplier</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editingTemplate.installationMultiplier}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      installationMultiplier: parseFloat(e.target.value) || 1,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Supports Multiplier</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editingTemplate.supportsMultiplier}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      supportsMultiplier: parseFloat(e.target.value) || 1,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                Cancel
              </Button>
              <Button onClick={() => handleUpdateTemplate(editingTemplate)}>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
