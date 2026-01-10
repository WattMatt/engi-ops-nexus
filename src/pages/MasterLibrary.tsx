import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Package, Users, Upload, FolderTree, TrendingUp, ArrowLeft } from "lucide-react";
import { MaterialsLibraryTab } from "@/components/master-library/MaterialsLibraryTab";
import { RetailerRatesTab } from "@/components/master-library/RetailerRatesTab";
import { BOQUploadTab } from "@/components/master-library/BOQUploadTab";
import { MaterialCategoriesTab } from "@/components/master-library/MaterialCategoriesTab";
import { MaterialAnalyticsTab } from "@/components/master-library/MaterialAnalyticsTab";

const MasterLibrary = () => {
  const [activeTab, setActiveTab] = useState("materials");
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/projects")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Master Library</h1>
            <p className="text-muted-foreground mt-1">
              Centralized rate library, materials database, and BOQ analysis
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="materials" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Materials</span>
            </TabsTrigger>
            <TabsTrigger value="retailers" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Retailer Rates</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <FolderTree className="h-4 w-4" />
              <span className="hidden sm:inline">Categories</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">BOQ Upload</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="materials">
            <MaterialsLibraryTab />
          </TabsContent>
          
          <TabsContent value="retailers">
            <RetailerRatesTab />
          </TabsContent>
          
          <TabsContent value="categories">
            <MaterialCategoriesTab />
          </TabsContent>
          
          <TabsContent value="upload">
            <BOQUploadTab />
          </TabsContent>
          
          <TabsContent value="analytics">
            <MaterialAnalyticsTab />
          </TabsContent>
        </Tabs>
      </div>
  );
};

export default MasterLibrary;
