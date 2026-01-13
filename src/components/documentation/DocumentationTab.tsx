import React, { useState } from 'react';
import { useDocumentation, DocumentationSection } from '@/hooks/useDocumentation';
import { SectionTree } from './SectionTree';
import { SectionDetail } from './SectionDetail';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Clock, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function DocumentationTab() {
  const { data: sections, isLoading } = useDocumentation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSection, setSelectedSection] = useState<DocumentationSection | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-40" />
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const stats = sections?.reduce(
    (acc, section) => {
      acc[section.status]++;
      acc.total++;
      return acc;
    },
    { pending: 0, in_progress: 0, documented: 0, total: 0 }
  ) || { pending: 0, in_progress: 0, documented: 0, total: 0 };

  if (selectedSection) {
    return (
      <SectionDetail 
        section={selectedSection} 
        onBack={() => setSelectedSection(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sections</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Documented</p>
                <p className="text-2xl font-bold text-green-600">{stats.documented}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.in_progress}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-muted-foreground">{stats.pending}</p>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {Math.round((stats.documented / stats.total) * 100)}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Application Sections</CardTitle>
          <CardDescription>
            Click a section to view details, or copy the specification prompt to generate documentation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="documented">Documented</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Section Tree */}
          {sections && (
            <SectionTree
              sections={sections}
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              onSectionSelect={setSelectedSection}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
