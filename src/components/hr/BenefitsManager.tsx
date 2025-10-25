import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Gift } from "lucide-react";

export function BenefitsManager() {
  const { data: benefits = [], isLoading } = useQuery({
    queryKey: ["benefits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("benefits")
        .select("*")
        .order("category", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount);
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      health: "bg-red-500",
      retirement: "bg-blue-500",
      insurance: "bg-purple-500",
      wellness: "bg-green-500",
      other: "bg-gray-500",
    };
    return (
      <Badge className={colors[category.toLowerCase()] || "bg-gray-500"}>
        {category}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Benefits Catalog
        </h3>
        <p className="text-sm text-muted-foreground">Available employee benefits and perks</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Benefit Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Employee Cost</TableHead>
            <TableHead>Employer Cost</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {benefits.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No benefits configured
              </TableCell>
            </TableRow>
          ) : (
            benefits.map((benefit: any) => (
              <TableRow key={benefit.id}>
                <TableCell className="font-medium">{benefit.name}</TableCell>
                <TableCell>{getCategoryBadge(benefit.category)}</TableCell>
                <TableCell>{benefit.provider || "-"}</TableCell>
                <TableCell>
                  {benefit.cost_employee ? formatCurrency(benefit.cost_employee) : "-"}
                </TableCell>
                <TableCell>
                  {benefit.cost_employer ? formatCurrency(benefit.cost_employer) : "-"}
                </TableCell>
                <TableCell>
                  {benefit.is_active ? (
                    <Badge className="bg-green-500">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell className="max-w-xs">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {benefit.description || "-"}
                  </p>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
