import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { PackageCheck, PackagePlus, AlertTriangle } from "lucide-react";

interface DependencyReportProps {
  required: string[];
  missing: string[];
}

export function DependencyReport({ required, missing }: DependencyReportProps) {
  const installed = required.filter(dep => !missing.includes(dep));
  
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
          <PackageCheck className="h-4 w-4" />
          Dependencies Overview
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 border rounded-lg">
            <div className="text-2xl font-bold text-green-500">{installed.length}</div>
            <div className="text-xs text-muted-foreground">Already Installed</div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-2xl font-bold text-orange-500">{missing.length}</div>
            <div className="text-xs text-muted-foreground">Need to Install</div>
          </div>
        </div>
      </div>

      {missing.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Installation Required</p>
              <p className="text-sm">
                The following packages need to be installed. Copy and run this command:
              </p>
              <div className="bg-muted p-2 rounded text-xs font-mono overflow-x-auto">
                npm install {missing.join(' ')}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div>
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <PackagePlus className="h-4 w-4" />
          Missing Packages ({missing.length})
        </h4>
        <ScrollArea className="h-[150px] border rounded-lg p-2">
          <div className="space-y-1">
            {missing.length === 0 ? (
              <p className="text-sm text-muted-foreground">All dependencies are installed!</p>
            ) : (
              missing.map((dep) => (
                <div key={dep} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="font-mono text-xs">
                    {dep}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2">
          Installed Dependencies ({installed.length})
        </h4>
        <ScrollArea className="h-[150px] border rounded-lg p-2">
          <div className="flex flex-wrap gap-2">
            {installed.map((dep) => (
              <Badge key={dep} variant="secondary" className="font-mono text-xs">
                {dep}
              </Badge>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
