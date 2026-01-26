import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EngineeringChatbot } from "@/components/ai-tools/EngineeringChatbot";
import { DocumentGenerator } from "@/components/ai-tools/DocumentGenerator";
import { DataAnalyzer } from "@/components/ai-tools/DataAnalyzer";
import { CostPredictor } from "@/components/ai-tools/CostPredictor";
import { KnowledgeBaseManager } from "@/components/ai-tools/KnowledgeBaseManager";
import { Bot, FileText, BarChart3, Sparkles, TrendingUp, Database } from "lucide-react";

const AITools = () => {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">AI Tools</h1>
            <p className="text-muted-foreground">
              Powerful AI-powered tools to enhance your workflow
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="chatbot" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="chatbot" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">Assistant</span>
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Knowledge</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
          <TabsTrigger value="analyzer" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analyzer</span>
          </TabsTrigger>
          <TabsTrigger value="prediction" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Predict</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chatbot" className="space-y-4">
          <EngineeringChatbot />
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-4">
          <KnowledgeBaseManager />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <DocumentGenerator />
        </TabsContent>

        <TabsContent value="analyzer" className="space-y-4">
          <DataAnalyzer />
        </TabsContent>

        <TabsContent value="prediction" className="space-y-4">
          <CostPredictor />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AITools;
