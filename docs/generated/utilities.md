## Utilities

Generated on 2026-01-07T04:31:56.431Z. Regenerate with `npm run docs:generate`.

### `@/utils/analyzeWordTemplate`

- **Source**: `src/utils/analyzeWordTemplate.ts`

#### `analyzeWordTemplate`

- **Import**: `import { analyzeWordTemplate } from "@/utils/analyzeWordTemplate";`
- **Kind**: Function
- **Signature**: `analyzeWordTemplate(file: File): Promise<TemplateStructure>`

**Example**:

```tsx
import { analyzeWordTemplate } from "@/utils/analyzeWordTemplate";

const result = analyzeWordTemplate(/* ...args */);
void result;
```

#### `compareTemplateStructures`

- **Import**: `import { compareTemplateStructures } from "@/utils/analyzeWordTemplate";`
- **Kind**: Function
- **Signature**: `compareTemplateStructures(completed: TemplateStructure, blank: TemplateStructure): { similarityScore: number; structuralMatch: boolean; suggestions: string[]; }`

**Example**:

```tsx
import { compareTemplateStructures } from "@/utils/analyzeWordTemplate";

const result = compareTemplateStructures(/* ...args */);
void result;
```

#### `DetectedField`

- **Import**: `import { DetectedField } from "@/utils/analyzeWordTemplate";`
- **Kind**: Type

**Definition**:

```ts
export interface DetectedField {
  fieldName: string;
  value: string;
  context: string;
  location: "heading" | "table" | "paragraph";
}
```

**Example**:

```tsx
import { DetectedField } from "@/utils/analyzeWordTemplate";

// Use DetectedField in your code where appropriate.
```

#### `detectPlaceholdersInTemplate`

- **Import**: `import { detectPlaceholdersInTemplate } from "@/utils/analyzeWordTemplate";`
- **Kind**: Function
- **Signature**: `detectPlaceholdersInTemplate(file: File): Promise<{ textPlaceholders: string[]; imagePlaceholders: string[]; loopPlaceholders: string[]; }>`

Detects existing placeholders in a template file


**Example**:

```tsx
import { detectPlaceholdersInTemplate } from "@/utils/analyzeWordTemplate";

const result = detectPlaceholdersInTemplate(/* ...args */);
void result;
```

#### `TemplateStructure`

- **Import**: `import { TemplateStructure } from "@/utils/analyzeWordTemplate";`
- **Kind**: Type

**Definition**:

```ts
export interface TemplateStructure {
  headings: Array<{ level: number; text: string; position: number }>;
  tables: Array<{ position: number; rows: number; columns: number }>;
  paragraphs: Array<{ text: string; position: number; isEmpty: boolean }>;
  images: Array<{ 
    position: number; 
    altText?: string; 
    context: string;
    beforeText: string;
    afterText: string;
  }>;
  detectedFields: DetectedField[];
  rawText: string;
  hasFinancialContent: boolean;
  hasTableStructure: boolean;
  hasImages: boolean;
}
```

**Example**:

```tsx
import { TemplateStructure } from "@/utils/analyzeWordTemplate";

// Use TemplateStructure in your code where appropriate.
```

### `@/utils/cableOptimization`

- **Source**: `src/utils/cableOptimization.ts`

#### `analyzeCableOptimizations`

- **Import**: `import { analyzeCableOptimizations } from "@/utils/cableOptimization";`
- **Kind**: Function
- **Signature**: `analyzeCableOptimizations(cableEntries: CableEntry[], cableRates: CableRate[], calcSettings: CalculationSettings): OptimizationResult[]`

**Example**:

```tsx
import { analyzeCableOptimizations } from "@/utils/cableOptimization";

const result = analyzeCableOptimizations(/* ...args */);
void result;
```

#### `OptimizationResult`

- **Import**: `import { OptimizationResult } from "@/utils/cableOptimization";`
- **Kind**: Type

**Definition**:

```ts
export interface OptimizationResult {
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
    supplyCost: number;
    installCost: number;
    terminationCost: number;
    savings: number;
    savingsPercent: number;
    voltDrop: number;
    isCurrentConfig?: boolean;
    complianceReport?: string;
  }>;
  complianceNotes?: string;
}
```

**Example**:

```tsx
import { OptimizationResult } from "@/utils/cableOptimization";

// Use OptimizationResult in your code where appropriate.
```

### `@/utils/cableSizing`

- **Source**: `src/utils/cableSizing.ts`

#### `ALUMINIUM_CABLE_TABLE`

- **Import**: `import { ALUMINIUM_CABLE_TABLE } from "@/utils/cableSizing";`
- **Kind**: Constant

**Example**:

```tsx
import { ALUMINIUM_CABLE_TABLE } from "@/utils/cableSizing";

console.log(ALUMINIUM_CABLE_TABLE);
```

#### `CABLE_SIZING_TABLE`

- **Import**: `import { CABLE_SIZING_TABLE } from "@/utils/cableSizing";`
- **Kind**: Constant

**Example**:

```tsx
import { CABLE_SIZING_TABLE } from "@/utils/cableSizing";

console.log(CABLE_SIZING_TABLE);
```

#### `CableAlternative`

- **Import**: `import { CableAlternative } from "@/utils/cableSizing";`
- **Kind**: Type

**Definition**:

```ts
export interface CableAlternative {
  cableSize: string;
  cablesInParallel: number;
  loadPerCable: number;
  voltDropPercentage: number;
  totalCost: number;
  supplyCost: number;
  installCost: number;
  isRecommended: boolean;
}
```

**Example**:

```tsx
import { CableAlternative } from "@/utils/cableSizing";

// Use CableAlternative in your code where appropriate.
```

#### `CableCalculationParams`

- **Import**: `import { CableCalculationParams } from "@/utils/cableSizing";`
- **Kind**: Type

**Definition**:

```ts
export interface CableCalculationParams {
  loadAmps: number;
  voltage: number;
  totalLength: number; // in meters
  cableType?: string; // for future expansion (e.g., "3C", "4C")
  deratingFactor?: number; // default 1.0
  material?: "copper" | "aluminium"; // default copper
  maxAmpsPerCable?: number; // Maximum amps per cable (default 400A)
  preferredAmpsPerCable?: number; // Preferred amps per cable for parallel runs (default 300A)
  installationMethod?: 'air' | 'ducts' | 'ground'; // Installation method (default 'air')
  safetyMargin?: number; // Safety margin multiplier (e.g., 1.15 for 15% margin)
  voltageDropLimit?: number; // Custom voltage drop limit percentage
}
```

**Example**:

```tsx
import { CableCalculationParams } from "@/utils/cableSizing";

// Use CableCalculationParams in your code where appropriate.
```

#### `CableCalculationResult`

- **Import**: `import { CableCalculationResult } from "@/utils/cableSizing";`
- **Kind**: Type

**Definition**:

```ts
export interface CableCalculationResult {
  recommendedSize: string;
  recommendedQuantity?: number;
  ohmPerKm: number;
  voltDrop: number;
  voltDropPercentage: number;
  supplyCost: number;
  installCost: number;
  totalCost: number;
  cablesInParallel?: number;
  loadPerCable?: number;
  validationWarnings?: ValidationWarning[];
  requiresEngineerVerification?: boolean;
  alternatives?: CableAlternative[]; // Other cost-effective options
  costSavings?: number; // Savings vs most expensive option
  capacitySufficient?: boolean; // True if cable can handle required load
}
```

**Example**:

```tsx
import { CableCalculationResult } from "@/utils/cableSizing";

// Use CableCalculationResult in your code where appropriate.
```

#### `CableData`

- **Import**: `import { CableData } from "@/utils/cableSizing";`
- **Kind**: Type

**Definition**:

```ts
export interface CableData {
  size: string;
  currentRatingGround: number; // Ground (A) - VERIFY AGAINST SANS 10142-1
  currentRatingDucts: number; // Ducts (A) - VERIFY AGAINST SANS 10142-1
  currentRatingAir: number; // Air (A) - VERIFY AGAINST SANS 10142-1
  impedance: number; // Ω/km at 20°C - VERIFY AGAINST SANS 10142-1
  voltDrop3Phase: number; // 3φ Volt drop (mV/A/m) - VERIFY AGAINST SANS 10142-1
  voltDrop1Phase: number; // 1φ Volt drop (mV/A/m) - VERIFY AGAINST SANS 10142-1
  d1_3c: number; // Nominal Diameter D1 - 3 core (mm)
  d1_4c: number; // Nominal Diameter D1 - 4 core (mm)
  d_3c: number; // Nominal Diameter d - 3 core (mm)
  d_4c: number; // Nominal Diameter d - 4 core (mm)
  d2_3c: number; // Nominal Diameter D2 - 3 core (mm)
  d2_4c: number; // Nominal Diameter D2 - 4 core (mm)
  mass_3c: number; // Approx. Mass 3 core (kg/km)
  mass_4c: number; // Approx. Mass 4 core (kg/km)
  supplyCost: number; // Cost per meter (R)
  installCost: number; // Installation cost per meter (R)
}
```

