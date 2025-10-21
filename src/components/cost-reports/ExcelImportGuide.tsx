import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

export const ExcelImportGuide = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Excel Import Format Guide</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Required Column Structure:</h3>
            <div className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left p-2 border-r">CODE</th>
                    <th className="text-left p-2 border-r">DESCRIPTION</th>
                    <th className="text-left p-2 border-r">ORIGINAL BUDGET</th>
                    <th className="text-left p-2 border-r">PREVIOUS REPORT</th>
                    <th className="text-left p-2">ANTICIPATED FINAL</th>
                  </tr>
                </thead>
              </table>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Category vs Line Item Codes:</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <strong>Categories:</strong> Single letter codes (A, B, C, D, etc.)
                <div className="bg-muted p-2 rounded-md font-mono text-xs mt-1">
                  A | ELECTRICAL CONNECTION | 7519711.00 | 7519711.00 | 7533561.00
                </div>
              </li>
              <li>
                <strong>Line Items:</strong> Letter + number codes (A1, A2, B1, B2, etc.)
                <div className="bg-muted p-2 rounded-md font-mono text-xs mt-1">
                  A1 | Bulk Contributions | 5477230.00 | 5477230.00 | 5477230.00
                </div>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Example Structure:</h3>
            <div className="bg-muted p-4 rounded-md font-mono text-xs space-y-1 overflow-x-auto">
              <div>A | ELECTRICAL CONNECTION | 7519711 | 7519711 | 7533561</div>
              <div>A1 | Bulk Contributions | 5477230 | 5477230 | 5477230</div>
              <div>A2 | Electrical Connection | 1402541 | 1402541 | 1402541</div>
              <div>A3 | Relocation of overhead line | 639940 | 639940 | 653790</div>
              <div className="h-2"></div>
              <div>B | ELECTRICAL INSTALLATION | 48256650 | 48256650 | 47699998</div>
              <div>B1 | ELECTRICAL BUDGET | 48256650 | 48256650 | 0</div>
              <div>B2 | ELECTRICAL TENDER | 0 | 0 | 47699998</div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Important Notes:</h3>
            <ul className="space-y-1 text-sm list-disc list-inside">
              <li>Categories must be defined before their line items</li>
              <li>Line items are automatically linked to categories by their letter prefix</li>
              <li>All monetary values should be numeric (no currency symbols)</li>
              <li>Empty rows are ignored during import</li>
              <li>First row should contain column headers (they will be skipped)</li>
            </ul>
          </div>

          <div className="border-l-4 border-primary pl-4">
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> Use your existing Excel templates! The import will
              automatically detect categories (A, B, C) and line items (A1, A2, B1) based
              on the code format.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
