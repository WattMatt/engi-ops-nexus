import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EngineeringChatbot } from "@/components/ai-tools/EngineeringChatbot";
import { DocumentGenerator } from "@/components/ai-tools/DocumentGenerator";
import { DataAnalyzer } from "@/components/ai-tools/DataAnalyzer";
import { Bot, FileText, BarChart3, Sparkles } from "lucide-react";

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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chatbot" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">Engineering Assistant</span>
            <span className="sm:hidden">Chat</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Document Generator</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="analyzer" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Data Analyzer</span>
            <span className="sm:hidden">Analyze</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chatbot" className="space-y-4">
          <EngineeringChatbot />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <DocumentGenerator />
        </TabsContent>

        <TabsContent value="analyzer" className="space-y-4">
          <DataAnalyzer />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AITools;