**Example**:

```tsx
import { CableData } from "@/utils/cableSizing";

// Use CableData in your code where appropriate.
```

#### `calculateCableSize`

- **Import**: `import { calculateCableSize } from "@/utils/cableSizing";`
- **Kind**: Function
- **Signature**: `calculateCableSize(params: CableCalculationParams): CableCalculationResult`

Calculate recommended cable size based on load current
Applies derating factor and selects cable with adequate current rating
If length is provided, also checks voltage drop and upsizes if necessary
Returns number of cables needed in parallel if load exceeds maximum cable capacity


**Example**:

```tsx
import { calculateCableSize } from "@/utils/cableSizing";

const result = calculateCableSize(/* ...args */);
void result;
```

#### `COPPER_CABLE_TABLE`

- **Import**: `import { COPPER_CABLE_TABLE } from "@/utils/cableSizing";`
- **Kind**: Constant

**Example**:

```tsx
import { COPPER_CABLE_TABLE } from "@/utils/cableSizing";

console.log(COPPER_CABLE_TABLE);
```

#### `ValidationWarning`

- **Import**: `import { ValidationWarning } from "@/utils/cableSizing";`
- **Kind**: Type

**Definition**:

```ts
export interface ValidationWarning {
  type: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
}
```

**Example**:

```tsx
import { ValidationWarning } from "@/utils/cableSizing";

// Use ValidationWarning in your code where appropriate.
```

### `@/utils/cableValidation`

- **Source**: `src/utils/cableValidation.ts`

#### `validateCableCalculation`

- **Import**: `import { validateCableCalculation } from "@/utils/cableValidation";`
- **Kind**: Function
- **Signature**: `validateCableCalculation(cable: CableData, loadAmps: number, voltage: number, length: number, voltDropPercentage: number, installationMethod: "ground" | "ducts" | "air", deratingFactor?: number): { warnings: ValidationWarning[]; requiresVerification: boolean; }`

Master validation function - returns all warnings/errors


**Example**:

```tsx
import { validateCableCalculation } from "@/utils/cableValidation";

const result = validateCableCalculation(/* ...args */);
void result;
```

#### `validateCableCapacity`

- **Import**: `import { validateCableCapacity } from "@/utils/cableValidation";`
- **Kind**: Function
- **Signature**: `validateCableCapacity(cable: CableData, loadAmps: number, installationMethod: "ground" | "ducts" | "air", deratingFactor?: number): ValidationWarning[]`

Validate that the selected cable can actually carry the load


**Example**:

```tsx
import { validateCableCapacity } from "@/utils/cableValidation";

const result = validateCableCapacity(/* ...args */);
void result;
```

#### `validateCalculationInputs`

- **Import**: `import { validateCalculationInputs } from "@/utils/cableValidation";`
- **Kind**: Function
- **Signature**: `validateCalculationInputs(loadAmps: number, voltage: number, length: number): ValidationWarning[]`

Validate that all calculation inputs are sensible


**Example**:

```tsx
import { validateCalculationInputs } from "@/utils/cableValidation";

const result = validateCalculationInputs(/* ...args */);
void result;
```

#### `validateImpedanceForSize`

- **Import**: `import { validateImpedanceForSize } from "@/utils/cableValidation";`
- **Kind**: Function
- **Signature**: `validateImpedanceForSize(cable: CableData): ValidationWarning[]`

Validate that impedance matches expected range for cable size
This helps catch data table errors


**Example**:

```tsx
import { validateImpedanceForSize } from "@/utils/cableValidation";

const result = validateImpedanceForSize(/* ...args */);
void result;
```

#### `validateVoltageDrop`

- **Import**: `import { validateVoltageDrop } from "@/utils/cableValidation";`
- **Kind**: Function
- **Signature**: `validateVoltageDrop(voltDropPercentage: number, voltage: number): ValidationWarning[]`

Validate voltage drop is within SANS limits


**Example**:

```tsx
import { validateVoltageDrop } from "@/utils/cableValidation";

const result = validateVoltageDrop(/* ...args */);
void result;
```

### `@/utils/captureUIForPDF`

- **Source**: `src/utils/captureUIForPDF.ts`

#### `canvasToDataURL`

- **Import**: `import { canvasToDataURL } from "@/utils/captureUIForPDF";`
- **Kind**: Function
- **Signature**: `canvasToDataURL(canvas: HTMLCanvasElement, format?: "PNG" | "JPEG", quality?: number): string`

**Example**:

```tsx
import { canvasToDataURL } from "@/utils/captureUIForPDF";

const result = canvasToDataURL(/* ...args */);
void result;
```

#### `captureAllCategoryCards`

- **Import**: `import { captureAllCategoryCards } from "@/utils/captureUIForPDF";`
- **Kind**: Function
- **Signature**: `captureAllCategoryCards(categoryIds: string[], options?: CaptureOptions): Promise<Map<string, HTMLCanvasElement>>`

**Example**:

```tsx
import { captureAllCategoryCards } from "@/utils/captureUIForPDF";

const result = captureAllCategoryCards(/* ...args */);
void result;
```

#### `captureCategorySummaryCard`

- **Import**: `import { captureCategorySummaryCard } from "@/utils/captureUIForPDF";`
- **Kind**: Function
- **Signature**: `captureCategorySummaryCard(categoryId: string, options?: CaptureOptions): Promise<HTMLCanvasElement>`

**Example**:

```tsx
import { captureCategorySummaryCard } from "@/utils/captureUIForPDF";

const result = captureCategorySummaryCard(/* ...args */);
void result;
```

#### `captureChart`

- **Import**: `import { captureChart } from "@/utils/captureUIForPDF";`
- **Kind**: Function
- **Signature**: `captureChart(chartId: string, options?: CaptureOptions): Promise<HTMLCanvasElement>`

**Example**:

```tsx
import { captureChart } from "@/utils/captureUIForPDF";

const result = captureChart(/* ...args */);
void result;
```

#### `captureCharts`

- **Import**: `import { captureCharts } from "@/utils/captureUIForPDF";`
- **Kind**: Function
- **Signature**: `captureCharts(elementId?: string, options?: CaptureOptions): Promise<HTMLCanvasElement>`

**Example**:

```tsx
import { captureCharts } from "@/utils/captureUIForPDF";

const result = captureCharts(/* ...args */);
void result;
```

#### `captureKPICards`

- **Import**: `import { captureKPICards } from "@/utils/captureUIForPDF";`
- **Kind**: Function
- **Signature**: `captureKPICards(elementId?: string, options?: CaptureOptions): Promise<HTMLCanvasElement>`

**Example**:

```tsx
import { captureKPICards } from "@/utils/captureUIForPDF";

const result = captureKPICards(/* ...args */);
void result;
```

#### `CaptureOptions`

- **Import**: `import { CaptureOptions } from "@/utils/captureUIForPDF";`
- **Kind**: Type

**Definition**:

```ts
export interface CaptureOptions {
  scale?: number;
  backgroundColor?: string;
  timeout?: number;
}
```

**Example**:

```tsx
import { CaptureOptions } from "@/utils/captureUIForPDF";

// Use CaptureOptions in your code where appropriate.
```

#### `prepareElementForCapture`

- **Import**: `import { prepareElementForCapture } from "@/utils/captureUIForPDF";`
- **Kind**: Function
- **Signature**: `prepareElementForCapture(elementId: string): Promise<void>`

**Example**:

```tsx
import { prepareElementForCapture } from "@/utils/captureUIForPDF";

const result = prepareElementForCapture(/* ...args */);
void result;
```

### `@/utils/componentToImage`

- **Source**: `src/utils/componentToImage.ts`

#### `captureComponentAsImage`

- **Import**: `import { captureComponentAsImage } from "@/utils/componentToImage";`
- **Kind**: Function
- **Signature**: `captureComponentAsImage(elementId: string, options?: { scale?: number; backgroundColor?: string; }): Promise<string>`

**Example**:

```tsx
import { captureComponentAsImage } from "@/utils/componentToImage";

const result = captureComponentAsImage(/* ...args */);
void result;
```

#### `captureMultipleComponents`

- **Import**: `import { captureMultipleComponents } from "@/utils/componentToImage";`
- **Kind**: Function
- **Signature**: `captureMultipleComponents(elementIds: string[], options?: { scale?: number; backgroundColor?: string; }): Promise<Record<string, string>>`

**Example**:

```tsx
import { captureMultipleComponents } from "@/utils/componentToImage";

const result = captureMultipleComponents(/* ...args */);
void result;
```

#### `exportToCSV`

- **Import**: `import { exportToCSV } from "@/utils/componentToImage";`
- **Kind**: Function
- **Signature**: `exportToCSV(data: any[], filename: string, headers?: string[]): void`

