// Test file to verify calculation settings integration
// This file is for debugging only and can be removed

import { useCalculationSettings } from "@/hooks/useCalculationSettings";

export const TestCalculationSettings = ({ projectId }: { projectId: string }) => {
  const { data: settings, isLoading } = useCalculationSettings(projectId);

  if (isLoading) return <div>Loading settings...</div>;

  console.log("🔧 Calculation Settings Loaded:", settings);
  console.log("Safety Margin:", settings?.cable_safety_margin);
  console.log("Voltage Drop Limits:", {
    "400V": settings?.voltage_drop_limit_400v,
    "230V": settings?.voltage_drop_limit_230v,
  });

  return (
    <div className="p-4 bg-muted rounded">
      <h3 className="font-bold">Active Calculation Settings</h3>
      <pre className="text-xs mt-2">{JSON.stringify(settings, null, 2)}</pre>
    </div>
  );
};
