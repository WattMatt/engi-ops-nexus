import * as React from "react";
import { cn } from "@/lib/utils";

export interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  suffix?: string;
  allowDecimals?: boolean;
  maxDecimals?: number;
}

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ className, suffix, allowDecimals = true, maxDecimals = 2, onWheel, onChange, ...props }, ref) => {
    const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
      // Prevent scroll-wheel value changes which are dangerous for engineering data
      e.currentTarget.blur();
      if (onWheel) {
        onWheel(e);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      
      // Allow empty string, minus sign, and valid numbers
      if (value === '' || value === '-') {
        onChange?.(e);
        return;
      }

      // Validate number format
      const regex = allowDecimals 
        ? new RegExp(`^-?\\d*\\.?\\d{0,${maxDecimals}}$`)
        : /^-?\d*$/;
      
      if (regex.test(value)) {
        onChange?.(e);
      }
    };

    return (
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            suffix && "pr-12",
            className
          )}
          ref={ref}
          onWheel={handleWheel}
          onChange={handleChange}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    );
  }
);
NumericInput.displayName = "NumericInput";

export { NumericInput };
