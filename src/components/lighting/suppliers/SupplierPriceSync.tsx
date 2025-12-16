import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  RefreshCw, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  Settings,
  Link2,
  Database
} from 'lucide-react';

interface SupplierPriceSyncProps {
  projectId?: string | null;
}

export const SupplierPriceSync = ({ projectId }: SupplierPriceSyncProps) => {
  // This is a placeholder for future API integration
  const integrations = [
    {
      name: 'Beka Schréder',
      status: 'planned',
      description: 'Automatic price and availability updates'
    },
    {
      name: 'LEDVANCE',
      status: 'planned',
      description: 'Product catalog synchronization'
    },
    {
      name: 'Philips Lighting',
      status: 'planned',
      description: 'Real-time stock levels and pricing'
    },
    {
      name: 'Custom API',
      status: 'available',
      description: 'Connect your own supplier API'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Supplier Price Sync
          </CardTitle>
          <Badge variant="secondary">Coming Soon</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Feature Overview */}
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <h3 className="font-medium mb-2">Automatic Price Updates</h3>
          <p className="text-sm text-muted-foreground">
            Connect directly to supplier systems to automatically sync product prices, 
            availability, and lead times. Keep your estimates accurate without manual updates.
          </p>
        </div>

        {/* Planned Features */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-muted/30">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-medium">Price Tracking</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Historical price tracking and alerts for significant changes
              </p>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-primary" />
                <span className="font-medium">Stock Levels</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Real-time availability checking before quote submission
              </p>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="font-medium">Lead Times</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Current lead times to improve project scheduling
              </p>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="h-4 w-4 text-primary" />
                <span className="font-medium">Multi-Supplier</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Compare prices across multiple supplier connections
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Integrations */}
        <div className="space-y-3">
          <h3 className="font-medium">Available Integrations</h3>
          {integrations.map((integration, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
            >
              <div>
                <div className="font-medium text-sm">{integration.name}</div>
                <div className="text-xs text-muted-foreground">{integration.description}</div>
              </div>
              <Badge variant={integration.status === 'available' ? 'default' : 'secondary'}>
                {integration.status === 'available' ? 'Available' : 'Planned'}
              </Badge>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Want to request a specific supplier integration?
            </span>
          </div>
          <Button variant="outline" size="sm" disabled>
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SupplierPriceSync;