**Example**:

```tsx
import { exportToCSV } from "@/utils/componentToImage";

const result = exportToCSV(/* ...args */);
void result;
```

### `@/utils/costReportCalculations`

- **Source**: `src/utils/costReportCalculations.ts`

#### `calculateCategoryTotals`

- **Import**: `import { calculateCategoryTotals } from "@/utils/costReportCalculations";`
- **Kind**: Function
- **Signature**: `calculateCategoryTotals(categories: any[], lineItems: any[], variations: any[]): CategoryTotal[]`

Calculate category totals from categories, line items, and variations
Variations show R0 in Original Budget and Previous Report, full amount in Anticipated Final
Uses precise decimal arithmetic to prevent floating-point rounding errors.


**Example**:

```tsx
import { calculateCategoryTotals } from "@/utils/costReportCalculations";

const result = calculateCategoryTotals(/* ...args */);
void result;
```

#### `calculateGrandTotals`

- **Import**: `import { calculateGrandTotals } from "@/utils/costReportCalculations";`
- **Kind**: Function
- **Signature**: `calculateGrandTotals(categoryTotals: CategoryTotal[]): GrandTotals`

Calculate grand totals from category totals using precise arithmetic


**Example**:

```tsx
import { calculateGrandTotals } from "@/utils/costReportCalculations";

const result = calculateGrandTotals(/* ...args */);
void result;
```

#### `CategoryTotal`

- **Import**: `import { CategoryTotal } from "@/utils/costReportCalculations";`
- **Kind**: Type

**Definition**:

```ts
export interface CategoryTotal {
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

**Example**:

```tsx
import { CategoryTotal } from "@/utils/costReportCalculations";

// Use CategoryTotal in your code where appropriate.
```

#### `GrandTotals`

- **Import**: `import { GrandTotals } from "@/utils/costReportCalculations";`
- **Kind**: Type

**Definition**:

```ts
export interface GrandTotals {
  originalBudget: number;
  previousReport: number;
  anticipatedFinal: number;
  currentVariance: number;
  originalVariance: number;
}
```

**Example**:

```tsx
import { GrandTotals } from "@/utils/costReportCalculations";

// Use GrandTotals in your code where appropriate.
```

#### `totalsMatch`

- **Import**: `import { totalsMatch } from "@/utils/costReportCalculations";`
- **Kind**: Function
- **Signature**: `totalsMatch(total1: number, total2: number, tolerance?: number): boolean`

Compare two totals with a small tolerance for floating point errors


**Example**:

```tsx
import { totalsMatch } from "@/utils/costReportCalculations";

const result = totalsMatch(/* ...args */);
void result;
```

#### `validateTotals`

- **Import**: `import { validateTotals } from "@/utils/costReportCalculations";`
- **Kind**: Function
- **Signature**: `validateTotals(uiTotals: GrandTotals, pdfTotals: GrandTotals): { isValid: boolean; mismatches: string[]; }`

Validate that UI totals match PDF calculation totals


**Example**:

```tsx
import { validateTotals } from "@/utils/costReportCalculations";

const result = validateTotals(/* ...args */);
void result;
```

### `@/utils/decimalPrecision`

- **Source**: `src/utils/decimalPrecision.ts`

#### `add`

- **Import**: `import { add } from "@/utils/decimalPrecision";`
- **Kind**: Function
- **Signature**: `add(values?: (string | number)[]): number`

Precise decimal arithmetic for cost reports and cable schedule calculations.
Prevents floating-point rounding errors that could cause engineering liability issues.


**Example**:

```tsx
import { add } from "@/utils/decimalPrecision";

const result = add(/* ...args */);
void result;
```

#### `calculateCableCost`

- **Import**: `import { calculateCableCost } from "@/utils/decimalPrecision";`
- **Kind**: Function
- **Signature**: `calculateCableCost(length: number, supplyRatePerMeter: number, installRatePerMeter: number, terminationCostPerEnd: number, quantity?: number): { supply: number; install: number; termination: number; total: number; }`

Calculate cable cost with precision


**Example**:

```tsx
import { calculateCableCost } from "@/utils/decimalPrecision";

const result = calculateCableCost(/* ...args */);
void result;
```

#### `calculatePercentage`

- **Import**: `import { calculatePercentage } from "@/utils/decimalPrecision";`
- **Kind**: Function
- **Signature**: `calculatePercentage(part: string | number, whole: string | number): number`

Calculate percentage with precision


**Example**:

```tsx
import { calculatePercentage } from "@/utils/decimalPrecision";

const result = calculatePercentage(/* ...args */);
void result;
```

#### `calculateVariance`

- **Import**: `import { calculateVariance } from "@/utils/decimalPrecision";`
- **Kind**: Function
- **Signature**: `calculateVariance(actual: string | number, budget: string | number): number`

Calculate variance (difference between two values)


**Example**:

```tsx
import { calculateVariance } from "@/utils/decimalPrecision";

const result = calculateVariance(/* ...args */);
void result;
```

#### `calculateVoltageDrop`

- **Import**: `import { calculateVoltageDrop } from "@/utils/decimalPrecision";`
- **Kind**: Function
- **Signature**: `calculateVoltageDrop(current: number, length: number, resistance: number, voltage: number): number`

Calculate voltage drop with precision (for cable sizing)


**Example**:

```tsx
import { calculateVoltageDrop } from "@/utils/decimalPrecision";

const result = calculateVoltageDrop(/* ...args */);
void result;
```

#### `decimal`

- **Import**: `import { decimal } from "@/utils/decimalPrecision";`
- **Kind**: Function
- **Signature**: `decimal(value: string | number): Decimal`

Create a Decimal instance for complex calculations


**Example**:

```tsx
import { decimal } from "@/utils/decimalPrecision";

const result = decimal(/* ...args */);
void result;
```

#### `Decimal`

- **Import**: `import { Decimal } from "@/utils/decimalPrecision";`
- **Kind**: Function
- **Signature**: `Decimal(n: Decimal.Value): Decimal`

**Example**:

```tsx
import { Decimal } from "@/utils/decimalPrecision";

const result = Decimal(/* ...args */);
void result;
```

#### `divide`

- **Import**: `import { divide } from "@/utils/decimalPrecision";`
- **Kind**: Function
- **Signature**: `divide(a: string | number, b: string | number, decimalPlaces?: number): number`

**Example**:

```tsx
import { divide } from "@/utils/decimalPrecision";

const result = divide(/* ...args */);
void result;
```

#### `formatCurrencyPrecise`

- **Import**: `import { formatCurrencyPrecise } from "@/utils/decimalPrecision";`
- **Kind**: Function
- **Signature**: `formatCurrencyPrecise(value: string | number, currencySymbol?: string): string`

Format currency with proper precision


**Example**:

```tsx
import { formatCurrencyPrecise } from "@/utils/decimalPrecision";

const result = formatCurrencyPrecise(/* ...args */);
void result;
```

#### `multiply`

- **Import**: `import { multiply } from "@/utils/decimalPrecision";`
- **Kind**: Function
- **Signature**: `multiply(values?: (string | number)[]): number`

**Example**:

```tsx
import { multiply } from "@/utils/decimalPrecision";

const result = multiply(/* ...args */);
void result;
```

#### `percentage`

- **Import**: `import { percentage } from "@/utils/decimalPrecision";`
- **Kind**: Function
- **Signature**: `percentage(value: string | number, percent: string | number): number`

**Example**:

```tsx
import { percentage } from "@/utils/decimalPrecision";

const result = percentage(/* ...args */);
void result;
```

#### `round`

- **Import**: `import { round } from "@/utils/decimalPrecision";`
- **Kind**: Function
- **Signature**: `round(value: string | number, decimalPlaces?: number): number`

**Example**:

```tsx
import { round } from "@/utils/decimalPrecision";

const result = round(/* ...args */);
void result;
```

#### `subtract`

- **Import**: `import { subtract } from "@/utils/decimalPrecision";`
- **Kind**: Function
- **Signature**: `subtract(a: string | number, b: string | number): number`

**Example**:

```tsx
import { subtract } from "@/utils/decimalPrecision";

const result = subtract(/* ...args */);
void result;
```

#### `sum`

- **Import**: `import { sum } from "@/utils/decimalPrecision";`
- **Kind**: Function
- **Signature**: `sum(values: number[]): number`

**Example**:

```tsx
import { sum } from "@/utils/decimalPrecision";

const result = sum(/* ...args */);
void result;
```

### `@/utils/excelParser`

- **Source**: `src/utils/excelParser.ts`

#### `ColumnDetectionResult`

- **Import**: `import { ColumnDetectionResult } from "@/utils/excelParser";`
- **Kind**: Type

**Definition**:

```ts
export interface ColumnDetectionResult {
  itemCode?: number;
  description?: number;
  quantity?: number;
  unit?: number;
  supplyRate?: number;
  installRate?: number;
  totalRate?: number;
  amount?: number;
}
```

**Example**:

```tsx
import { ColumnDetectionResult } from "@/utils/excelParser";

