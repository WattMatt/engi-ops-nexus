# Component Library & Feature Modules

This document provides an overview of the React components and feature modules in the application.

## UI Component Library (`src/components/ui`)
The application uses a reusable component library (likely based on shadcn/ui) located in `src/components/ui`. These components should be used for all basic UI elements to ensure consistency.

**Common Components:**
- `Button`: Standard buttons.
- `Input`, `Select`, `Textarea`: Form controls.
- `Dialog`, `Sheet`: Modals and slide-over panels.
- `Card`: Content containers.
- `Table`: Data display.
- `Toast`: Notifications.

## Feature Modules

The application is structured into domain-specific modules.

### 1. Lighting (`src/components/lighting`)
Components for lighting design, calculations, and reporting.
- Manages lighting fixtures, layouts, and energy calculations.
- Includes reporting tools for compliance and efficiency.

### 2. Floor Plan (`src/components/floor-plan`)
A complex interactive module for viewing and editing floor plans.
- Likely uses HTML5 Canvas or SVG.
- Supports marking up plans, measuring, and placing assets (like lights or outlets).

### 3. Tenant Management (`src/components/tenant`)
Manages tenant data, billing, and documents.
- **TenantList**: Displays all tenants.
- **TenantOverview**: Dashboard for a specific tenant.
- **CostBreakdownChart**: Visualizes tenant costs.
- **ReportPreviewDialog**: Previews generated reports for tenants.

### 4. Finance & Invoicing (`src/components/finance`)
Handles financial aspects of the project.
- **CashFlowDashboard**: Visualizes financial health.
- **InvoiceHistoryTab**: Lists past invoices.
- **ExpenseManager**: Tracks project expenses.

### 5. Cable Schedules (`src/components/cable-schedules`)
Engineering tools for electrical cable management.
- **CableScheduleDetail**: Detailed view of cable runs.
- **CircuitList**: Manages electrical circuits.

### 6. Admin & Settings (`src/components/admin`, `src/components/settings`)
Administrative interfaces.
- User management, system configuration, and audit logs.

### 7. AI Tools (`src/components/ai-tools`)
Interfaces for the AI features.
- **CostPredictor**: UI for the cost prediction AI.
- **DataAnalyzer**: Interface for uploading data to be analyzed.
- **EngineeringChatbot**: Chat interface for engineering queries.

## Integration Guidelines

When building new features:
1.  **Check `src/components/ui` first**: Always use existing base components.
2.  **Check Shared Components**: Look in `src/components/shared` or `src/components/common` for reusable business logic components.
3.  **Module Isolation**: Keep feature-specific components within their directory (e.g., `src/components/my-new-feature`).
4.  **Colocation**: Keep related utils and hooks close to the components if they are only used there, or move them to `src/hooks` / `src/utils` if they are global.

## Example: Creating a new Feature

```tsx
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function MyNewFeature() {
  return (
    <Card>
      <CardHeader>Feature Title</CardHeader>
      <CardContent>
        <p>Feature content goes here.</p>
        <Button>Action</Button>
      </CardContent>
    </Card>
  );
}
```
