import { ReactNode } from "react";
import { InfoTooltip } from "@/components/ui/rich-tooltip";
import { HelpCircle, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormFieldTooltipProps {
  children: ReactNode;
  label: string;
  description: string;
  required?: boolean;
  example?: string;
  tips?: string[];
  side?: "top" | "bottom" | "left" | "right";
}

/**
 * Tooltip wrapper for form field labels with helpful descriptions
 */
export function FormFieldTooltip({
  children,
  label,
  description,
  required,
  example,
  tips,
  side = "top",
}: FormFieldTooltipProps) {
  const fullDescription = [
    description,
    example ? `\n\nExample: ${example}` : "",
    tips ? `\n\nTips:\n${tips.map((t) => `• ${t}`).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("");

  return (
    <InfoTooltip
      title={label}
      description={fullDescription}
      icon={HelpCircle}
      iconColor="text-muted-foreground"
      side={side}
      delayDuration={500}
    >
      {children}
    </InfoTooltip>
  );
}

interface FormLabelWithHelpProps {
  label: string;
  description: string;
  required?: boolean;
  example?: string;
  htmlFor?: string;
  className?: string;
}

/**
 * Form label with integrated help tooltip icon
 */
export function FormLabelWithHelp({
  label,
  description,
  required,
  example,
  htmlFor,
  className,
}: FormLabelWithHelpProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <InfoTooltip
        title={label}
        description={description}
        icon={HelpCircle}
        iconColor="text-muted-foreground"
        side="top"
        delayDuration={300}
      >
        <button
          type="button"
          className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-muted transition-colors"
        >
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </InfoTooltip>
    </div>
  );
}

export default FormFieldTooltip;
