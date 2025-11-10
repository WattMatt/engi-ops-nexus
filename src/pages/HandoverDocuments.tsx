import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Link2, Share2, Package, Users, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UploadHandoverDocumentDialog } from "@/components/handover/UploadHandoverDocumentDialog";
import { LinkHandoverDocumentDialog } from "@/components/handover/LinkHandoverDocumentDialog";
import { GenerateHandoverLinkDialog } from "@/components/handover/GenerateHandoverLinkDialog";
import { HandoverDocumentsList } from "@/components/handover/HandoverDocumentsList";
import { HandoverLinksManager } from "@/components/handover/HandoverLinksManager";
import { HandoverTenantsList } from "@/components/handover/HandoverTenantsList";
import { DocumentSearchFilters } from "@/components/handover/DocumentSearchFilters";
import { HandoverDashboard } from "@/components/handover/HandoverDashboard";

const HandoverDocuments = () => {
  const { toast } = useToast();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [generateLinkDialogOpen, setGenerateLinkDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

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
        <Button variant="secondary" onClick={() => setGenerateLinkDialogOpen(true)}>
          <Share2 className="h-4 w-4 mr-2" />
          Generate Client Link
        </Button>
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList>
          <TabsTrigger value="dashboard">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="search">
            <Package className="h-4 w-4 mr-2" />
            Search Documents
          </TabsTrigger>
          <TabsTrigger value="tenants">
            <Users className="h-4 w-4 mr-2" />
            Tenants
          </TabsTrigger>
          <TabsTrigger value="documents">
            <Package className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <HandoverDashboard 
            projectId={projectId} 
            projectName={project?.name || "Project"}
          />
        </TabsContent>

        <TabsContent value="search">
          <DocumentSearchFilters projectId={projectId} />
        </TabsContent>

        <TabsContent value="tenants">
          <HandoverTenantsList projectId={projectId} />
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          {/* Documents List */}
          <HandoverDocumentsList projectId={projectId} />

          {/* Active Links Manager */}
          <HandoverLinksManager projectId={projectId} />
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

      <GenerateHandoverLinkDialog
        open={generateLinkDialogOpen}
        onOpenChange={setGenerateLinkDialogOpen}
        projectId={projectId}
      />
    </div>
  );
};

export default HandoverDocuments;
