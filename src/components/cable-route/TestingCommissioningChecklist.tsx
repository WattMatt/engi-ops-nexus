import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TestItem } from './types';
import { useState, useEffect } from 'react';
import { Download, Printer, Upload, X } from 'lucide-react';
import { format } from 'date-fns';

const DEFAULT_TEST_ITEMS: Omit<TestItem, 'status' | 'testValue' | 'notes' | 'photos'>[] = [
  // Visual Inspection
  { id: 'vi-1', category: 'Visual Inspection', regulation: 'BS 7671:641.1', description: 'Connection of conductors' },
  { id: 'vi-2', category: 'Visual Inspection', regulation: 'BS 7671:641.1', description: 'Identification of conductors' },
  { id: 'vi-3', category: 'Visual Inspection', regulation: 'BS 7671:641.1', description: 'Cable routing and support' },
  { id: 'vi-4', category: 'Visual Inspection', regulation: 'BS 7671:641.1', description: 'Cable bending radius' },
  { id: 'vi-5', category: 'Visual Inspection', regulation: 'BS 7671:641.1', description: 'Cable terminations' },
  { id: 'vi-6', category: 'Visual Inspection', regulation: 'BS 7671:641.1', description: 'Warning labels' },

  // Continuity Testing
  { id: 'ct-1', category: 'Continuity Testing', regulation: 'BS 7671:612.2', description: 'Protective conductor continuity' },
  { id: 'ct-2', category: 'Continuity Testing', regulation: 'BS 7671:612.2', description: 'Ring final circuit continuity' },

  // Insulation Resistance
  { id: 'ir-1', category: 'Insulation Resistance', regulation: 'BS 7671:612.3', description: 'Phase to Earth (500V DC)' },
  { id: 'ir-2', category: 'Insulation Resistance', regulation: 'BS 7671:612.3', description: 'Phase to Phase (500V DC)' },

  // Polarity Testing
  { id: 'pt-1', category: 'Polarity Testing', regulation: 'BS 7671:612.6', description: 'Correct polarity at distribution board' },
  { id: 'pt-2', category: 'Polarity Testing', regulation: 'BS 7671:612.6', description: 'Socket outlet polarity' },

  // Earth Fault Loop Impedance
  { id: 'ef-1', category: 'Earth Fault', regulation: 'BS 7671:612.9', description: 'Zs at origin' },
  { id: 'ef-2', category: 'Earth Fault', regulation: 'BS 7671:612.9', description: 'Zs at furthest point' },

  // RCD Testing
  { id: 'rcd-1', category: 'RCD Testing', regulation: 'BS 7671:612.10', description: 'Operating time at 1× IΔn' },
  { id: 'rcd-2', category: 'RCD Testing', regulation: 'BS 7671:612.10', description: 'Operating time at 5× IΔn' },
  { id: 'rcd-3', category: 'RCD Testing', regulation: 'BS 7671:612.10', description: 'Non-trip test at 0.5× IΔn' },

  // Functional Testing
  { id: 'ft-1', category: 'Functional Testing', regulation: 'BS 7671:612.13', description: 'Switchgear operation' },
  { id: 'ft-2', category: 'Functional Testing', regulation: 'BS 7671:612.13', description: 'Protective devices operation' },
];

