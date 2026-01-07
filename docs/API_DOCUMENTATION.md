# Comprehensive API & Component Documentation

This document provides comprehensive documentation for all public APIs, functions, components, and utilities in the codebase. It includes detailed descriptions, parameters, return types, and usage examples.

---

## Table of Contents

1. [Utility Functions](#utility-functions)
   - [Cable Sizing Utilities](#cable-sizing-utilities)
   - [Cable Validation Utilities](#cable-validation-utilities)
   - [Cable Optimization Utilities](#cable-optimization-utilities)
   - [Decimal Precision Utilities](#decimal-precision-utilities)
   - [Cost Report Calculations](#cost-report-calculations)
   - [Formatting Utilities](#formatting-utilities)
   - [Excel Parsing Utilities](#excel-parsing-utilities)
   - [PDF Export Utilities](#pdf-export-utilities)
   - [Placeholder Detection](#placeholder-detection)
   - [Tenant Sorting](#tenant-sorting)
   - [Generator Sizing](#generator-sizing)
2. [React Hooks](#react-hooks)
   - [useCalculationSettings](#usecalculationsettings)
   - [useRoleAccess](#useroleaccess)
   - [useUserRole](#useuserrole)
   - [useToast](#usetoast)
   - [useNotifications](#usenotifications)
   - [useActivityLogger](#useactivitylogger)
   - [useImageCompression](#useimagecompression)
   - [useMunicipalityQuery](#usemunicipalityquery)
   - [usePDFEditorHistory](#usepdfeditorhistory)
3. [Data Modules](#data-modules)
   - [South African Cities & Zones](#south-african-cities--zones)
   - [Smart Assemblies](#smart-assemblies)
4. [Library Functions](#library-functions)
   - [Password Validation](#password-validation)
   - [Utility Helpers (cn, formatCurrency)](#utility-helpers)
5. [Supabase Integration](#supabase-integration)

---

## Utility Functions

### Cable Sizing Utilities

**File:** `src/utils/cableSizing.ts`

Provides electrical cable sizing calculations based on SANS 10142-1 standards for South African electrical installations.

#### Constants

##### `COPPER_CABLE_TABLE`

Array of copper cable specifications from SANS 1507-3 Table 6.2.

```typescript
interface CableData {
  size: string;                    // e.g., "25mm²"
  currentRatingGround: number;     // Ground installation (A)
  currentRatingDucts: number;      // Duct installation (A)
  currentRatingAir: number;        // Air installation (A)
  impedance: number;               // Ω/km at 20°C
  voltDrop3Phase: number;          // 3φ Volt drop (mV/A/m)
  voltDrop1Phase: number;          // 1φ Volt drop (mV/A/m)
  d1_3c: number;                   // Nominal Diameter D1 - 3 core (mm)
  d1_4c: number;                   // Nominal Diameter D1 - 4 core (mm)
  d_3c: number;                    // Nominal Diameter d - 3 core (mm)
  d_4c: number;                    // Nominal Diameter d - 4 core (mm)
  d2_3c: number;                   // Nominal Diameter D2 - 3 core (mm)
  d2_4c: number;                   // Nominal Diameter D2 - 4 core (mm)
  mass_3c: number;                 // Approx. Mass 3 core (kg/km)
  mass_4c: number;                 // Approx. Mass 4 core (kg/km)
  supplyCost: number;              // Cost per meter (R)
  installCost: number;             // Installation cost per meter (R)
}
```

##### `ALUMINIUM_CABLE_TABLE`

Array of aluminium cable specifications from SANS 1507-3 Table 6.3.

---

#### `calculateCableSize(params)`

Calculate recommended cable size based on load current, applying derating factors and voltage drop checks.

**Parameters:**

```typescript
interface CableCalculationParams {
  loadAmps: number;                            // Required: Load current in Amperes
  voltage: number;                             // Required: System voltage (230V or 400V)
  totalLength: number;                         // Required: Cable length in meters
  cableType?: string;                          // Optional: Cable type (e.g., "3C", "4C")
  deratingFactor?: number;                     // Optional: Derating factor (default: 1.0)
  material?: "copper" | "aluminium";           // Optional: Cable material (default: "copper")
  maxAmpsPerCable?: number;                    // Optional: Max amps per cable (default: 400A)
  preferredAmpsPerCable?: number;              // Optional: Preferred amps for parallel (default: 300A)
  installationMethod?: 'air' | 'ducts' | 'ground';  // Optional: Installation method (default: 'air')
  safetyMargin?: number;                       // Optional: Safety margin multiplier (e.g., 1.15)
  voltageDropLimit?: number;                   // Optional: Custom voltage drop limit %
}
```

**Returns:**

```typescript
interface CableCalculationResult {
  recommendedSize: string;         // e.g., "25mm²"
  recommendedQuantity?: number;    // Number of cables
  ohmPerKm: number;                // Cable impedance
  voltDrop: number;                // Voltage drop in Volts
  voltDropPercentage: number;      // Voltage drop as percentage
  supplyCost: number;              // Total supply cost (R)
  installCost: number;             // Total installation cost (R)
  totalCost: number;               // Combined total cost (R)
  cablesInParallel?: number;       // Number of parallel cables
  loadPerCable?: number;           // Load per cable when parallel
  validationWarnings?: ValidationWarning[];
  requiresEngineerVerification?: boolean;
  alternatives?: CableAlternative[];
  costSavings?: number;
  capacitySufficient?: boolean;
}
```

**Example:**

```typescript
import { calculateCableSize } from '@/utils/cableSizing';

const result = calculateCableSize({
  loadAmps: 150,
  voltage: 400,
  totalLength: 50,
  material: 'copper',
  installationMethod: 'air',
  safetyMargin: 1.15,
});

if (result) {
  console.log(`Recommended cable: ${result.recommendedSize}`);
  console.log(`Voltage drop: ${result.voltDropPercentage}%`);
  console.log(`Total cost: R${result.totalCost}`);
}
```

---

### Cable Validation Utilities

**File:** `src/utils/cableValidation.ts`

Provides validation functions to ensure cable calculations meet SANS 10142-1 requirements.

#### `validateCableCapacity(cable, loadAmps, installationMethod, deratingFactor)`

Validates that a selected cable can carry the specified load.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `cable` | `CableData` | Cable specification object |
| `loadAmps` | `number` | Load current in Amperes |
| `installationMethod` | `'ground' \| 'ducts' \| 'air'` | Installation method |
| `deratingFactor` | `number` | Derating factor (default: 1.0) |

**Returns:** `ValidationWarning[]`

**Example:**

```typescript
import { validateCableCapacity, COPPER_CABLE_TABLE } from '@/utils/cableSizing';

const cable = COPPER_CABLE_TABLE[6]; // 25mm²
const warnings = validateCableCapacity(cable, 100, 'air', 0.8);

warnings.forEach(w => {
  console.log(`${w.type}: ${w.message}`);
});
```

---

#### `validateVoltageDrop(voltDropPercentage, voltage)`

Validates that voltage drop is within SANS limits (5% for 400V, 3% for 230V).

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `voltDropPercentage` | `number` | Voltage drop as percentage |
| `voltage` | `number` | System voltage |

**Returns:** `ValidationWarning[]`

---

#### `validateCableCalculation(cable, loadAmps, voltage, length, voltDropPercentage, installationMethod, deratingFactor)`

Master validation function that performs all validation checks.

**Returns:**

```typescript
{ 
  warnings: ValidationWarning[], 
  requiresVerification: boolean 
}
```

---

### Cable Optimization Utilities

**File:** `src/utils/cableOptimization.ts`

Analyzes cable configurations to find cost-effective alternatives while maintaining SANS 10142-1 compliance.

#### `analyzeCableOptimizations(cableEntries, cableRates, calcSettings)`

Analyzes cable entries to find optimization opportunities.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `cableEntries` | `CableEntry[]` | Array of cable entries |
| `cableRates` | `CableRate[]` | Cable pricing rates |
| `calcSettings` | `CalculationSettings` | Calculation settings |

**Returns:** `OptimizationResult[]`

```typescript
interface OptimizationResult {
  cableId: string;
  cableTag: string;
  fromLocation: string;
  toLocation: string;
  totalLength: number;
  currentConfig: {
    size: string;
    parallelCount: number;
    totalCost: number;
    supplyCost: number;
    installCost: number;
    terminationCost: number;
    voltage: number;
    loadAmps: number;
  };
  alternatives: Array<{
    size: string;
    parallelCount: number;
    totalCost: number;
    savings: number;
    savingsPercent: number;
    voltDrop: number;
    isCurrentConfig?: boolean;
    complianceReport?: string;
  }>;
  complianceNotes?: string;
}
```

**Example:**

```typescript
import { analyzeCableOptimizations } from '@/utils/cableOptimization';

const optimizations = analyzeCableOptimizations(
  cableEntries,
  cableRates,
  calculationSettings
);

optimizations.forEach(opt => {
  console.log(`Cable ${opt.cableTag}: ${opt.alternatives.length} alternatives found`);
  opt.alternatives.forEach(alt => {
    if (alt.savings > 0) {
      console.log(`  ${alt.size} x${alt.parallelCount}: Save R${alt.savings}`);
    }
  });
});
```

---

### Decimal Precision Utilities

**File:** `src/utils/decimalPrecision.ts`

Provides precise decimal arithmetic for financial/engineering calculations using Decimal.js.

#### `add(...values)`

Adds multiple values with precision.

```typescript
import { add } from '@/utils/decimalPrecision';
const total = add(100.1, 200.2, 300.3); // Returns 600.6
```

#### `subtract(a, b)`

Subtracts b from a with precision.

```typescript
import { subtract } from '@/utils/decimalPrecision';
const diff = subtract(1000, 599.99); // Returns 400.01
```

#### `multiply(...values)`

Multiplies multiple values with precision.

```typescript
import { multiply } from '@/utils/decimalPrecision';
const product = multiply(10.5, 20.3, 2); // Returns 426.3
```

#### `divide(a, b, decimalPlaces = 10)`

Divides a by b with specified precision.

```typescript
import { divide } from '@/utils/decimalPrecision';
const result = divide(100, 3, 4); // Returns 33.3333
```

#### `percentage(value, percent)`

Calculates percentage of a value.

```typescript
import { percentage } from '@/utils/decimalPrecision';
const vat = percentage(1000, 15); // Returns 150
```

#### `round(value, decimalPlaces = 2)`

Rounds a value with HALF_UP rounding.

```typescript
import { round } from '@/utils/decimalPrecision';
const rounded = round(123.456, 2); // Returns 123.46
```

#### `sum(values)`

Sums an array of numbers, ignoring null/undefined.

```typescript
import { sum } from '@/utils/decimalPrecision';
const total = sum([100, 200, null, 300]); // Returns 600
```

#### `formatCurrencyPrecise(value, currencySymbol = 'R')`

Formats a value as currency with precision.

```typescript
import { formatCurrencyPrecise } from '@/utils/decimalPrecision';
const formatted = formatCurrencyPrecise(12345.67); // Returns "R 12,345.67"
```

#### `calculateVoltageDrop(current, length, resistance, voltage)`

Calculates voltage drop percentage for cable sizing.

```typescript
import { calculateVoltageDrop } from '@/utils/decimalPrecision';
const vdPercent = calculateVoltageDrop(50, 100, 0.5, 400); // Returns voltage drop %
```

#### `calculateCableCost(length, supplyRatePerMeter, installRatePerMeter, terminationCostPerEnd, quantity)`

Calculates cable cost breakdown.

```typescript
import { calculateCableCost } from '@/utils/decimalPrecision';
const costs = calculateCableCost(100, 25, 15, 50, 2);
// Returns { supply: 5000, install: 3000, termination: 200, total: 8200 }
```

---

### Cost Report Calculations

**File:** `src/utils/costReportCalculations.ts`

Shared calculation utilities for cost reports to ensure consistency between UI display and PDF exports.

#### `calculateCategoryTotals(categories, lineItems, variations)`

Calculates category totals from categories, line items, and variations.

**Returns:** `CategoryTotal[]`

```typescript
interface CategoryTotal {
  id: string;
  code: string;
  description: string;
  originalBudget: number;
  previousReport: number;
  anticipatedFinal: number;
  percentageOfTotal: number;
  currentVariance: number;
  originalVariance: number;
}
```

#### `calculateGrandTotals(categoryTotals)`

Calculates grand totals from category totals.

**Returns:** `GrandTotals`

```typescript
interface GrandTotals {
  originalBudget: number;
  previousReport: number;
  anticipatedFinal: number;
  currentVariance: number;
  originalVariance: number;
}
```

#### `validateTotals(uiTotals, pdfTotals)`

Validates that UI totals match PDF calculation totals.

```typescript
const validation = validateTotals(uiTotals, pdfTotals);
if (!validation.isValid) {
  validation.mismatches.forEach(m => console.warn(m));
}
```

---

### Formatting Utilities

**File:** `src/utils/formatters.ts`

Simple formatting utilities for currency, numbers, and percentages.

#### `formatCurrency(value)`

Formats a value as South African Rand currency.

```typescript
import { formatCurrency } from '@/utils/formatters';
formatCurrency(12345.67);  // Returns "R 12,345.67"
formatCurrency(null);      // Returns "R 0.00"
```

#### `formatNumber(value, decimals = 2)`

Formats a number with localized formatting.

```typescript
import { formatNumber } from '@/utils/formatters';
formatNumber(12345.678);     // Returns "12,345.68"
formatNumber(12345.678, 0);  // Returns "12,346"
```

#### `formatPercentage(value)`

Formats a value as a percentage.

```typescript
import { formatPercentage } from '@/utils/formatters';
formatPercentage(75.5);  // Returns "75.50%"
```

---

### Excel Parsing Utilities

**File:** `src/utils/excelParser.ts`

Utilities for parsing Excel files and extracting BOQ (Bill of Quantities) data.

#### `parseExcelFile(file)`

Parses an Excel file and extracts all sheets with their data.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `file` | `File` | Excel file to parse |

**Returns:** `Promise<ParsedExcelResult>`

```typescript
interface ParsedExcelResult {
  sheets: ParsedSheet[];
  totalRows: number;
  combinedText: string;
  columnDetection: Record<string, ColumnDetectionResult>;
}

interface ParsedSheet {
  name: string;
  headers: string[];
  rows: Record<string, string | number | null>[];
  rawText: string;
  rowCount: number;
}
```

**Example:**

```typescript
import { parseExcelFile } from '@/utils/excelParser';

const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];
const result = await parseExcelFile(file);

console.log(`Parsed ${result.totalRows} rows from ${result.sheets.length} sheets`);
result.sheets.forEach(sheet => {
  console.log(`Sheet "${sheet.name}": ${sheet.rowCount} rows`);
});
```

#### `detectBOQColumns(headers)`

Detects common BOQ column patterns in headers.

**Returns:** `ColumnDetectionResult`

```typescript
interface ColumnDetectionResult {
  itemCode?: number;      // Column index for item codes
  description?: number;   // Column index for descriptions
  quantity?: number;      // Column index for quantities
  unit?: number;          // Column index for units
  supplyRate?: number;    // Column index for supply rates
  installRate?: number;   // Column index for install rates
  totalRate?: number;     // Column index for total rates
  amount?: number;        // Column index for amounts
}
```

#### `getColumnDetectionSummary(detection, headers)`

Gets a summary of detected columns for display.

```typescript
const summary = getColumnDetectionSummary(detection, headers);
console.log(`Detected: ${summary.detected.join(', ')}`);
console.log(`Missing: ${summary.missing.join(', ')}`);
```

---

### PDF Export Utilities

**File:** `src/utils/pdfExportBase.ts`

Base utilities for standardized PDF exports.

#### `initializePDF(options)`

Initializes a PDF document with standardized settings.

**Parameters:**

```typescript
interface PDFExportOptions {
  quality?: 'draft' | 'standard' | 'high';
  orientation?: 'portrait' | 'landscape';
  compress?: boolean;
}
```

**Returns:** `jsPDF`

```typescript
import { initializePDF } from '@/utils/pdfExportBase';

const doc = initializePDF({ 
  quality: 'high', 
  orientation: 'landscape' 
});
```

#### `getStandardTableStyles(quality)`

Gets standardized table styles for jsPDF-AutoTable.

```typescript
import { getStandardTableStyles } from '@/utils/pdfExportBase';
import autoTable from 'jspdf-autotable';

const doc = initializePDF();
autoTable(doc, {
  ...getStandardTableStyles(),
  head: [['Header 1', 'Header 2']],
  body: [['Data 1', 'Data 2']],
});
```

#### `addSectionHeader(doc, text, y, quality)`

Adds a standardized section header to the PDF.

**Returns:** Next Y position

```typescript
let y = 20;
y = addSectionHeader(doc, 'Project Summary', y);
// Add content at new y position
```

#### `addBodyText(doc, text, x, y, quality)`

Adds standardized body text to the PDF.

#### `addPageNumbers(doc, startPage = 2, quality)`

Adds page numbers to all pages except cover.

#### `checkPageBreak(doc, currentY, requiredSpace = 40)`

Checks if a new page is needed and adds one if necessary.

**Returns:** Updated Y position

---

**File:** `src/utils/pdfQualitySettings.ts`

Quality presets and settings for PDF exports.

#### Quality Presets

| Preset | Scale | Compression | Use Case |
|--------|-------|-------------|----------|
| `draft` | 1.5 | 0.75 | Fast rendering, smaller files |
| `standard` | 2 | 0.85 | Balanced quality (default) |
| `high` | 3 | 0.95 | Best quality, larger files |

#### `getQualitySettings(preset)`

Gets quality settings for a preset.

```typescript
import { getQualitySettings } from '@/utils/pdfQualitySettings';

const settings = getQualitySettings('high');
console.log(`Scale: ${settings.scale}, Compression: ${settings.compression}`);
```

#### `captureElementAsCanvas(element, options)`

Captures an HTML element as a high-quality canvas.

```typescript
import { captureElementAsCanvas } from '@/utils/pdfQualitySettings';

const element = document.getElementById('chart');
const canvas = await captureElementAsCanvas(element);
```

#### `createHighQualityPDF(orientation, compress)`

Creates a new jsPDF instance with optimal settings.

---

**File:** `src/utils/pdfUserPreferences.ts`

User preference management for PDF quality.

#### `getUserQualityPreset()`

Gets the user's preferred PDF quality preset from localStorage.

**Returns:** `'draft' | 'standard' | 'high'`

#### `setUserQualityPreset(preset)`

Sets the user's preferred PDF quality preset.

```typescript
import { setUserQualityPreset, getUserQualityPreset } from '@/utils/pdfUserPreferences';

setUserQualityPreset('high');
const preset = getUserQualityPreset(); // Returns 'high'
```

---

**File:** `src/utils/pdfFilenameGenerator.ts`

Generates standardized PDF filenames.

#### `generateStandardizedPDFFilename(options)`

Generates a filename in format: `PROJ-{number}_{type}_{ISO-date}.pdf`

```typescript
import { generateStandardizedPDFFilename } from '@/utils/pdfFilenameGenerator';

const filename = generateStandardizedPDFFilename({
  projectNumber: '2024-001',
  reportType: 'Cost Report',
  reportNumber: 3,
  revision: 'A'
});
// Returns: "PROJ-2024-001_CostReport_Rep3_RevA_2024-03-15.pdf"
```

#### `generateStorageFilename(options)`

Generates filename with timestamp for storage uniqueness.

---

### Placeholder Detection

**File:** `src/utils/placeholderDetection.ts`

Detects and manages placeholders in document templates.

#### `detectPlaceholders(file)`

Detects placeholders in a DOCX template file.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `file` | `File` | DOCX file to analyze |

**Returns:**

```typescript
{
  textPlaceholders: string[];   // Regular {placeholder} patterns
  imagePlaceholders: string[];  // Image-related placeholders
  loopPlaceholders: string[];   // Loop syntax {#...} and {/...}
}
```

**Example:**

```typescript
import { detectPlaceholders } from '@/utils/placeholderDetection';

const placeholders = await detectPlaceholders(templateFile);
console.log('Text placeholders:', placeholders.textPlaceholders);
console.log('Image placeholders:', placeholders.imagePlaceholders);
```

#### `getPlaceholderSuggestions(templateType)`

Gets common placeholder suggestions based on template type.

**Returns:** `PlaceholderInfo[]`

```typescript
interface PlaceholderInfo {
  placeholder: string;      // e.g., "{project_name}"
  description: string;      // e.g., "Project name"
  example?: string;         // e.g., "PRINCE CONSORT CENTRE"
}
```

---

### Tenant Sorting

**File:** `src/utils/tenantSorting.ts`

Natural sorting utilities for shop numbers.

#### `compareShopNumbers(a, b)`

Natural sort comparison for shop numbers (handles "Shop 1", "Shop 10A", etc.).

```typescript
import { compareShopNumbers } from '@/utils/tenantSorting';

const shops = ['Shop 10', 'Shop 2', 'Shop 1', 'Shop 10A'];
shops.sort(compareShopNumbers);
// Result: ['Shop 1', 'Shop 2', 'Shop 10', 'Shop 10A']
```

#### `sortTenantsByShopNumber(tenants)`

Sorts an array of tenants by shop number.

```typescript
import { sortTenantsByShopNumber } from '@/utils/tenantSorting';

const sortedTenants = sortTenantsByShopNumber(tenants);
```

---

### Generator Sizing

**File:** `src/utils/generatorSizing.ts`

Generator sizing data based on load percentages.

#### `GENERATOR_SIZING_TABLE`

Array of generator sizing data.

```typescript
interface GeneratorSizingData {
  rating: string;   // e.g., "100 kVA"
  load25: number;   // Fuel consumption at 25% load
  load50: number;   // Fuel consumption at 50% load
  load75: number;   // Fuel consumption at 75% load
  load100: number;  // Fuel consumption at 100% load
}
```

Available sizes range from 10 kVA to 1000 kVA.

---

## React Hooks

### useCalculationSettings

**File:** `src/hooks/useCalculationSettings.tsx`

Fetches calculation settings for a project from Supabase.

#### Usage

```typescript
import { useCalculationSettings } from '@/hooks/useCalculationSettings';

function CableCalculator({ projectId }) {
  const { data: settings, isLoading, error } = useCalculationSettings(projectId);
  
  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;
  
  // Use settings.voltage_drop_limit_400v, settings.cable_safety_margin, etc.
}
```

#### Settings Interface

```typescript
interface CalculationSettings {
  voltage_drop_limit_400v: number;      // Default: 5.0
  voltage_drop_limit_230v: number;      // Default: 3.0
  power_factor_power: number;           // Default: 0.85
  power_factor_lighting: number;        // Default: 0.95
  power_factor_motor: number;           // Default: 0.80
  power_factor_hvac: number;            // Default: 0.85
  ambient_temp_baseline: number;        // Default: 30
  grouping_factor_2_circuits: number;   // Default: 0.80
  grouping_factor_3_circuits: number;   // Default: 0.70
  grouping_factor_4plus_circuits: number; // Default: 0.65
  cable_safety_margin: number;          // Default: 1.15
  max_amps_per_cable: number;           // Default: 400
  preferred_amps_per_cable: number;     // Default: 300
  k_factor_copper: number;              // Default: 115
  k_factor_aluminium: number;           // Default: 76
  calculation_standard: string;         // Default: "SANS 10142-1"
  default_installation_method: string;  // Default: "air"
  default_cable_material: string;       // Default: "Aluminium"
  default_insulation_type: string;      // Default: "PVC"
}
```

---

### useRoleAccess

**File:** `src/hooks/useRoleAccess.tsx`

Manages role-based access control.

#### Usage

```typescript
import { useRoleAccess } from '@/hooks/useRoleAccess';

function AdminPanel() {
  const { isAdmin, isModerator, hasAccess, loading } = useRoleAccess('admin');
  
  if (loading) return <Loading />;
  
  return (
    <div>
      {isAdmin && <AdminControls />}
      {isModerator && <ModeratorControls />}
      {hasAccess('user') && <UserContent />}
    </div>
  );
}
```

#### Returns

```typescript
{
  userRole: 'admin' | 'moderator' | 'user' | null;
  loading: boolean;
  isAdmin: boolean;
  isModerator: boolean;  // True for moderator OR admin
  hasRole: (role: AppRole) => boolean;
  hasAccess: (role: AppRole) => boolean;
}
```

---

### useUserRole

**File:** `src/hooks/useUserRole.tsx`

Simple hook to check if current user is an admin.

```typescript
import { useUserRole } from '@/hooks/useUserRole';

function Component() {
  const { isAdmin, loading } = useUserRole();
  
  if (loading) return <Loading />;
  
  return isAdmin ? <AdminView /> : <UserView />;
}
```

---

### useToast

**File:** `src/hooks/use-toast.ts`

Toast notification management hook.

#### Usage

```typescript
import { useToast, toast } from '@/hooks/use-toast';

function Component() {
  const { toasts, dismiss } = useToast();
  
  const handleAction = () => {
    toast({
      title: 'Success',
      description: 'Action completed successfully',
      variant: 'default', // or 'destructive'
    });
  };
  
  return <Button onClick={handleAction}>Do Action</Button>;
}
```

#### Functions

| Function | Description |
|----------|-------------|
| `toast({ title, description, variant, action })` | Shows a toast notification |
| `dismiss(toastId?)` | Dismisses a specific toast or all toasts |

---

### useNotifications

**File:** `src/hooks/useNotifications.tsx`

Real-time notification management with Supabase subscriptions.

#### Usage

```typescript
import { useNotifications } from '@/hooks/useNotifications';

function NotificationBell() {
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead 
  } = useNotifications();
  
  return (
    <div>
      <Badge count={unreadCount} />
      {notifications?.map(n => (
        <NotificationItem 
          key={n.id} 
          notification={n}
          onRead={() => markAsRead(n.id)}
        />
      ))}
      <Button onClick={markAllAsRead}>Mark All Read</Button>
    </div>
  );
}
```

#### Notification Types

- `status_update` - Status change notifications
- `approval_request` - Approval requests
- `task_assigned` - Task assignments
- `mention` - User mentions
- `client_request` - Client requests

---

### useActivityLogger

**File:** `src/hooks/useActivityLogger.tsx`

Logs user activities to the database.

```typescript
import { useActivityLogger } from '@/hooks/useActivityLogger';

function Component() {
  const { logActivity } = useActivityLogger();
  
  const handleDocumentDownload = async (docId: string) => {
    await logActivity(
      'document_download',
      'Downloaded cost report PDF',
      { documentId: docId, fileSize: 1024 },
      projectId
    );
  };
}
```

---

### useImageCompression

**File:** `src/hooks/useImageCompression.ts`

Client-side image compression before upload.

#### Usage

```typescript
import { useImageCompression } from '@/hooks/useImageCompression';

function ImageUploader() {
  const { 
    compressImage, 
    isCompressing, 
    compressionProgress, 
    error 
  } = useImageCompression();
  
  const handleUpload = async (file: File) => {
    const compressed = await compressImage(file, {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1280,
    });
    
    // Upload compressed file
    await uploadFile(compressed);
  };
  
  return (
    <div>
      <input type="file" onChange={e => handleUpload(e.target.files[0])} />
      {isCompressing && <Progress value={compressionProgress} />}
    </div>
  );
}
```

#### Compression Options

```typescript
interface CompressionOptions {
  maxSizeMB?: number;          // Default: 1
  maxWidthOrHeight?: number;   // Default: 1920
  useWebWorker?: boolean;      // Default: true
}
```

---

### useMunicipalityQuery

**File:** `src/hooks/useMunicipalityQuery.ts`

Queries South African municipality data based on coordinates.

```typescript
import { useMunicipalityQuery } from '@/hooks/useMunicipalityQuery';

function LocationPicker() {
  const { queryMunicipality, isQuerying, lastResult } = useMunicipalityQuery();
  
  const handleMapClick = async (lng: number, lat: number) => {
    const result = await queryMunicipality(lng, lat);
    if (result?.found) {
      console.log(`Municipality: ${result.municipality.name}`);
      console.log(`District: ${result.municipality.district}`);
    }
  };
}
```

---

### usePDFEditorHistory

**File:** `src/hooks/usePDFEditorHistory.tsx`

Undo/redo history management for PDF editor.

```typescript
import { usePDFEditorHistory } from '@/hooks/usePDFEditorHistory';

function PDFEditor() {
  const { 
    canUndo, 
    canRedo, 
    pushState, 
    undo, 
    redo, 
    getCurrentState 
  } = usePDFEditorHistory(initialState);
  
  const handleEdit = (newText: string) => {
    pushState({
      extractedText: [...currentState.extractedText],
      editedTextItems: new Map([...currentState.editedTextItems, [id, newText]]),
    });
  };
  
  return (
    <div>
      <Button disabled={!canUndo} onClick={undo}>Undo</Button>
      <Button disabled={!canRedo} onClick={redo}>Redo</Button>
    </div>
  );
}
```

---

## Data Modules

### South African Cities & Zones

**File:** `src/data/saCitiesZones.ts`

Database of South African cities mapped to SANS 10400-XA climatic zones.

#### Types

```typescript
interface CityZoneData {
  city: string;                    // City name
  zone: string;                    // Zone number (1-6)
  province: string;                // Province name
  coordinates: [number, number];   // [longitude, latitude]
}
```

#### Climatic Zones

| Zone | Name | Example Cities |
|------|------|----------------|
| 1 | Cold Interior | Johannesburg, Bloemfontein |
| 2 | Temperate Interior | Pretoria, Polokwane |
| 3 | Hot Interior | Nelspruit, Tzaneen |
| 4 | Temperate Coastal | Cape Town, Port Elizabeth |
| 5 | Sub-tropical Coastal | Durban, Richards Bay |
| 6 | Arid Interior | Kimberley, Upington |

#### Functions

##### `findZoneByCity(cityName)`

Finds zone data by city name (partial match supported).

```typescript
import { findZoneByCity } from '@/data/saCitiesZones';

const data = findZoneByCity('johannesburg');
console.log(`Zone: ${data?.zone}`); // "1"
```

##### `getCitiesByZone(zone)`

Gets all cities in a specific zone.

```typescript
import { getCitiesByZone } from '@/data/saCitiesZones';

const zone1Cities = getCitiesByZone('1');
console.log(zone1Cities.map(c => c.city));
```

##### `findClosestCity(lng, lat)`

Finds the closest city to given coordinates.

```typescript
import { findClosestCity } from '@/data/saCitiesZones';

const closest = findClosestCity(28.0, -26.2);
console.log(`Closest city: ${closest?.city}`); // "Johannesburg"
```

---

### Smart Assemblies

**File:** `src/data/assemblies.ts`

Defines equipment assembly components for electrical installations.

#### Types

```typescript
interface SmartAssembly {
  equipmentType: EquipmentType;
  name: string;
  description: string;
  components: AssemblyComponent[];
}

interface AssemblyComponent {
  id: string;
  name: string;
  description: string;
  unit: string;
  quantity: number;
  category: 'material' | 'labor' | 'accessory';
  boqCode?: string;
  supplyRate?: number;
  installRate?: number;
  variantGroupId?: string;
  defaultVariantId?: string;
}
```

#### Available Equipment Types

- `SOCKET_16A` - 16A Socket Assembly
- `SOCKET_DOUBLE` - Double Socket Assembly
- `GENERAL_LIGHT_SWITCH` - Light Switch Assembly
- `TWO_WAY_LIGHT_SWITCH` - 2-Way Switch Assembly
- `DIMMER_SWITCH` - Dimmer Switch Assembly
- `DATA_SOCKET` - Data Socket Assembly
- `TELEPHONE_OUTLET` - Telephone Outlet Assembly
- `TV_OUTLET` - TV Outlet Assembly
- `CEILING_LIGHT` - Ceiling Light Assembly
- `RECESSED_LIGHT_600` - 600x600 LED Panel Assembly
- `RECESSED_LIGHT_1200` - 1200x600 LED Panel Assembly
- `FLOODLIGHT` - Floodlight Assembly
- `MOTION_SENSOR` - Motion Sensor Assembly
- `DISTRIBUTION_BOARD` - Distribution Board Assembly
- `CCTV_CAMERA` - CCTV Camera Assembly
- `GEYSER_OUTLET` - Geyser Outlet Assembly

#### Functions

##### `getAssemblyForType(type)`

Gets the assembly definition for an equipment type.

```typescript
import { getAssemblyForType } from '@/data/assemblies';
import { EquipmentType } from '@/components/floor-plan/types';

const assembly = getAssemblyForType(EquipmentType.SOCKET_16A);
console.log(`${assembly?.name}: ${assembly?.components.length} components`);
```

##### `getEffectiveComponents(assembly, modifications)`

Gets components with modifications applied.

```typescript
import { getEffectiveComponents } from '@/data/assemblies';

const effectiveComponents = getEffectiveComponents(assembly, [
  { componentId: 'socket-16a-box', excluded: false, selectedVariantId: 'box-65-pvc' }
]);
```

##### `getVariantsForGroup(groupId)`

Gets available variants for a component group.

```typescript
import { getVariantsForGroup } from '@/data/assemblies';

const boxVariants = getVariantsForGroup('draw-box');
// Returns variants like '50mm PVC Draw Box', '65mm Deep PVC Box', etc.
```

---

## Library Functions

### Password Validation

**File:** `src/lib/passwordValidation.ts`

Password strength validation utilities.

#### `validatePassword(password)`

Validates password against security requirements.

**Returns:**

```typescript
interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: "weak" | "fair" | "good" | "strong";
}
```

**Requirements:**

- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Not a common password

**Example:**

```typescript
import { validatePassword } from '@/lib/passwordValidation';

const result = validatePassword('MyP@ssw0rd123!');
if (result.isValid) {
  console.log(`Password strength: ${result.strength}`);
} else {
  result.errors.forEach(e => console.log(`Error: ${e}`));
}
```

#### `getPasswordRequirements(password)`

Gets a list of requirements with their current status.

```typescript
import { getPasswordRequirements } from '@/lib/passwordValidation';

const requirements = getPasswordRequirements('partial');
requirements.forEach(req => {
  console.log(`${req.met ? '✓' : '✗'} ${req.label}`);
});
```

---

### Utility Helpers

**File:** `src/lib/utils.ts`

General utility functions.

#### `cn(...inputs)`

Combines class names using clsx and tailwind-merge.

```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  'base-class',
  isActive && 'active-class',
  variant === 'primary' ? 'bg-blue-500' : 'bg-gray-500'
)} />
```

#### `formatCurrency(value, currency = "ZAR")`

Formats a value as currency.

```typescript
import { formatCurrency } from '@/lib/utils';

formatCurrency(12345.67);        // Returns "R12,345.67"
formatCurrency(null);            // Returns "R0.00"
formatCurrency(1000, 'USD');     // Returns "$1,000.00"
```

---

## Supabase Integration

**File:** `src/integrations/supabase/client.ts`

Pre-configured Supabase client for database and authentication.

### Configuration

The client is automatically configured using environment variables:

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/public key

### Usage

```typescript
import { supabase } from '@/integrations/supabase/client';

// Authentication
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Database queries
const { data: projects, error } = await supabase
  .from('projects')
  .select('*')
  .eq('user_id', user.id);

// Real-time subscriptions
const channel = supabase
  .channel('changes')
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'notifications' 
  }, (payload) => {
    console.log('New notification:', payload.new);
  })
  .subscribe();

// Storage
const { data, error } = await supabase.storage
  .from('documents')
  .upload('path/to/file.pdf', file);
```

### Features

- Persistent sessions with localStorage
- Automatic token refresh
- TypeScript type safety with `Database` types

---

## UI Components

The project includes a comprehensive UI component library based on shadcn/ui, located in `src/components/ui/`. Key components include:

| Component | Description |
|-----------|-------------|
| `Button` | Styled button with variants |
| `Card` | Container with header, content, footer |
| `Dialog` | Modal dialog with overlay |
| `Form` | Form handling with react-hook-form |
| `Input` | Text input with validation |
| `Select` | Dropdown selection |
| `Table` | Data table with sorting |
| `Tabs` | Tabbed interface |
| `Toast` | Notification toasts |
| `Tooltip` | Hover tooltips |

See individual component files in `src/components/ui/` for detailed props and usage.

---

## Best Practices

### Cable Calculations

1. Always use the validation functions to check calculations
2. Consider installation method when selecting cables
3. Apply appropriate derating factors for grouped cables
4. Verify voltage drop is within SANS limits
5. Have calculations verified by a qualified engineer

### PDF Exports

1. Use `initializePDF()` for consistent document setup
2. Apply `getStandardTableStyles()` for uniform table appearance
3. Use the user's preferred quality preset from Settings
4. Add page numbers with `addPageNumbers()`
5. Check for page breaks with `checkPageBreak()`

### Precision Calculations

1. Use `decimalPrecision` utilities for financial calculations
2. Avoid floating-point arithmetic for currency values
3. Round final values appropriately with `round()`
4. Validate totals match between UI and exports

---

## Version Information

- **Documentation Version:** 1.0.0
- **Last Updated:** 2026-01-07
- **Calculation Standard:** SANS 10142-1 (2020)
- **Cable Tables:** SANS 1507-3 Tables 6.2 & 6.3

---

*This documentation is auto-generated. For updates, see the source files in `src/utils/`, `src/hooks/`, `src/lib/`, and `src/data/`.*
