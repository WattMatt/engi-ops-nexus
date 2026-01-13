import React, { useState } from 'react';
import { DocumentationSection } from '@/hooks/useDocumentation';
import { SectionListItem } from './SectionListItem';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionTreeProps {
  sections: DocumentationSection[];
  searchQuery: string;
  statusFilter: string;
  onSectionSelect: (section: DocumentationSection) => void;
}

interface TreeNode {
  section: DocumentationSection;
  children: TreeNode[];
}

function buildTree(sections: DocumentationSection[]): TreeNode[] {
  const sectionMap = new Map<string, DocumentationSection>();
  sections.forEach(s => sectionMap.set(s.section_key, s));
  
  const rootNodes: TreeNode[] = [];
  const childMap = new Map<string, TreeNode[]>();
  
  // First pass: create all nodes and group by parent
  sections.forEach(section => {
    const node: TreeNode = { section, children: [] };
    
    if (!section.parent_section) {
      rootNodes.push(node);
    } else {
      if (!childMap.has(section.parent_section)) {
        childMap.set(section.parent_section, []);
      }
      childMap.get(section.parent_section)!.push(node);
    }
  });
  
  // Second pass: attach children to parents
  function attachChildren(nodes: TreeNode[]) {
    nodes.forEach(node => {
      const children = childMap.get(node.section.section_key) || [];
      node.children = children.sort((a, b) => a.section.display_order - b.section.display_order);
      attachChildren(node.children);
    });
  }
  
  attachChildren(rootNodes);
  
  return rootNodes.sort((a, b) => a.section.display_order - b.section.display_order);
}

function filterTree(
  nodes: TreeNode[], 
  searchQuery: string, 
  statusFilter: string
): TreeNode[] {
  const query = searchQuery.toLowerCase();
  
  function nodeMatches(node: TreeNode): boolean {
    const matchesSearch = !query || 
      node.section.section_name.toLowerCase().includes(query) ||
      node.section.section_key.toLowerCase().includes(query) ||
      (node.section.description?.toLowerCase().includes(query) ?? false);
    
    const matchesStatus = statusFilter === 'all' || node.section.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }
  
  function filterNode(node: TreeNode): TreeNode | null {
    const filteredChildren = node.children
      .map(filterNode)
      .filter((n): n is TreeNode => n !== null);
    
    if (nodeMatches(node) || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }
    
    return null;
  }
  
  return nodes
    .map(filterNode)
    .filter((n): n is TreeNode => n !== null);
}

interface TreeBranchProps {
  node: TreeNode;
  level: number;
  onSectionSelect: (section: DocumentationSection) => void;
  expandedByDefault: boolean;
}

function TreeBranch({ node, level, onSectionSelect, expandedByDefault }: TreeBranchProps) {
  const [isExpanded, setIsExpanded] = useState(expandedByDefault);
  const hasChildren = node.children.length > 0;
  const isParent = !node.section.parent_section;
  
  return (
    <div className="w-full">
      <div 
        className={cn(
          "flex items-center gap-1 w-full",
          isParent && "mt-2 first:mt-0"
        )}
      >
        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-muted rounded shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-6" />
        )}
        
        <SectionListItem 
          section={node.section} 
          isParent={isParent}
          onSelect={() => onSectionSelect(node.section)}
        />
      </div>
      
      {hasChildren && isExpanded && (
        <div className={cn("ml-6 border-l border-border pl-2")}>
          {node.children.map(child => (
            <TreeBranch
              key={child.section.id}
              node={child}
              level={level + 1}
              onSectionSelect={onSectionSelect}
              expandedByDefault={expandedByDefault}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SectionTree({ 
  sections, 
  searchQuery, 
  statusFilter,
  onSectionSelect 
}: SectionTreeProps) {
  const tree = buildTree(sections);
  const filteredTree = filterTree(tree, searchQuery, statusFilter);
  const shouldExpandAll = !!searchQuery || statusFilter !== 'all';
  
  if (filteredTree.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No sections match your filters
      </div>
    );
  }
  
  return (
    <div className="space-y-1">
      {filteredTree.map(node => (
        <TreeBranch
          key={node.section.id}
          node={node}
          level={0}
          onSectionSelect={onSectionSelect}
          expandedByDefault={shouldExpandAll}
        />
      ))}
    </div>
  );
}