// Use ColumnDetectionResult in your code where appropriate.
```

#### `detectBOQColumns`

- **Import**: `import { detectBOQColumns } from "@/utils/excelParser";`
- **Kind**: Function
- **Signature**: `detectBOQColumns(headers: string[]): ColumnDetectionResult`

Detect common BOQ column patterns in headers using Phase 1 patterns
COLUMN DETECTION PATTERNS (from BOQ Development Phase 1):
- Item Code: /item|code|no\.?|ref/i
- Description: /desc|name|particular/i  
- Unit: /unit|uom/i
- Quantity: /qty|quantity/i
- Rate: /rate|price|cost/i
- Amount: /amount|total|value/i


**Example**:

```tsx
import { detectBOQColumns } from "@/utils/excelParser";

const result = detectBOQColumns(/* ...args */);
void result;
```

#### `getColumnDetectionSummary`

- **Import**: `import { getColumnDetectionSummary } from "@/utils/excelParser";`
- **Kind**: Function
- **Signature**: `getColumnDetectionSummary(detection: ColumnDetectionResult, headers: string[]): { detected: string[]; missing: string[]; mappings: { field: string; column: string; index: number; }[]; }`

Get column detection summary for display


**Example**:

```tsx
import { getColumnDetectionSummary } from "@/utils/excelParser";

const result = getColumnDetectionSummary(/* ...args */);
void result;
```

#### `ParsedExcelResult`

- **Import**: `import { ParsedExcelResult } from "@/utils/excelParser";`
- **Kind**: Type

**Definition**:

```ts
export interface ParsedExcelResult {
  sheets: ParsedSheet[];
  totalRows: number;
  combinedText: string;
  columnDetection: Record<string, ColumnDetectionResult>;
}
```

**Example**:

```tsx
import { ParsedExcelResult } from "@/utils/excelParser";

// Use ParsedExcelResult in your code where appropriate.
```

#### `ParsedSheet`

- **Import**: `import { ParsedSheet } from "@/utils/excelParser";`
- **Kind**: Type

**Definition**:

```ts
export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: Record<string, string | number | null>[];
  rawText: string;
  rowCount: number;
}
```

**Example**:

```tsx
import { ParsedSheet } from "@/utils/excelParser";

// Use ParsedSheet in your code where appropriate.
```

#### `parseExcelFile`

- **Import**: `import { parseExcelFile } from "@/utils/excelParser";`
- **Kind**: Function
- **Signature**: `parseExcelFile(file: File): Promise<ParsedExcelResult>`

Parse an Excel file and extract all sheets with their data


**Example**:

```tsx
import { parseExcelFile } from "@/utils/excelParser";

const result = parseExcelFile(/* ...args */);
void result;
```

### `@/utils/executiveSummaryTable`

- **Source**: `src/utils/executiveSummaryTable.ts`

#### `ExecutiveSummaryRow`

- **Import**: `import { ExecutiveSummaryRow } from "@/utils/executiveSummaryTable";`
- **Kind**: Type

Shared Executive Summary table configuration
Used by both UI and PDF export to ensure consistency


**Definition**:

```ts
export interface ExecutiveSummaryRow {
  code: string;
  description: string;
  originalBudget: number;
  previousReport: number;
  anticipatedFinal: number;
  percentOfTotal: string;
  currentVariance: number;
  originalVariance: number;
}
```

**Example**:

```tsx
import { ExecutiveSummaryRow } from "@/utils/executiveSummaryTable";

// Use ExecutiveSummaryRow in your code where appropriate.
```

#### `ExecutiveSummaryTableData`

- **Import**: `import { ExecutiveSummaryTableData } from "@/utils/executiveSummaryTable";`
- **Kind**: Type

**Definition**:

```ts
export interface ExecutiveSummaryTableData {
  headers: string[];
  categoryRows: ExecutiveSummaryRow[];
  grandTotalRow: ExecutiveSummaryRow;
}
```

**Example**:

```tsx
import { ExecutiveSummaryTableData } from "@/utils/executiveSummaryTable";

// Use ExecutiveSummaryTableData in your code where appropriate.
```

#### `formatCurrency`

- **Import**: `import { formatCurrency } from "@/utils/executiveSummaryTable";`
- **Kind**: Function
- **Signature**: `formatCurrency(amount: number): string`

**Example**:

```tsx
import { formatCurrency } from "@/utils/executiveSummaryTable";

const result = formatCurrency(/* ...args */);
void result;
```

#### `formatVariance`

- **Import**: `import { formatVariance } from "@/utils/executiveSummaryTable";`
- **Kind**: Function
- **Signature**: `formatVariance(variance: number): string`

**Example**:

```tsx
import { formatVariance } from "@/utils/executiveSummaryTable";

const result = formatVariance(/* ...args */);
void result;
```

#### `generateExecutiveSummaryTableData`

- **Import**: `import { generateExecutiveSummaryTableData } from "@/utils/executiveSummaryTable";`
- **Kind**: Function
- **Signature**: `generateExecutiveSummaryTableData(categoryTotals: any[], grandTotals: any): ExecutiveSummaryTableData`

**Example**:

```tsx
import { generateExecutiveSummaryTableData } from "@/utils/executiveSummaryTable";

const result = generateExecutiveSummaryTableData(/* ...args */);
void result;
```

### `@/utils/exportPredictionPDF`

- **Source**: `src/utils/exportPredictionPDF.ts`

#### `exportPredictionToPDF`

- **Import**: `import { exportPredictionToPDF } from "@/utils/exportPredictionPDF";`
- **Kind**: Function
- **Signature**: `exportPredictionToPDF({ predictionData, projectName, projectNumber, parameters, }: ExportParams): Promise<void>`

**Example**:

```tsx
import { exportPredictionToPDF } from "@/utils/exportPredictionPDF";

const result = exportPredictionToPDF(/* ...args */);
void result;
```

### `@/utils/formatters`

- **Source**: `src/utils/formatters.ts`

#### `formatCurrency`

- **Import**: `import { formatCurrency } from "@/utils/formatters";`
- **Kind**: Function
- **Signature**: `formatCurrency(value: string | number): string`

**Example**:

```tsx
import { formatCurrency } from "@/utils/formatters";

const result = formatCurrency(/* ...args */);
void result;
```

#### `formatNumber`

- **Import**: `import { formatNumber } from "@/utils/formatters";`
- **Kind**: Function
- **Signature**: `formatNumber(value: string | number, decimals?: number): string`

**Example**:

```tsx
import { formatNumber } from "@/utils/formatters";

const result = formatNumber(/* ...args */);
void result;
```

#### `formatPercentage`

- **Import**: `import { formatPercentage } from "@/utils/formatters";`
- **Kind**: Function
- **Signature**: `formatPercentage(value: string | number): string`

**Example**:

```tsx
import { formatPercentage } from "@/utils/formatters";

const result = formatPercentage(/* ...args */);
void result;
```

### `@/utils/generateCostReportTemplate`

- **Source**: `src/utils/generateCostReportTemplate.ts`

#### `generateCostReportTemplate`

- **Import**: `import { generateCostReportTemplate } from "@/utils/generateCostReportTemplate";`
- **Kind**: Function
- **Signature**: `generateCostReportTemplate(): Promise<Blob>`

**Example**:

```tsx
import { generateCostReportTemplate } from "@/utils/generateCostReportTemplate";

const result = generateCostReportTemplate(/* ...args */);
void result;
```

### `@/utils/generatorSizing`

- **Source**: `src/utils/generatorSizing.ts`

#### `GENERATOR_SIZING_TABLE`

- **Import**: `import { GENERATOR_SIZING_TABLE } from "@/utils/generatorSizing";`
- **Kind**: Constant

**Example**:

```tsx
import { GENERATOR_SIZING_TABLE } from "@/utils/generatorSizing";

console.log(GENERATOR_SIZING_TABLE);
```

#### `GeneratorSizingData`

- **Import**: `import { GeneratorSizingData } from "@/utils/generatorSizing";`
- **Kind**: Type

**Definition**:

```ts
export interface GeneratorSizingData {
  rating: string;
  load25: number;
  load50: number;
  load75: number;
  load100: number;
}
```

**Example**:

```tsx
import { GeneratorSizingData } from "@/utils/generatorSizing";

// Use GeneratorSizingData in your code where appropriate.
```

### `@/utils/lightingReportPDF`

- **Source**: `src/utils/lightingReportPDF.ts`

#### `generateLightingReportPDF`

- **Import**: `import { generateLightingReportPDF } from "@/utils/lightingReportPDF";`
- **Kind**: Function
- **Signature**: `generateLightingReportPDF(projectId: string, config: LightingReportConfig): Promise<void>`

**Example**:

```tsx
import { generateLightingReportPDF } from "@/utils/lightingReportPDF";

