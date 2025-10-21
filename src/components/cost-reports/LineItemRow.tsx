interface LineItemRowProps {
  item: any;
  onUpdate: () => void;
  isEven?: boolean;
}

export const LineItemRow = ({ item, isEven }: LineItemRowProps) => {
  const varianceCurrent = Number(item.anticipated_final) - Number(item.previous_report);
  const varianceOriginal = Number(item.anticipated_final) - Number(item.original_budget);

  return (
    <div className={`grid grid-cols-12 gap-2 text-sm py-2 px-4 border-b ${isEven ? 'bg-background' : 'bg-muted/20'} hover:bg-muted/40 transition-colors`}>
      <div className="col-span-1 font-medium pl-4">{item.code}</div>
      <div className="col-span-2">{item.description}</div>
      <div className="col-span-2 text-right">
        R{Number(item.original_budget).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
      </div>
      <div className="col-span-2 text-right">
        R{Number(item.previous_report).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
      </div>
      <div className="col-span-2 text-right font-medium">
        R{Number(item.anticipated_final).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
      </div>
      <div className="col-span-2 text-right">
        {varianceCurrent < 0 ? "-" : "+"}R
        {Math.abs(varianceCurrent).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
      </div>
      <div className="col-span-1 text-right">
        {varianceOriginal < 0 ? "-" : "+"}R
        {Math.abs(varianceOriginal).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
      </div>
    </div>
  );
};
