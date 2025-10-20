import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight, Shield, Users, FileCheck } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate("/projects");
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-hero)' }}>
      <div className="container mx-auto px-6 py-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">WM Consulting</h1>
              <p className="text-sm text-white/80">Engineering Excellence</p>
            </div>
          </div>
          <Button 
            variant="secondary" 
            onClick={() => navigate("/auth")}
            className="bg-white text-primary hover:bg-white/90"
          >
            Login
          </Button>
        </div>

        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Engineering Operations
            <br />
            <span className="text-accent">Simplified</span>
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Comprehensive platform for electrical engineering teams to manage projects, 
            track progress, and ensure compliance across all operations
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate("/auth")}
            className="bg-white text-primary hover:bg-white/90 shadow-xl"
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="p-3 rounded-lg bg-white/10 w-fit mb-4">
              <FileCheck className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Project Management
            </h3>
            <p className="text-white/80">
              Track reports, budgets, site diaries, and equipment orders in one place
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="p-3 rounded-lg bg-white/10 w-fit mb-4">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              SANS Compliance
            </h3>
            <p className="text-white/80">
              Built-in compliance tracking for SANS 10142-1 and regulatory requirements
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="p-3 rounded-lg bg-white/10 w-fit mb-4">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Team Collaboration
            </h3>
            <p className="text-white/80">
              Role-based access, task assignment, and real-time team updates
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