const result = generateLightingReportPDF(/* ...args */);
void result;
```

### `@/utils/pdfCoverPage`

- **Source**: `src/utils/pdfCoverPage.ts`

#### `CompanyDetails`

- **Import**: `import { CompanyDetails } from "@/utils/pdfCoverPage";`
- **Kind**: Type

**Definition**:

```ts
export interface CompanyDetails {
  /** Company name from settings (defaults to "WATSON MATTHEUS...") */
  companyName: string;
  /** URL to company logo from storage (optional) */
  logoUrl?: string;
  /** Contact person name from logged-in user's employee record */
  contactName: string;
  /** Contact phone number from employee record or default */
  contactPhone: string;
  /** Client/recipient name for "Prepared For" section */
  clientName?: string;
  /** Client logo URL for cover pages */
  clientLogoUrl?: string;
  /** Client address line 1 */
  clientAddressLine1?: string;
  /** Client address line 2 */
  clientAddressLine2?: string;
  /** Client phone number */
  clientPhone?: string;
}
```

**Example**:

```tsx
import { CompanyDetails } from "@/utils/pdfCoverPage";

// Use CompanyDetails in your code where appropriate.
```

#### `CoverPageOptions`

- **Import**: `import { CoverPageOptions } from "@/utils/pdfCoverPage";`
- **Kind**: Type

**Definition**:

```ts
export interface CoverPageOptions {
  /** Main title at top of page (e.g., "Financial Evaluation", "Cable Schedule") */
  title: string;
  /** Project or report name (e.g., "Segonyana Mall", "Generator Report") */
  projectName: string;
  /** Subtitle below project name (e.g., "Centre Standby Plant", "Schedule #123") */
  subtitle: string;
  /** Revision information (e.g., "Rev 0", "Rev 1") */
  revision: string;
  /** Optional date override (defaults to current date if not provided) */
  date?: string;
}
```

**Example**:

```tsx
import { CoverPageOptions } from "@/utils/pdfCoverPage";

// Use CoverPageOptions in your code where appropriate.
```

#### `fetchCompanyDetails`

- **Import**: `import { fetchCompanyDetails } from "@/utils/pdfCoverPage";`
- **Kind**: Function
- **Signature**: `fetchCompanyDetails(): Promise<CompanyDetails>`

Fetches company settings and current user details for the cover page.


**Example**:

```tsx
import { fetchCompanyDetails } from "@/utils/pdfCoverPage";

const result = fetchCompanyDetails(/* ...args */);
void result;
```

#### `generateCoverPage`

- **Import**: `import { generateCoverPage } from "@/utils/pdfCoverPage";`
- **Kind**: Function
- **Signature**: `generateCoverPage(doc: jsPDF, options: CoverPageOptions, companyDetails: CompanyDetails, contactId?: string, skipTemplate?: boolean): Promise<void>`

Main function to generate a cover page.
ALWAYS uses Word template from database.


**Example**:

```tsx
import { generateCoverPage } from "@/utils/pdfCoverPage";

const result = generateCoverPage(/* ...args */);
void result;
```

### `@/utils/pdfCoverPageSimple`

- **Source**: `src/utils/pdfCoverPageSimple.ts`

#### `CoverPageData`

- **Import**: `import { CoverPageData } from "@/utils/pdfCoverPageSimple";`
- **Kind**: Type

**Definition**:

```ts
export interface CoverPageData {
  project_name: string;
  client_name: string;
  report_title: string;
  report_date: string;
  revision: string;
  subtitle?: string;
  contact_name?: string;
  contact_phone?: string;
  project_id?: string;
  contact_id?: string;
}
```

**Example**:

```tsx
import { CoverPageData } from "@/utils/pdfCoverPageSimple";

// Use CoverPageData in your code where appropriate.
```

#### `generateCoverPage`

- **Import**: `import { generateCoverPage } from "@/utils/pdfCoverPageSimple";`
- **Kind**: Function
- **Signature**: `generateCoverPage(doc: jsPDF, reportData: CoverPageData): Promise<void>`

Generates a simple, reliable cover page directly with jsPDF


**Example**:

```tsx
import { generateCoverPage } from "@/utils/pdfCoverPageSimple";

const result = generateCoverPage(/* ...args */);
void result;
```

### `@/utils/pdfExportBase`

- **Source**: `src/utils/pdfExportBase.ts`

#### `addBodyText`

- **Import**: `import { addBodyText } from "@/utils/pdfExportBase";`
- **Kind**: Function
- **Signature**: `addBodyText(doc: jsPDF, text: string, x: number, y: number, quality?: QualityPreset): void`

**Example**:

```tsx
import { addBodyText } from "@/utils/pdfExportBase";

const result = addBodyText(/* ...args */);
void result;
```

#### `addKeyValue`

- **Import**: `import { addKeyValue } from "@/utils/pdfExportBase";`
- **Kind**: Function
- **Signature**: `addKeyValue(doc: jsPDF, key: string, value: string, x: number, y: number, quality?: QualityPreset): number`

**Example**:

```tsx
import { addKeyValue } from "@/utils/pdfExportBase";

const result = addKeyValue(/* ...args */);
void result;
```

#### `addPageNumbers`

- **Import**: `import { addPageNumbers } from "@/utils/pdfExportBase";`
- **Kind**: Function
- **Signature**: `addPageNumbers(doc: jsPDF, startPage?: number, quality?: QualityPreset): void`

**Example**:

```tsx
import { addPageNumbers } from "@/utils/pdfExportBase";

const result = addPageNumbers(/* ...args */);
void result;
```

#### `addSectionHeader`

- **Import**: `import { addSectionHeader } from "@/utils/pdfExportBase";`
- **Kind**: Function
- **Signature**: `addSectionHeader(doc: jsPDF, text: string, y: number, quality?: QualityPreset): number`

**Example**:

```tsx
import { addSectionHeader } from "@/utils/pdfExportBase";

const result = addSectionHeader(/* ...args */);
void result;
```

#### `checkPageBreak`

- **Import**: `import { checkPageBreak } from "@/utils/pdfExportBase";`
- **Kind**: Function
- **Signature**: `checkPageBreak(doc: jsPDF, currentY: number, requiredSpace?: number): number`

**Example**:

```tsx
import { checkPageBreak } from "@/utils/pdfExportBase";

const result = checkPageBreak(/* ...args */);
void result;
```

#### `getStandardTableStyles`

- **Import**: `import { getStandardTableStyles } from "@/utils/pdfExportBase";`
- **Kind**: Function
- **Signature**: `getStandardTableStyles(quality?: QualityPreset): { theme: "grid"; headStyles: { fillColor: number[]; textColor: number[]; fontSize: number; fontStyle: string; halign: "left"; cellPadding: number; }; bodyStyles: { fontSize: number; textColor: number[]; cellPadding: number; }; alternateRowStyles: { fillColor: number[]; }; styles: { lineColor: number[]; lineWidth: number; overflow: "linebreak"; cellWidth: "auto"; }; margin: PageMargins; }`

**Example**:

```tsx
import { getStandardTableStyles } from "@/utils/pdfExportBase";

const result = getStandardTableStyles(/* ...args */);
void result;
```

#### `initializePDF`

- **Import**: `import { initializePDF } from "@/utils/pdfExportBase";`
- **Kind**: Function
- **Signature**: `initializePDF(options?: PDFExportOptions): jsPDF`

**Example**:

```tsx
import { initializePDF } from "@/utils/pdfExportBase";

const result = initializePDF(/* ...args */);
void result;
```

#### `PageMargins`

- **Import**: `import { PageMargins } from "@/utils/pdfExportBase";`
- **Kind**: Type

**Definition**:

```ts
export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
```

**Example**:

```tsx
import { PageMargins } from "@/utils/pdfExportBase";

// Use PageMargins in your code where appropriate.
```

#### `PDFExportOptions`

- **Import**: `import { PDFExportOptions } from "@/utils/pdfExportBase";`
- **Kind**: Type

**Definition**:

```ts
export interface PDFExportOptions {
  quality?: QualityPreset;
  orientation?: 'portrait' | 'landscape';
  compress?: boolean;
}
```

**Example**:

```tsx
import { PDFExportOptions } from "@/utils/pdfExportBase";

// Use PDFExportOptions in your code where appropriate.
```

#### `STANDARD_MARGINS`

- **Import**: `import { STANDARD_MARGINS } from "@/utils/pdfExportBase";`
- **Kind**: Constant

**Example**:

```tsx
import { STANDARD_MARGINS } from "@/utils/pdfExportBase";

console.log(STANDARD_MARGINS);
```

#### `wrapText`

- **Import**: `import { wrapText } from "@/utils/pdfExportBase";`
- **Kind**: Function
- **Signature**: `wrapText(doc: jsPDF, text: string, maxWidth: number): string[]`

**Example**:

```tsx
import { wrapText } from "@/utils/pdfExportBase";

