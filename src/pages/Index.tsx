import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight, Shield, Users, FileCheck } from "lucide-react";
import { StoicQuote } from "@/components/StoicQuote";
import { FloatingShapes } from "@/components/landing/FloatingShapes";
import { FeatureCard } from "@/components/landing/FeatureCard";
import { StatsSection } from "@/components/landing/StatsSection";

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
    <div className="min-h-screen relative overflow-y-auto" style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #064e3b 100%)' }}>
      <FloatingShapes />
      
      <div className="container mx-auto px-6 py-16 relative z-10">
        {/* Header */}
        <div 
          className="flex items-center justify-between mb-16 opacity-0 animate-fade-in"
          style={{ animationFillMode: 'forwards' }}
        >
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm group-hover:bg-white/20 transition-all duration-300">
              <Building2 className="h-8 w-8 text-white group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">WM Consulting</h1>
              <p className="text-sm text-white/80">Engineering Excellence</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate("/auth")}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300"
            >
              Login
            </Button>
            <Button 
              onClick={() => navigate("/admin/projects")}
              className="bg-white text-primary hover:bg-white/90 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Admin Portal
            </Button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-20">
          <h2 
            className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight opacity-0 animate-fade-in-up"
            style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
          >
            Engineering Operations
            <br />
            <span 
              className="text-accent relative inline-block"
              style={{
                background: 'linear-gradient(90deg, hsl(var(--accent)), hsl(var(--primary-foreground)), hsl(var(--accent)))',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'shimmer 3s linear infinite',
              }}
            >
              Simplified
            </span>
          </h2>
          <p 
            className="text-xl text-white/90 mb-8 max-w-2xl mx-auto opacity-0 animate-fade-in"
            style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}
          >
            Comprehensive platform for electrical engineering teams to manage projects, 
            track progress, and ensure compliance across all operations
          </p>
          <div 
            className="opacity-0 animate-fade-in"
            style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}
          >
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")}
              className="bg-white text-primary hover:bg-white/90 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 group"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mb-20">
          <StatsSection />
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          <FeatureCard 
            icon={FileCheck}
            title="Project Management"
            description="Track reports, budgets, site diaries, and equipment orders in one place"
            delay={500}
          />
          <FeatureCard 
            icon={Shield}
            title="SANS Compliance"
            description="Built-in compliance tracking for SANS 10142-1 and regulatory requirements"
            delay={600}
          />
          <FeatureCard 
            icon={Users}
            title="Team Collaboration"
            description="Role-based access, task assignment, and real-time team updates"
            delay={700}
          />
        </div>

        {/* Daily Stoic Quote */}
        <div 
          className="opacity-0 animate-fade-in"
          style={{ animationDelay: '800ms', animationFillMode: 'forwards' }}
        >
          <p className="text-white/60 text-sm text-center mb-4 uppercase tracking-wider">
            Daily Wisdom
          </p>
          <StoicQuote />
        </div>
      </div>
    </div>
  );
};

export default Index;
