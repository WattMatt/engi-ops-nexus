# Hooks and Utilities Documentation

This document outlines the custom hooks and utility functions available in the application.

## Custom Hooks (`src/hooks`)

These hooks encapsulate reusable logic for the React application.

### UI & UX
- **use-mobile**: Detects if the current viewport is a mobile device.
- **use-toast**: Managing toast notifications (likely using shadcn/ui or sonner).
- **useImageCompression**: Handles client-side image compression.
- **usePDFEditorHistory**: Manages undo/redo history for the PDF editor.
- **useTypingIndicator**: Manages typing indicators in chat interfaces.

### Data & State
- **useCalculationSettings**: Manages settings for engineering calculations.
- **useConversations**: Manages chat conversations.
- **useMessages**: Handles fetching and sending messages.
- **useNotifications**: Manages user notifications.
- **useUnreadMessages**: Tracks unread message counts.
- **useProjectIssues**: Manages project-specific issues or tickets.
- **useTenantPresence**: Tracks online status of tenants.

### Access Control & Auth
- **useClientAccess**: Checks client access permissions.
- **useRoleAccess**: Generic role-based access control.
- **useUserRole**: specific hook for the current user's role.

### Business Logic
- **useActivityLogger**: Logs user activities.
- **useFeedbackNotifications**: Handles feedback-related notifications.
- **useHandoverLinkStatus**: Checks the status of handover links.
- **useMunicipalityQuery**: Queries municipality data.
- **useProjectCompletion**: Tracks project completion status.

## Utilities (`src/utils`)

Pure functions and helpers organized by domain.

### Formatting & display
- **formatters**: Contains `formatCurrency`, `formatNumber`, `formatPercentage` for consistent data display.
- **decimalPrecision**: Helpers for handling floating-point precision in calculations.

### PDF & Exporting
A significant portion of the utilities handles PDF generation and export.
- **pdfExportBase**: Base class/functions for PDF export logic.
- **pdfStyleManager**: Manages styles for PDF exports.
- **lightingReportPDF**: Generates lighting reports.
- **templatePDFExport**: Generic template-based PDF export.
- **captureUIForPDF**: Captures HTML/DOM elements for PDF generation.
- **componentToImage**: Converts React components/DOM to images.
- **pdfCoverPage** / **pdfCoverPageSimple**: Generates cover pages.

### Engineering Calculations
- **cableSizing**: Algorithms for calculating cable sizes.
- **cableOptimization**: Optimizes cable routes or selections.
- **cableValidation**: Validates cable selections against rules.
- **generatorSizing**: Calculates generator requirements.
- **costReportCalculations**: Core logic for financial report calculations.

### Data Processing & Import
- **excelParser**: Parses Excel files (likely for bulk imports).
- **analyzeWordTemplate**: Analyzes Word documents for templates.
- **templatePlaceholderInsertion**: Replaces placeholders in templates.
- **prepareCostReportTemplateData**: Prepares data for cost reports.
- **validateCostReportTemplate**: Validates imported or generated templates.
- **tenantSorting**: Sorting logic for tenant lists.

## Usage Examples

### Using `formatters`
```typescript
import { formatCurrency, formatPercentage } from "@/utils/formatters";

const price = 1234.56;
console.log(formatCurrency(price)); // "R 1,234.56"

const rate = 15.5;
console.log(formatPercentage(rate)); // "15.50%"
```

### Using `use-mobile`
```typescript
import { useIsMobile } from "@/hooks/use-mobile";

const MyComponent = () => {
  const isMobile = useIsMobile();
  
  return (
    <div>
      {isMobile ? <MobileView /> : <DesktopView />}
    </div>
  );
};
```
