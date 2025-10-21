interface LineItemRowProps {
  item: any;
  onUpdate: () => void;
}

export const LineItemRow = ({ item }: LineItemRowProps) => {
  const variance = Number(item.anticipated_final) - Number(item.original_budget);

  return (
    <div className="grid grid-cols-6 gap-2 text-sm py-2 border-b hover:bg-muted/50">
      <div className="font-medium">{item.code}</div>
      <div>{item.description}</div>
      <div className="text-right">
        R{Number(item.original_budget).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
      </div>
      <div className="text-right">
        R{Number(item.previous_report).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
      </div>
      <div className="text-right font-medium">
        R{Number(item.anticipated_final).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
      </div>
      <div className={`text-right font-medium ${variance < 0 ? "text-green-600" : "text-red-600"}`}>
        {variance < 0 ? "-" : "+"}R
        {Math.abs(variance).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
      </div>
    </div>
  );
};
