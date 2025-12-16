import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PortfolioAnalytics } from './PortfolioAnalytics';
import { BenchmarkingView } from './BenchmarkingView';
import { TrendAnalysis } from './TrendAnalysis';
import { ReportBuilder } from './ReportBuilder';
import { InsightsEngine } from './InsightsEngine';
import { BarChart3, GitCompare, TrendingUp, FileText, Sparkles } from 'lucide-react';

export const AnalyticsTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState('portfolio');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Multi-Project Analytics</h2>
        <p className="text-muted-foreground">
          Portfolio-wide insights, benchmarking, and trend analysis across all projects
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="portfolio" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Portfolio</span>
          </TabsTrigger>
          <TabsTrigger value="benchmarks" className="flex items-center gap-2">
            <GitCompare className="h-4 w-4" />
            <span className="hidden sm:inline">Benchmarks</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Trends</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">AI Insights</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="mt-6">
          <PortfolioAnalytics />
        </TabsContent>

        <TabsContent value="benchmarks" className="mt-6">
          <BenchmarkingView />
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <TrendAnalysis />
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <InsightsEngine />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <ReportBuilder />
        </TabsContent>
      </Tabs>
    </div>
  );
};
