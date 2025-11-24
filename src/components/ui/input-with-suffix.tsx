import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputWithSuffixProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  suffix: string;
}

const InputWithSuffix = React.forwardRef<HTMLInputElement, InputWithSuffixProps>(
  ({ className, suffix, ...props }, ref) => {
    return (
      <div className="relative">
        <input
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-12 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          {...props}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
          {suffix}
        </span>
      </div>
    );
  }
);
InputWithSuffix.displayName = "InputWithSuffix";

export { InputWithSuffix };