const result = wrapText(/* ...args */);
void result;
```

### `@/utils/pdfFilenameGenerator`

- **Source**: `src/utils/pdfFilenameGenerator.ts`

#### `generateStandardizedPDFFilename`

- **Import**: `import { generateStandardizedPDFFilename } from "@/utils/pdfFilenameGenerator";`
- **Kind**: Function
- **Signature**: `generateStandardizedPDFFilename(options: PDFFilenameOptions): string`

**Example**:

```tsx
import { generateStandardizedPDFFilename } from "@/utils/pdfFilenameGenerator";

const result = generateStandardizedPDFFilename(/* ...args */);
void result;
```

#### `generateStorageFilename`

- **Import**: `import { generateStorageFilename } from "@/utils/pdfFilenameGenerator";`
- **Kind**: Function
- **Signature**: `generateStorageFilename(options: PDFFilenameOptions): string`

Generate filename for storage (includes timestamp for uniqueness)


**Example**:

```tsx
import { generateStorageFilename } from "@/utils/pdfFilenameGenerator";

const result = generateStorageFilename(/* ...args */);
void result;
```

#### `PDFFilenameOptions`

- **Import**: `import { PDFFilenameOptions } from "@/utils/pdfFilenameGenerator";`
- **Kind**: Type

Generate standardized PDF filenames with ISO dates and project numbers
Format: PROJ-{number}_{type}_{ISO-date}_{timestamp}.pdf


**Definition**:

```ts
export interface PDFFilenameOptions {
  projectNumber?: string;
  reportType: string;
  reportNumber?: string | number;
  revision?: string;
}
```

**Example**:

```tsx
import { PDFFilenameOptions } from "@/utils/pdfFilenameGenerator";

// Use PDFFilenameOptions in your code where appropriate.
```

### `@/utils/pdfQualitySettings`

- **Source**: `src/utils/pdfQualitySettings.ts`

#### `addHighQualityImage`

- **Import**: `import { addHighQualityImage } from "@/utils/pdfQualitySettings";`
- **Kind**: Function
- **Signature**: `addHighQualityImage(doc: jsPDF, canvas: HTMLCanvasElement, x: number, y: number, width: number, height: number, format?: "PNG" | "JPEG", quality?: number): void`

**Example**:

```tsx
import { addHighQualityImage } from "@/utils/pdfQualitySettings";

const result = addHighQualityImage(/* ...args */);
void result;
```

#### `captureChartAsCanvas`

- **Import**: `import { captureChartAsCanvas } from "@/utils/pdfQualitySettings";`
- **Kind**: Function
- **Signature**: `captureChartAsCanvas(element: HTMLElement, options?: Partial<{ readonly scale: 2; readonly useCORS: true; readonly allowTaint: false; readonly backgroundColor: "#ffffff"; readonly logging: false; readonly imageTimeout: 20000; readonly removeContainer: true; readonly letterRendering: true; readonly windowWidth: 1200; readonly windowHeight: 800; }>): Promise<HTMLCanvasElement>`

**Example**:

```tsx
import { captureChartAsCanvas } from "@/utils/pdfQualitySettings";

const result = captureChartAsCanvas(/* ...args */);
void result;
```

#### `captureElementAsCanvas`

- **Import**: `import { captureElementAsCanvas } from "@/utils/pdfQualitySettings";`
- **Kind**: Function
- **Signature**: `captureElementAsCanvas(element: HTMLElement, options?: Partial<{ readonly scale: 2; readonly useCORS: true; readonly allowTaint: false; readonly backgroundColor: "#ffffff"; readonly logging: false; readonly imageTimeout: 15000; readonly removeContainer: true; readonly letterRendering: true; }>): Promise<HTMLCanvasElement>`

**Example**:

```tsx
import { captureElementAsCanvas } from "@/utils/pdfQualitySettings";

const result = captureElementAsCanvas(/* ...args */);
void result;
```

#### `CHART_QUALITY_CANVAS_OPTIONS`

- **Import**: `import { CHART_QUALITY_CANVAS_OPTIONS } from "@/utils/pdfQualitySettings";`
- **Kind**: Constant

**Example**:

```tsx
import { CHART_QUALITY_CANVAS_OPTIONS } from "@/utils/pdfQualitySettings";

console.log(CHART_QUALITY_CANVAS_OPTIONS);
```

#### `createHighQualityPDF`

- **Import**: `import { createHighQualityPDF } from "@/utils/pdfQualitySettings";`
- **Kind**: Function
- **Signature**: `createHighQualityPDF(orientation?: "portrait" | "landscape", compress?: boolean): jsPDF`

**Example**:

```tsx
import { createHighQualityPDF } from "@/utils/pdfQualitySettings";

const result = createHighQualityPDF(/* ...args */);
void result;
```

#### `getQualitySettings`

- **Import**: `import { getQualitySettings } from "@/utils/pdfQualitySettings";`
- **Kind**: Function
- **Signature**: `getQualitySettings(preset?: QualityPreset): QualitySettings`

**Example**:

```tsx
import { getQualitySettings } from "@/utils/pdfQualitySettings";

const result = getQualitySettings(/* ...args */);
void result;
```

#### `HIGH_QUALITY_CANVAS_OPTIONS`

- **Import**: `import { HIGH_QUALITY_CANVAS_OPTIONS } from "@/utils/pdfQualitySettings";`
- **Kind**: Constant

**Example**:

```tsx
import { HIGH_QUALITY_CANVAS_OPTIONS } from "@/utils/pdfQualitySettings";

console.log(HIGH_QUALITY_CANVAS_OPTIONS);
```

#### `prepareElementForCapture`

- **Import**: `import { prepareElementForCapture } from "@/utils/pdfQualitySettings";`
- **Kind**: Function
- **Signature**: `prepareElementForCapture(element: HTMLElement): Promise<void>`

**Example**:

```tsx
import { prepareElementForCapture } from "@/utils/pdfQualitySettings";

const result = prepareElementForCapture(/* ...args */);
void result;
```

#### `QUALITY_PRESETS`

- **Import**: `import { QUALITY_PRESETS } from "@/utils/pdfQualitySettings";`
- **Kind**: Constant

**Example**:

```tsx
import { QUALITY_PRESETS } from "@/utils/pdfQualitySettings";

console.log(QUALITY_PRESETS);
```

#### `QualityPreset`

- **Import**: `import { QualityPreset } from "@/utils/pdfQualitySettings";`
- **Kind**: Type

**Definition**:

```ts
export type QualityPreset = 'draft' | 'standard' | 'high';
```

**Example**:

```tsx
import { QualityPreset } from "@/utils/pdfQualitySettings";

// Use QualityPreset in your code where appropriate.
```

#### `QualitySettings`

- **Import**: `import { QualitySettings } from "@/utils/pdfQualitySettings";`
- **Kind**: Type

**Definition**:

```ts
export interface QualitySettings {
  scale: number;
  compression: number;
  format: 'PNG' | 'JPEG';
  fontSize: {
    table: number;
    body: number;
    heading: number;
  };
}
```

**Example**:

```tsx
import { QualitySettings } from "@/utils/pdfQualitySettings";

// Use QualitySettings in your code where appropriate.
```

#### `STANDARD_QUALITY_CANVAS_OPTIONS`

- **Import**: `import { STANDARD_QUALITY_CANVAS_OPTIONS } from "@/utils/pdfQualitySettings";`
- **Kind**: Constant

**Example**:

```tsx
import { STANDARD_QUALITY_CANVAS_OPTIONS } from "@/utils/pdfQualitySettings";

console.log(STANDARD_QUALITY_CANVAS_OPTIONS);
```

#### `waitForElementRender`

- **Import**: `import { waitForElementRender } from "@/utils/pdfQualitySettings";`
- **Kind**: Function
- **Signature**: `waitForElementRender(ms?: number): Promise<void>`

**Example**:

```tsx
import { waitForElementRender } from "@/utils/pdfQualitySettings";

const result = waitForElementRender(/* ...args */);
void result;
```

### `@/utils/pdfStyleManager`

- **Source**: `src/utils/pdfStyleManager.ts`

#### `ElementMetadata`

- **Import**: `import { ElementMetadata } from "@/utils/pdfStyleManager";`
- **Kind**: Type

**Definition**:

```ts
export interface ElementMetadata {
  visible: boolean;
  locked: boolean;
  zIndex: number;
  page?: number; // Which page this element is on
}
```

**Example**:

```tsx
import { ElementMetadata } from "@/utils/pdfStyleManager";

// Use ElementMetadata in your code where appropriate.
```

#### `ElementPosition`

- **Import**: `import { ElementPosition } from "@/utils/pdfStyleManager";`
- **Kind**: Type

**Definition**:

```ts
export interface ElementPosition {
  x: number;
  y: number;
  page?: number; // Which PDF page the element belongs to (1-indexed)
}
```

**Example**:

```tsx
import { ElementPosition } from "@/utils/pdfStyleManager";

