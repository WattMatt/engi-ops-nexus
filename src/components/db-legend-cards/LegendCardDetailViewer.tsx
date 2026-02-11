import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Circuit {
  cb_no: number;
  description: string;
  amp_rating: string;
}

interface Contactor {
  name: string;
  amps: string;
  controlling: string;
  kw: string;
  coil: string;
  poles: string;
}

interface LegendCardDetailViewerProps {
  card: {
    db_name: string;
    address?: string | null;
    coc_no?: string | null;
    section_name?: string | null;
    fed_from?: string | null;
    feeding_breaker_id?: string | null;
    feeding_system_info?: string | null;
    circuits: any[];
    contactors?: any[];
    reviewer_notes?: string | null;
  };
}

export function LegendCardDetailViewer({ card }: LegendCardDetailViewerProps) {
  const circuits: Circuit[] = Array.isArray(card.circuits) ? card.circuits : [];
  const contactors: Contactor[] = Array.isArray((card as any).contactors) ? (card as any).contactors : [];

  return (
    <div className="space-y-4 pt-3 border-t">
      {/* Metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {card.address && (
          <div><span className="text-muted-foreground">Address:</span> <span className="font-medium">{card.address}</span></div>
        )}
        {card.coc_no && (
          <div><span className="text-muted-foreground">COC No:</span> <span className="font-medium">{card.coc_no}</span></div>
        )}
        {card.fed_from && (
          <div><span className="text-muted-foreground">Fed From:</span> <span className="font-medium">{card.fed_from}</span></div>
        )}
        {card.feeding_breaker_id && (
          <div><span className="text-muted-foreground">Feeding Breaker:</span> <span className="font-medium">{card.feeding_breaker_id}</span></div>
        )}
        {card.feeding_system_info && (
          <div className="col-span-2"><span className="text-muted-foreground">System/Cabling:</span> <span className="font-medium">{card.feeding_system_info}</span></div>
        )}
      </div>

      {card.reviewer_notes && (
        <div className="bg-muted/50 rounded p-3 text-xs">
          <span className="font-semibold text-muted-foreground">Reviewer Notes: </span>
          {card.reviewer_notes}
        </div>
      )}

      {/* Circuits */}
      {circuits.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">
            CIRCUITS <Badge variant="secondary" className="ml-2 text-[10px]">{circuits.length}</Badge>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[0, 1].map((col) => {
              const half = Math.ceil(circuits.length / 2);
              const slice = col === 0 ? circuits.slice(0, half) : circuits.slice(half);
              if (slice.length === 0) return null;
              return (
                <Table key={col}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14 text-xs">CB#</TableHead>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="w-16 text-xs text-right">Amps</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slice.map((c, i) => (
                      <TableRow key={i} className="text-xs">
                        <TableCell className="font-medium py-1">{c.cb_no}</TableCell>
                        <TableCell className="py-1">{c.description || "-"}</TableCell>
                        <TableCell className="text-right py-1">{c.amp_rating || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              );
            })}
          </div>
        </div>
      )}

      {/* Contactors */}
      {contactors.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">
            CONTACTORS <Badge variant="secondary" className="ml-2 text-[10px]">{contactors.length}</Badge>
          </h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-14">#</TableHead>
                <TableHead className="text-xs">Amps</TableHead>
                <TableHead className="text-xs">Controlling</TableHead>
                <TableHead className="text-xs">KW</TableHead>
                <TableHead className="text-xs">Coil</TableHead>
                <TableHead className="text-xs">Poles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contactors.map((c, i) => (
                <TableRow key={i} className="text-xs">
                  <TableCell className="font-medium py-1">C{i + 1}</TableCell>
                  <TableCell className="py-1">{c.amps || "-"}</TableCell>
                  <TableCell className="py-1">{c.controlling || "-"}</TableCell>
                  <TableCell className="py-1">{c.kw || "-"}</TableCell>
                  <TableCell className="py-1">{c.coil || "-"}</TableCell>
                  <TableCell className="py-1">{c.poles || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {circuits.length === 0 && contactors.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">No circuit or contactor data available.</p>
      )}
    </div>
  );
}
