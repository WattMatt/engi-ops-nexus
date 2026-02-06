/**
 * Portal Redirect Page
 * Handles short URL codes (/p/:code) and redirects to full contractor portal URL
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Link2Off, Clock, XCircle, RefreshCw } from "lucide-react";

type ErrorType = 'NOT_FOUND' | 'EXPIRED' | 'INACTIVE' | 'ERROR';

interface ErrorConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const ERROR_CONFIGS: Record<ErrorType, ErrorConfig> = {
  NOT_FOUND: {
    icon: <Link2Off className="h-12 w-12 text-muted-foreground" />,
    title: "Link Not Found",
    description: "This short link doesn't exist or may have been deleted. Please check the URL or request a new link."
  },
  EXPIRED: {
    icon: <Clock className="h-12 w-12 text-amber-500" />,
    title: "Link Expired",
    description: "This access link has expired. Please contact the project team to request a new link."
  },
  INACTIVE: {
    icon: <XCircle className="h-12 w-12 text-destructive" />,
    title: "Access Revoked",
    description: "Your access to this portal has been revoked. Please contact the project team if you need access restored."
  },
  ERROR: {
    icon: <AlertTriangle className="h-12 w-12 text-destructive" />,
    title: "Something Went Wrong",
    description: "We couldn't validate this link. Please try again or contact support."
  }
};

export default function PortalRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorType | null>(null);

  useEffect(() => {
    if (!code) {
      setError('NOT_FOUND');
      setLoading(false);
      return;
    }

    validateAndRedirect(code);
  }, [code]);

  const validateAndRedirect = async (shortCode: string) => {
    try {
      console.log('[PortalRedirect] Validating short code:', shortCode);

      const { data, error: rpcError } = await supabase.rpc('validate_portal_short_code', {
        p_code: shortCode.toUpperCase()
      });

      if (rpcError) {
        console.error('[PortalRedirect] RPC error:', rpcError);
        setError('ERROR');
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        console.log('[PortalRedirect] No token found for code:', shortCode);
        setError('NOT_FOUND');
        setLoading(false);
        return;
      }

      const tokenInfo = data[0];
      console.log('[PortalRedirect] Token info:', { 
        projectId: tokenInfo.project_id, 
        isValid: tokenInfo.is_valid,
        contractorName: tokenInfo.contractor_name
      });

      // Check if token is valid (not expired and active)
      if (!tokenInfo.is_valid) {
        // We don't have expires_at in the response, so we'll just say inactive
        setError('INACTIVE');
        setLoading(false);
        return;
      }

      // Redirect to full contractor portal URL
      const fullUrl = `/contractor-portal?token=${tokenInfo.token}`;
      console.log('[PortalRedirect] Redirecting to:', fullUrl);
      navigate(fullUrl, { replace: true });

    } catch (err) {
      console.error('[PortalRedirect] Validation error:', err);
      setError('ERROR');
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (code) {
      setLoading(true);
      setError(null);
      validateAndRedirect(code);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg font-medium">Validating access...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please wait while we verify your link
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    const config = ERROR_CONFIGS[error];

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">{config.icon}</div>
            <CardTitle>{config.title}</CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={handleRetry} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button 
                variant="default" 
                onClick={() => window.location.href = 'mailto:support@watsonmattheus.com?subject=Portal%20Access%20Issue'}
                className="w-full"
              >
                Request New Link
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Code: {code?.toUpperCase() || 'None'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
