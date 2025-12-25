import React, { useState } from 'react';
import { Folder, ChevronRight, ChevronDown, FolderOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { FolderNode } from './FolderManagementPanel';

interface MoveToFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  folders: FolderNode[];
  currentFolderId: string | null;
  onMove: () => void;
}

export const MoveToFolderDialog: React.FC<MoveToFolderDialogProps> = ({
  isOpen,
  onClose,
  itemId,
  itemName,
  folders,
  currentFolderId,
  onMove,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isMoving, setIsMoving] = useState(false);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleMove = async () => {
    setIsMoving(true);
    try {
      const { error } = await supabase
        .from('floor_plan_projects')
        .update({ folder_id: selectedFolderId })
        .eq('id', itemId);

      if (error) throw error;

      toast.success(`Moved "${itemName}" successfully`);
      onMove();
      onClose();
    } catch (error) {
      console.error('Error moving item:', error);
      toast.error('Failed to move item');
    } finally {
      setIsMoving(false);
    }
  };

  const renderFolder = (folder: FolderNode, depth: number = 0) => {
    const hasChildren = folder.children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;

    return (
      <div key={folder.id}>
        <div
          style={{ paddingLeft: depth * 16 + 8 }}
          className={`flex items-center gap-2 py-2 px-2 rounded cursor-pointer transition-colors ${
            isSelected ? 'bg-primary/10 border border-primary' : 'hover:bg-accent'
          }`}
          onClick={() => setSelectedFolderId(folder.id)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggleFolder(folder.id);
            }}
            className="p-0.5"
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <div className="w-4" />
            )}
          </button>
          {isSelected ? (
            <FolderOpen className="h-4 w-4 text-primary" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="flex-1 text-sm">{folder.name}</span>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {folder.children.map(child => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move "{itemName}" to folder</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[300px] border rounded-lg">
          <div className="p-2">
            {/* Root level option */}
            <div
              className={`flex items-center gap-2 py-2 px-2 rounded cursor-pointer transition-colors ${
                selectedFolderId === null ? 'bg-primary/10 border border-primary' : 'hover:bg-accent'
              }`}
              onClick={() => setSelectedFolderId(null)}
            >
              <div className="w-4" />
              {selectedFolderId === null ? (
                <FolderOpen className="h-4 w-4 text-primary" />
              ) : (
                <Folder className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="flex-1 text-sm font-medium">Root (No Folder)</span>
            </div>

            {folders.map(folder => renderFolder(folder))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={isMoving}>
            {isMoving ? 'Moving...' : 'Move Here'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
