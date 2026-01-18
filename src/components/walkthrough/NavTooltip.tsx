import { ReactNode } from "react";
import { InfoTooltip } from "@/components/ui/rich-tooltip";
import { LucideIcon } from "lucide-react";

interface NavTooltipProps {
  children: ReactNode;
  title: string;
  description: string;
  icon?: LucideIcon;
  iconColor?: string;
  shortcut?: string;
  learnMoreUrl?: string;
  side?: "top" | "bottom" | "left" | "right";
}

/**
 * Pre-configured tooltip for navigation buttons and key UI elements
 */
export function NavTooltip({
  children,
  title,
  description,
  icon,
  iconColor,
  shortcut,
  learnMoreUrl,
  side = "bottom",
}: NavTooltipProps) {
  const shortcuts = shortcut
    ? shortcut.split("+").map((key) => ({ key: key.trim() }))
    : undefined;

  return (
    <InfoTooltip
      title={title}
      description={description}
      icon={icon}
      iconColor={iconColor}
      shortcuts={shortcuts}
      learnMoreUrl={learnMoreUrl}
      side={side}
      delayDuration={400}
    >
      {children}
    </InfoTooltip>
  );
}

export default NavTooltip;