export function TestingCommissioningChecklist() {
  const [testItems, setTestItems] = useState<TestItem[]>([]);
  const [projectInfo, setProjectInfo] = useState({
    projectName: '',
    location: '',
    inspector: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    signedOff: false,
    signOffName: '',
    signOffDate: '',
  });

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem('cable-route-testing-checklist');
    if (saved) {
      const data = JSON.parse(saved);
      setTestItems(data.testItems);
      setProjectInfo(data.projectInfo);
    } else {
      setTestItems(
        DEFAULT_TEST_ITEMS.map((item) => ({ ...item, status: 'pending', photos: [] }))
      );
    }
  }, []);

  useEffect(() => {
    // Auto-save
    const timer = setTimeout(() => {
      localStorage.setItem(
        'cable-route-testing-checklist',
        JSON.stringify({ testItems, projectInfo })
      );
    }, 1000);
    return () => clearTimeout(timer);
  }, [testItems, projectInfo]);

  const handleStatusChange = (id: string, status: TestItem['status']) => {
    setTestItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
  };

  const handleValueChange = (id: string, testValue: string) => {
    setTestItems((prev) => prev.map((item) => (item.id === id ? { ...item, testValue } : item)));
  };

  const handleNotesChange = (id: string, notes: string) => {
    setTestItems((prev) => prev.map((item) => (item.id === id ? { ...item, notes } : item)));
  };

  const handlePhotoUpload = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setTestItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, photos: [...(item.photos || []), dataUrl] } : item
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const handleDeletePhoto = (itemId: string, photoIndex: number) => {
    setTestItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, photos: item.photos?.filter((_, i) => i !== photoIndex) }
          : item
      )
    );
  };

  const handleExportJSON = () => {
    const data = { testItems, projectInfo };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `testing-checklist-${projectInfo.projectName || 'export'}.json`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const stats = {
    completed: testItems.filter((i) => i.status !== 'pending').length,
    passed: testItems.filter((i) => i.status === 'pass').length,
    failed: testItems.filter((i) => i.status === 'fail').length,
    na: testItems.filter((i) => i.status === 'na').length,
  };

  const categories = Array.from(new Set(testItems.map((i) => i.category)));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Testing & Commissioning Checklist</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportJSON}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Project Information */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
          <div className="space-y-2">
            <Label>Project Name</Label>
            <Input
              value={projectInfo.projectName}
              onChange={(e) =>
                setProjectInfo({ ...projectInfo, projectName: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              value={projectInfo.location}
              onChange={(e) => setProjectInfo({ ...projectInfo, location: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Inspector</Label>
            <Input
              value={projectInfo.inspector}
              onChange={(e) => setProjectInfo({ ...projectInfo, inspector: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={projectInfo.date}
              onChange={(e) => setProjectInfo({ ...projectInfo, date: e.target.value })}
            />
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-500/10 rounded-lg">
            <div className="text-2xl font-bold text-blue-500">{stats.completed}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
          <div className="text-center p-3 bg-green-500/10 rounded-lg">
            <div className="text-2xl font-bold text-green-500">{stats.passed}</div>
            <div className="text-sm text-muted-foreground">Passed</div>
          </div>
          <div className="text-center p-3 bg-destructive/10 rounded-lg">
            <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </div>
          <div className="text-center p-3 bg-gray-500/10 rounded-lg">
            <div className="text-2xl font-bold text-gray-500">{stats.na}</div>
            <div className="text-sm text-muted-foreground">N/A</div>
          </div>
        </div>

        {/* Test Items */}
        <ScrollArea className="h-[500px]">
          <div className="space-y-6">
            {categories.map((category) => (
              <div key={category}>
                <h3 className="font-semibold text-lg mb-3">{category}</h3>
                <div className="space-y-4">
                  {testItems
                    .filter((item) => item.category === category)
                    .map((item) => (
                      <div key={item.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{item.description}</div>
                            <div className="text-xs text-muted-foreground">{item.regulation}</div>
                          </div>
                          <Select
                            value={item.status}
                            onValueChange={(value) =>
                              handleStatusChange(item.id, value as TestItem['status'])
                            }
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="pass">Pass</SelectItem>
                              <SelectItem value="fail">Fail</SelectItem>
                              <SelectItem value="na">N/A</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Test Value</Label>
                            <Input
                              value={item.testValue || ''}
                              onChange={(e) => handleValueChange(item.id, e.target.value)}
                              placeholder="e.g., 2.5 MΩ"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Photos</Label>
                            <div className="flex gap-2">
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handlePhotoUpload(item.id, file);
                                }}
                                className="hidden"
                                id={`photo-${item.id}`}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => document.getElementById(`photo-${item.id}`)?.click()}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Upload
                              </Button>
                              {item.photos && item.photos.length > 0 && (
                                <Badge variant="secondary">{item.photos.length} photos</Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {item.photos && item.photos.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {item.photos.map((photo, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={photo}
                                  alt={`Test ${item.id} photo ${index + 1}`}
                                  className="w-20 h-20 object-cover rounded border"
                                />
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleDeletePhoto(item.id, index)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>Notes</Label>
                          <Textarea
                            value={item.notes || ''}
                            onChange={(e) => handleNotesChange(item.id, e.target.value)}
                            placeholder="Add any notes or observations..."
                            rows={2}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Sign-off */}
        <div className="p-4 border-2 border-primary rounded-lg space-y-3">
          <h3 className="font-semibold">Completion Sign-off</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Inspector Name</Label>
              <Input
                value={projectInfo.signOffName}
                onChange={(e) =>
                  setProjectInfo({ ...projectInfo, signOffName: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Sign-off Date</Label>
              <Input
                type="date"
                value={projectInfo.signOffDate}
                onChange={(e) =>
                  setProjectInfo({ ...projectInfo, signOffDate: e.target.value })
                }
              />
            </div>
          </div>
          <Button
            onClick={() =>
              setProjectInfo({ ...projectInfo, signedOff: !projectInfo.signedOff })
            }
            variant={projectInfo.signedOff ? 'default' : 'outline'}
            className="w-full"
          >
            {projectInfo.signedOff ? '✓ Signed Off' : 'Sign Off Checklist'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
