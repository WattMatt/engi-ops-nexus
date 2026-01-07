## Data

Generated on 2026-01-07T04:31:56.433Z. Regenerate with `npm run docs:generate`.

### `@/data/assemblies`

- **Source**: `src/data/assemblies.ts`

#### `AssemblyComponent`

- **Import**: `import { AssemblyComponent } from "@/data/assemblies";`
- **Kind**: Type

**Definition**:

```ts
export interface AssemblyComponent {
  id: string;
  name: string;
  description: string;
  unit: string;
  quantity: number;
  category: 'material' | 'labor' | 'accessory';
  boqCode?: string;
  supplyRate?: number;
  installRate?: number;
  // Optional variants for user selection
  variantGroupId?: string; // Links to COMPONENT_VARIANTS
  defaultVariantId?: string; // Default selected variant
}
```

**Example**:

```tsx
import { AssemblyComponent } from "@/data/assemblies";

// Use AssemblyComponent in your code where appropriate.
```

#### `AssemblyModification`

- **Import**: `import { AssemblyModification } from "@/data/assemblies";`
- **Kind**: Type

**Definition**:

```ts
export interface AssemblyModification {
  componentId: string;
  excluded: boolean;
  quantityOverride?: number;
  notes?: string;
  selectedVariantId?: string; // Selected variant override
}
```

**Example**:

```tsx
import { AssemblyModification } from "@/data/assemblies";

// Use AssemblyModification in your code where appropriate.
```

#### `COMPONENT_VARIANTS`

- **Import**: `import { COMPONENT_VARIANTS } from "@/data/assemblies";`
- **Kind**: Constant

**Example**:

```tsx
import { COMPONENT_VARIANTS } from "@/data/assemblies";

console.log(COMPONENT_VARIANTS);
```

#### `ComponentVariant`

- **Import**: `import { ComponentVariant } from "@/data/assemblies";`
- **Kind**: Type

**Definition**:

```ts
export interface ComponentVariant {
  id: string;
  name: string;
  description: string;
  boqCode?: string;
  supplyRate?: number;
  installRate?: number;
  finalAccountItemId?: string; // Link to final_account_items table
}
```

**Example**:

```tsx
import { ComponentVariant } from "@/data/assemblies";

// Use ComponentVariant in your code where appropriate.
```

#### `getAssemblyEquipmentTypes`

- **Import**: `import { getAssemblyEquipmentTypes } from "@/data/assemblies";`
- **Kind**: Function
- **Signature**: `getAssemblyEquipmentTypes(): EquipmentType[]`

**Example**:

```tsx
import { getAssemblyEquipmentTypes } from "@/data/assemblies";

const result = getAssemblyEquipmentTypes(/* ...args */);
void result;
```

#### `getAssemblyForType`

- **Import**: `import { getAssemblyForType } from "@/data/assemblies";`
- **Kind**: Function
- **Signature**: `getAssemblyForType(type: EquipmentType): SmartAssembly`

**Example**:

```tsx
import { getAssemblyForType } from "@/data/assemblies";

const result = getAssemblyForType(/* ...args */);
void result;
```

#### `getComponentWithVariant`

- **Import**: `import { getComponentWithVariant } from "@/data/assemblies";`
- **Kind**: Function
- **Signature**: `getComponentWithVariant(component: AssemblyComponent, modifications?: AssemblyModification[]): AssemblyComponent & { selectedVariant?: ComponentVariant; }`

**Example**:

```tsx
import { getComponentWithVariant } from "@/data/assemblies";

const result = getComponentWithVariant(/* ...args */);
void result;
```

#### `getEffectiveComponents`

- **Import**: `import { getEffectiveComponents } from "@/data/assemblies";`
- **Kind**: Function
- **Signature**: `getEffectiveComponents(assembly: SmartAssembly, modifications?: AssemblyModification[]): (AssemblyComponent & { excluded: boolean; effectiveQuantity: number; selectedVariant?: ComponentVariant; availableVariants?: ComponentVariant[]; })[]`

**Example**:

```tsx
import { getEffectiveComponents } from "@/data/assemblies";

const result = getEffectiveComponents(/* ...args */);
void result;
```

#### `getVariantsForGroup`

- **Import**: `import { getVariantsForGroup } from "@/data/assemblies";`
- **Kind**: Function
- **Signature**: `getVariantsForGroup(groupId: string): ComponentVariant[]`

**Example**:

```tsx
import { getVariantsForGroup } from "@/data/assemblies";

const result = getVariantsForGroup(/* ...args */);
void result;
```

#### `SMART_ASSEMBLIES`

- **Import**: `import { SMART_ASSEMBLIES } from "@/data/assemblies";`
- **Kind**: Constant

**Example**:

```tsx
import { SMART_ASSEMBLIES } from "@/data/assemblies";

console.log(SMART_ASSEMBLIES);
```

#### `SmartAssembly`

- **Import**: `import { SmartAssembly } from "@/data/assemblies";`
- **Kind**: Type

**Definition**:

```ts
export interface SmartAssembly {
  equipmentType: EquipmentType;
  name: string;
  description: string;
  components: AssemblyComponent[];
}
```

**Example**:

```tsx
import { SmartAssembly } from "@/data/assemblies";

// Use SmartAssembly in your code where appropriate.
```

#### `VARIANT_GROUP_NAMES`

- **Import**: `import { VARIANT_GROUP_NAMES } from "@/data/assemblies";`
- **Kind**: Constant

**Example**:

```tsx
import { VARIANT_GROUP_NAMES } from "@/data/assemblies";

console.log(VARIANT_GROUP_NAMES);
```

### `@/data/saCitiesZones`

- **Source**: `src/data/saCitiesZones.ts`

#### `CityZoneData`

- **Import**: `import { CityZoneData } from "@/data/saCitiesZones";`
- **Kind**: Type

**Definition**:

```ts
export interface CityZoneData {
  city: string;
  zone: string;
  province: string;
  coordinates: [number, number]; // [longitude, latitude]
}
```

**Example**:

```tsx
import { CityZoneData } from "@/data/saCitiesZones";

// Use CityZoneData in your code where appropriate.
```

#### `findClosestCity`

- **Import**: `import { findClosestCity } from "@/data/saCitiesZones";`
- **Kind**: Function
- **Signature**: `findClosestCity(lng: number, lat: number): CityZoneData`

**Example**:

```tsx
import { findClosestCity } from "@/data/saCitiesZones";

const result = findClosestCity(/* ...args */);
void result;
```

#### `findZoneByCity`

- **Import**: `import { findZoneByCity } from "@/data/saCitiesZones";`
- **Kind**: Function
- **Signature**: `findZoneByCity(cityName: string): CityZoneData`

**Example**:

```tsx
import { findZoneByCity } from "@/data/saCitiesZones";

const result = findZoneByCity(/* ...args */);
void result;
```

#### `getCitiesByZone`

- **Import**: `import { getCitiesByZone } from "@/data/saCitiesZones";`
- **Kind**: Function
- **Signature**: `getCitiesByZone(zone: string): CityZoneData[]`

**Example**:

```tsx
import { getCitiesByZone } from "@/data/saCitiesZones";

const result = getCitiesByZone(/* ...args */);
void result;
```

#### `SA_CITIES_ZONES`

- **Import**: `import { SA_CITIES_ZONES } from "@/data/saCitiesZones";`
- **Kind**: Constant

**Example**:

```tsx
import { SA_CITIES_ZONES } from "@/data/saCitiesZones";

console.log(SA_CITIES_ZONES);
```
