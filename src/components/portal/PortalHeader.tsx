import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface PortalHeaderProps {
  // Project branding
  projectName: string;
  projectNumber?: string;
  projectLogoUrl?: string | null;
  clientLogoUrl?: string | null;
  consultantLogoUrl?: string | null;
  
  // Portal type
  portalType: 'client' | 'contractor';
  
  // User info (for contractor portal)
  userName?: string;
  userBadge?: string;
  
  // Subtitle for client portal
  subtitle?: string;
  
  // Actions
  onLogout?: () => void;
  showLogout?: boolean;
}

export function PortalHeader({
  projectName,
  projectNumber,
  projectLogoUrl,
  clientLogoUrl,
  consultantLogoUrl,
  portalType,
  userName,
  userBadge,
  subtitle,
  onLogout,
  showLogout = true
}: PortalHeaderProps) {
  // Determine which logo to show as primary based on portal type
  // Client portal: Show client logo first, then project logo
  // Contractor portal: Show project/consultant logo first
  const primaryLogo = portalType === 'client' 
    ? (clientLogoUrl || projectLogoUrl || consultantLogoUrl)
    : (projectLogoUrl || consultantLogoUrl || clientLogoUrl);
  
  const secondaryLogo = portalType === 'client'
    ? (projectLogoUrl || consultantLogoUrl)
    : (clientLogoUrl);

  return (
    <header className="border-b bg-card">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - Logos and project info */}
          <div className="flex items-center gap-4 min-w-0">
            {/* Logo section */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {primaryLogo ? (
                <div className="h-12 w-auto flex items-center">
                  <img 
                    src={primaryLogo} 
                    alt="Logo" 
                    className="h-12 w-auto object-contain max-w-[120px]"
                  />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
              )}
              
              {/* Secondary logo (smaller, shown alongside if both exist) */}
              {primaryLogo && secondaryLogo && primaryLogo !== secondaryLogo && (
                <>
                  <div className="h-8 w-px bg-border hidden sm:block" />
                  <div className="h-10 w-auto hidden sm:flex items-center">
                    <img 
                      src={secondaryLogo} 
                      alt="Partner Logo" 
                      className="h-10 w-auto object-contain max-w-[80px] opacity-80"
                    />
                  </div>
                </>
              )}
            </div>
            
            {/* Project info */}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold truncate">
                {projectName}
              </h1>
              {projectNumber && (
                <p className="text-sm text-muted-foreground">
                  Project #{projectNumber}
                </p>
              )}
              {subtitle && !projectNumber && (
                <p className="text-sm text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right side - User info and actions */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* User info (contractor portal) */}
            {userName && (
              <div className="text-right hidden sm:block">
                <p className="font-medium text-sm">{userName}</p>
                {userBadge && (
                  <Badge variant="outline" className="text-xs">
                    {userBadge}
                  </Badge>
                )}
              </div>
            )}
            
            {/* Logout button */}
            {showLogout && onLogout && (
              <Button variant="outline" size="sm" onClick={onLogout}>
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            )}
          </div>
        </div>
        
        {/* Mobile user info */}
        {userName && (
          <div className="sm:hidden mt-3 pt-3 border-t flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{userName}</p>
            </div>
            {userBadge && (
              <Badge variant="outline" className="text-xs">
                {userBadge}
              </Badge>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
