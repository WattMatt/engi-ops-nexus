import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Share2, Package, Users, BarChart3, Zap, Cpu, Server, Lightbulb, Camera, Shield, FileText, FileCheck, BookOpen, ClipboardCheck, Award, BadgeCheck, ToggleRight, Unplug, Gauge, Cable, Siren, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { UploadHandoverDocumentDialog } from "@/components/handover/UploadHandoverDocumentDialog";
import { HandoverDocumentsList } from "@/components/handover/HandoverDocumentsList";
import { HandoverTenantsList } from "@/components/handover/HandoverTenantsList";
import { DocumentSearchFilters } from "@/components/handover/DocumentSearchFilters";
import { HandoverDashboard } from "@/components/handover/HandoverDashboard";
import { AsBuiltDrawingsView } from "@/components/handover/AsBuiltDrawingsView";
import { EquipmentDocumentsView } from "@/components/handover/EquipmentDocumentsView";
import { GeneralDocumentsView } from "@/components/handover/GeneralDocumentsView";
import { FolderBrowser } from "@/components/handover/folders";
import { SANS10142ComplianceChecklist } from "@/components/handover/SANS10142ComplianceChecklist";

const HandoverDocuments = () => {
  const { toast } = useToast();
  const { isAdmin } = useUserRole();

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
      <div className="container mx-auto px-6 py-6">
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
    <div className="container mx-auto px-6 py-6 space-y-6">
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
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        {isAdmin && (
          <Button 
            variant="secondary" 
            onClick={() => window.location.href = '/handover-client-management'}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Client Portal Link
          </Button>
        )}
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
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
          {/* Phase 1: New electrical equipment tabs */}
          <TabsTrigger value="switchgear">
            <ToggleRight className="h-4 w-4 mr-2" />
            Switchgear
          </TabsTrigger>
          <TabsTrigger value="earthing">
            <Unplug className="h-4 w-4 mr-2" />
            Earthing
          </TabsTrigger>
          <TabsTrigger value="surge">
            <Shield className="h-4 w-4 mr-2" />
            Surge
          </TabsTrigger>
          <TabsTrigger value="metering">
            <Gauge className="h-4 w-4 mr-2" />
            Metering
          </TabsTrigger>
          <TabsTrigger value="cables">
            <Cable className="h-4 w-4 mr-2" />
            Cables
          </TabsTrigger>
          <TabsTrigger value="emergency">
            <Siren className="h-4 w-4 mr-2" />
            Emergency
          </TabsTrigger>
          <TabsTrigger value="specifications">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Specifications
          </TabsTrigger>
          <TabsTrigger value="test-certificates">
            <FileCheck className="h-4 w-4 mr-2" />
            Test Certificates
          </TabsTrigger>
          <TabsTrigger value="warranties">
            <Award className="h-4 w-4 mr-2" />
            Warranties
          </TabsTrigger>
          <TabsTrigger value="manuals">
            <BookOpen className="h-4 w-4 mr-2" />
            Manuals
          </TabsTrigger>
          <TabsTrigger value="commissioning">
            <BadgeCheck className="h-4 w-4 mr-2" />
            Commissioning
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <FileCheck className="h-4 w-4 mr-2" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="sans10142">
            <ShieldCheck className="h-4 w-4 mr-2" />
            SANS 10142
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
          <FolderBrowser 
            projectId={projectId}
            documentCategory="generators"
            categoryLabel="Generators"
            icon={<Zap className="h-5 w-5" />}
          />
        </TabsContent>

        <TabsContent value="transformers">
          <FolderBrowser 
            projectId={projectId}
            documentCategory="transformers"
            categoryLabel="Transformers"
            icon={<Cpu className="h-5 w-5" />}
          />
        </TabsContent>

        <TabsContent value="main-boards">
          <FolderBrowser 
            projectId={projectId}
            documentCategory="main_boards"
            categoryLabel="Main Boards"
            icon={<Server className="h-5 w-5" />}
          />
        </TabsContent>

        <TabsContent value="lighting">
          <FolderBrowser 
            projectId={projectId}
            documentCategory="lighting"
            categoryLabel="Lighting"
            icon={<Lightbulb className="h-5 w-5" />}
          />
        </TabsContent>

        <TabsContent value="cctv">
          <FolderBrowser 
            projectId={projectId}
            documentCategory="cctv_access_control"
            categoryLabel="CCTV and Access Control"
            icon={<Camera className="h-5 w-5" />}
          />
        </TabsContent>

        <TabsContent value="lightning">
          <FolderBrowser 
            projectId={projectId}
            documentCategory="lightning_protection"
            categoryLabel="Lightning Protection"
            icon={<Shield className="h-5 w-5" />}
          />
        </TabsContent>

        {/* Phase 1: New electrical equipment tabs content */}
        <TabsContent value="switchgear">
          <FolderBrowser 
            projectId={projectId}
            documentCategory="switchgear"
            categoryLabel="Switchgear"
            icon={<ToggleRight className="h-5 w-5" />}
          />
        </TabsContent>

        <TabsContent value="earthing">
          <FolderBrowser 
            projectId={projectId}
            documentCategory="earthing_bonding"
            categoryLabel="Earthing & Bonding"
            icon={<Unplug className="h-5 w-5" />}
          />
        </TabsContent>

        <TabsContent value="surge">
          <FolderBrowser 
            projectId={projectId}
            documentCategory="surge_protection"
            categoryLabel="Surge Protection"
            icon={<Shield className="h-5 w-5" />}
          />
        </TabsContent>

        <TabsContent value="metering">
          <FolderBrowser 
            projectId={projectId}
            documentCategory="metering"
            categoryLabel="Metering"
            icon={<Gauge className="h-5 w-5" />}
          />
        </TabsContent>

        <TabsContent value="cables">
          <FolderBrowser 
            projectId={projectId}
            documentCategory="cable_installation"
            categoryLabel="Cable Installation"
            icon={<Cable className="h-5 w-5" />}
          />
        </TabsContent>

        <TabsContent value="emergency">
          <FolderBrowser 
            projectId={projectId}
            documentCategory="emergency_systems"
            categoryLabel="Emergency Systems"
            icon={<Siren className="h-5 w-5" />}
          />
        </TabsContent>

        <TabsContent value="specifications">
          <FolderBrowser 
            projectId={projectId}
            documentCategory="specifications"
            categoryLabel="Specifications"
            icon={<ClipboardCheck className="h-5 w-5" />}
          />
        </TabsContent>

        <TabsContent value="test-certificates">
          <FolderBrowser 
            projectId={projectId}
            documentCategory="test_certificates"
            categoryLabel="Test Certificates"
            icon={<FileCheck className="h-5 w-5" />}
          />
        </TabsContent>

        <TabsContent value="warranties">
          <FolderBrowser 
            projectId={projectId}
            documentCategory="warranties"
            categoryLabel="Warranties"
            icon={<Award className="h-5 w-5" />}
          />
        </TabsContent>

        <TabsContent value="manuals">
          <FolderBrowser 
            projectId={projectId}
            documentCategory="manuals"
            categoryLabel="Manuals and Instructions"
            icon={<BookOpen className="h-5 w-5" />}
          />
        </TabsContent>

        <TabsContent value="commissioning">
          <FolderBrowser 
            projectId={projectId}
            documentCategory="commissioning_docs"
            categoryLabel="Commissioning Documents"
            icon={<BadgeCheck className="h-5 w-5" />}
          />
        </TabsContent>

        <TabsContent value="compliance">
          <FolderBrowser 
            projectId={projectId}
            documentCategory="compliance_certs"
            categoryLabel="Compliance Certificates"
            icon={<FileCheck className="h-5 w-5" />}
          />
        </TabsContent>

        <TabsContent value="sans10142">
          <SANS10142ComplianceChecklist projectId={projectId} />
        </TabsContent>

        <TabsContent value="tenants">
          <HandoverTenantsList projectId={projectId} />
        </TabsContent>

        <TabsContent value="search">
          <DocumentSearchFilters projectId={projectId} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
    </div>
  );
};

export default HandoverDocuments;
