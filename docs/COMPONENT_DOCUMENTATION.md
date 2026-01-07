# Component Documentation

This document provides comprehensive documentation for the major React components in the application. Components are organized by feature area.

---

## Table of Contents

1. [UI Components (shadcn/ui)](#ui-components-shadcnui)
2. [Authentication Components](#authentication-components)
3. [Cable Schedule Components](#cable-schedule-components)
4. [Cost Reports Components](#cost-reports-components)
5. [Floor Plan Components](#floor-plan-components)
6. [Lighting Components](#lighting-components)
7. [Tenant Management Components](#tenant-management-components)
8. [PDF Editor Components](#pdf-editor-components)
9. [Dashboard Components](#dashboard-components)
10. [Shared Components](#shared-components)

---

## UI Components (shadcn/ui)

Located in `src/components/ui/`, these are the foundational UI building blocks.

### Button

A versatile button component with multiple variants and sizes.

**File:** `src/components/ui/button.tsx`

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'destructive' \| 'outline' \| 'secondary' \| 'ghost' \| 'link'` | `'default'` | Button style variant |
| `size` | `'default' \| 'sm' \| 'lg' \| 'icon'` | `'default'` | Button size |
| `asChild` | `boolean` | `false` | Render as child component |

**Example:**

```tsx
import { Button } from '@/components/ui/button';

<Button variant="default" size="lg" onClick={handleClick}>
  Primary Action
</Button>

<Button variant="outline" size="sm">
  Secondary Action
</Button>

<Button variant="destructive">
  Delete Item
</Button>

<Button variant="ghost" size="icon">
  <IconSettings className="h-4 w-4" />
</Button>
```

---

### Card

Container component for grouping related content.

**File:** `src/components/ui/card.tsx`

**Components:**

- `Card` - Container
- `CardHeader` - Header section
- `CardTitle` - Title text
- `CardDescription` - Subtitle/description
- `CardContent` - Main content area
- `CardFooter` - Footer section

**Example:**

```tsx
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Project Summary</CardTitle>
    <CardDescription>Overview of project metrics</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Total Budget: R 5,000,000</p>
    <p>Completion: 75%</p>
  </CardContent>
  <CardFooter>
    <Button>View Details</Button>
  </CardFooter>
</Card>
```

---

### Dialog

Modal dialog component for overlaying content.

**File:** `src/components/ui/dialog.tsx`

**Components:**

- `Dialog` - Root component (controlled)
- `DialogTrigger` - Trigger element
- `DialogContent` - Dialog container
- `DialogHeader` - Header section
- `DialogTitle` - Title (required for accessibility)
- `DialogDescription` - Description text
- `DialogFooter` - Footer with actions
- `DialogClose` - Close button

**Example:**

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogDescription>
        Are you sure you want to proceed?
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### Form

Form handling components with react-hook-form integration.

**File:** `src/components/ui/form.tsx`

**Components:**

- `Form` - Form provider
- `FormField` - Field wrapper
- `FormItem` - Item container
- `FormLabel` - Field label
- `FormControl` - Input wrapper
- `FormDescription` - Help text
- `FormMessage` - Error message

**Example:**

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const formSchema = z.object({
  projectName: z.string().min(2, 'Project name is required'),
  budget: z.number().min(0),
});

function ProjectForm() {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { projectName: '', budget: 0 },
  });

  const onSubmit = (values) => {
    console.log(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="projectName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter project name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

---

### Table

Data table component for displaying structured data.

**File:** `src/components/ui/table.tsx`

**Components:**

- `Table` - Table container
- `TableHeader` - Header section
- `TableBody` - Body section
- `TableFooter` - Footer section
- `TableRow` - Table row
- `TableHead` - Header cell
- `TableCell` - Body cell
- `TableCaption` - Table caption

**Example:**

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Cable Tag</TableHead>
      <TableHead>Size</TableHead>
      <TableHead className="text-right">Length</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {cables.map(cable => (
      <TableRow key={cable.id}>
        <TableCell>{cable.tag}</TableCell>
        <TableCell>{cable.size}</TableCell>
        <TableCell className="text-right">{cable.length}m</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

### Select

Dropdown selection component.

**File:** `src/components/ui/select.tsx`

**Example:**

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

<Select value={material} onValueChange={setMaterial}>
  <SelectTrigger>
    <SelectValue placeholder="Select material" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="copper">Copper</SelectItem>
    <SelectItem value="aluminium">Aluminium</SelectItem>
  </SelectContent>
</Select>
```

---

### Tabs

Tabbed interface component.

**File:** `src/components/ui/tabs.tsx`

**Example:**

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">
    <OverviewPanel />
  </TabsContent>
  <TabsContent value="details">
    <DetailsPanel />
  </TabsContent>
  <TabsContent value="settings">
    <SettingsPanel />
  </TabsContent>
</Tabs>
```

---

### Input

Text input component with variants.

**File:** `src/components/ui/input.tsx`

**Example:**

```tsx
import { Input } from '@/components/ui/input';

<Input 
  type="text" 
  placeholder="Enter value" 
  value={value}
  onChange={e => setValue(e.target.value)}
/>

<Input type="email" placeholder="Email address" />
<Input type="password" placeholder="Password" />
<Input type="number" min={0} step={0.01} />
```

---

### NumericInput

Specialized numeric input with formatting.

**File:** `src/components/ui/numeric-input.tsx`

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `value` | `number \| undefined` | Current value |
| `onChange` | `(value: number \| undefined) => void` | Change handler |
| `min` | `number` | Minimum value |
| `max` | `number` | Maximum value |
| `step` | `number` | Increment step |
| `decimalPlaces` | `number` | Decimal precision |

**Example:**

```tsx
import { NumericInput } from '@/components/ui/numeric-input';

<NumericInput
  value={budget}
  onChange={setBudget}
  min={0}
  decimalPlaces={2}
  placeholder="Enter budget"
/>
```

---

### Toast & Sonner

Toast notification components.

**File:** `src/components/ui/sonner.tsx`

**Example:**

```tsx
import { toast } from 'sonner';

// Success toast
toast.success('Operation completed successfully');

// Error toast
toast.error('An error occurred');

// With description
toast('Notification', {
  description: 'Additional details here',
});

// With action
toast('File uploaded', {
  action: {
    label: 'View',
    onClick: () => viewFile(),
  },
});
```

---

## Authentication Components

Located in `src/components/auth/`.

### Overview

Authentication is handled via Supabase Auth with the following components:

- Login/Signup forms
- Password reset functionality
- Session management

**Example Usage:**

```tsx
import { supabase } from '@/integrations/supabase/client';

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
});

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
});

// Sign out
await supabase.auth.signOut();

// Get current session
const { data: { session } } = await supabase.auth.getSession();
```

---

## Cable Schedule Components

Located in `src/components/cable-schedules/`.

### Overview

Cable schedule management components for electrical project documentation.

### Key Components

| Component | Description |
|-----------|-------------|
| `CableScheduleList` | List of cable schedules for a project |
| `CableScheduleEditor` | Main editor for cable data |
| `CableEntryRow` | Individual cable entry with inline editing |
| `CableOptimizationPanel` | Cost optimization suggestions |
| `ImportCableDialog` | Import cables from Excel |

### Usage Pattern

```tsx
import { CableScheduleEditor } from '@/components/cable-schedules/CableScheduleEditor';

function CableSchedulePage({ projectId, scheduleId }) {
  return (
    <CableScheduleEditor 
      projectId={projectId}
      scheduleId={scheduleId}
      onSave={handleSave}
    />
  );
}
```

### Cable Data Structure

```typescript
interface CableEntry {
  id: string;
  cable_tag: string;
  from_location: string;
  to_location: string;
  voltage: number;
  cable_size: string;
  cable_type: string;
  total_length: number;
  load_amps: number;
  protection_device_rating: number;
  installation_method: 'air' | 'ground' | 'ducts';
}
```

---

## Cost Reports Components

Located in `src/components/cost-reports/`.

### Overview

Cost report management for project financial tracking.

### Key Components

| Component | Description |
|-----------|-------------|
| `CostReportsList` | List of cost reports |
| `CostReportEditor` | Main cost report editor |
| `CategoryManager` | Manage report categories |
| `LineItemEditor` | Edit individual line items |
| `VariationsTable` | Track project variations |
| `CostReportPDFExport` | Export to PDF |

### Category Structure

```typescript
interface Category {
  id: string;
  code: string;
  description: string;
  sort_order: number;
}

interface LineItem {
  id: string;
  category_id: string;
  description: string;
  original_budget: number;
  previous_report: number;
  anticipated_final: number;
}
```

### Usage Pattern

```tsx
import { CostReportEditor } from '@/components/cost-reports/CostReportEditor';

function CostReportPage({ reportId }) {
  return (
    <CostReportEditor 
      reportId={reportId}
      onExport={handleExport}
    />
  );
}
```

---

## Floor Plan Components

Located in `src/components/floor-plan/`.

### Overview

Interactive floor plan editor for electrical layout design.

### Key Components

| Component | Description |
|-----------|-------------|
| `FloorPlanCanvas` | Main canvas for floor plan display |
| `FloorPlanToolbar` | Tool selection toolbar |
| `EquipmentPalette` | Equipment type selector |
| `EquipmentMarker` | Individual equipment marker |
| `CableRouteEditor` | Cable routing tool |
| `FloorPlanZoom` | Zoom controls |
| `FloorPlanLayers` | Layer management |

### Equipment Types

```typescript
enum EquipmentType {
  SOCKET_16A = 'socket_16a',
  SOCKET_DOUBLE = 'socket_double',
  GENERAL_LIGHT_SWITCH = 'general_light_switch',
  TWO_WAY_LIGHT_SWITCH = 'two_way_light_switch',
  DIMMER_SWITCH = 'dimmer_switch',
  DATA_SOCKET = 'data_socket',
  TELEPHONE_OUTLET = 'telephone_outlet',
  TV_OUTLET = 'tv_outlet',
  CEILING_LIGHT = 'ceiling_light',
  RECESSED_LIGHT_600 = 'recessed_light_600',
  RECESSED_LIGHT_1200 = 'recessed_light_1200',
  FLOODLIGHT = 'floodlight',
  MOTION_SENSOR = 'motion_sensor',
  DISTRIBUTION_BOARD = 'distribution_board',
  CCTV_CAMERA = 'cctv_camera',
  GEYSER_OUTLET = 'geyser_outlet',
}
```

### Usage Pattern

```tsx
import { FloorPlanCanvas } from '@/components/floor-plan/FloorPlanCanvas';
import { FloorPlanToolbar } from '@/components/floor-plan/FloorPlanToolbar';

function FloorPlanEditor({ projectId, layoutId }) {
  const [selectedTool, setSelectedTool] = useState('select');
  const [equipment, setEquipment] = useState([]);

  return (
    <div className="flex">
      <FloorPlanToolbar 
        selectedTool={selectedTool}
        onToolChange={setSelectedTool}
      />
      <FloorPlanCanvas
        layoutId={layoutId}
        equipment={equipment}
        selectedTool={selectedTool}
        onEquipmentAdd={handleAdd}
        onEquipmentMove={handleMove}
      />
    </div>
  );
}
```

---

## Lighting Components

Located in `src/components/lighting/`.

### Overview

Lighting calculations and design tools.

### Key Components

| Component | Description |
|-----------|-------------|
| `LightingCalculator` | Lux level calculations |
| `LightingReport` | Lighting design report |
| `LightFittingSelector` | Light fitting database |
| `RoomEditor` | Room dimension editor |
| `LightingGrid` | Grid layout for fittings |

### Calculation Inputs

```typescript
interface LightingCalculation {
  roomLength: number;        // meters
  roomWidth: number;         // meters
  roomHeight: number;        // meters
  workingPlaneHeight: number; // meters
  requiredLux: number;       // lux
  maintenanceFactor: number; // 0.8 typical
  utilizationFactor: number; // from CU tables
  fittingLumens: number;     // lumens per fitting
}
```

---

## Tenant Management Components

Located in `src/components/tenant/`.

### Overview

Tenant and shop management for commercial buildings.

### Key Components

| Component | Description |
|-----------|-------------|
| `TenantList` | List of tenants/shops |
| `TenantDialog` | Add/edit tenant |
| `TenantOverview` | Tenant summary dashboard |
| `CapitalRecoveryCalculator` | Cost recovery calculations |
| `GeneratorSizingTable` | Generator sizing for tenants |
| `TenantReportGenerator` | Generate tenant reports |

### Tenant Data Structure

```typescript
interface Tenant {
  id: string;
  project_id: string;
  shop_number: string;
  tenant_name: string;
  connected_load_kw: number;
  maximum_demand_kva: number;
  floor_area_m2: number;
  occupancy_type: string;
  contact_email?: string;
  contact_phone?: string;
}
```

### Usage Pattern

```tsx
import { TenantList } from '@/components/tenant/TenantList';
import { TenantDialog } from '@/components/tenant/TenantDialog';

function TenantManager({ projectId }) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);

  return (
    <>
      <TenantList 
        projectId={projectId}
        onEdit={setSelectedTenant}
        onAdd={() => setShowDialog(true)}
      />
      <TenantDialog
        open={showDialog || !!selectedTenant}
        tenant={selectedTenant}
        onClose={() => {
          setShowDialog(false);
          setSelectedTenant(null);
        }}
        onSave={handleSave}
      />
    </>
  );
}
```

### Charts

| Chart Component | Description |
|-----------------|-------------|
| `CostBreakdownChart` | Pie chart of cost breakdown |
| `LoadDistributionChart` | Load distribution visualization |
| `RecoveryProjectionChart` | Cost recovery projections |

---

## PDF Editor Components

Located in `src/components/pdf-editor/`.

### Overview

PDF viewing and editing capabilities.

### Key Components

| Component | Description |
|-----------|-------------|
| `PDFViewer` | PDF document viewer |
| `PDFEditor` | Text editing on PDFs |
| `PDFAnnotations` | Annotation tools |
| `PDFPageNavigation` | Page navigation controls |

### Features

- View PDF documents
- Edit text content
- Add annotations
- Undo/redo support
- Export edited PDFs

---

## Dashboard Components

Located in `src/components/dashboard/`.

### Overview

Dashboard and reporting components.

### Key Components

| Component | Description |
|-----------|-------------|
| `ProjectDashboard` | Project overview dashboard |
| `KPICards` | Key performance indicators |
| `ActivityFeed` | Recent activity list |
| `QuickActions` | Common action shortcuts |

### Example

```tsx
import { KPICards } from '@/components/dashboard/KPICards';

function Dashboard({ projectId }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <KPICards
        metrics={[
          { label: 'Total Budget', value: 'R 5,000,000', trend: 'up' },
          { label: 'Completion', value: '75%', trend: 'up' },
          { label: 'Open Issues', value: '12', trend: 'down' },
          { label: 'Due Tasks', value: '5', trend: 'neutral' },
        ]}
      />
    </div>
  );
}
```

---

## Shared Components

Located in `src/components/shared/` and `src/components/common/`.

### ErrorBoundary

Catches JavaScript errors and displays fallback UI.

**File:** `src/components/ErrorBoundary.tsx`

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```

### Loading States

Common loading indicators:

```tsx
import { Skeleton } from '@/components/ui/skeleton';

// Card skeleton
<Skeleton className="h-[125px] w-[250px] rounded-xl" />

// Text skeleton
<Skeleton className="h-4 w-[200px]" />
<Skeleton className="h-4 w-[160px]" />
```

---

## Component Patterns

### Controlled vs Uncontrolled

Most components support both patterns:

```tsx
// Controlled
const [value, setValue] = useState('');
<Input value={value} onChange={e => setValue(e.target.value)} />

// Uncontrolled
<Input defaultValue="initial" ref={inputRef} />
```

### Composition

Components use composition for flexibility:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### Polymorphic Components

Using `asChild` for custom rendering:

```tsx
<Button asChild>
  <Link to="/dashboard">Go to Dashboard</Link>
</Button>
```

---

## Styling Guidelines

### Tailwind CSS Classes

Use the `cn()` utility for conditional classes:

```tsx
import { cn } from '@/lib/utils';

<div className={cn(
  'base-styles p-4',
  isActive && 'bg-primary text-white',
  disabled && 'opacity-50 cursor-not-allowed'
)} />
```

### Common Spacing

| Class | Size |
|-------|------|
| `p-2` / `m-2` | 8px |
| `p-4` / `m-4` | 16px |
| `p-6` / `m-6` | 24px |
| `gap-2` | 8px |
| `gap-4` | 16px |

### Responsive Design

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id} />)}
</div>
```

---

## Form Validation

Using Zod with react-hook-form:

```tsx
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  budget: z.number().min(0, 'Budget must be positive'),
});

// With custom error messages
const cableSchema = z.object({
  loadAmps: z.number()
    .min(1, 'Load must be at least 1A')
    .max(3000, 'Load cannot exceed 3000A'),
  length: z.number()
    .min(1, 'Minimum length is 1m')
    .max(5000, 'Maximum length is 5000m'),
});
```

---

## State Management

### React Query (TanStack Query)

Used for server state:

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetch data
const { data, isLoading, error } = useQuery({
  queryKey: ['projects', projectId],
  queryFn: () => fetchProject(projectId),
});

// Mutate data
const mutation = useMutation({
  mutationFn: updateProject,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  },
});
```

### Local State

Use `useState` for component-local state:

```tsx
const [isOpen, setIsOpen] = useState(false);
const [selectedItems, setSelectedItems] = useState<string[]>([]);
```

---

*This documentation covers the major components in the application. For detailed props and implementation, refer to the source files in `src/components/`.*