// Use ElementPosition in your code where appropriate.
```

#### `PDFStyleManager`

- **Import**: `import { PDFStyleManager } from "@/utils/pdfStyleManager";`
- **Kind**: Class

**Definition**:

```ts
export class PDFStyleManager {
  constructor(private settings: PDFStyleSettings) {}

  getSettings(): PDFStyleSettings {
    return this.settings;
  }

  applyHeading(doc: jsPDF, level: 1 | 2 | 3, text: string, x: number, y: number, options?: any) {
    const sizeKey = `h${level}Size` as 'h1Size' | 'h2Size' | 'h3Size';
    doc.setFont(this.settings.typography.headingFont, 'bold');
    doc.setFontSize(this.settings.typography[sizeKey]);
    doc.setTextColor(...this.settings.colors.primary);
    doc.text(text, x, y, options);
    return y + this.settings.typography[sizeKey] * 0.5;
  }

  applyBodyText(doc: jsPDF, text: string, x: number, y: number, options?: any) {
    doc.setFont(this.settings.typography.bodyFont, 'normal');
    doc.setFontSize(this.settings.typography.bodySize);
    doc.setTextColor(...this.settings.colors.text);
    doc.text(text, x, y, options);
    return y + this.settings.typography.bodySize * 0.5;
  }

  applySmallText(doc: jsPDF, text: string, x: number, y: number, options?: any) {
    doc.setFont(this.settings.typography.bodyFont, 'normal');
    doc.setFontSize(this.settings.typography.smallSize);
    doc.setTextColor(...this.settings.colors.secondary);
    doc.text(text, x, y, options);
    return y + this.settings.typography.smallSize * 0.5;
  }

  applySectionHeader(doc: jsPDF, text: string, x: number, y: number, pageWidth: number, margins: { left: number; right: number }) {
    this.applyHeading(doc, 1, text, pageWidth / 2, y + 5, { align: "center" });
    
    // Add subtle line under header
    doc.setDrawColor(...this.settings.colors.neutral);
    doc.setLineWidth(0.5);
    doc.line(x, y + 8, pageWidth - margins.right, y + 8);
    
    return y + 20;
  }

  getTableStyles() {
    return {
      headStyles: {
        fillColor: this.settings.tables.headerBg,
        textColor: this.settings.tables.headerText,
        fontSize: this.settings.tables.fontSize,
        fontStyle: 'bold',
        cellPadding: this.settings.tables.cellPadding,
        halign: 'left' as const,
      },
      bodyStyles: {
        fontSize: this.settings.tables.fontSize,
        cellPadding: this.settings.tables.cellPadding,
        textColor: this.settings.colors.text,
      },
      alternateRowStyles: {
        fillColor: this.settings.tables.alternateRowBg,
      },
      styles: {
        lineColor: this.settings.tables.showGridLines ? this.settings.tables.borderColor : undefined,
        lineWidth: this.settings.tables.showGridLines ? 0.1 : 0,
      },
    };
  }

  getMargins() {
    return this.settings.layout.margins;
  }

  getLineSpacing() {
    return this.settings.spacing.lineSpacing;
  }

  getParagraphSpacing() {
    return this.settings.spacing.paragraphSpacing;
  }

  getSectionSpacing() {
    return this.settings.spacing.sectionSpacing;
  }

  getElementPosition(elementKey: string): ElementPosition | null {
    return this.settings.positions?.[elementKey] || null;
  }

  setElementPosition(elementKey: string, position: ElementPosition) {
    if (!this.settings.positions) {
      this.settings.positions = {};
    }
    this.settings.positions[elementKey] = position;
  }

  getGridSettings() {
    return this.settings.grid || { size: 10, enabled: true, visible: true };
  }

  snapToGrid(value: number): number {
    const grid = this.getGridSettings();
    if (!grid.enabled) return value;
    return Math.round(value / grid.size) * grid.size;
  }

  getElementMetadata(elementKey: string): ElementMetadata {
    return this.settings.elements?.[elementKey] || { 
      visible: true, 
      locked: false, 
      zIndex: 0 
    };
  }

  setElementMetadata(elementKey: string, metadata: Partial<ElementMetadata>) {
    if (!this.settings.elements) {
      this.settings.elements = {};
    }
    this.settings.elements[elementKey] = {
      ...this.getElementMetadata(elementKey),
      ...metadata
    };
  }

  getAllElements(): string[] {
    const positionKeys = Object.keys(this.settings.positions || {});
    const metadataKeys = Object.keys(this.settings.elements || {});
    return Array.from(new Set([...positionKeys, ...metadataKeys]));
  }
}
```

**Example**:

```tsx
import { PDFStyleManager } from "@/utils/pdfStyleManager";

// Use PDFStyleManager in your code where appropriate.
```

#### `PDFStyleSettings`

- **Import**: `import { PDFStyleSettings } from "@/utils/pdfStyleManager";`
- **Kind**: Type

**Definition**:

```ts
export interface PDFStyleSettings {
  typography: {
    headingFont: 'helvetica' | 'times' | 'courier';
    bodyFont: 'helvetica' | 'times' | 'courier';
    h1Size: number;
    h2Size: number;
    h3Size: number;
    bodySize: number;
    smallSize: number;
  };
  colors: {
    primary: [number, number, number];
    secondary: [number, number, number];
    accent: [number, number, number];
    text: [number, number, number];
    neutral: [number, number, number];
    success: [number, number, number];
    danger: [number, number, number];
    warning: [number, number, number];
    white: [number, number, number];
  };
  spacing: {
    lineSpacing: number;
    paragraphSpacing: number;
    sectionSpacing: number;
  };
  tables: {
    headerBg: [number, number, number];
    headerText: [number, number, number];
    alternateRowBg: [number, number, number];
    borderColor: [number, number, number];
    fontSize: number;
    cellPadding: number;
    showGridLines: boolean;
  };
  layout: {
    margins: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  };
  positions?: {
    [elementKey: string]: ElementPosition;
  };
  grid?: {
    size: number;
    enabled: boolean;
    visible: boolean;
  };
  elements?: {
    [elementKey: string]: ElementMetadata;
  };
}
```

**Example**:

```tsx
import { PDFStyleSettings } from "@/utils/pdfStyleManager";

// Use PDFStyleSettings in your code where appropriate.
```

### `@/utils/pdfUserPreferences`

- **Source**: `src/utils/pdfUserPreferences.ts`

#### `getUserQualityPreset`

- **Import**: `import { getUserQualityPreset } from "@/utils/pdfUserPreferences";`
- **Kind**: Function
- **Signature**: `getUserQualityPreset(): QualityPreset`

Get the user's preferred PDF quality preset from localStorage
Falls back to 'standard' if not set


**Example**:

```tsx
import { getUserQualityPreset } from "@/utils/pdfUserPreferences";

const result = getUserQualityPreset(/* ...args */);
void result;
```

#### `setUserQualityPreset`

- **Import**: `import { setUserQualityPreset } from "@/utils/pdfUserPreferences";`
- **Kind**: Function
- **Signature**: `setUserQualityPreset(preset: QualityPreset): void`

Set the user's preferred PDF quality preset


**Example**:

```tsx
import { setUserQualityPreset } from "@/utils/pdfUserPreferences";

const result = setUserQualityPreset(/* ...args */);
void result;
```

### `@/utils/placeholderDetection`

- **Source**: `src/utils/placeholderDetection.ts`

#### `detectPlaceholders`

- **Import**: `import { detectPlaceholders } from "@/utils/placeholderDetection";`
- **Kind**: Function
- **Signature**: `detectPlaceholders(file: File): Promise<{ textPlaceholders: string[]; imagePlaceholders: string[]; loopPlaceholders: string[]; }>`

Detects placeholders in a DOCX template file


**Example**:

```tsx
import { detectPlaceholders } from "@/utils/placeholderDetection";

const result = detectPlaceholders(/* ...args */);
void result;
```

#### `getPlaceholderSuggestions`

- **Import**: `import { getPlaceholderSuggestions } from "@/utils/placeholderDetection";`
- **Kind**: Function
- **Signature**: `getPlaceholderSuggestions(templateType: string): PlaceholderInfo[]`

Get common placeholder suggestions based on template type


**Example**:

```tsx
import { getPlaceholderSuggestions } from "@/utils/placeholderDetection";

const result = getPlaceholderSuggestions(/* ...args */);
void result;
```

#### `PlaceholderInfo`

- **Import**: `import { PlaceholderInfo } from "@/utils/placeholderDetection";`
- **Kind**: Type

**Definition**:

```ts
export interface PlaceholderInfo {
  placeholder: string;
  description: string;
  example?: string;
}
```

**Example**:

```tsx
import { PlaceholderInfo } from "@/utils/placeholderDetection";

