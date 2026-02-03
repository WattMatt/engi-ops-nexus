import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, FolderTree, ChevronRight, ChevronDown, Folder } from "lucide-react";
import { FolderTemplate, countFoldersInTemplate } from "./FolderTemplates";
import { cn } from "@/lib/utils";

interface InitializeFoldersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: FolderTemplate[];
  categoryLabel: string;
  onConfirm: (selectedTemplates: FolderTemplate[]) => void;
  isPending?: boolean;
  existingFolderCount: number;
}

interface TemplateTreeItemProps {
  template: FolderTemplate;
  level: number;
  isSelected: boolean;
  onToggle: (name: string) => void;
}

function TemplateTreeItem({ template, level, isSelected, onToggle }: TemplateTreeItemProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = template.children && template.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer",
          isSelected && "bg-primary/10"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 hover:bg-muted rounded"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}
        
        <Checkbox
          id={`folder-${template.name}`}
          checked={isSelected}
          onCheckedChange={() => onToggle(template.name)}
        />
        
        <Folder className="h-4 w-4 text-amber-500" />
        
        <Label
          htmlFor={`folder-${template.name}`}
          className="text-sm cursor-pointer flex-1"
        >
          {template.name}
        </Label>
        
        {hasChildren && (
          <span className="text-xs text-muted-foreground">
            {template.children!.length} subfolder{template.children!.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      
      {hasChildren && expanded && (
        <div>
          {template.children!.map((child) => (
            <TemplateTreeItem
              key={child.name}
              template={child}
              level={level + 1}
              isSelected={isSelected}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const InitializeFoldersDialog = ({
  open,
  onOpenChange,
  templates,
  categoryLabel,
  onConfirm,
  isPending,
  existingFolderCount,
}: InitializeFoldersDialogProps) => {
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(
    new Set(templates.map((t) => t.name))
  );

  const handleToggle = (name: string) => {
    const newSelected = new Set(selectedFolders);
    if (newSelected.has(name)) {
      newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    setSelectedFolders(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedFolders(new Set(templates.map((t) => t.name)));
  };

  const handleSelectNone = () => {
    setSelectedFolders(new Set());
  };

  const handleSubmit = () => {
    const selected = templates.filter((t) => selectedFolders.has(t.name));
    onConfirm(selected);
  };

  const totalFolders = countFoldersInTemplate(templates);
  const selectedFoldersCount = countFoldersInTemplate(
    templates.filter((t) => selectedFolders.has(t.name))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Initialize Folder Structure
          </DialogTitle>
          <DialogDescription>
            Create a recommended folder structure for {categoryLabel} documents.
            {existingFolderCount > 0 && (
              <span className="block mt-1 text-amber-600">
                Note: {existingFolderCount} folder{existingFolderCount !== 1 ? "s" : ""} already exist. 
                Duplicates will be skipped.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">
              {selectedFoldersCount} of {totalFolders} folders selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                disabled={selectedFolders.size === templates.length}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectNone}
                disabled={selectedFolders.size === 0}
              >
                Select None
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[300px] border rounded-lg p-2">
            {templates.map((template) => (
              <TemplateTreeItem
                key={template.name}
                template={template}
                level={0}
                isSelected={selectedFolders.has(template.name)}
                onToggle={handleToggle}
              />
            ))}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedFolders.size === 0 || isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create {selectedFoldersCount} Folder{selectedFoldersCount !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
