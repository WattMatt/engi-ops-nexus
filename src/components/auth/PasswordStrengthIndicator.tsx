import { Check, X } from "lucide-react";
import { getPasswordRequirements, validatePassword } from "@/lib/passwordValidation";
import { Progress } from "@/components/ui/progress";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const requirements = getPasswordRequirements(password);
  const { strength } = validatePassword(password);

  const strengthColors = {
    weak: "bg-destructive",
    fair: "bg-orange-500",
    good: "bg-yellow-500",
    strong: "bg-green-500",
  };

  const strengthLabels = {
    weak: "Weak",
    fair: "Fair",
    good: "Good",
    strong: "Strong",
  };

  const metCount = requirements.filter((r) => r.met).length;
  const progressValue = (metCount / requirements.length) * 100;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Password strength:</span>
          <span className={`font-medium ${
            strength === "strong" ? "text-green-600" :
            strength === "good" ? "text-yellow-600" :
            strength === "fair" ? "text-orange-600" :
            "text-destructive"
          }`}>
            {strengthLabels[strength]}
          </span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full transition-all ${strengthColors[strength]}`}
            style={{ width: `${progressValue}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            {req.met ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground" />
            )}
            <span className={req.met ? "text-foreground" : "text-muted-foreground"}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
