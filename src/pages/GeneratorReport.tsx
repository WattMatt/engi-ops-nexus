import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

const GeneratorReport = () => {
  const [costsTab, setCostsTab] = useState<"capital" | "running">("capital");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Generator Report</h1>
        <p className="text-muted-foreground">
          Comprehensive generator analysis and cost recovery planning
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tenant-schedule">Tenant Schedule</TabsTrigger>
          <TabsTrigger value="sizing">Generator Sizing & Consumption</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generator System Overview</CardTitle>
              <CardDescription>Summary of generator specifications and usage</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Overview content will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenant-schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Schedule</CardTitle>
              <CardDescription>Generator allocation and usage by tenant</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Tenant schedule content will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sizing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generator Sizing & Consumption</CardTitle>
              <CardDescription>Capacity planning and consumption analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Sizing and consumption data will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <div className="space-y-4">
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-card rounded-lg border hover:bg-accent transition-colors">
                <h3 className="text-lg font-semibold">Capital Recovery</h3>
                <ChevronDown className="h-5 w-5 transition-transform duration-200" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Capital Recovery Analysis</CardTitle>
                    <CardDescription>Initial investment recovery calculations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Capital recovery data will be displayed here.</p>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-card rounded-lg border hover:bg-accent transition-colors">
                <h3 className="text-lg font-semibold">Running Recovery</h3>
                <ChevronDown className="h-5 w-5 transition-transform duration-200" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Running Recovery Analysis</CardTitle>
                    <CardDescription>Ongoing operational cost recovery</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Running recovery data will be displayed here.</p>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GeneratorReport;
