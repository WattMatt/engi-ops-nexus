import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Link2, Share2, Package, Users, BarChart3, Zap, Cpu, Server, Lightbulb, Camera, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { UploadHandoverDocumentDialog } from "@/components/handover/UploadHandoverDocumentDialog";
import { LinkHandoverDocumentDialog } from "@/components/handover/LinkHandoverDocumentDialog";
import { HandoverDocumentsList } from "@/components/handover/HandoverDocumentsList";
import { HandoverTenantsList } from "@/components/handover/HandoverTenantsList";
import { DocumentSearchFilters } from "@/components/handover/DocumentSearchFilters";
import { HandoverDashboard } from "@/components/handover/HandoverDashboard";
import { AsBuiltDrawingsView } from "@/components/handover/AsBuiltDrawingsView";
import { EquipmentDocumentsView } from "@/components/handover/EquipmentDocumentsView";

const HandoverDocuments = () => {
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  // Get current project from localStorage (using same key as TenantTracker)
  const projectId = localStorage.getItem("selectedProjectId") || "";

  // Fetch project details
  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch handover documents count
  const { data: documentsCount } = useQuery({
    queryKey: ["handover-documents-count", projectId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("handover_documents")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!projectId,
  });

  // Fetch tenants count
  const { data: tenantsCount } = useQuery({
    queryKey: ["tenants-count", projectId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("tenants")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!projectId,
  });

  if (!projectId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>No Project Selected</CardTitle>
            <CardDescription>
              Please select a project from the Tenant Tracker to manage handover documents.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Handover Documents</h1>
          <p className="text-muted-foreground mt-2">
            Build your document repository and generate client access links
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Documents in repository
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenantsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Project tenants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project?.name || "Loading..."}</div>
            <p className="text-xs text-muted-foreground">
              Current project
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start"
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start"
              onClick={() => setLinkDialogOpen(true)}
            >
              <Link2 className="h-4 w-4 mr-2" />
              Link Document
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
        <Button variant="outline" onClick={() => setLinkDialogOpen(true)}>
          <Link2 className="h-4 w-4 mr-2" />
          Link from Project
        </Button>
        {isAdmin && (
          <Button 
            variant="secondary" 
            onClick={() => window.open(`/handover-client-management`, '_blank')}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Client Portal Link
          </Button>
        )}
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10">
          <TabsTrigger value="dashboard">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="as-built">
            <Package className="h-4 w-4 mr-2" />
            As Built
          </TabsTrigger>
          <TabsTrigger value="generators">
            <Zap className="h-4 w-4 mr-2" />
            Generators
          </TabsTrigger>
          <TabsTrigger value="transformers">
            <Cpu className="h-4 w-4 mr-2" />
            Transformers
          </TabsTrigger>
          <TabsTrigger value="main-boards">
            <Server className="h-4 w-4 mr-2" />
            Main Boards
          </TabsTrigger>
          <TabsTrigger value="lighting">
            <Lightbulb className="h-4 w-4 mr-2" />
            Lighting
          </TabsTrigger>
          <TabsTrigger value="cctv">
            <Camera className="h-4 w-4 mr-2" />
            CCTV & Access
          </TabsTrigger>
          <TabsTrigger value="lightning">
            <Shield className="h-4 w-4 mr-2" />
            Lightning
          </TabsTrigger>
          <TabsTrigger value="tenants">
            <Users className="h-4 w-4 mr-2" />
            Tenants
          </TabsTrigger>
          <TabsTrigger value="search">
            <Package className="h-4 w-4 mr-2" />
            Search
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <HandoverDashboard 
            projectId={projectId} 
            projectName={project?.name || "Project"}
          />
        </TabsContent>

        <TabsContent value="as-built">
          <AsBuiltDrawingsView projectId={projectId} />
        </TabsContent>

        <TabsContent value="generators">
          <EquipmentDocumentsView 
            projectId={projectId}
            equipmentType="generators"
            equipmentLabel="Generators"
            icon={<Zap className="h-5 w-5" />}
          />
        </TabsContent>

        <TabsContent value="transformers">
          <EquipmentDocumentsView 
            projectId={projectId}
            equipmentType="transformers"
            equipmentLabel="Transformers"
            icon={<Cpu className="h-5 w-5" />}
          />
        </TabsContent>

        <TabsContent value="main-boards">
          <EquipmentDocumentsView 
            projectId={projectId}
            equipmentType="main_boards"
            equipmentLabel="Main Boards"
            icon={<Server className="h-5 w-5" />}
          />
        </TabsContent>

        <TabsContent value="lighting">
          <EquipmentDocumentsView 
            projectId={projectId}
            equipmentType="lighting"
            equipmentLabel="Lighting"
            icon={<Lightbulb className="h-5 w-5" />}
          />
        </TabsContent>

        <TabsContent value="cctv">
          <EquipmentDocumentsView 
            projectId={projectId}
            equipmentType="cctv_access_control"
            equipmentLabel="CCTV and Access Control"
            icon={<Camera className="h-5 w-5" />}
          />
        </TabsContent>

        <TabsContent value="lightning">
          <EquipmentDocumentsView 
            projectId={projectId}
            equipmentType="lightning_protection"
            equipmentLabel="Lightning Protection"
            icon={<Shield className="h-5 w-5" />}
          />
        </TabsContent>

        <TabsContent value="tenants">
          <HandoverTenantsList projectId={projectId} />
        </TabsContent>

        <TabsContent value="search">
          <DocumentSearchFilters projectId={projectId} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <UploadHandoverDocumentDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        projectId={projectId}
      />

      <LinkHandoverDocumentDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        projectId={projectId}
      />
    </div>
  );
};

export default HandoverDocuments;
