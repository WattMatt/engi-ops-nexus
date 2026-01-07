## Lib

Generated on 2026-01-07T04:31:56.433Z. Regenerate with `npm run docs:generate`.

### `@/lib/passwordValidation`

- **Source**: `src/lib/passwordValidation.ts`

#### `getPasswordRequirements`

- **Import**: `import { getPasswordRequirements } from "@/lib/passwordValidation";`
- **Kind**: Function
- **Signature**: `getPasswordRequirements(password: string): PasswordRequirement[]`

**Example**:

```tsx
import { getPasswordRequirements } from "@/lib/passwordValidation";

const result = getPasswordRequirements(/* ...args */);
void result;
```

#### `PasswordRequirement`

- **Import**: `import { PasswordRequirement } from "@/lib/passwordValidation";`
- **Kind**: Type

**Definition**:

```ts
export interface PasswordRequirement {
  met: boolean;
  label: string;
}
```

**Example**:

```tsx
import { PasswordRequirement } from "@/lib/passwordValidation";

// Use PasswordRequirement in your code where appropriate.
```

#### `PasswordValidationResult`

- **Import**: `import { PasswordValidationResult } from "@/lib/passwordValidation";`
- **Kind**: Type

**Definition**:

```ts
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: "weak" | "fair" | "good" | "strong";
}
```

**Example**:

```tsx
import { PasswordValidationResult } from "@/lib/passwordValidation";

// Use PasswordValidationResult in your code where appropriate.
```

#### `validatePassword`

- **Import**: `import { validatePassword } from "@/lib/passwordValidation";`
- **Kind**: Function
- **Signature**: `validatePassword(password: string): PasswordValidationResult`

**Example**:

```tsx
import { validatePassword } from "@/lib/passwordValidation";

const result = validatePassword(/* ...args */);
void result;
```

### `@/lib/utils`

- **Source**: `src/lib/utils.ts`

#### `cn`

- **Import**: `import { cn } from "@/lib/utils";`
- **Kind**: Function
- **Signature**: `cn(inputs?: ClassValue[]): string`

**Example**:

```tsx
import { cn } from "@/lib/utils";

const result = cn(/* ...args */);
void result;
```

#### `formatCurrency`

- **Import**: `import { formatCurrency } from "@/lib/utils";`
- **Kind**: Function
- **Signature**: `formatCurrency(value: number, currency?: string): string`

**Example**:

```tsx
import { formatCurrency } from "@/lib/utils";

const result = formatCurrency(/* ...args */);
void result;
```
