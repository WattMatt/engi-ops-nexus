import { useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, ChevronDown, File, Folder } from "lucide-react";

interface FileNode {
  path: string;
  type: 'file' | 'dir';
  size?: number;
}

interface FileTreeViewProps {
  files: FileNode[];
  selectedFiles: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children: TreeNode[];
  size?: number;
}

function buildTree(files: FileNode[]): TreeNode[] {
  const root: TreeNode[] = [];
  
  files.forEach(file => {
    const parts = file.path.split('/');
    let currentLevel = root;
    
    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      const existingNode = currentLevel.find(node => node.name === part);
      
      if (existingNode) {
        if (!isFile) {
          currentLevel = existingNode.children;
        }
      } else {
        const newNode: TreeNode = {
          name: part,
          path: parts.slice(0, index + 1).join('/'),
          type: isFile ? 'file' : 'dir',
          children: [],
          size: isFile ? file.size : undefined,
        };
        
        currentLevel.push(newNode);
        if (!isFile) {
          currentLevel = newNode.children;
        }
      }
    });
  });
  
  return root;
}

function TreeNodeComponent({ 
  node, 
  level, 
  selectedFiles, 
  onToggle 
}: { 
  node: TreeNode; 
  level: number; 
  selectedFiles: Set<string>; 
  onToggle: (path: string, isFile: boolean) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  
  const isChecked = node.type === 'file' 
    ? selectedFiles.has(node.path)
    : node.children.every(child => 
        child.type === 'file' ? selectedFiles.has(child.path) : true
      );
  
  const isIndeterminate = node.type === 'dir' && 
    !isChecked && 
    node.children.some(child => 
      child.type === 'file' ? selectedFiles.has(child.path) : false
    );

  return (
    <div>
      <div 
        className="flex items-center gap-2 py-1 px-2 hover:bg-accent/50 rounded cursor-pointer"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {node.type === 'dir' && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0 h-4 w-4"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        )}
        {node.type === 'file' && <div className="w-4" />}
        
        <Checkbox 
          checked={isChecked}
          onCheckedChange={() => onToggle(node.path, node.type === 'file')}
          className={isIndeterminate ? 'data-[state=checked]:bg-primary/50' : ''}
        />
        
        {node.type === 'dir' ? (
          <Folder className="h-4 w-4 text-blue-400" />
        ) : (
          <File className="h-4 w-4 text-gray-400" />
        )}
        
        <span className="text-sm flex-1">{node.name}</span>
        
        {node.type === 'file' && node.size && (
          <span className="text-xs text-muted-foreground">
            {(node.size / 1024).toFixed(1)} KB
          </span>
        )}
      </div>
      
      {node.type === 'dir' && isExpanded && node.children.map((child) => (
        <TreeNodeComponent
          key={child.path}
          node={child}
          level={level + 1}
          selectedFiles={selectedFiles}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

export function FileTreeView({ files, selectedFiles, onSelectionChange }: FileTreeViewProps) {
  const tree = useMemo(() => buildTree(files), [files]);
  
  const handleToggle = (path: string, isFile: boolean) => {
    const newSelected = new Set(selectedFiles);
    
    if (isFile) {
      if (newSelected.has(path)) {
        newSelected.delete(path);
      } else {
        newSelected.add(path);
      }
    } else {
      // Toggle all files in directory
      const dirFiles = files.filter(f => f.path.startsWith(path + '/'));
      const allSelected = dirFiles.every(f => newSelected.has(f.path));
      
      dirFiles.forEach(f => {
        if (allSelected) {
          newSelected.delete(f.path);
        } else {
          newSelected.add(f.path);
        }
      });
    }
    
    onSelectionChange(newSelected);
  };
  
  const handleSelectAll = () => {
    const allFiles = files.map(f => f.path);
    onSelectionChange(new Set(allFiles));
  };
  
  const handleDeselectAll = () => {
    onSelectionChange(new Set());
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between p-2 border-b">
        <span className="text-sm font-medium">
          {selectedFiles.size} / {files.length} files selected
        </span>
        <div className="flex gap-2">
          <button 
            onClick={handleSelectAll}
            className="text-xs text-primary hover:underline"
          >
            Select All
          </button>
          <button 
            onClick={handleDeselectAll}
            className="text-xs text-muted-foreground hover:underline"
          >
            Deselect All
          </button>
        </div>
      </div>
      
      <ScrollArea className="h-[400px]">
        <div className="space-y-1">
          {tree.map((node) => (
            <TreeNodeComponent
              key={node.path}
              node={node}
              level={0}
              selectedFiles={selectedFiles}
              onToggle={handleToggle}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