// Use PlaceholderInfo in your code where appropriate.
```

### `@/utils/prepareCostReportTemplateData`

- **Source**: `src/utils/prepareCostReportTemplateData.ts`

#### `CostReportTemplateData`

- **Import**: `import { CostReportTemplateData } from "@/utils/prepareCostReportTemplateData";`
- **Kind**: Type

**Definition**:

```ts
export interface CostReportTemplateData {
  placeholderData: Record<string, any>;
  imagePlaceholders?: Record<string, string>;
}
```

**Example**:

```tsx
import { CostReportTemplateData } from "@/utils/prepareCostReportTemplateData";

// Use CostReportTemplateData in your code where appropriate.
```

#### `prepareCostReportTemplateData`

- **Import**: `import { prepareCostReportTemplateData } from "@/utils/prepareCostReportTemplateData";`
- **Kind**: Function
- **Signature**: `prepareCostReportTemplateData(reportId: string): Promise<CostReportTemplateData>`

**Example**:

```tsx
import { prepareCostReportTemplateData } from "@/utils/prepareCostReportTemplateData";

const result = prepareCostReportTemplateData(/* ...args */);
void result;
```

### `@/utils/reportTemplateSchemas`

- **Source**: `src/utils/reportTemplateSchemas.ts`

#### `getPlaceholdersByCategory`

- **Import**: `import { getPlaceholdersByCategory } from "@/utils/reportTemplateSchemas";`
- **Kind**: Function
- **Signature**: `getPlaceholdersByCategory(templateType: ReportTemplateType): Record<string, PlaceholderInfo[]>`

**Example**:

```tsx
import { getPlaceholdersByCategory } from "@/utils/reportTemplateSchemas";

const result = getPlaceholdersByCategory(/* ...args */);
void result;
```

#### `getTemplatePlaceholders`

- **Import**: `import { getTemplatePlaceholders } from "@/utils/reportTemplateSchemas";`
- **Kind**: Function
- **Signature**: `getTemplatePlaceholders(templateType: ReportTemplateType): PlaceholderInfo[]`

**Example**:

```tsx
import { getTemplatePlaceholders } from "@/utils/reportTemplateSchemas";

const result = getTemplatePlaceholders(/* ...args */);
void result;
```

#### `PlaceholderInfo`

- **Import**: `import { PlaceholderInfo } from "@/utils/reportTemplateSchemas";`
- **Kind**: Type

**Definition**:

```ts
export interface PlaceholderInfo {
  key: string;
  placeholder: string;
  description: string;
  category: string;
}
```

**Example**:

```tsx
import { PlaceholderInfo } from "@/utils/reportTemplateSchemas";

// Use PlaceholderInfo in your code where appropriate.
```

#### `REPORT_TEMPLATE_SCHEMAS`

- **Import**: `import { REPORT_TEMPLATE_SCHEMAS } from "@/utils/reportTemplateSchemas";`
- **Kind**: Constant

**Example**:

```tsx
import { REPORT_TEMPLATE_SCHEMAS } from "@/utils/reportTemplateSchemas";

console.log(REPORT_TEMPLATE_SCHEMAS);
```

#### `REPORT_TEMPLATE_TYPES`

- **Import**: `import { REPORT_TEMPLATE_TYPES } from "@/utils/reportTemplateSchemas";`
- **Kind**: Constant

**Example**:

```tsx
import { REPORT_TEMPLATE_TYPES } from "@/utils/reportTemplateSchemas";

console.log(REPORT_TEMPLATE_TYPES);
```

#### `ReportTemplateType`

- **Import**: `import { ReportTemplateType } from "@/utils/reportTemplateSchemas";`
- **Kind**: Type

**Definition**:

```ts
export type ReportTemplateType = 
  | 'cost_report'
  | 'cable_schedule'
  | 'bulk_services'
  | 'final_account'
  | 'specification'
  | 'generator_report'
  | 'project_outline'
  | 'electrical_budget'
  | 'cover_page';
```

**Example**:

```tsx
import { ReportTemplateType } from "@/utils/reportTemplateSchemas";

// Use ReportTemplateType in your code where appropriate.
```

### `@/utils/sectionPdfExport`

- **Source**: `src/utils/sectionPdfExport.ts`

#### `downloadSectionPDF`

- **Import**: `import { downloadSectionPDF } from "@/utils/sectionPdfExport";`
- **Kind**: Function
- **Signature**: `downloadSectionPDF(sectionId: string, sectionName: string): Promise<void>`

**Example**:

```tsx
import { downloadSectionPDF } from "@/utils/sectionPdfExport";

const result = downloadSectionPDF(/* ...args */);
void result;
```

#### `generateSectionPDF`

- **Import**: `import { generateSectionPDF } from "@/utils/sectionPdfExport";`
- **Kind**: Function
- **Signature**: `generateSectionPDF(sectionId: string): Promise<Blob>`

**Example**:

```tsx
import { generateSectionPDF } from "@/utils/sectionPdfExport";

const result = generateSectionPDF(/* ...args */);
void result;
```

### `@/utils/templatePDFExport`

- **Source**: `src/utils/templatePDFExport.ts`

#### `exportTemplatePDF`

- **Import**: `import { exportTemplatePDF } from "@/utils/templatePDFExport";`
- **Kind**: Function
- **Signature**: `exportTemplatePDF(templateData: any, companyDetails: any): Promise<jsPDF>`

**Example**:

```tsx
import { exportTemplatePDF } from "@/utils/templatePDFExport";

const result = exportTemplatePDF(/* ...args */);
void result;
```

### `@/utils/templatePlaceholderInsertion`

- **Source**: `src/utils/templatePlaceholderInsertion.ts`

#### `generatePlaceholderDocument`

- **Import**: `import { generatePlaceholderDocument } from "@/utils/templatePlaceholderInsertion";`
- **Kind**: Function
- **Signature**: `generatePlaceholderDocument(templateType: TemplateType): Document`

**Example**:

```tsx
import { generatePlaceholderDocument } from "@/utils/templatePlaceholderInsertion";

const result = generatePlaceholderDocument(/* ...args */);
void result;
```

#### `getPlaceholdersByType`

- **Import**: `import { getPlaceholdersByType } from "@/utils/templatePlaceholderInsertion";`
- **Kind**: Function
- **Signature**: `getPlaceholdersByType(templateType: TemplateType): PlaceholderSection[]`

**Example**:

```tsx
import { getPlaceholdersByType } from "@/utils/templatePlaceholderInsertion";

const result = getPlaceholdersByType(/* ...args */);
void result;
```

#### `TemplateType`

- **Import**: `import { TemplateType } from "@/utils/templatePlaceholderInsertion";`
- **Kind**: Type

**Definition**:

```ts
export type TemplateType = "cover_page" | "cost_report" | "cable_schedule" | "final_account" | "specification" | "project_outline" | "bulk_services";
```

**Example**:

```tsx
import { TemplateType } from "@/utils/templatePlaceholderInsertion";

// Use TemplateType in your code where appropriate.
```

### `@/utils/tenantSorting`

- **Source**: `src/utils/tenantSorting.ts`

#### `compareShopNumbers`

- **Import**: `import { compareShopNumbers } from "@/utils/tenantSorting";`
- **Kind**: Function
- **Signature**: `compareShopNumbers(a: string, b: string): number`

**Example**:

```tsx
import { compareShopNumbers } from "@/utils/tenantSorting";

const result = compareShopNumbers(/* ...args */);
void result;
```

#### `sortTenantsByShopNumber`

- **Import**: `import { sortTenantsByShopNumber } from "@/utils/tenantSorting";`
- **Kind**: Function
- **Signature**: `sortTenantsByShopNumber(tenants: T[]): T[]`

**Example**:

```tsx
import { sortTenantsByShopNumber } from "@/utils/tenantSorting";

const result = sortTenantsByShopNumber(/* ...args */);
void result;
```

### `@/utils/validateCostReportTemplate`

- **Source**: `src/utils/validateCostReportTemplate.ts`

#### `TemplateValidationResult`

- **Import**: `import { TemplateValidationResult } from "@/utils/validateCostReportTemplate";`
- **Kind**: Type

**Definition**:

```ts
export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingPlaceholders: string[];
  hasLoopSyntax: boolean;
}
```

**Example**:

```tsx
import { TemplateValidationResult } from "@/utils/validateCostReportTemplate";

// Use TemplateValidationResult in your code where appropriate.
```

#### `validateCostReportTemplate`

- **Import**: `import { validateCostReportTemplate } from "@/utils/validateCostReportTemplate";`
- **Kind**: Function
- **Signature**: `validateCostReportTemplate(file: File): Promise<TemplateValidationResult>`

**Example**:

```tsx
import { validateCostReportTemplate } from "@/utils/validateCostReportTemplate";

const result = validateCostReportTemplate(/* ...args */);
void result;
```
