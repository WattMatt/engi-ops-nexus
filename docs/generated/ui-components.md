## UI Components

Generated on 2026-01-07T04:31:56.417Z. Regenerate with `npm run docs:generate`.

### `@/components/ui/accordion`

- **Source**: `src/components/ui/accordion.tsx`

#### `Accordion`

- **Import**: `import { Accordion } from "@/components/ui/accordion";`
- **Kind**: Component
- **Signature**: `Accordion(props: P): ReactNode`

**Example**:

```tsx
import { Accordion } from "@/components/ui/accordion";

export function Example() {
  return <Accordion />;
}
```

#### `AccordionContent`

- **Import**: `import { AccordionContent } from "@/components/ui/accordion";`
- **Kind**: Component
- **Signature**: `AccordionContent(props: P): ReactNode`

**Example**:

```tsx
import { AccordionContent } from "@/components/ui/accordion";

export function Example() {
  return <AccordionContent />;
}
```

#### `AccordionItem`

- **Import**: `import { AccordionItem } from "@/components/ui/accordion";`
- **Kind**: Component
- **Signature**: `AccordionItem(props: P): ReactNode`

**Example**:

```tsx
import { AccordionItem } from "@/components/ui/accordion";

export function Example() {
  return <AccordionItem />;
}
```

#### `AccordionTrigger`

- **Import**: `import { AccordionTrigger } from "@/components/ui/accordion";`
- **Kind**: Component
- **Signature**: `AccordionTrigger(props: P): ReactNode`

**Example**:

```tsx
import { AccordionTrigger } from "@/components/ui/accordion";

export function Example() {
  return <AccordionTrigger />;
}
```

### `@/components/ui/alert`

- **Source**: `src/components/ui/alert.tsx`

#### `Alert`

- **Import**: `import { Alert } from "@/components/ui/alert";`
- **Kind**: Component
- **Signature**: `Alert(props: P): ReactNode`

**Example**:

```tsx
import { Alert } from "@/components/ui/alert";

export function Example() {
  return <Alert />;
}
```

#### `AlertDescription`

- **Import**: `import { AlertDescription } from "@/components/ui/alert";`
- **Kind**: Component
- **Signature**: `AlertDescription(props: P): ReactNode`

**Example**:

```tsx
import { AlertDescription } from "@/components/ui/alert";

export function Example() {
  return <AlertDescription />;
}
```

#### `AlertTitle`

- **Import**: `import { AlertTitle } from "@/components/ui/alert";`
- **Kind**: Component
- **Signature**: `AlertTitle(props: P): ReactNode`

**Example**:

```tsx
import { AlertTitle } from "@/components/ui/alert";

export function Example() {
  return <AlertTitle />;
}
```

### `@/components/ui/alert-dialog`

- **Source**: `src/components/ui/alert-dialog.tsx`

#### `AlertDialog`

- **Import**: `import { AlertDialog } from "@/components/ui/alert-dialog";`
- **Kind**: Component
- **Signature**: `AlertDialog(props: P, deprecatedLegacyContext?: any): ReactNode`

**Example**:

```tsx
import { AlertDialog } from "@/components/ui/alert-dialog";

export function Example() {
  return <AlertDialog />;
}
```

#### `AlertDialogAction`

- **Import**: `import { AlertDialogAction } from "@/components/ui/alert-dialog";`
- **Kind**: Component
- **Signature**: `AlertDialogAction(props: P): ReactNode`

**Example**:

```tsx
import { AlertDialogAction } from "@/components/ui/alert-dialog";

export function Example() {
  return <AlertDialogAction />;
}
```

#### `AlertDialogCancel`

- **Import**: `import { AlertDialogCancel } from "@/components/ui/alert-dialog";`
- **Kind**: Component
- **Signature**: `AlertDialogCancel(props: P): ReactNode`

**Example**:

```tsx
import { AlertDialogCancel } from "@/components/ui/alert-dialog";

export function Example() {
  return <AlertDialogCancel />;
}
```

#### `AlertDialogContent`

- **Import**: `import { AlertDialogContent } from "@/components/ui/alert-dialog";`
- **Kind**: Component
- **Signature**: `AlertDialogContent(props: P): ReactNode`

**Example**:

```tsx
import { AlertDialogContent } from "@/components/ui/alert-dialog";

export function Example() {
  return <AlertDialogContent />;
}
```

#### `AlertDialogDescription`

- **Import**: `import { AlertDialogDescription } from "@/components/ui/alert-dialog";`
- **Kind**: Component
- **Signature**: `AlertDialogDescription(props: P): ReactNode`

**Example**:

```tsx
import { AlertDialogDescription } from "@/components/ui/alert-dialog";

export function Example() {
  return <AlertDialogDescription />;
}
```

#### `AlertDialogFooter`

- **Import**: `import { AlertDialogFooter } from "@/components/ui/alert-dialog";`
- **Kind**: Component
- **Signature**: `AlertDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element`

**Props**:
- **`about` (optional)**: `string`
- **`accessKey` (optional)**: `string`
- **`aria-activedescendant` (optional)**: `string`
- **`aria-atomic` (optional)**: `Booleanish`
- **`aria-autocomplete` (optional)**: `"list" | "none" | "inline" | "both"`
- **`aria-braillelabel` (optional)**: `string`
- **`aria-brailleroledescription` (optional)**: `string`
- **`aria-busy` (optional)**: `Booleanish`
- **`aria-checked` (optional)**: `boolean | "true" | "false" | "mixed"`
- **`aria-colcount` (optional)**: `number`
- **`aria-colindex` (optional)**: `number`
- **`aria-colindextext` (optional)**: `string`
- **`aria-colspan` (optional)**: `number`
- **`aria-controls` (optional)**: `string`
- **`aria-current` (optional)**: `boolean | "location" | "date" | "time" | "step" | "true" | "false" | "page"`
- **`aria-describedby` (optional)**: `string`
- **`aria-description` (optional)**: `string`
- **`aria-details` (optional)**: `string`
- **`aria-disabled` (optional)**: `Booleanish`
- **`aria-dropeffect` (optional)**: `"link" | "copy" | "none" | "execute" | "move" | "popup"`
- **`aria-errormessage` (optional)**: `string`
- **`aria-expanded` (optional)**: `Booleanish`
- **`aria-flowto` (optional)**: `string`
- **`aria-grabbed` (optional)**: `Booleanish`
- **`aria-haspopup` (optional)**: `boolean | "grid" | "dialog" | "menu" | "true" | "false" | "listbox" | "tree"`
- **`aria-hidden` (optional)**: `Booleanish`
- **`aria-invalid` (optional)**: `boolean | "true" | "false" | "grammar" | "spelling"`
- **`aria-keyshortcuts` (optional)**: `string`
- **`aria-label` (optional)**: `string`
- **`aria-labelledby` (optional)**: `string`
- **…**: (and 234 more)

**Example**:

```tsx
import { AlertDialogFooter } from "@/components/ui/alert-dialog";

export function Example() {
  return <AlertDialogFooter />;
}
```

#### `AlertDialogHeader`

- **Import**: `import { AlertDialogHeader } from "@/components/ui/alert-dialog";`
- **Kind**: Component
- **Signature**: `AlertDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element`

**Props**:
- **`about` (optional)**: `string`
- **`accessKey` (optional)**: `string`
- **`aria-activedescendant` (optional)**: `string`
- **`aria-atomic` (optional)**: `Booleanish`
- **`aria-autocomplete` (optional)**: `"list" | "none" | "inline" | "both"`
- **`aria-braillelabel` (optional)**: `string`
- **`aria-brailleroledescription` (optional)**: `string`
- **`aria-busy` (optional)**: `Booleanish`
- **`aria-checked` (optional)**: `boolean | "true" | "false" | "mixed"`
- **`aria-colcount` (optional)**: `number`
- **`aria-colindex` (optional)**: `number`
- **`aria-colindextext` (optional)**: `string`
- **`aria-colspan` (optional)**: `number`
- **`aria-controls` (optional)**: `string`
- **`aria-current` (optional)**: `boolean | "location" | "date" | "time" | "step" | "true" | "false" | "page"`
- **`aria-describedby` (optional)**: `string`
- **`aria-description` (optional)**: `string`
- **`aria-details` (optional)**: `string`
- **`aria-disabled` (optional)**: `Booleanish`
- **`aria-dropeffect` (optional)**: `"link" | "copy" | "none" | "execute" | "move" | "popup"`
- **`aria-errormessage` (optional)**: `string`
- **`aria-expanded` (optional)**: `Booleanish`
- **`aria-flowto` (optional)**: `string`
- **`aria-grabbed` (optional)**: `Booleanish`
- **`aria-haspopup` (optional)**: `boolean | "grid" | "dialog" | "menu" | "true" | "false" | "listbox" | "tree"`
- **`aria-hidden` (optional)**: `Booleanish`
- **`aria-invalid` (optional)**: `boolean | "true" | "false" | "grammar" | "spelling"`
- **`aria-keyshortcuts` (optional)**: `string`
- **`aria-label` (optional)**: `string`
- **`aria-labelledby` (optional)**: `string`
- **…**: (and 234 more)

**Example**:

```tsx
import { AlertDialogHeader } from "@/components/ui/alert-dialog";

export function Example() {
  return <AlertDialogHeader />;
}
```

#### `AlertDialogOverlay`

- **Import**: `import { AlertDialogOverlay } from "@/components/ui/alert-dialog";`
- **Kind**: Component
- **Signature**: `AlertDialogOverlay(props: P): ReactNode`

**Example**:

```tsx
import { AlertDialogOverlay } from "@/components/ui/alert-dialog";

export function Example() {
  return <AlertDialogOverlay />;
}
```

#### `AlertDialogPortal`

- **Import**: `import { AlertDialogPortal } from "@/components/ui/alert-dialog";`
- **Kind**: Component
- **Signature**: `AlertDialogPortal(props: P, deprecatedLegacyContext?: any): ReactNode`

**Example**:

```tsx
import { AlertDialogPortal } from "@/components/ui/alert-dialog";

export function Example() {
  return <AlertDialogPortal />;
}
```

#### `AlertDialogTitle`

- **Import**: `import { AlertDialogTitle } from "@/components/ui/alert-dialog";`
- **Kind**: Component
- **Signature**: `AlertDialogTitle(props: P): ReactNode`

**Example**:

```tsx
import { AlertDialogTitle } from "@/components/ui/alert-dialog";

export function Example() {
  return <AlertDialogTitle />;
}
```

#### `AlertDialogTrigger`

- **Import**: `import { AlertDialogTrigger } from "@/components/ui/alert-dialog";`
- **Kind**: Component
- **Signature**: `AlertDialogTrigger(props: P): ReactNode`

**Example**:

```tsx
import { AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function Example() {
  return <AlertDialogTrigger />;
}
```

### `@/components/ui/aspect-ratio`

- **Source**: `src/components/ui/aspect-ratio.tsx`

#### `AspectRatio`

- **Import**: `import { AspectRatio } from "@/components/ui/aspect-ratio";`
- **Kind**: Component
- **Signature**: `AspectRatio(props: P): ReactNode`

**Example**:

```tsx
import { AspectRatio } from "@/components/ui/aspect-ratio";

export function Example() {
  return <AspectRatio />;
}
```

### `@/components/ui/avatar`

- **Source**: `src/components/ui/avatar.tsx`

#### `Avatar`

- **Import**: `import { Avatar } from "@/components/ui/avatar";`
- **Kind**: Component
- **Signature**: `Avatar(props: P): ReactNode`

**Example**:

```tsx
import { Avatar } from "@/components/ui/avatar";

export function Example() {
  return <Avatar />;
}
```

#### `AvatarFallback`

- **Import**: `import { AvatarFallback } from "@/components/ui/avatar";`
- **Kind**: Component
- **Signature**: `AvatarFallback(props: P): ReactNode`

**Example**:

```tsx
import { AvatarFallback } from "@/components/ui/avatar";

export function Example() {
  return <AvatarFallback />;
}
```

#### `AvatarImage`

- **Import**: `import { AvatarImage } from "@/components/ui/avatar";`
- **Kind**: Component
- **Signature**: `AvatarImage(props: P): ReactNode`

**Example**:

```tsx
import { AvatarImage } from "@/components/ui/avatar";

export function Example() {
  return <AvatarImage />;
}
```

### `@/components/ui/badge`

- **Source**: `src/components/ui/badge.tsx`

#### `Badge`

- **Import**: `import { Badge } from "@/components/ui/badge";`
- **Kind**: Component
- **Signature**: `Badge({ className, variant, ...props }: BadgeProps): JSX.Element`

**Props**:
- **`about` (optional)**: `string`
- **`accessKey` (optional)**: `string`
- **`aria-activedescendant` (optional)**: `string`
- **`aria-atomic` (optional)**: `Booleanish`
- **`aria-autocomplete` (optional)**: `"list" | "none" | "inline" | "both"`
- **`aria-braillelabel` (optional)**: `string`
- **`aria-brailleroledescription` (optional)**: `string`
- **`aria-busy` (optional)**: `Booleanish`
- **`aria-checked` (optional)**: `boolean | "true" | "false" | "mixed"`
- **`aria-colcount` (optional)**: `number`
- **`aria-colindex` (optional)**: `number`
- **`aria-colindextext` (optional)**: `string`
- **`aria-colspan` (optional)**: `number`
- **`aria-controls` (optional)**: `string`
- **`aria-current` (optional)**: `boolean | "location" | "date" | "time" | "step" | "true" | "false" | "page"`
- **`aria-describedby` (optional)**: `string`
- **`aria-description` (optional)**: `string`
- **`aria-details` (optional)**: `string`
- **`aria-disabled` (optional)**: `Booleanish`
- **`aria-dropeffect` (optional)**: `"link" | "copy" | "none" | "execute" | "move" | "popup"`
- **`aria-errormessage` (optional)**: `string`
- **`aria-expanded` (optional)**: `Booleanish`
- **`aria-flowto` (optional)**: `string`
- **`aria-grabbed` (optional)**: `Booleanish`
- **`aria-haspopup` (optional)**: `boolean | "grid" | "dialog" | "menu" | "true" | "false" | "listbox" | "tree"`
- **`aria-hidden` (optional)**: `Booleanish`
- **`aria-invalid` (optional)**: `boolean | "true" | "false" | "grammar" | "spelling"`
- **`aria-keyshortcuts` (optional)**: `string`
- **`aria-label` (optional)**: `string`
- **`aria-labelledby` (optional)**: `string`
- **…**: (and 235 more)

**Example**:

```tsx
import { Badge } from "@/components/ui/badge";

export function Example() {
  return <Badge />;
}
```

#### `BadgeProps`

- **Import**: `import { BadgeProps } from "@/components/ui/badge";`
- **Kind**: Type

**Definition**:

```ts
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}
```

**Example**:

```tsx
import { BadgeProps } from "@/components/ui/badge";

// Use BadgeProps in your code where appropriate.
```

#### `badgeVariants`

- **Import**: `import { badgeVariants } from "@/components/ui/badge";`
- **Kind**: Function
- **Signature**: `badgeVariants(props?: Props<T>): string`

**Example**:

```tsx
import { badgeVariants } from "@/components/ui/badge";

const result = badgeVariants(/* ...args */);
void result;
```

### `@/components/ui/breadcrumb`

- **Source**: `src/components/ui/breadcrumb.tsx`

#### `Breadcrumb`

- **Import**: `import { Breadcrumb } from "@/components/ui/breadcrumb";`
- **Kind**: Component
- **Signature**: `Breadcrumb(props: P): ReactNode`

**Example**:

```tsx
import { Breadcrumb } from "@/components/ui/breadcrumb";

export function Example() {
  return <Breadcrumb />;
}
```

#### `BreadcrumbEllipsis`

- **Import**: `import { BreadcrumbEllipsis } from "@/components/ui/breadcrumb";`
- **Kind**: Component
- **Signature**: `BreadcrumbEllipsis({ className, ...props }: React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>): JSX.Element`

**Props**:
- **`about` (optional)**: `string`
- **`accessKey` (optional)**: `string`
- **`aria-activedescendant` (optional)**: `string`
- **`aria-atomic` (optional)**: `Booleanish`
- **`aria-autocomplete` (optional)**: `"list" | "none" | "inline" | "both"`
- **`aria-braillelabel` (optional)**: `string`
- **`aria-brailleroledescription` (optional)**: `string`
- **`aria-busy` (optional)**: `Booleanish`
- **`aria-checked` (optional)**: `boolean | "true" | "false" | "mixed"`
- **`aria-colcount` (optional)**: `number`
- **`aria-colindex` (optional)**: `number`
- **`aria-colindextext` (optional)**: `string`
- **`aria-colspan` (optional)**: `number`
- **`aria-controls` (optional)**: `string`
- **`aria-current` (optional)**: `boolean | "location" | "date" | "time" | "step" | "true" | "false" | "page"`
- **`aria-describedby` (optional)**: `string`
- **`aria-description` (optional)**: `string`
- **`aria-details` (optional)**: `string`
- **`aria-disabled` (optional)**: `Booleanish`
- **`aria-dropeffect` (optional)**: `"link" | "copy" | "none" | "execute" | "move" | "popup"`
- **`aria-errormessage` (optional)**: `string`
- **`aria-expanded` (optional)**: `Booleanish`
- **`aria-flowto` (optional)**: `string`
- **`aria-grabbed` (optional)**: `Booleanish`
- **`aria-haspopup` (optional)**: `boolean | "grid" | "dialog" | "menu" | "true" | "false" | "listbox" | "tree"`
- **`aria-hidden` (optional)**: `Booleanish`
- **`aria-invalid` (optional)**: `boolean | "true" | "false" | "grammar" | "spelling"`
- **`aria-keyshortcuts` (optional)**: `string`
- **`aria-label` (optional)**: `string`
- **`aria-labelledby` (optional)**: `string`
- **…**: (and 236 more)

**Example**:

```tsx
import { BreadcrumbEllipsis } from "@/components/ui/breadcrumb";

export function Example() {
  return <BreadcrumbEllipsis />;
}
```

#### `BreadcrumbItem`

- **Import**: `import { BreadcrumbItem } from "@/components/ui/breadcrumb";`
- **Kind**: Component
- **Signature**: `BreadcrumbItem(props: P): ReactNode`

**Example**:

```tsx
import { BreadcrumbItem } from "@/components/ui/breadcrumb";

export function Example() {
  return <BreadcrumbItem />;
}
```

#### `BreadcrumbLink`

- **Import**: `import { BreadcrumbLink } from "@/components/ui/breadcrumb";`
- **Kind**: Component
- **Signature**: `BreadcrumbLink(props: P): ReactNode`

**Example**:

```tsx
import { BreadcrumbLink } from "@/components/ui/breadcrumb";

export function Example() {
  return <BreadcrumbLink />;
}
```

#### `BreadcrumbList`

- **Import**: `import { BreadcrumbList } from "@/components/ui/breadcrumb";`
- **Kind**: Component
- **Signature**: `BreadcrumbList(props: P): ReactNode`

**Example**:

```tsx
import { BreadcrumbList } from "@/components/ui/breadcrumb";

export function Example() {
  return <BreadcrumbList />;
}
```

#### `BreadcrumbPage`

- **Import**: `import { BreadcrumbPage } from "@/components/ui/breadcrumb";`
- **Kind**: Component
- **Signature**: `BreadcrumbPage(props: P): ReactNode`

**Example**:

```tsx
import { BreadcrumbPage } from "@/components/ui/breadcrumb";

export function Example() {
  return <BreadcrumbPage />;
}
```

#### `BreadcrumbSeparator`

- **Import**: `import { BreadcrumbSeparator } from "@/components/ui/breadcrumb";`
- **Kind**: Component
- **Signature**: `BreadcrumbSeparator({ children, className, ...props }: React.DetailedHTMLProps<React.LiHTMLAttributes<HTMLLIElement>, HTMLLIElement>): JSX.Element`

**Props**:
- **`about` (optional)**: `string`
- **`accessKey` (optional)**: `string`
- **`aria-activedescendant` (optional)**: `string`
- **`aria-atomic` (optional)**: `Booleanish`
- **`aria-autocomplete` (optional)**: `"list" | "none" | "inline" | "both"`
- **`aria-braillelabel` (optional)**: `string`
- **`aria-brailleroledescription` (optional)**: `string`
- **`aria-busy` (optional)**: `Booleanish`
- **`aria-checked` (optional)**: `boolean | "true" | "false" | "mixed"`
- **`aria-colcount` (optional)**: `number`
- **`aria-colindex` (optional)**: `number`
- **`aria-colindextext` (optional)**: `string`
- **`aria-colspan` (optional)**: `number`
- **`aria-controls` (optional)**: `string`
- **`aria-current` (optional)**: `boolean | "location" | "date" | "time" | "step" | "true" | "false" | "page"`
- **`aria-describedby` (optional)**: `string`
- **`aria-description` (optional)**: `string`
- **`aria-details` (optional)**: `string`
- **`aria-disabled` (optional)**: `Booleanish`
- **`aria-dropeffect` (optional)**: `"link" | "copy" | "none" | "execute" | "move" | "popup"`
- **`aria-errormessage` (optional)**: `string`
- **`aria-expanded` (optional)**: `Booleanish`
- **`aria-flowto` (optional)**: `string`
- **`aria-grabbed` (optional)**: `Booleanish`
- **`aria-haspopup` (optional)**: `boolean | "grid" | "dialog" | "menu" | "true" | "false" | "listbox" | "tree"`
- **`aria-hidden` (optional)**: `Booleanish`
- **`aria-invalid` (optional)**: `boolean | "true" | "false" | "grammar" | "spelling"`
- **`aria-keyshortcuts` (optional)**: `string`
- **`aria-label` (optional)**: `string`
- **`aria-labelledby` (optional)**: `string`
- **…**: (and 237 more)

**Example**:

```tsx
import { BreadcrumbSeparator } from "@/components/ui/breadcrumb";

export function Example() {
  return <BreadcrumbSeparator />;
}
```

### `@/components/ui/button`

- **Source**: `src/components/ui/button.tsx`

#### `Button`

- **Import**: `import { Button } from "@/components/ui/button";`
- **Kind**: Component
- **Signature**: `Button(props: P): ReactNode`

**Example**:

```tsx
import { Button } from "@/components/ui/button";

export function Example() {
  return <Button />;
}
```

#### `ButtonProps`

- **Import**: `import { ButtonProps } from "@/components/ui/button";`
- **Kind**: Type

**Definition**:

```ts
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}
```

**Example**:

```tsx
import { ButtonProps } from "@/components/ui/button";

// Use ButtonProps in your code where appropriate.
```

#### `buttonVariants`

- **Import**: `import { buttonVariants } from "@/components/ui/button";`
- **Kind**: Function
- **Signature**: `buttonVariants(props?: Props<T>): string`

**Example**:

```tsx
import { buttonVariants } from "@/components/ui/button";

const result = buttonVariants(/* ...args */);
void result;
```

### `@/components/ui/calendar`

- **Source**: `src/components/ui/calendar.tsx`

#### `Calendar`

- **Import**: `import { Calendar } from "@/components/ui/calendar";`
- **Kind**: Component
- **Signature**: `Calendar({ className, classNames, showOutsideDays = true, ...props }: DayPickerDefaultProps | DayPickerSingleProps | DayPickerMultipleProps | DayPickerRangeProps): JSX.Element`

**Props**:
- **`captionLayout` (optional)**: `CaptionLayout`
- **`className` (optional)**: `string`
- **`classNames` (optional)**: `Partial<StyledElement<string>>`
- **`components` (optional)**: `CustomComponents`
- **`defaultMonth` (optional)**: `Date`
- **`dir` (optional)**: `string`
- **`disabled` (optional)**: `Matcher | Matcher[]`
- **`disableNavigation` (optional)**: `boolean`
- **`firstWeekContainsDate` (optional)**: `1 | 4`
- **`fixedWeeks` (optional)**: `boolean`
- **`footer` (optional)**: `react.ReactNode`
- **`formatters` (optional)**: `Partial<Formatters>`
- **`fromDate` (optional)**: `Date`
- **`fromMonth` (optional)**: `Date`
- **`fromYear` (optional)**: `number`
- **`hidden` (optional)**: `Matcher | Matcher[]`
- **`hideHead` (optional)**: `boolean`
- **`id` (optional)**: `string`
- **`initialFocus` (optional)**: `boolean`
- **`ISOWeek` (optional)**: `boolean`
- **`labels` (optional)**: `Partial<Labels>`
- **`lang` (optional)**: `string`
- **`locale` (optional)**: `Locale`
- **`mode` (optional)**: `"multiple" | "default" | "single" | "range"`
- **`modifiers` (optional)**: `DayModifiers`
- **`modifiersClassNames` (optional)**: `ModifiersClassNames`
- **`modifiersStyles` (optional)**: `ModifiersStyles`
- **`month` (optional)**: `Date`
- **`nonce` (optional)**: `string`
- **`numberOfMonths` (optional)**: `number`
- **…**: (and 31 more)

**Example**:

```tsx
import { Calendar } from "@/components/ui/calendar";

export function Example() {
  return <Calendar />;
}
```

#### `CalendarProps`

- **Import**: `import { CalendarProps } from "@/components/ui/calendar";`
- **Kind**: Type

**Definition**:

```ts
export type CalendarProps = React.ComponentProps<typeof DayPicker>;
```

**Example**:

```tsx
import { CalendarProps } from "@/components/ui/calendar";

// Use CalendarProps in your code where appropriate.
```

### `@/components/ui/card`

- **Source**: `src/components/ui/card.tsx`

#### `Card`

- **Import**: `import { Card } from "@/components/ui/card";`
- **Kind**: Component
- **Signature**: `Card(props: P): ReactNode`

**Example**:

```tsx
import { Card } from "@/components/ui/card";

export function Example() {
  return <Card />;
}
```

#### `CardContent`

- **Import**: `import { CardContent } from "@/components/ui/card";`
- **Kind**: Component
- **Signature**: `CardContent(props: P): ReactNode`

**Example**:

```tsx
import { CardContent } from "@/components/ui/card";

export function Example() {
  return <CardContent />;
}
```

#### `CardDescription`

- **Import**: `import { CardDescription } from "@/components/ui/card";`
- **Kind**: Component
- **Signature**: `CardDescription(props: P): ReactNode`

**Example**:

```tsx
import { CardDescription } from "@/components/ui/card";

export function Example() {
  return <CardDescription />;
}
```

#### `CardFooter`

- **Import**: `import { CardFooter } from "@/components/ui/card";`
- **Kind**: Component
- **Signature**: `CardFooter(props: P): ReactNode`

**Example**:

```tsx
import { CardFooter } from "@/components/ui/card";

export function Example() {
  return <CardFooter />;
}
```

#### `CardHeader`

- **Import**: `import { CardHeader } from "@/components/ui/card";`
- **Kind**: Component
- **Signature**: `CardHeader(props: P): ReactNode`

**Example**:

```tsx
import { CardHeader } from "@/components/ui/card";

export function Example() {
  return <CardHeader />;
}
```

#### `CardTitle`

- **Import**: `import { CardTitle } from "@/components/ui/card";`
- **Kind**: Component
- **Signature**: `CardTitle(props: P): ReactNode`

**Example**:

```tsx
import { CardTitle } from "@/components/ui/card";

export function Example() {
  return <CardTitle />;
}
```

### `@/components/ui/carousel`

- **Source**: `src/components/ui/carousel.tsx`

#### `Carousel`

- **Import**: `import { Carousel } from "@/components/ui/carousel";`
- **Kind**: Component
- **Signature**: `Carousel(props: P): ReactNode`

**Example**:

```tsx
import { Carousel } from "@/components/ui/carousel";

export function Example() {
  return <Carousel />;
}
```

#### `CarouselApi`

- **Import**: `import { CarouselApi } from "@/components/ui/carousel";`
- **Kind**: Type

**Definition**:

```ts
type CarouselApi = UseEmblaCarouselType[1];
```

**Example**:

```tsx
import { CarouselApi } from "@/components/ui/carousel";

// Use CarouselApi in your code where appropriate.
```

#### `CarouselContent`

- **Import**: `import { CarouselContent } from "@/components/ui/carousel";`
- **Kind**: Component
- **Signature**: `CarouselContent(props: P): ReactNode`

**Example**:

```tsx
import { CarouselContent } from "@/components/ui/carousel";

export function Example() {
  return <CarouselContent />;
}
```

#### `CarouselItem`

- **Import**: `import { CarouselItem } from "@/components/ui/carousel";`
- **Kind**: Component
- **Signature**: `CarouselItem(props: P): ReactNode`

**Example**:

```tsx
import { CarouselItem } from "@/components/ui/carousel";

export function Example() {
  return <CarouselItem />;
}
```

#### `CarouselNext`

- **Import**: `import { CarouselNext } from "@/components/ui/carousel";`
- **Kind**: Component
- **Signature**: `CarouselNext(props: P): ReactNode`

**Example**:

```tsx
import { CarouselNext } from "@/components/ui/carousel";

export function Example() {
  return <CarouselNext />;
}
```

#### `CarouselPrevious`

- **Import**: `import { CarouselPrevious } from "@/components/ui/carousel";`
- **Kind**: Component
- **Signature**: `CarouselPrevious(props: P): ReactNode`

**Example**:

```tsx
import { CarouselPrevious } from "@/components/ui/carousel";

export function Example() {
  return <CarouselPrevious />;
}
```

### `@/components/ui/chart`

- **Source**: `src/components/ui/chart.tsx`

#### `ChartConfig`

- **Import**: `import { ChartConfig } from "@/components/ui/chart";`
- **Kind**: Type

**Definition**:

```ts
export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & ({ color?: string; theme?: never } | { color?: never; theme: Record<keyof typeof THEMES, string> });
};
```

**Example**:

```tsx
import { ChartConfig } from "@/components/ui/chart";

// Use ChartConfig in your code where appropriate.
```

#### `ChartContainer`

- **Import**: `import { ChartContainer } from "@/components/ui/chart";`
- **Kind**: Component
- **Signature**: `ChartContainer(props: P): ReactNode`

**Example**:

```tsx
import { ChartContainer } from "@/components/ui/chart";

export function Example() {
  return <ChartContainer />;
}
```

#### `ChartLegend`

- **Import**: `import { ChartLegend } from "@/components/ui/chart";`
- **Kind**: Constant

**Example**:

```tsx
import { ChartLegend } from "@/components/ui/chart";

console.log(ChartLegend);
```

#### `ChartLegendContent`

- **Import**: `import { ChartLegendContent } from "@/components/ui/chart";`
- **Kind**: Component
- **Signature**: `ChartLegendContent(props: P): ReactNode`

**Example**:

```tsx
import { ChartLegendContent } from "@/components/ui/chart";

export function Example() {
  return <ChartLegendContent />;
}
```

#### `ChartStyle`

- **Import**: `import { ChartStyle } from "@/components/ui/chart";`
- **Kind**: Component
- **Signature**: `ChartStyle({ id, config }: { id: string; config: ChartConfig; }): JSX.Element`

**Props**:
- **`config`**: `ChartConfig`
- **`id`**: `string`

**Example**:

```tsx
import { ChartStyle } from "@/components/ui/chart";

export function Example() {
  return <ChartStyle config={undefined as any} id="..." />;
}
```

#### `ChartTooltip`

- **Import**: `import { ChartTooltip } from "@/components/ui/chart";`
- **Kind**: Constant

**Example**:

```tsx
import { ChartTooltip } from "@/components/ui/chart";

console.log(ChartTooltip);
```

#### `ChartTooltipContent`

- **Import**: `import { ChartTooltipContent } from "@/components/ui/chart";`
- **Kind**: Component
- **Signature**: `ChartTooltipContent(props: P): ReactNode`

**Example**:

```tsx
import { ChartTooltipContent } from "@/components/ui/chart";

export function Example() {
  return <ChartTooltipContent />;
}
```

### `@/components/ui/checkbox`

- **Source**: `src/components/ui/checkbox.tsx`

#### `Checkbox`

- **Import**: `import { Checkbox } from "@/components/ui/checkbox";`
- **Kind**: Component
- **Signature**: `Checkbox(props: P): ReactNode`

**Example**:

```tsx
import { Checkbox } from "@/components/ui/checkbox";

export function Example() {
  return <Checkbox />;
}
```

### `@/components/ui/collapsible`

- **Source**: `src/components/ui/collapsible.tsx`

#### `Collapsible`

- **Import**: `import { Collapsible } from "@/components/ui/collapsible";`
- **Kind**: Component
- **Signature**: `Collapsible(props: P): ReactNode`

**Example**:

```tsx
import { Collapsible } from "@/components/ui/collapsible";

export function Example() {
  return <Collapsible />;
}
```

#### `CollapsibleContent`

- **Import**: `import { CollapsibleContent } from "@/components/ui/collapsible";`
- **Kind**: Component
- **Signature**: `CollapsibleContent(props: P): ReactNode`

**Example**:

```tsx
import { CollapsibleContent } from "@/components/ui/collapsible";

export function Example() {
  return <CollapsibleContent />;
}
```

#### `CollapsibleTrigger`

- **Import**: `import { CollapsibleTrigger } from "@/components/ui/collapsible";`
- **Kind**: Component
- **Signature**: `CollapsibleTrigger(props: P): ReactNode`

**Example**:

```tsx
import { CollapsibleTrigger } from "@/components/ui/collapsible";

export function Example() {
  return <CollapsibleTrigger />;
}
```

### `@/components/ui/command`

- **Source**: `src/components/ui/command.tsx`

#### `Command`

- **Import**: `import { Command } from "@/components/ui/command";`
- **Kind**: Component
- **Signature**: `Command(props: P): ReactNode`

**Example**:

```tsx
import { Command } from "@/components/ui/command";

export function Example() {
  return <Command />;
}
```

#### `CommandDialog`

- **Import**: `import { CommandDialog } from "@/components/ui/command";`
- **Kind**: Component
- **Signature**: `CommandDialog({ children, ...props }: CommandDialogProps): JSX.Element`

**Props**:
- **`children` (optional)**: `React.ReactNode`
- **`defaultOpen` (optional)**: `boolean`
- **`modal` (optional)**: `boolean`
- **`onOpenChange` (optional)**: `(open: boolean) => void`
- **`open` (optional)**: `boolean`

**Example**:

```tsx
import { CommandDialog } from "@/components/ui/command";

export function Example() {
  return <CommandDialog />;
}
```

#### `CommandEmpty`

- **Import**: `import { CommandEmpty } from "@/components/ui/command";`
- **Kind**: Component
- **Signature**: `CommandEmpty(props: P): ReactNode`

**Example**:

```tsx
import { CommandEmpty } from "@/components/ui/command";

export function Example() {
  return <CommandEmpty />;
}
```

#### `CommandGroup`

- **Import**: `import { CommandGroup } from "@/components/ui/command";`
- **Kind**: Component
- **Signature**: `CommandGroup(props: P): ReactNode`

**Example**:

```tsx
import { CommandGroup } from "@/components/ui/command";

export function Example() {
  return <CommandGroup />;
}
```

#### `CommandInput`

- **Import**: `import { CommandInput } from "@/components/ui/command";`
- **Kind**: Component
- **Signature**: `CommandInput(props: P): ReactNode`

**Example**:

```tsx
import { CommandInput } from "@/components/ui/command";

export function Example() {
  return <CommandInput />;
}
```

#### `CommandItem`

- **Import**: `import { CommandItem } from "@/components/ui/command";`
- **Kind**: Component
- **Signature**: `CommandItem(props: P): ReactNode`

**Example**:

```tsx
import { CommandItem } from "@/components/ui/command";

export function Example() {
  return <CommandItem />;
}
```

#### `CommandList`

- **Import**: `import { CommandList } from "@/components/ui/command";`
- **Kind**: Component
- **Signature**: `CommandList(props: P): ReactNode`

**Example**:

```tsx
import { CommandList } from "@/components/ui/command";

export function Example() {
  return <CommandList />;
}
```

#### `CommandSeparator`

- **Import**: `import { CommandSeparator } from "@/components/ui/command";`
- **Kind**: Component
- **Signature**: `CommandSeparator(props: P): ReactNode`

**Example**:

```tsx
import { CommandSeparator } from "@/components/ui/command";

export function Example() {
  return <CommandSeparator />;
}
```

#### `CommandShortcut`

- **Import**: `import { CommandShortcut } from "@/components/ui/command";`
- **Kind**: Component
- **Signature**: `CommandShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>): JSX.Element`

**Props**:
- **`about` (optional)**: `string`
- **`accessKey` (optional)**: `string`
- **`aria-activedescendant` (optional)**: `string`
- **`aria-atomic` (optional)**: `Booleanish`
- **`aria-autocomplete` (optional)**: `"list" | "none" | "inline" | "both"`
- **`aria-braillelabel` (optional)**: `string`
- **`aria-brailleroledescription` (optional)**: `string`
- **`aria-busy` (optional)**: `Booleanish`
- **`aria-checked` (optional)**: `boolean | "true" | "false" | "mixed"`
- **`aria-colcount` (optional)**: `number`
- **`aria-colindex` (optional)**: `number`
- **`aria-colindextext` (optional)**: `string`
- **`aria-colspan` (optional)**: `number`
- **`aria-controls` (optional)**: `string`
- **`aria-current` (optional)**: `boolean | "location" | "date" | "time" | "step" | "true" | "false" | "page"`
- **`aria-describedby` (optional)**: `string`
- **`aria-description` (optional)**: `string`
- **`aria-details` (optional)**: `string`
- **`aria-disabled` (optional)**: `Booleanish`
- **`aria-dropeffect` (optional)**: `"link" | "copy" | "none" | "execute" | "move" | "popup"`
- **`aria-errormessage` (optional)**: `string`
- **`aria-expanded` (optional)**: `Booleanish`
- **`aria-flowto` (optional)**: `string`
- **`aria-grabbed` (optional)**: `Booleanish`
- **`aria-haspopup` (optional)**: `boolean | "grid" | "dialog" | "menu" | "true" | "false" | "listbox" | "tree"`
- **`aria-hidden` (optional)**: `Booleanish`
- **`aria-invalid` (optional)**: `boolean | "true" | "false" | "grammar" | "spelling"`
- **`aria-keyshortcuts` (optional)**: `string`
- **`aria-label` (optional)**: `string`
- **`aria-labelledby` (optional)**: `string`
- **…**: (and 234 more)

**Example**:

```tsx
import { CommandShortcut } from "@/components/ui/command";

export function Example() {
  return <CommandShortcut />;
}
```

### `@/components/ui/context-menu`

- **Source**: `src/components/ui/context-menu.tsx`

#### `ContextMenu`

- **Import**: `import { ContextMenu } from "@/components/ui/context-menu";`
- **Kind**: Component
- **Signature**: `ContextMenu(props: P, deprecatedLegacyContext?: any): ReactNode`

**Example**:

```tsx
import { ContextMenu } from "@/components/ui/context-menu";

export function Example() {
  return <ContextMenu />;
}
```

#### `ContextMenuCheckboxItem`

- **Import**: `import { ContextMenuCheckboxItem } from "@/components/ui/context-menu";`
- **Kind**: Component
- **Signature**: `ContextMenuCheckboxItem(props: P): ReactNode`

**Example**:

```tsx
import { ContextMenuCheckboxItem } from "@/components/ui/context-menu";

export function Example() {
  return <ContextMenuCheckboxItem />;
}
```

#### `ContextMenuContent`

- **Import**: `import { ContextMenuContent } from "@/components/ui/context-menu";`
- **Kind**: Component
- **Signature**: `ContextMenuContent(props: P): ReactNode`

**Example**:

```tsx
import { ContextMenuContent } from "@/components/ui/context-menu";

export function Example() {
  return <ContextMenuContent />;
}
```

#### `ContextMenuGroup`

- **Import**: `import { ContextMenuGroup } from "@/components/ui/context-menu";`
- **Kind**: Component
- **Signature**: `ContextMenuGroup(props: P): ReactNode`

**Example**:

```tsx
import { ContextMenuGroup } from "@/components/ui/context-menu";

export function Example() {
  return <ContextMenuGroup />;
}
```

#### `ContextMenuItem`

- **Import**: `import { ContextMenuItem } from "@/components/ui/context-menu";`
- **Kind**: Component
- **Signature**: `ContextMenuItem(props: P): ReactNode`

**Example**:

```tsx
import { ContextMenuItem } from "@/components/ui/context-menu";

export function Example() {
  return <ContextMenuItem />;
}
```

#### `ContextMenuLabel`

- **Import**: `import { ContextMenuLabel } from "@/components/ui/context-menu";`
- **Kind**: Component
- **Signature**: `ContextMenuLabel(props: P): ReactNode`

**Example**:

```tsx
import { ContextMenuLabel } from "@/components/ui/context-menu";

export function Example() {
  return <ContextMenuLabel />;
}
```

#### `ContextMenuPortal`

- **Import**: `import { ContextMenuPortal } from "@/components/ui/context-menu";`
- **Kind**: Component
- **Signature**: `ContextMenuPortal(props: P, deprecatedLegacyContext?: any): ReactNode`

**Example**:

```tsx
import { ContextMenuPortal } from "@/components/ui/context-menu";

export function Example() {
  return <ContextMenuPortal />;
}
```

#### `ContextMenuRadioGroup`

- **Import**: `import { ContextMenuRadioGroup } from "@/components/ui/context-menu";`
- **Kind**: Component
- **Signature**: `ContextMenuRadioGroup(props: P): ReactNode`

**Example**:

```tsx
import { ContextMenuRadioGroup } from "@/components/ui/context-menu";

export function Example() {
  return <ContextMenuRadioGroup />;
}
```

#### `ContextMenuRadioItem`

- **Import**: `import { ContextMenuRadioItem } from "@/components/ui/context-menu";`
- **Kind**: Component
- **Signature**: `ContextMenuRadioItem(props: P): ReactNode`

**Example**:

```tsx
import { ContextMenuRadioItem } from "@/components/ui/context-menu";

export function Example() {
  return <ContextMenuRadioItem />;
}
```

#### `ContextMenuSeparator`

- **Import**: `import { ContextMenuSeparator } from "@/components/ui/context-menu";`
- **Kind**: Component
- **Signature**: `ContextMenuSeparator(props: P): ReactNode`

**Example**:

```tsx
import { ContextMenuSeparator } from "@/components/ui/context-menu";

export function Example() {
  return <ContextMenuSeparator />;
}
```

#### `ContextMenuShortcut`

- **Import**: `import { ContextMenuShortcut } from "@/components/ui/context-menu";`
- **Kind**: Component
- **Signature**: `ContextMenuShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>): JSX.Element`

**Props**:
- **`about` (optional)**: `string`
- **`accessKey` (optional)**: `string`
- **`aria-activedescendant` (optional)**: `string`
- **`aria-atomic` (optional)**: `Booleanish`
- **`aria-autocomplete` (optional)**: `"list" | "none" | "inline" | "both"`
- **`aria-braillelabel` (optional)**: `string`
- **`aria-brailleroledescription` (optional)**: `string`
- **`aria-busy` (optional)**: `Booleanish`
- **`aria-checked` (optional)**: `boolean | "true" | "false" | "mixed"`
- **`aria-colcount` (optional)**: `number`
- **`aria-colindex` (optional)**: `number`
- **`aria-colindextext` (optional)**: `string`
- **`aria-colspan` (optional)**: `number`
- **`aria-controls` (optional)**: `string`
- **`aria-current` (optional)**: `boolean | "location" | "date" | "time" | "step" | "true" | "false" | "page"`
- **`aria-describedby` (optional)**: `string`
- **`aria-description` (optional)**: `string`
- **`aria-details` (optional)**: `string`
- **`aria-disabled` (optional)**: `Booleanish`
- **`aria-dropeffect` (optional)**: `"link" | "copy" | "none" | "execute" | "move" | "popup"`
- **`aria-errormessage` (optional)**: `string`
- **`aria-expanded` (optional)**: `Booleanish`
- **`aria-flowto` (optional)**: `string`
- **`aria-grabbed` (optional)**: `Booleanish`
- **`aria-haspopup` (optional)**: `boolean | "grid" | "dialog" | "menu" | "true" | "false" | "listbox" | "tree"`
- **`aria-hidden` (optional)**: `Booleanish`
- **`aria-invalid` (optional)**: `boolean | "true" | "false" | "grammar" | "spelling"`
- **`aria-keyshortcuts` (optional)**: `string`
- **`aria-label` (optional)**: `string`
- **`aria-labelledby` (optional)**: `string`
- **…**: (and 234 more)

**Example**:

```tsx
import { ContextMenuShortcut } from "@/components/ui/context-menu";

export function Example() {
  return <ContextMenuShortcut />;
}
```

#### `ContextMenuSub`

- **Import**: `import { ContextMenuSub } from "@/components/ui/context-menu";`
- **Kind**: Component
- **Signature**: `ContextMenuSub(props: P, deprecatedLegacyContext?: any): ReactNode`

**Example**:

```tsx
import { ContextMenuSub } from "@/components/ui/context-menu";

export function Example() {
  return <ContextMenuSub />;
}
```

#### `ContextMenuSubContent`

- **Import**: `import { ContextMenuSubContent } from "@/components/ui/context-menu";`
- **Kind**: Component
- **Signature**: `ContextMenuSubContent(props: P): ReactNode`

**Example**:

```tsx
import { ContextMenuSubContent } from "@/components/ui/context-menu";

export function Example() {
  return <ContextMenuSubContent />;
}
```

#### `ContextMenuSubTrigger`

- **Import**: `import { ContextMenuSubTrigger } from "@/components/ui/context-menu";`
- **Kind**: Component
- **Signature**: `ContextMenuSubTrigger(props: P): ReactNode`

**Example**:

```tsx
import { ContextMenuSubTrigger } from "@/components/ui/context-menu";

export function Example() {
  return <ContextMenuSubTrigger />;
}
```

#### `ContextMenuTrigger`

- **Import**: `import { ContextMenuTrigger } from "@/components/ui/context-menu";`
- **Kind**: Component
- **Signature**: `ContextMenuTrigger(props: P): ReactNode`

**Example**:

```tsx
import { ContextMenuTrigger } from "@/components/ui/context-menu";

export function Example() {
  return <ContextMenuTrigger />;
}
```

### `@/components/ui/dialog`

- **Source**: `src/components/ui/dialog.tsx`

#### `Dialog`

- **Import**: `import { Dialog } from "@/components/ui/dialog";`
- **Kind**: Component
- **Signature**: `Dialog(props: P, deprecatedLegacyContext?: any): ReactNode`

**Example**:

```tsx
import { Dialog } from "@/components/ui/dialog";

export function Example() {
  return <Dialog />;
}
```

#### `DialogClose`

- **Import**: `import { DialogClose } from "@/components/ui/dialog";`
- **Kind**: Component
- **Signature**: `DialogClose(props: P): ReactNode`

**Example**:

```tsx
import { DialogClose } from "@/components/ui/dialog";

export function Example() {
  return <DialogClose />;
}
```

#### `DialogContent`

- **Import**: `import { DialogContent } from "@/components/ui/dialog";`
- **Kind**: Component
- **Signature**: `DialogContent(props: P): ReactNode`

**Example**:

```tsx
import { DialogContent } from "@/components/ui/dialog";

export function Example() {
  return <DialogContent />;
}
```

#### `DialogDescription`

- **Import**: `import { DialogDescription } from "@/components/ui/dialog";`
- **Kind**: Component
- **Signature**: `DialogDescription(props: P): ReactNode`

**Example**:

```tsx
import { DialogDescription } from "@/components/ui/dialog";

export function Example() {
  return <DialogDescription />;
}
```

#### `DialogFooter`

- **Import**: `import { DialogFooter } from "@/components/ui/dialog";`
- **Kind**: Component
- **Signature**: `DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element`

**Props**:
- **`about` (optional)**: `string`
- **`accessKey` (optional)**: `string`
- **`aria-activedescendant` (optional)**: `string`
- **`aria-atomic` (optional)**: `Booleanish`
- **`aria-autocomplete` (optional)**: `"list" | "none" | "inline" | "both"`
- **`aria-braillelabel` (optional)**: `string`
- **`aria-brailleroledescription` (optional)**: `string`
- **`aria-busy` (optional)**: `Booleanish`
- **`aria-checked` (optional)**: `boolean | "true" | "false" | "mixed"`
- **`aria-colcount` (optional)**: `number`
- **`aria-colindex` (optional)**: `number`
- **`aria-colindextext` (optional)**: `string`
- **`aria-colspan` (optional)**: `number`
- **`aria-controls` (optional)**: `string`
- **`aria-current` (optional)**: `boolean | "location" | "date" | "time" | "step" | "true" | "false" | "page"`
- **`aria-describedby` (optional)**: `string`
- **`aria-description` (optional)**: `string`
- **`aria-details` (optional)**: `string`
- **`aria-disabled` (optional)**: `Booleanish`
- **`aria-dropeffect` (optional)**: `"link" | "copy" | "none" | "execute" | "move" | "popup"`
- **`aria-errormessage` (optional)**: `string`
- **`aria-expanded` (optional)**: `Booleanish`
- **`aria-flowto` (optional)**: `string`
- **`aria-grabbed` (optional)**: `Booleanish`
- **`aria-haspopup` (optional)**: `boolean | "grid" | "dialog" | "menu" | "true" | "false" | "listbox" | "tree"`
- **`aria-hidden` (optional)**: `Booleanish`
- **`aria-invalid` (optional)**: `boolean | "true" | "false" | "grammar" | "spelling"`
- **`aria-keyshortcuts` (optional)**: `string`
- **`aria-label` (optional)**: `string`
- **`aria-labelledby` (optional)**: `string`
- **…**: (and 234 more)

**Example**:

```tsx
import { DialogFooter } from "@/components/ui/dialog";

export function Example() {
  return <DialogFooter />;
}
```

#### `DialogHeader`

- **Import**: `import { DialogHeader } from "@/components/ui/dialog";`
- **Kind**: Component
- **Signature**: `DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element`

**Props**:
- **`about` (optional)**: `string`
- **`accessKey` (optional)**: `string`
- **`aria-activedescendant` (optional)**: `string`
- **`aria-atomic` (optional)**: `Booleanish`
- **`aria-autocomplete` (optional)**: `"list" | "none" | "inline" | "both"`
- **`aria-braillelabel` (optional)**: `string`
- **`aria-brailleroledescription` (optional)**: `string`
- **`aria-busy` (optional)**: `Booleanish`
- **`aria-checked` (optional)**: `boolean | "true" | "false" | "mixed"`
- **`aria-colcount` (optional)**: `number`
- **`aria-colindex` (optional)**: `number`
- **`aria-colindextext` (optional)**: `string`
- **`aria-colspan` (optional)**: `number`
- **`aria-controls` (optional)**: `string`
- **`aria-current` (optional)**: `boolean | "location" | "date" | "time" | "step" | "true" | "false" | "page"`
- **`aria-describedby` (optional)**: `string`
- **`aria-description` (optional)**: `string`
- **`aria-details` (optional)**: `string`
- **`aria-disabled` (optional)**: `Booleanish`
- **`aria-dropeffect` (optional)**: `"link" | "copy" | "none" | "execute" | "move" | "popup"`
- **`aria-errormessage` (optional)**: `string`
- **`aria-expanded` (optional)**: `Booleanish`
- **`aria-flowto` (optional)**: `string`
- **`aria-grabbed` (optional)**: `Booleanish`
- **`aria-haspopup` (optional)**: `boolean | "grid" | "dialog" | "menu" | "true" | "false" | "listbox" | "tree"`
- **`aria-hidden` (optional)**: `Booleanish`
- **`aria-invalid` (optional)**: `boolean | "true" | "false" | "grammar" | "spelling"`
- **`aria-keyshortcuts` (optional)**: `string`
- **`aria-label` (optional)**: `string`
- **`aria-labelledby` (optional)**: `string`
- **…**: (and 234 more)

**Example**:

```tsx
import { DialogHeader } from "@/components/ui/dialog";

export function Example() {
  return <DialogHeader />;
}
```

#### `DialogOverlay`

- **Import**: `import { DialogOverlay } from "@/components/ui/dialog";`
- **Kind**: Component
- **Signature**: `DialogOverlay(props: P): ReactNode`

**Example**:

```tsx
import { DialogOverlay } from "@/components/ui/dialog";

export function Example() {
  return <DialogOverlay />;
}
```

#### `DialogPortal`

- **Import**: `import { DialogPortal } from "@/components/ui/dialog";`
- **Kind**: Component
- **Signature**: `DialogPortal(props: P, deprecatedLegacyContext?: any): ReactNode`

**Example**:

```tsx
import { DialogPortal } from "@/components/ui/dialog";

export function Example() {
  return <DialogPortal />;
}
```

#### `DialogTitle`

- **Import**: `import { DialogTitle } from "@/components/ui/dialog";`
- **Kind**: Component
- **Signature**: `DialogTitle(props: P): ReactNode`

**Example**:

```tsx
import { DialogTitle } from "@/components/ui/dialog";

export function Example() {
  return <DialogTitle />;
}
```

#### `DialogTrigger`

- **Import**: `import { DialogTrigger } from "@/components/ui/dialog";`
- **Kind**: Component
- **Signature**: `DialogTrigger(props: P): ReactNode`

**Example**:

```tsx
import { DialogTrigger } from "@/components/ui/dialog";

export function Example() {
  return <DialogTrigger />;
}
```

### `@/components/ui/drawer`

- **Source**: `src/components/ui/drawer.tsx`

#### `Drawer`

- **Import**: `import { Drawer } from "@/components/ui/drawer";`
- **Kind**: Component
- **Signature**: `Drawer({ shouldScaleBackground = true, ...props }: DialogProps): JSX.Element`

**Props**:
- **`activeSnapPoint` (optional)**: `string | number`
- **`autoFocus` (optional)**: `boolean`
- **`children` (optional)**: `React.ReactNode`
- **`closeThreshold` (optional)**: `number`
- **`container` (optional)**: `HTMLElement`
- **`defaultOpen` (optional)**: `boolean`
- **`direction` (optional)**: `"left" | "right" | "top" | "bottom"`
- **`disablePreventScroll` (optional)**: `boolean`
- **`dismissible` (optional)**: `boolean`
- **`fadeFromIndex` (optional)**: `number`
- **`fixed` (optional)**: `boolean`
- **`handleOnly` (optional)**: `boolean`
- **`modal` (optional)**: `boolean`
- **`nested` (optional)**: `boolean`
- **`noBodyStyles` (optional)**: `boolean`
- **`onAnimationEnd` (optional)**: `(open: boolean) => void`
- **`onClose` (optional)**: `() => void`
- **`onDrag` (optional)**: `(event: React.PointerEvent<HTMLDivElement>, percentageDragged: number) => void`
- **`onOpenChange` (optional)**: `(open: boolean) => void`
- **`onRelease` (optional)**: `(event: React.PointerEvent<HTMLDivElement>, open: boolean) => void`
- **`open` (optional)**: `boolean`
- **`preventScrollRestoration` (optional)**: `boolean`
- **`repositionInputs` (optional)**: `boolean`
- **`scrollLockTimeout` (optional)**: `number`
- **`setActiveSnapPoint` (optional)**: `(snapPoint: number | string | null) => void`
- **`setBackgroundColorOnScale` (optional)**: `boolean`
- **`shouldScaleBackground` (optional)**: `boolean`
- **`snapPoints` (optional)**: `(string | number)[]`
- **`snapToSequentialPoint` (optional)**: `boolean`

**Example**:

```tsx
import { Drawer } from "@/components/ui/drawer";

export function Example() {
  return <Drawer />;
}
```

#### `DrawerClose`

- **Import**: `import { DrawerClose } from "@/components/ui/drawer";`
- **Kind**: Component
- **Signature**: `DrawerClose(props: P): ReactNode`

**Example**:

```tsx
import { DrawerClose } from "@/components/ui/drawer";

export function Example() {
  return <DrawerClose />;
}
```

#### `DrawerContent`

- **Import**: `import { DrawerContent } from "@/components/ui/drawer";`
- **Kind**: Component
- **Signature**: `DrawerContent(props: P): ReactNode`

**Example**:

```tsx
import { DrawerContent } from "@/components/ui/drawer";

export function Example() {
  return <DrawerContent />;
}
```

#### `DrawerDescription`

- **Import**: `import { DrawerDescription } from "@/components/ui/drawer";`
- **Kind**: Component
- **Signature**: `DrawerDescription(props: P): ReactNode`

**Example**:

```tsx
import { DrawerDescription } from "@/components/ui/drawer";

export function Example() {
  return <DrawerDescription />;
}
```

#### `DrawerFooter`

- **Import**: `import { DrawerFooter } from "@/components/ui/drawer";`
- **Kind**: Component
- **Signature**: `DrawerFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element`

**Props**:
- **`about` (optional)**: `string`
- **`accessKey` (optional)**: `string`
- **`aria-activedescendant` (optional)**: `string`
- **`aria-atomic` (optional)**: `Booleanish`
- **`aria-autocomplete` (optional)**: `"list" | "none" | "inline" | "both"`
- **`aria-braillelabel` (optional)**: `string`
- **`aria-brailleroledescription` (optional)**: `string`
- **`aria-busy` (optional)**: `Booleanish`
- **`aria-checked` (optional)**: `boolean | "true" | "false" | "mixed"`
- **`aria-colcount` (optional)**: `number`
- **`aria-colindex` (optional)**: `number`
- **`aria-colindextext` (optional)**: `string`
- **`aria-colspan` (optional)**: `number`
- **`aria-controls` (optional)**: `string`
- **`aria-current` (optional)**: `boolean | "location" | "date" | "time" | "step" | "true" | "false" | "page"`
- **`aria-describedby` (optional)**: `string`
- **`aria-description` (optional)**: `string`
- **`aria-details` (optional)**: `string`
- **`aria-disabled` (optional)**: `Booleanish`
- **`aria-dropeffect` (optional)**: `"link" | "copy" | "none" | "execute" | "move" | "popup"`
- **`aria-errormessage` (optional)**: `string`
- **`aria-expanded` (optional)**: `Booleanish`
- **`aria-flowto` (optional)**: `string`
- **`aria-grabbed` (optional)**: `Booleanish`
- **`aria-haspopup` (optional)**: `boolean | "grid" | "dialog" | "menu" | "true" | "false" | "listbox" | "tree"`
- **`aria-hidden` (optional)**: `Booleanish`
- **`aria-invalid` (optional)**: `boolean | "true" | "false" | "grammar" | "spelling"`
- **`aria-keyshortcuts` (optional)**: `string`
- **`aria-label` (optional)**: `string`
- **`aria-labelledby` (optional)**: `string`
- **…**: (and 234 more)

**Example**:

```tsx
import { DrawerFooter } from "@/components/ui/drawer";

export function Example() {
  return <DrawerFooter />;
}
```

#### `DrawerHeader`

- **Import**: `import { DrawerHeader } from "@/components/ui/drawer";`
- **Kind**: Component
- **Signature**: `DrawerHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element`

**Props**:
- **`about` (optional)**: `string`
- **`accessKey` (optional)**: `string`
- **`aria-activedescendant` (optional)**: `string`
- **`aria-atomic` (optional)**: `Booleanish`
- **`aria-autocomplete` (optional)**: `"list" | "none" | "inline" | "both"`
- **`aria-braillelabel` (optional)**: `string`
- **`aria-brailleroledescription` (optional)**: `string`
- **`aria-busy` (optional)**: `Booleanish`
- **`aria-checked` (optional)**: `boolean | "true" | "false" | "mixed"`
- **`aria-colcount` (optional)**: `number`
- **`aria-colindex` (optional)**: `number`
- **`aria-colindextext` (optional)**: `string`
- **`aria-colspan` (optional)**: `number`
- **`aria-controls` (optional)**: `string`
- **`aria-current` (optional)**: `boolean | "location" | "date" | "time" | "step" | "true" | "false" | "page"`
- **`aria-describedby` (optional)**: `string`
- **`aria-description` (optional)**: `string`
- **`aria-details` (optional)**: `string`
- **`aria-disabled` (optional)**: `Booleanish`
- **`aria-dropeffect` (optional)**: `"link" | "copy" | "none" | "execute" | "move" | "popup"`
- **`aria-errormessage` (optional)**: `string`
- **`aria-expanded` (optional)**: `Booleanish`
- **`aria-flowto` (optional)**: `string`
- **`aria-grabbed` (optional)**: `Booleanish`
- **`aria-haspopup` (optional)**: `boolean | "grid" | "dialog" | "menu" | "true" | "false" | "listbox" | "tree"`
- **`aria-hidden` (optional)**: `Booleanish`
- **`aria-invalid` (optional)**: `boolean | "true" | "false" | "grammar" | "spelling"`
- **`aria-keyshortcuts` (optional)**: `string`
- **`aria-label` (optional)**: `string`
- **`aria-labelledby` (optional)**: `string`
- **…**: (and 234 more)

**Example**:

```tsx
import { DrawerHeader } from "@/components/ui/drawer";

export function Example() {
  return <DrawerHeader />;
}
```

#### `DrawerOverlay`

- **Import**: `import { DrawerOverlay } from "@/components/ui/drawer";`
- **Kind**: Component
- **Signature**: `DrawerOverlay(props: P): ReactNode`

**Example**:

```tsx
import { DrawerOverlay } from "@/components/ui/drawer";

export function Example() {
  return <DrawerOverlay />;
}
```

#### `DrawerPortal`

- **Import**: `import { DrawerPortal } from "@/components/ui/drawer";`
- **Kind**: Component
- **Signature**: `DrawerPortal(props: DialogPrimitive.DialogPortalProps): React.JSX.Element`

**Props**:
- **`children` (optional)**: `React.ReactNode`
- **`container` (optional)**: `Element | DocumentFragment`
- **`forceMount` (optional)**: `true`

**Example**:

```tsx
import { DrawerPortal } from "@/components/ui/drawer";

export function Example() {
  return <DrawerPortal />;
}
```

#### `DrawerTitle`

- **Import**: `import { DrawerTitle } from "@/components/ui/drawer";`
- **Kind**: Component
- **Signature**: `DrawerTitle(props: P): ReactNode`

**Example**:

```tsx
import { DrawerTitle } from "@/components/ui/drawer";

export function Example() {
  return <DrawerTitle />;
}
```

#### `DrawerTrigger`

- **Import**: `import { DrawerTrigger } from "@/components/ui/drawer";`
- **Kind**: Component
- **Signature**: `DrawerTrigger(props: P): ReactNode`

**Example**:

```tsx
import { DrawerTrigger } from "@/components/ui/drawer";

export function Example() {
  return <DrawerTrigger />;
}
```

### `@/components/ui/dropdown-menu`

- **Source**: `src/components/ui/dropdown-menu.tsx`

#### `DropdownMenu`

- **Import**: `import { DropdownMenu } from "@/components/ui/dropdown-menu";`
- **Kind**: Component
- **Signature**: `DropdownMenu(props: P, deprecatedLegacyContext?: any): ReactNode`

**Example**:

```tsx
import { DropdownMenu } from "@/components/ui/dropdown-menu";

export function Example() {
  return <DropdownMenu />;
}
```

#### `DropdownMenuCheckboxItem`

- **Import**: `import { DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";`
- **Kind**: Component
- **Signature**: `DropdownMenuCheckboxItem(props: P): ReactNode`

**Example**:

```tsx
import { DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";

export function Example() {
  return <DropdownMenuCheckboxItem />;
}
```

#### `DropdownMenuContent`

- **Import**: `import { DropdownMenuContent } from "@/components/ui/dropdown-menu";`
- **Kind**: Component
- **Signature**: `DropdownMenuContent(props: P): ReactNode`

**Example**:

```tsx
import { DropdownMenuContent } from "@/components/ui/dropdown-menu";

export function Example() {
  return <DropdownMenuContent />;
}
```

#### `DropdownMenuGroup`

- **Import**: `import { DropdownMenuGroup } from "@/components/ui/dropdown-menu";`
- **Kind**: Component
- **Signature**: `DropdownMenuGroup(props: P): ReactNode`

**Example**:

```tsx
import { DropdownMenuGroup } from "@/components/ui/dropdown-menu";

export function Example() {
  return <DropdownMenuGroup />;
}
```

#### `DropdownMenuItem`

- **Import**: `import { DropdownMenuItem } from "@/components/ui/dropdown-menu";`
- **Kind**: Component
- **Signature**: `DropdownMenuItem(props: P): ReactNode`

**Example**:

```tsx
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function Example() {
  return <DropdownMenuItem />;
}
```

#### `DropdownMenuLabel`

- **Import**: `import { DropdownMenuLabel } from "@/components/ui/dropdown-menu";`
- **Kind**: Component
- **Signature**: `DropdownMenuLabel(props: P): ReactNode`

**Example**:

```tsx
import { DropdownMenuLabel } from "@/components/ui/dropdown-menu";

export function Example() {
  return <DropdownMenuLabel />;
}
```

#### `DropdownMenuPortal`

- **Import**: `import { DropdownMenuPortal } from "@/components/ui/dropdown-menu";`
- **Kind**: Component
- **Signature**: `DropdownMenuPortal(props: P, deprecatedLegacyContext?: any): ReactNode`

**Example**:

```tsx
import { DropdownMenuPortal } from "@/components/ui/dropdown-menu";

export function Example() {
  return <DropdownMenuPortal />;
}
```

#### `DropdownMenuRadioGroup`

- **Import**: `import { DropdownMenuRadioGroup } from "@/components/ui/dropdown-menu";`
- **Kind**: Component
- **Signature**: `DropdownMenuRadioGroup(props: P): ReactNode`

**Example**:

```tsx
import { DropdownMenuRadioGroup } from "@/components/ui/dropdown-menu";

export function Example() {
  return <DropdownMenuRadioGroup />;
}
```

#### `DropdownMenuRadioItem`

- **Import**: `import { DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";`
- **Kind**: Component
- **Signature**: `DropdownMenuRadioItem(props: P): ReactNode`

**Example**:

```tsx
import { DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";

export function Example() {
  return <DropdownMenuRadioItem />;
}
```

#### `DropdownMenuSeparator`

- **Import**: `import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";`
- **Kind**: Component
- **Signature**: `DropdownMenuSeparator(props: P): ReactNode`

**Example**:

```tsx
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

export function Example() {
  return <DropdownMenuSeparator />;
}
```

#### `DropdownMenuShortcut`

- **Import**: `import { DropdownMenuShortcut } from "@/components/ui/dropdown-menu";`
- **Kind**: Component
- **Signature**: `DropdownMenuShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>): JSX.Element`

**Props**:
- **`about` (optional)**: `string`
- **`accessKey` (optional)**: `string`
- **`aria-activedescendant` (optional)**: `string`
- **`aria-atomic` (optional)**: `Booleanish`
- **`aria-autocomplete` (optional)**: `"list" | "none" | "inline" | "both"`
- **`aria-braillelabel` (optional)**: `string`
- **`aria-brailleroledescription` (optional)**: `string`
- **`aria-busy` (optional)**: `Booleanish`
- **`aria-checked` (optional)**: `boolean | "true" | "false" | "mixed"`
- **`aria-colcount` (optional)**: `number`
- **`aria-colindex` (optional)**: `number`
- **`aria-colindextext` (optional)**: `string`
- **`aria-colspan` (optional)**: `number`
- **`aria-controls` (optional)**: `string`
- **`aria-current` (optional)**: `boolean | "location" | "date" | "time" | "step" | "true" | "false" | "page"`
- **`aria-describedby` (optional)**: `string`
- **`aria-description` (optional)**: `string`
- **`aria-details` (optional)**: `string`
- **`aria-disabled` (optional)**: `Booleanish`
- **`aria-dropeffect` (optional)**: `"link" | "copy" | "none" | "execute" | "move" | "popup"`
- **`aria-errormessage` (optional)**: `string`
- **`aria-expanded` (optional)**: `Booleanish`
- **`aria-flowto` (optional)**: `string`
- **`aria-grabbed` (optional)**: `Booleanish`
- **`aria-haspopup` (optional)**: `boolean | "grid" | "dialog" | "menu" | "true" | "false" | "listbox" | "tree"`
- **`aria-hidden` (optional)**: `Booleanish`
- **`aria-invalid` (optional)**: `boolean | "true" | "false" | "grammar" | "spelling"`
- **`aria-keyshortcuts` (optional)**: `string`
- **`aria-label` (optional)**: `string`
- **`aria-labelledby` (optional)**: `string`
- **…**: (and 234 more)

**Example**:

```tsx
import { DropdownMenuShortcut } from "@/components/ui/dropdown-menu";

export function Example() {
  return <DropdownMenuShortcut />;
}
```

#### `DropdownMenuSub`

- **Import**: `import { DropdownMenuSub } from "@/components/ui/dropdown-menu";`
- **Kind**: Component
- **Signature**: `DropdownMenuSub(props: P, deprecatedLegacyContext?: any): ReactNode`

**Example**:

```tsx
import { DropdownMenuSub } from "@/components/ui/dropdown-menu";

export function Example() {
  return <DropdownMenuSub />;
}
```

#### `DropdownMenuSubContent`

- **Import**: `import { DropdownMenuSubContent } from "@/components/ui/dropdown-menu";`
- **Kind**: Component
- **Signature**: `DropdownMenuSubContent(props: P): ReactNode`

**Example**:

```tsx
import { DropdownMenuSubContent } from "@/components/ui/dropdown-menu";

export function Example() {
  return <DropdownMenuSubContent />;
}
```

#### `DropdownMenuSubTrigger`

- **Import**: `import { DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu";`
- **Kind**: Component
- **Signature**: `DropdownMenuSubTrigger(props: P): ReactNode`

**Example**:

```tsx
import { DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu";

export function Example() {
  return <DropdownMenuSubTrigger />;
}
```

#### `DropdownMenuTrigger`

- **Import**: `import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu";`
- **Kind**: Component
- **Signature**: `DropdownMenuTrigger(props: P): ReactNode`

**Example**:

```tsx
import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function Example() {
  return <DropdownMenuTrigger />;
}
```

### `@/components/ui/form`

- **Source**: `src/components/ui/form.tsx`

#### `Form`

- **Import**: `import { Form } from "@/components/ui/form";`
- **Kind**: Component
- **Signature**: `Form(props: FormProviderProps<TFieldValues, TContext, TTransformedValues>): React.JSX.Element`

**Props**:
- **`children`**: `React.ReactNode | React.ReactNode[]`
- **`clearErrors`**: `UseFormClearErrors<TFieldValues>`
- **`control`**: `Control<TFieldValues, TContext, TTransformedValues>`
- **`formState`**: `FormState<TFieldValues>`
- **`getFieldState`**: `UseFormGetFieldState<TFieldValues>`
- **`getValues`**: `UseFormGetValues<TFieldValues>`
- **`handleSubmit`**: `UseFormHandleSubmit<TFieldValues, TTransformedValues>`
- **`register`**: `UseFormRegister<TFieldValues>`
- **`reset`**: `UseFormReset<TFieldValues>`
- **`resetField`**: `UseFormResetField<TFieldValues>`
- **`setError`**: `UseFormSetError<TFieldValues>`
- **`setFocus`**: `UseFormSetFocus<TFieldValues>`
- **`setValue`**: `UseFormSetValue<TFieldValues>`
- **`subscribe`**: `UseFormSubscribe<TFieldValues>`
- **`trigger`**: `UseFormTrigger<TFieldValues>`
- **`unregister`**: `UseFormUnregister<TFieldValues>`
- **`watch`**: `UseFormWatch<TFieldValues>`

**Example**:

```tsx
import { Form } from "@/components/ui/form";

export function Example() {
  return <Form clearErrors={undefined as any} control={undefined as any} formState={undefined as any} getFieldState={undefined as any} getValues={undefined as any} handleSubmit={undefined as any} register={undefined as any} reset={undefined as any} />;
}
```

#### `FormControl`

- **Import**: `import { FormControl } from "@/components/ui/form";`
- **Kind**: Component
- **Signature**: `FormControl(props: P): ReactNode`

**Example**:

```tsx
import { FormControl } from "@/components/ui/form";

export function Example() {
  return <FormControl />;
}
```

#### `FormDescription`

- **Import**: `import { FormDescription } from "@/components/ui/form";`
- **Kind**: Component
- **Signature**: `FormDescription(props: P): ReactNode`

**Example**:

```tsx
import { FormDescription } from "@/components/ui/form";

export function Example() {
  return <FormDescription />;
}
```

#### `FormField`

- **Import**: `import { FormField } from "@/components/ui/form";`
- **Kind**: Component
- **Signature**: `FormField({ ...props }: ControllerProps<TFieldValues, TName>): JSX.Element`

**Props**:
- **`control` (optional)**: `Control<TFieldValues, any, TFieldValues>`
- **`defaultValue` (optional)**: `TFieldValues extends any ? TName extends \`${infer K}.${infer R}\` ? K extends keyof TFieldValues ? TFieldValues[K] extends any ? R extends \`${infer K}.${infer R}\` ? K extends keyof TFieldValues[K] ? TFieldValues[K][K] extends any ? R extends \`${infer K}.${infer R}\` ? K extends keyof TFieldValues[K][K] ? TFieldValues[K][K][K] extends any ? R extends \`${infer K}.${infer R}\` ? K extends keyof TFieldValues[K][K][K] ? TFieldValues[K][K][K][K] extends any ? R extends \`${infer K}.${infer R}\` ? K extends keyof TFieldValues[K][K][K][K] ? TFieldValues[K][K][K][K][K] extends any ? R extends \`${infer K}.${infer R}\` ? K extends keyof TFieldValues[K][K][K][K][K] ? TFieldValues[K][K][K][K][K][K] extends any ? R extends \`${infer K}.${infer R}\` ? K extends keyof TFieldValues[K][K][K][K][K][K] ? TFieldValues[K][K][K][K][K][K][K] extends any ? R extends \`${infer K}.${infer R}\` ? K extends keyof TFieldValues[K][K][K][K][K][K][K] ? TFieldValues[K][K][K][K][K][K][K][K] extends any ? R extends \`${infer K}.${infer R}\` ? K extends keyof TFieldValues[K][K][K][K][K][K][K][K] ? TFieldValues[K][K][K][K][K][K][K][K][K] extends any ? R extends \`${infer K}.${infer R}\` ? K extends keyof TFieldValues[K][K][K][K][K][K][K][K][K] ? TFieldValues[K][K][K][K][K][K][K][K][K][K] extends any ? R extends \`${infer K}.${infer R}\` ? K extends keyof TFieldValues[K][K][K][K][K][K][K][K][K][K] ? any : K extends \`${number}\` ? TFieldValues[K][K][K][K][K][K][K][K][K][K] extends readonly (infer V)[] ? any : never : never : R extends keyof TFieldValues[K][K][K][K][K][K][K][K][K][K] ? TFieldValues[K][K][K][K][K][K][K][K][K][K][R] : R extends \`${number}\` ? TFieldValues[K][K][K][K][K][K][K][K][K][K] extends readonly (infer V)[] ? V : never : never : never : K extends \`${number}\` ? TFieldValues[K][K][K][K][K][K][K][K][K] extends readonly (infer V)[] ? V extends any ? R extends \`${infer K}.${infer R}\` ? K extends keyof V ? any : K extends \`${number}\` ? V extends readonly (infer V)[] ? any : never : never : R extends keyof V ? V[R] : R extends \`${number}\` ? V extends readonly (infer V)[] ? V : never : never : never : never : never : R extends keyof TFieldValues[K][K][K][K][K][K][K][K][K] ? TFieldValues[K][K][K][K][K][K][K][K][K][R] : R extends \`${number}\` ? TFieldValues[K][K][K][K][K][K][K][K][K] extends readonly (infer V)[] ? V : never : never : never : K extends \`${number}\` ? TFieldValues[K][K][K][K][K][K][K][K] extends readonly (infer V)[] ? V extends any ? R extends \`${infer K}.${infer R}\` ? K extends keyof V ? any : K extends \`${number}\` ? V extends readonly (infer V)[] ? any : never : never : R extends keyof V ? V[R] : R extends \`${number}\` ? V extends readonly (infer V)[] ? V : never : never : never : never : never : R extends keyof TFieldValues[K][K][K][K][K][K][K][K] ? TFieldValues[K][K][K][K][K][K][K][K][R] : R extends \`${number}\` ? TFieldValues[K][K][K][K][K][K][K][K] extends readonly (infer V)[] ? V : never : never : never : K extends \`${number}\` ? TFieldValues[K][K][K][K][K][K][K] extends readonly (infer V)[] ? V extends any ? R extends \`${infer K}.${infer R}\` ? K extends keyof V ? any : K extends \`${number}\` ? V extends readonly (infer V)[] ? any : never : never : R extends keyof V ? V[R] : R extends \`${number}\` ? V extends readonly (infer V)[] ? V : never : never : never : never : never : R extends keyof TFieldValues[K][K][K][K][K][K][K] ? TFieldValues[K][K][K][K][K][K][K][R] : R extends \`${number}\` ? TFieldValues[K][K][K][K][K][K][K] extends readonly (infer V)[] ? V : never : never : never : K extends \`${number}\` ? TFieldValues[K][K][K][K][K][K] extends readonly (infer V)[] ? V extends any ? R extends \`${infer K}.${infer R}\` ? K extends keyof V ? any : K extends \`${number}\` ? V extends readonly (infer V)[] ? any : never : never : R extends keyof V ? V[R] : R extends \`${number}\` ? V extends readonly (infer V)[] ? V : never : never : never : never : never : R extends keyof TFieldValues[K][K][K][K][K][K] ? TFieldValues[K][K][K][K][K][K][R] : R extends \`${number}\` ? TFieldValues[K][K][K][K][K][K] extends readonly (infer V)[] ? V : never : never : never : K extends \`${number}\` ? TFieldValues[K][K][K][K][K] extends readonly (infer V)[] ? V extends any ? R extends \`${infer K}.${infer R}\` ? K extends keyof V ? any : K extends \`${number}\` ? V extends readonly (infer V)[] ? any : never : never : R extends keyof V ? V[R] : R extends \`${number}\` ? V extends readonly (infer V)[] ? V : never : never : never : never : never : R extends keyof TFieldValues[K][K][K][K][K] ? TFieldValues[K][K][K][K][K][R] : R extends \`${number}\` ? TFieldValues[K][K][K][K][K] extends readonly (infer V)[] ? V : never : never : never : K extends \`${number}\` ? TFieldValues[K][K][K][K] extends readonly (infer V)[] ? V extends any ? R extends \`${infer K}.${infer R}\` ? K extends keyof V ? any : K extends \`${number}\` ? V extends readonly (infer V)[] ? any : never : never : R extends keyof V ? V[R] : R extends \`${number}\` ? V extends readonly (infer V)[] ? V : never : never : never : never : never : R extends keyof TFieldValues[K][K][K][K] ? TFieldValues[K][K][K][K][R] : R extends \`${number}\` ? TFieldValues[K][K][K][K] extends readonly (infer V)[] ? V : never : never : never : K extends \`${number}\` ? TFieldValues[K][K][K] extends readonly (infer V)[] ? V extends any ? R extends \`${infer K}.${infer R}\` ? K extends keyof V ? any : K extends \`${number}\` ? V extends readonly (infer V)[] ? any : never : never : R extends keyof V ? V[R] : R extends \`${number}\` ? V extends readonly (infer V)[] ? V : never : never : never : never : never : R extends keyof TFieldValues[K][K][K] ? TFieldValues[K][K][K][R] : R extends \`${number}\` ? TFieldValues[K][K][K] extends readonly (infer V)[] ? V : never : never : never : K extends \`${number}\` ? TFieldValues[K][K] extends readonly (infer V)[] ? V extends any ? R extends \`${infer K}.${infer R}\` ? K extends keyof V ? any : K extends \`${number}\` ? V extends readonly (infer V)[] ? any : never : never : R extends keyof V ? V[R] : R extends \`${number}\` ? V extends readonly (infer V)[] ? V : never : never : never : never : never : R extends keyof TFieldValues[K][K] ? TFieldValues[K][K][R] : R extends \`${number}\` ? TFieldValues[K][K] extends readonly (infer V)[] ? V : never : never : never : K extends \`${number}\` ? TFieldValues[K] extends readonly (infer V)[] ? V extends any ? R extends \`${infer K}.${infer R}\` ? K extends keyof V ? any : K extends \`${number}\` ? V extends readonly (infer V)[] ? any : never : never : R extends keyof V ? V[R] : R extends \`${number}\` ? V extends readonly (infer V)[] ? V : never : never : never : never : never : R extends keyof TFieldValues[K] ? TFieldValues[K][R] : R extends \`${number}\` ? TFieldValues[K] extends readonly (infer V)[] ? V : never : never : never : K extends \`${number}\` ? TFieldValues extends readonly (infer V)[] ? V extends any ? R extends \`${infer K}.${infer R}\` ? K extends keyof V ? any : K extends \`${number}\` ? V extends readonly (infer V)[] ? any : never : never : R extends keyof V ? V[R] : R extends \`${number}\` ? V extends readonly (infer V)[] ? V : never : never : never : never : never : TName extends keyof TFieldValues ? TFieldValues[TName] : TName extends \`${number}\` ? TFieldValues extends readonly (infer V)[] ? V : never : never : never`
- **`disabled` (optional)**: `boolean`
- **`name`**: `TName`
- **`render`**: `({ field, fieldState, formState, }: { field: ControllerRenderProps<TFieldValues, TName>; fieldState: ControllerFieldState; formState: UseFormStateReturn<TFieldValues>; }) => React.ReactElement`
- **`rules` (optional)**: `Omit<RegisterOptions<TFieldValues, TName>, "disabled" | "valueAsNumber" | "valueAsDate" | "setValueAs">`
- **`shouldUnregister` (optional)**: `boolean`

**Example**:

```tsx
import { FormField } from "@/components/ui/form";

export function Example() {
  return <FormField name={undefined as any} render={() => {}} />;
}
```

#### `FormItem`

- **Import**: `import { FormItem } from "@/components/ui/form";`
- **Kind**: Component
- **Signature**: `FormItem(props: P): ReactNode`

**Example**:

```tsx
import { FormItem } from "@/components/ui/form";

export function Example() {
  return <FormItem />;
}
```

#### `FormLabel`

- **Import**: `import { FormLabel } from "@/components/ui/form";`
- **Kind**: Component
- **Signature**: `FormLabel(props: P): ReactNode`

**Example**:

```tsx
import { FormLabel } from "@/components/ui/form";

export function Example() {
  return <FormLabel />;
}
```

#### `FormMessage`

- **Import**: `import { FormMessage } from "@/components/ui/form";`
- **Kind**: Component
- **Signature**: `FormMessage(props: P): ReactNode`

**Example**:

```tsx
import { FormMessage } from "@/components/ui/form";

export function Example() {
  return <FormMessage />;
}
```

#### `useFormField`

- **Import**: `import { useFormField } from "@/components/ui/form";`
- **Kind**: Hook
- **Signature**: `useFormField(): { invalid: boolean; isDirty: boolean; isTouched: boolean; isValidating: boolean; error?: FieldError; id: string; name: string; formItemId: string; formDescriptionId: string; formMessageId: string; }`

**Example**:

```tsx
import { useFormField } from "@/components/ui/form";

export function Example() {
  const result = useFormField();
  void result;
  return null;
}
```

### `@/components/ui/hover-card`

- **Source**: `src/components/ui/hover-card.tsx`

#### `HoverCard`

- **Import**: `import { HoverCard } from "@/components/ui/hover-card";`
- **Kind**: Component
- **Signature**: `HoverCard(props: P, deprecatedLegacyContext?: any): ReactNode`

**Example**:

```tsx
import { HoverCard } from "@/components/ui/hover-card";

export function Example() {
  return <HoverCard />;
}
```

#### `HoverCardContent`

- **Import**: `import { HoverCardContent } from "@/components/ui/hover-card";`
- **Kind**: Component
- **Signature**: `HoverCardContent(props: P): ReactNode`

**Example**:

```tsx
import { HoverCardContent } from "@/components/ui/hover-card";

export function Example() {
  return <HoverCardContent />;
}
```

#### `HoverCardTrigger`

- **Import**: `import { HoverCardTrigger } from "@/components/ui/hover-card";`
- **Kind**: Component
- **Signature**: `HoverCardTrigger(props: P): ReactNode`

**Example**:

```tsx
import { HoverCardTrigger } from "@/components/ui/hover-card";

export function Example() {
  return <HoverCardTrigger />;
}
```

### `@/components/ui/input`

- **Source**: `src/components/ui/input.tsx`

#### `Input`

- **Import**: `import { Input } from "@/components/ui/input";`
- **Kind**: Component
- **Signature**: `Input(props: P): ReactNode`

**Example**:

```tsx
import { Input } from "@/components/ui/input";

export function Example() {
  return <Input />;
}
```

### `@/components/ui/input-otp`

- **Source**: `src/components/ui/input-otp.tsx`

#### `InputOTP`

- **Import**: `import { InputOTP } from "@/components/ui/input-otp";`
- **Kind**: Component
- **Signature**: `InputOTP(props: P): ReactNode`

**Example**:

```tsx
import { InputOTP } from "@/components/ui/input-otp";

export function Example() {
  return <InputOTP />;
}
```

#### `InputOTPGroup`

- **Import**: `import { InputOTPGroup } from "@/components/ui/input-otp";`
- **Kind**: Component
- **Signature**: `InputOTPGroup(props: P): ReactNode`

**Example**:

```tsx
import { InputOTPGroup } from "@/components/ui/input-otp";

export function Example() {
  return <InputOTPGroup />;
}
```

#### `InputOTPSeparator`

- **Import**: `import { InputOTPSeparator } from "@/components/ui/input-otp";`
- **Kind**: Component
- **Signature**: `InputOTPSeparator(props: P): ReactNode`

**Example**:

```tsx
import { InputOTPSeparator } from "@/components/ui/input-otp";

export function Example() {
  return <InputOTPSeparator />;
}
```

#### `InputOTPSlot`

- **Import**: `import { InputOTPSlot } from "@/components/ui/input-otp";`
- **Kind**: Component
- **Signature**: `InputOTPSlot(props: P): ReactNode`

**Example**:

```tsx
import { InputOTPSlot } from "@/components/ui/input-otp";

export function Example() {
  return <InputOTPSlot />;
}
```

### `@/components/ui/input-with-suffix`

- **Source**: `src/components/ui/input-with-suffix.tsx`

#### `InputWithSuffix`

- **Import**: `import { InputWithSuffix } from "@/components/ui/input-with-suffix";`
- **Kind**: Component
- **Signature**: `InputWithSuffix(props: P): ReactNode`

**Example**:

```tsx
import { InputWithSuffix } from "@/components/ui/input-with-suffix";

export function Example() {
  return <InputWithSuffix />;
}
```

#### `InputWithSuffixProps`

- **Import**: `import { InputWithSuffixProps } from "@/components/ui/input-with-suffix";`
- **Kind**: Type

**Definition**:

```ts
export interface InputWithSuffixProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  suffix: string;
}
```

**Example**:

```tsx
import { InputWithSuffixProps } from "@/components/ui/input-with-suffix";

// Use InputWithSuffixProps in your code where appropriate.
```

### `@/components/ui/label`

- **Source**: `src/components/ui/label.tsx`

#### `Label`

- **Import**: `import { Label } from "@/components/ui/label";`
- **Kind**: Component
- **Signature**: `Label(props: P): ReactNode`

**Example**:

```tsx
import { Label } from "@/components/ui/label";

export function Example() {
  return <Label />;
}
```

### `@/components/ui/menubar`

- **Source**: `src/components/ui/menubar.tsx`

#### `Menubar`

- **Import**: `import { Menubar } from "@/components/ui/menubar";`
- **Kind**: Component
- **Signature**: `Menubar(props: P): ReactNode`

**Example**:

```tsx
import { Menubar } from "@/components/ui/menubar";

export function Example() {
  return <Menubar />;
}
```

#### `MenubarCheckboxItem`

- **Import**: `import { MenubarCheckboxItem } from "@/components/ui/menubar";`
- **Kind**: Component
- **Signature**: `MenubarCheckboxItem(props: P): ReactNode`

**Example**:

```tsx
import { MenubarCheckboxItem } from "@/components/ui/menubar";

export function Example() {
  return <MenubarCheckboxItem />;
}
```

#### `MenubarContent`

- **Import**: `import { MenubarContent } from "@/components/ui/menubar";`
- **Kind**: Component
- **Signature**: `MenubarContent(props: P): ReactNode`

**Example**:

```tsx
import { MenubarContent } from "@/components/ui/menubar";

export function Example() {
  return <MenubarContent />;
}
```

#### `MenubarGroup`

- **Import**: `import { MenubarGroup } from "@/components/ui/menubar";`
- **Kind**: Component
- **Signature**: `MenubarGroup(props: P): ReactNode`

**Example**:

```tsx
import { MenubarGroup } from "@/components/ui/menubar";

export function Example() {
  return <MenubarGroup />;
}
```

#### `MenubarItem`

- **Import**: `import { MenubarItem } from "@/components/ui/menubar";`
- **Kind**: Component
- **Signature**: `MenubarItem(props: P): ReactNode`

**Example**:

```tsx
import { MenubarItem } from "@/components/ui/menubar";

export function Example() {
  return <MenubarItem />;
}
```

#### `MenubarLabel`

- **Import**: `import { MenubarLabel } from "@/components/ui/menubar";`
- **Kind**: Component
- **Signature**: `MenubarLabel(props: P): ReactNode`

**Example**:

```tsx
import { MenubarLabel } from "@/components/ui/menubar";

export function Example() {
  return <MenubarLabel />;
}
```

#### `MenubarMenu`

- **Import**: `import { MenubarMenu } from "@/components/ui/menubar";`
- **Kind**: Component
- **Signature**: `MenubarMenu(props: ScopedProps<MenubarMenuProps>): react_jsx_runtime.JSX.Element`

**Props**:
- **`__scopeMenubar` (optional)**: `_radix_ui_react_context.Scope`
- **`children` (optional)**: `React.ReactNode`
- **`value` (optional)**: `string`

**Example**:

```tsx
import { MenubarMenu } from "@/components/ui/menubar";

export function Example() {
  return <MenubarMenu />;
}
```

#### `MenubarPortal`

- **Import**: `import { MenubarPortal } from "@/components/ui/menubar";`
- **Kind**: Component
- **Signature**: `MenubarPortal(props: P, deprecatedLegacyContext?: any): ReactNode`

**Example**:

```tsx
import { MenubarPortal } from "@/components/ui/menubar";

export function Example() {
  return <MenubarPortal />;
}
```

#### `MenubarRadioGroup`

- **Import**: `import { MenubarRadioGroup } from "@/components/ui/menubar";`
- **Kind**: Component
- **Signature**: `MenubarRadioGroup(props: P): ReactNode`

**Example**:

```tsx
import { MenubarRadioGroup } from "@/components/ui/menubar";

export function Example() {
  return <MenubarRadioGroup />;
}
```

#### `MenubarRadioItem`

- **Import**: `import { MenubarRadioItem } from "@/components/ui/menubar";`
- **Kind**: Component
- **Signature**: `MenubarRadioItem(props: P): ReactNode`

**Example**:

```tsx
import { MenubarRadioItem } from "@/components/ui/menubar";

export function Example() {
  return <MenubarRadioItem />;
}
```

#### `MenubarSeparator`

- **Import**: `import { MenubarSeparator } from "@/components/ui/menubar";`
- **Kind**: Component
- **Signature**: `MenubarSeparator(props: P): ReactNode`

**Example**:

```tsx
import { MenubarSeparator } from "@/components/ui/menubar";

export function Example() {
  return <MenubarSeparator />;
}
```

#### `MenubarShortcut`

- **Import**: `import { MenubarShortcut } from "@/components/ui/menubar";`
- **Kind**: Component
- **Signature**: `MenubarShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>): JSX.Element`

**Props**:
- **`about` (optional)**: `string`
- **`accessKey` (optional)**: `string`
- **`aria-activedescendant` (optional)**: `string`
- **`aria-atomic` (optional)**: `Booleanish`
- **`aria-autocomplete` (optional)**: `"list" | "none" | "inline" | "both"`
- **`aria-braillelabel` (optional)**: `string`
- **`aria-brailleroledescription` (optional)**: `string`
- **`aria-busy` (optional)**: `Booleanish`
- **`aria-checked` (optional)**: `boolean | "true" | "false" | "mixed"`
- **`aria-colcount` (optional)**: `number`
- **`aria-colindex` (optional)**: `number`
- **`aria-colindextext` (optional)**: `string`
- **`aria-colspan` (optional)**: `number`
- **`aria-controls` (optional)**: `string`
- **`aria-current` (optional)**: `boolean | "location" | "date" | "time" | "step" | "true" | "false" | "page"`
- **`aria-describedby` (optional)**: `string`
- **`aria-description` (optional)**: `string`
- **`aria-details` (optional)**: `string`
- **`aria-disabled` (optional)**: `Booleanish`
- **`aria-dropeffect` (optional)**: `"link" | "copy" | "none" | "execute" | "move" | "popup"`
- **`aria-errormessage` (optional)**: `string`
- **`aria-expanded` (optional)**: `Booleanish`
- **`aria-flowto` (optional)**: `string`
- **`aria-grabbed` (optional)**: `Booleanish`
- **`aria-haspopup` (optional)**: `boolean | "grid" | "dialog" | "menu" | "true" | "false" | "listbox" | "tree"`
- **`aria-hidden` (optional)**: `Booleanish`
- **`aria-invalid` (optional)**: `boolean | "true" | "false" | "grammar" | "spelling"`
- **`aria-keyshortcuts` (optional)**: `string`
- **`aria-label` (optional)**: `string`
- **`aria-labelledby` (optional)**: `string`
- **…**: (and 234 more)

**Example**:

```tsx
import { MenubarShortcut } from "@/components/ui/menubar";

export function Example() {
  return <MenubarShortcut />;
}
```

#### `MenubarSub`

- **Import**: `import { MenubarSub } from "@/components/ui/menubar";`
- **Kind**: Component
- **Signature**: `MenubarSub(props: P, deprecatedLegacyContext?: any): ReactNode`

**Example**:

```tsx
import { MenubarSub } from "@/components/ui/menubar";

export function Example() {
  return <MenubarSub />;
}
```

#### `MenubarSubContent`

- **Import**: `import { MenubarSubContent } from "@/components/ui/menubar";`
- **Kind**: Component
- **Signature**: `MenubarSubContent(props: P): ReactNode`

**Example**:

```tsx
import { MenubarSubContent } from "@/components/ui/menubar";

export function Example() {
  return <MenubarSubContent />;
}
```

#### `MenubarSubTrigger`

- **Import**: `import { MenubarSubTrigger } from "@/components/ui/menubar";`
- **Kind**: Component
- **Signature**: `MenubarSubTrigger(props: P): ReactNode`

**Example**:

```tsx
import { MenubarSubTrigger } from "@/components/ui/menubar";

export function Example() {
  return <MenubarSubTrigger />;
}
```

#### `MenubarTrigger`

- **Import**: `import { MenubarTrigger } from "@/components/ui/menubar";`
- **Kind**: Component
- **Signature**: `MenubarTrigger(props: P): ReactNode`

**Example**:

```tsx
import { MenubarTrigger } from "@/components/ui/menubar";

export function Example() {
  return <MenubarTrigger />;
}
```

### `@/components/ui/navigation-menu`

- **Source**: `src/components/ui/navigation-menu.tsx`

#### `NavigationMenu`

- **Import**: `import { NavigationMenu } from "@/components/ui/navigation-menu";`
- **Kind**: Component
- **Signature**: `NavigationMenu(props: P): ReactNode`

**Example**:

```tsx
import { NavigationMenu } from "@/components/ui/navigation-menu";

export function Example() {
  return <NavigationMenu />;
}
```

#### `NavigationMenuContent`

- **Import**: `import { NavigationMenuContent } from "@/components/ui/navigation-menu";`
- **Kind**: Component
- **Signature**: `NavigationMenuContent(props: P): ReactNode`

**Example**:

```tsx
import { NavigationMenuContent } from "@/components/ui/navigation-menu";

export function Example() {
  return <NavigationMenuContent />;
}
```

#### `NavigationMenuIndicator`

- **Import**: `import { NavigationMenuIndicator } from "@/components/ui/navigation-menu";`
- **Kind**: Component
- **Signature**: `NavigationMenuIndicator(props: P): ReactNode`

**Example**:

```tsx
import { NavigationMenuIndicator } from "@/components/ui/navigation-menu";

export function Example() {
  return <NavigationMenuIndicator />;
}
```

#### `NavigationMenuItem`

- **Import**: `import { NavigationMenuItem } from "@/components/ui/navigation-menu";`
- **Kind**: Component
- **Signature**: `NavigationMenuItem(props: P): ReactNode`

**Example**:

```tsx
import { NavigationMenuItem } from "@/components/ui/navigation-menu";

export function Example() {
  return <NavigationMenuItem />;
}
```

#### `NavigationMenuLink`

- **Import**: `import { NavigationMenuLink } from "@/components/ui/navigation-menu";`
- **Kind**: Component
- **Signature**: `NavigationMenuLink(props: P): ReactNode`

**Example**:

```tsx
import { NavigationMenuLink } from "@/components/ui/navigation-menu";

export function Example() {
  return <NavigationMenuLink />;
}
```

#### `NavigationMenuList`

- **Import**: `import { NavigationMenuList } from "@/components/ui/navigation-menu";`
- **Kind**: Component
- **Signature**: `NavigationMenuList(props: P): ReactNode`

**Example**:

```tsx
import { NavigationMenuList } from "@/components/ui/navigation-menu";

export function Example() {
  return <NavigationMenuList />;
}
```

#### `NavigationMenuTrigger`

- **Import**: `import { NavigationMenuTrigger } from "@/components/ui/navigation-menu";`
- **Kind**: Component
- **Signature**: `NavigationMenuTrigger(props: P): ReactNode`

**Example**:

```tsx
import { NavigationMenuTrigger } from "@/components/ui/navigation-menu";

export function Example() {
  return <NavigationMenuTrigger />;
}
```

#### `navigationMenuTriggerStyle`

- **Import**: `import { navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";`
- **Kind**: Function
- **Signature**: `navigationMenuTriggerStyle(props?: Props<T>): string`

**Example**:

```tsx
import { navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";

const result = navigationMenuTriggerStyle(/* ...args */);
void result;
```

#### `NavigationMenuViewport`

- **Import**: `import { NavigationMenuViewport } from "@/components/ui/navigation-menu";`
- **Kind**: Component
- **Signature**: `NavigationMenuViewport(props: P): ReactNode`

**Example**:

```tsx
import { NavigationMenuViewport } from "@/components/ui/navigation-menu";

export function Example() {
  return <NavigationMenuViewport />;
}
```

### `@/components/ui/numeric-input`

- **Source**: `src/components/ui/numeric-input.tsx`

#### `NumericInput`

- **Import**: `import { NumericInput } from "@/components/ui/numeric-input";`
- **Kind**: Component
- **Signature**: `NumericInput(props: P): ReactNode`

**Example**:

```tsx
import { NumericInput } from "@/components/ui/numeric-input";

export function Example() {
  return <NumericInput />;
}
```

#### `NumericInputProps`

- **Import**: `import { NumericInputProps } from "@/components/ui/numeric-input";`
- **Kind**: Type

**Definition**:

```ts
export interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  suffix?: string;
  allowDecimals?: boolean;
  maxDecimals?: number;
}
```

**Example**:

```tsx
import { NumericInputProps } from "@/components/ui/numeric-input";

// Use NumericInputProps in your code where appropriate.
```

### `@/components/ui/pagination`

- **Source**: `src/components/ui/pagination.tsx`

#### `Pagination`

- **Import**: `import { Pagination } from "@/components/ui/pagination";`
- **Kind**: Component
- **Signature**: `Pagination({ className, ...props }: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>): JSX.Element`

**Props**:
- **`about` (optional)**: `string`
- **`accessKey` (optional)**: `string`
- **`aria-activedescendant` (optional)**: `string`
- **`aria-atomic` (optional)**: `Booleanish`
- **`aria-autocomplete` (optional)**: `"list" | "none" | "inline" | "both"`
- **`aria-braillelabel` (optional)**: `string`
- **`aria-brailleroledescription` (optional)**: `string`
- **`aria-busy` (optional)**: `Booleanish`
- **`aria-checked` (optional)**: `boolean | "true" | "false" | "mixed"`
- **`aria-colcount` (optional)**: `number`
- **`aria-colindex` (optional)**: `number`
- **`aria-colindextext` (optional)**: `string`
- **`aria-colspan` (optional)**: `number`
- **`aria-controls` (optional)**: `string`
- **`aria-current` (optional)**: `boolean | "location" | "date" | "time" | "step" | "true" | "false" | "page"`
- **`aria-describedby` (optional)**: `string`
- **`aria-description` (optional)**: `string`
- **`aria-details` (optional)**: `string`
- **`aria-disabled` (optional)**: `Booleanish`
- **`aria-dropeffect` (optional)**: `"link" | "copy" | "none" | "execute" | "move" | "popup"`
- **`aria-errormessage` (optional)**: `string`
- **`aria-expanded` (optional)**: `Booleanish`
- **`aria-flowto` (optional)**: `string`
- **`aria-grabbed` (optional)**: `Booleanish`
- **`aria-haspopup` (optional)**: `boolean | "grid" | "dialog" | "menu" | "true" | "false" | "listbox" | "tree"`
- **`aria-hidden` (optional)**: `Booleanish`
- **`aria-invalid` (optional)**: `boolean | "true" | "false" | "grammar" | "spelling"`
- **`aria-keyshortcuts` (optional)**: `string`
- **`aria-label` (optional)**: `string`
- **`aria-labelledby` (optional)**: `string`
- **…**: (and 236 more)

**Example**:

```tsx
import { Pagination } from "@/components/ui/pagination";

export function Example() {
  return <Pagination />;
}
```

#### `PaginationContent`

- **Import**: `import { PaginationContent } from "@/components/ui/pagination";`
- **Kind**: Component
- **Signature**: `PaginationContent(props: P): ReactNode`

**Example**:

```tsx
import { PaginationContent } from "@/components/ui/pagination";

export function Example() {
  return <PaginationContent />;
}
```

#### `PaginationEllipsis`

- **Import**: `import { PaginationEllipsis } from "@/components/ui/pagination";`
- **Kind**: Component
- **Signature**: `PaginationEllipsis({ className, ...props }: React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>): JSX.Element`

**Props**:
- **`about` (optional)**: `string`
- **`accessKey` (optional)**: `string`
- **`aria-activedescendant` (optional)**: `string`
- **`aria-atomic` (optional)**: `Booleanish`
- **`aria-autocomplete` (optional)**: `"list" | "none" | "inline" | "both"`
- **`aria-braillelabel` (optional)**: `string`
- **`aria-brailleroledescription` (optional)**: `string`
- **`aria-busy` (optional)**: `Booleanish`
- **`aria-checked` (optional)**: `boolean | "true" | "false" | "mixed"`
- **`aria-colcount` (optional)**: `number`
- **`aria-colindex` (optional)**: `number`
- **`aria-colindextext` (optional)**: `string`
- **`aria-colspan` (optional)**: `number`
- **`aria-controls` (optional)**: `string`
- **`aria-current` (optional)**: `boolean | "location" | "date" | "time" | "step" | "true" | "false" | "page"`
- **`aria-describedby` (optional)**: `string`
- **`aria-description` (optional)**: `string`
- **`aria-details` (optional)**: `string`
- **`aria-disabled` (optional)**: `Booleanish`
- **`aria-dropeffect` (optional)**: `"link" | "copy" | "none" | "execute" | "move" | "popup"`
- **`aria-errormessage` (optional)**: `string`
- **`aria-expanded` (optional)**: `Booleanish`
- **`aria-flowto` (optional)**: `string`
- **`aria-grabbed` (optional)**: `Booleanish`
- **`aria-haspopup` (optional)**: `boolean | "grid" | "dialog" | "menu" | "true" | "false" | "listbox" | "tree"`
- **`aria-hidden` (optional)**: `Booleanish`
- **`aria-invalid` (optional)**: `boolean | "true" | "false" | "grammar" | "spelling"`
- **`aria-keyshortcuts` (optional)**: `string`
- **`aria-label` (optional)**: `string`
- **`aria-labelledby` (optional)**: `string`
- **…**: (and 236 more)

**Example**:

```tsx
import { PaginationEllipsis } from "@/components/ui/pagination";

export function Example() {
  return <PaginationEllipsis />;
}
```

#### `PaginationItem`

- **Import**: `import { PaginationItem } from "@/components/ui/pagination";`
- **Kind**: Component
- **Signature**: `PaginationItem(props: P): ReactNode`

**Example**:

```tsx
import { PaginationItem } from "@/components/ui/pagination";

export function Example() {
  return <PaginationItem />;
}
```

#### `PaginationLink`

- **Import**: `import { PaginationLink } from "@/components/ui/pagination";`
- **Kind**: Component
- **Signature**: `PaginationLink({ className, isActive, size = "icon", ...props }: PaginationLinkProps): JSX.Element`

**Props**:
- **`about` (optional)**: `string`
- **`accessKey` (optional)**: `string`
- **`aria-activedescendant` (optional)**: `string`
- **`aria-atomic` (optional)**: `Booleanish`
- **`aria-autocomplete` (optional)**: `"list" | "none" | "inline" | "both"`
- **`aria-braillelabel` (optional)**: `string`
- **`aria-brailleroledescription` (optional)**: `string`
- **`aria-busy` (optional)**: `Booleanish`
- **`aria-checked` (optional)**: `boolean | "true" | "false" | "mixed"`
- **`aria-colcount` (optional)**: `number`
- **`aria-colindex` (optional)**: `number`
- **`aria-colindextext` (optional)**: `string`
- **`aria-colspan` (optional)**: `number`
- **`aria-controls` (optional)**: `string`
- **`aria-current` (optional)**: `boolean | "location" | "date" | "time" | "step" | "true" | "false" | "page"`
- **`aria-describedby` (optional)**: `string`
- **`aria-description` (optional)**: `string`
- **`aria-details` (optional)**: `string`
- **`aria-disabled` (optional)**: `Booleanish`
- **`aria-dropeffect` (optional)**: `"link" | "copy" | "none" | "execute" | "move" | "popup"`
- **`aria-errormessage` (optional)**: `string`
- **`aria-expanded` (optional)**: `Booleanish`
- **`aria-flowto` (optional)**: `string`
- **`aria-grabbed` (optional)**: `Booleanish`
- **`aria-haspopup` (optional)**: `boolean | "grid" | "dialog" | "menu" | "true" | "false" | "listbox" | "tree"`
- **`aria-hidden` (optional)**: `Booleanish`
- **`aria-invalid` (optional)**: `boolean | "true" | "false" | "grammar" | "spelling"`
- **`aria-keyshortcuts` (optional)**: `string`
- **`aria-label` (optional)**: `string`
- **`aria-labelledby` (optional)**: `string`
- **…**: (and 246 more)

**Example**:

```tsx
import { PaginationLink } from "@/components/ui/pagination";

export function Example() {
  return <PaginationLink />;
}
```

#### `PaginationNext`

- **Import**: `import { PaginationNext } from "@/components/ui/pagination";`
- **Kind**: Component
- **Signature**: `PaginationNext({ className, ...props }: { isActive?: boolean; } & Pick<ButtonProps, "size"> & React.ClassAttributes<HTMLAnchorElement> & React.AnchorHTMLAttributes<HTMLAnchorElement>): JSX.Element`

**Props**:
- **`about` (optional)**: `string`
- **`accessKey` (optional)**: `string`
- **`aria-activedescendant` (optional)**: `string`
- **`aria-atomic` (optional)**: `Booleanish`
- **`aria-autocomplete` (optional)**: `"list" | "none" | "inline" | "both"`
- **`aria-braillelabel` (optional)**: `string`
- **`aria-brailleroledescription` (optional)**: `string`
- **`aria-busy` (optional)**: `Booleanish`
- **`aria-checked` (optional)**: `boolean | "true" | "false" | "mixed"`
- **`aria-colcount` (optional)**: `number`
- **`aria-colindex` (optional)**: `number`
- **`aria-colindextext` (optional)**: `string`
- **`aria-colspan` (optional)**: `number`
- **`aria-controls` (optional)**: `string`
- **`aria-current` (optional)**: `boolean | "location" | "date" | "time" | "step" | "true" | "false" | "page"`
- **`aria-describedby` (optional)**: `string`
- **`aria-description` (optional)**: `string`
- **`aria-details` (optional)**: `string`
- **`aria-disabled` (optional)**: `Booleanish`
- **`aria-dropeffect` (optional)**: `"link" | "copy" | "none" | "execute" | "move" | "popup"`
- **`aria-errormessage` (optional)**: `string`
- **`aria-expanded` (optional)**: `Booleanish`
- **`aria-flowto` (optional)**: `string`
- **`aria-grabbed` (optional)**: `Booleanish`
- **`aria-haspopup` (optional)**: `boolean | "grid" | "dialog" | "menu" | "true" | "false" | "listbox" | "tree"`
- **`aria-hidden` (optional)**: `Booleanish`
- **`aria-invalid` (optional)**: `boolean | "true" | "false" | "grammar" | "spelling"`
- **`aria-keyshortcuts` (optional)**: `string`
- **`aria-label` (optional)**: `string`
- **`aria-labelledby` (optional)**: `string`
- **…**: (and 246 more)

**Example**:

```tsx
import { PaginationNext } from "@/components/ui/pagination";

export function Example() {
  return <PaginationNext />;
}
```

#### `PaginationPrevious`

- **Import**: `import { PaginationPrevious } from "@/components/ui/pagination";`
- **Kind**: Component
- **Signature**: `PaginationPrevious({ className, ...props }: { isActive?: boolean; } & Pick<ButtonProps, "size"> & React.ClassAttributes<HTMLAnchorElement> & React.AnchorHTMLAttributes<HTMLAnchorElement>): JSX.Element`

**Props**:
- **`about` (optional)**: `string`
- **`accessKey` (optional)**: `string`
- **`aria-activedescendant` (optional)**: `string`
- **`aria-atomic` (optional)**: `Booleanish`
- **`aria-autocomplete` (optional)**: `"list" | "none" | "inline" | "both"`
- **`aria-braillelabel` (optional)**: `string`
- **`aria-brailleroledescription` (optional)**: `string`
- **`aria-busy` (optional)**: `Booleanish`
- **`aria-checked` (optional)**: `boolean | "true" | "false" | "mixed"`
- **`aria-colcount` (optional)**: `number`
- **`aria-colindex` (optional)**: `number`
- **`aria-colindextext` (optional)**: `string`
- **`aria-colspan` (optional)**: `number`
- **`aria-controls` (optional)**: `string`
- **`aria-current` (optional)**: `boolean | "location" | "date" | "time" | "step" | "true" | "false" | "page"`
- **`aria-describedby` (optional)**: `string`
- **`aria-description` (optional)**: `string`
- **`aria-details` (optional)**: `string`
- **`aria-disabled` (optional)**: `Booleanish`
- **`aria-dropeffect` (optional)**: `"link" | "copy" | "none" | "execute" | "move" | "popup"`
- **`aria-errormessage` (optional)**: `string`
- **`aria-expanded` (optional)**: `Booleanish`
- **`aria-flowto` (optional)**: `string`
- **`aria-grabbed` (optional)**: `Booleanish`
- **`aria-haspopup` (optional)**: `boolean | "grid" | "dialog" | "menu" | "true" | "false" | "listbox" | "tree"`
- **`aria-hidden` (optional)**: `Booleanish`
- **`aria-invalid` (optional)**: `boolean | "true" | "false" | "grammar" | "spelling"`
- **`aria-keyshortcuts` (optional)**: `string`
- **`aria-label` (optional)**: `string`
- **`aria-labelledby` (optional)**: `string`
- **…**: (and 246 more)

**Example**:

```tsx
import { PaginationPrevious } from "@/components/ui/pagination";

export function Example() {
  return <PaginationPrevious />;
}
```

### `@/components/ui/popover`

- **Source**: `src/components/ui/popover.tsx`

#### `Popover`

- **Import**: `import { Popover } from "@/components/ui/popover";`
- **Kind**: Component
- **Signature**: `Popover(props: P, deprecatedLegacyContext?: any): ReactNode`

**Example**:

```tsx
import { Popover } from "@/components/ui/popover";

export function Example() {
  return <Popover />;
}
```

#### `PopoverContent`

- **Import**: `import { PopoverContent } from "@/components/ui/popover";`
- **Kind**: Component
- **Signature**: `PopoverContent(props: P): ReactNode`

**Example**:

```tsx
import { PopoverContent } from "@/components/ui/popover";

export function Example() {
  return <PopoverContent />;
}
```

#### `PopoverTrigger`

- **Import**: `import { PopoverTrigger } from "@/components/ui/popover";`
- **Kind**: Component
- **Signature**: `PopoverTrigger(props: P): ReactNode`

**Example**:

```tsx
import { PopoverTrigger } from "@/components/ui/popover";

export function Example() {
  return <PopoverTrigger />;
}
```

### `@/components/ui/progress`

- **Source**: `src/components/ui/progress.tsx`

#### `Progress`

- **Import**: `import { Progress } from "@/components/ui/progress";`
- **Kind**: Component
- **Signature**: `Progress(props: P): ReactNode`

**Example**:

```tsx
import { Progress } from "@/components/ui/progress";

export function Example() {
  return <Progress />;
}
```

### `@/components/ui/radio-group`

- **Source**: `src/components/ui/radio-group.tsx`

#### `RadioGroup`

- **Import**: `import { RadioGroup } from "@/components/ui/radio-group";`
- **Kind**: Component
- **Signature**: `RadioGroup(props: P): ReactNode`

**Example**:

```tsx
import { RadioGroup } from "@/components/ui/radio-group";

export function Example() {
  return <RadioGroup />;
}
```

#### `RadioGroupItem`

- **Import**: `import { RadioGroupItem } from "@/components/ui/radio-group";`
- **Kind**: Component
- **Signature**: `RadioGroupItem(props: P): ReactNode`

**Example**:

```tsx
import { RadioGroupItem } from "@/components/ui/radio-group";

export function Example() {
  return <RadioGroupItem />;
}
```

### `@/components/ui/resizable`

- **Source**: `src/components/ui/resizable.tsx`

#### `ResizableHandle`

- **Import**: `import { ResizableHandle } from "@/components/ui/resizable";`
- **Kind**: Component
- **Signature**: `ResizableHandle({ withHandle, className, ...props }: Omit<HTMLAttributes<keyof HTMLElementTagNameMap>, "id" | "onFocus" | "onBlur" | "onClick" | "onPointerDown" | "onPointerUp"> & { className?: string; disabled?: boolean; hitAreaMargins?: ResizablePrimitive.PointerHitAreaMargins; id?: string | null; onBlur?: () => void; onClick?: () => void; onDragging?: ResizablePrimitive.PanelResizeHandleOnDragging; onFocus?: () => void; onPointerDown?: () => void; onPointerUp?: () => void; style?: CSSProperties; tabIndex?: number; tagName?: keyof HTMLElementTagNameMap; } & { children?: ReactNode | undefined; } & { withHandle?: boolean; }): JSX.Element`

**Props**:
- **`about` (optional)**: `string`
- **`accessKey` (optional)**: `string`
- **`aria-activedescendant` (optional)**: `string`
- **`aria-atomic` (optional)**: `boolean | "true" | "false"`
- **`aria-autocomplete` (optional)**: `"list" | "none" | "inline" | "both"`
- **`aria-braillelabel` (optional)**: `string`
- **`aria-brailleroledescription` (optional)**: `string`
- **`aria-busy` (optional)**: `boolean | "true" | "false"`
- **`aria-checked` (optional)**: `boolean | "true" | "false" | "mixed"`
- **`aria-colcount` (optional)**: `number`
- **`aria-colindex` (optional)**: `number`
- **`aria-colindextext` (optional)**: `string`
- **`aria-colspan` (optional)**: `number`
- **`aria-controls` (optional)**: `string`
- **`aria-current` (optional)**: `boolean | "location" | "date" | "time" | "step" | "true" | "false" | "page"`
- **`aria-describedby` (optional)**: `string`
- **`aria-description` (optional)**: `string`
- **`aria-details` (optional)**: `string`
- **`aria-disabled` (optional)**: `boolean | "true" | "false"`
- **`aria-dropeffect` (optional)**: `"link" | "copy" | "none" | "execute" | "move" | "popup"`
- **`aria-errormessage` (optional)**: `string`
- **`aria-expanded` (optional)**: `boolean | "true" | "false"`
- **`aria-flowto` (optional)**: `string`
- **`aria-grabbed` (optional)**: `boolean | "true" | "false"`
- **`aria-haspopup` (optional)**: `boolean | "grid" | "dialog" | "menu" | "true" | "false" | "listbox" | "tree"`
- **`aria-hidden` (optional)**: `boolean | "true" | "false"`
- **`aria-invalid` (optional)**: `boolean | "true" | "false" | "grammar" | "spelling"`
- **`aria-keyshortcuts` (optional)**: `string`
- **`aria-label` (optional)**: `string`
- **`aria-labelledby` (optional)**: `string`
- **…**: (and 239 more)

**Example**:

```tsx
import { ResizableHandle } from "@/components/ui/resizable";

export function Example() {
  return <ResizableHandle />;
}
```

#### `ResizablePanel`

- **Import**: `import { ResizablePanel } from "@/components/ui/resizable";`
- **Kind**: Component
- **Signature**: `ResizablePanel(props: P): ReactNode`

**Example**:

```tsx
import { ResizablePanel } from "@/components/ui/resizable";

export function Example() {
  return <ResizablePanel />;
}
```

#### `ResizablePanelGroup`

- **Import**: `import { ResizablePanelGroup } from "@/components/ui/resizable";`
- **Kind**: Component
- **Signature**: `ResizablePanelGroup({ className, ...props }: Omit<HTMLAttributes<keyof HTMLElementTagNameMap>, "id"> & { autoSaveId?: string | null | undefined; className?: string | undefined; direction: Direction; id?: string | null | undefined; keyboardResizeBy?: number | null | undefined; onLayout?: ResizablePrimitive.PanelGroupOnLayout | null | undefined; storage?: ResizablePrimitive.PanelGroupStorage | undefined; style?: CSSProperties | undefined; tagName?: keyof HTMLElementTagNameMap | undefined; dir?: "auto" | "ltr" | "rtl" | undefined; } & { children?: ReactNode; } & RefAttributes<ResizablePrimitive.ImperativePanelGroupHandle>): JSX.Element`

**Props**:
- **`about` (optional)**: `string`
- **`accessKey` (optional)**: `string`
- **`aria-activedescendant` (optional)**: `string`
- **`aria-atomic` (optional)**: `boolean | "true" | "false"`
- **`aria-autocomplete` (optional)**: `"list" | "none" | "inline" | "both"`
- **`aria-braillelabel` (optional)**: `string`
- **`aria-brailleroledescription` (optional)**: `string`
- **`aria-busy` (optional)**: `boolean | "true" | "false"`
- **`aria-checked` (optional)**: `boolean | "true" | "false" | "mixed"`
- **`aria-colcount` (optional)**: `number`
- **`aria-colindex` (optional)**: `number`
- **`aria-colindextext` (optional)**: `string`
- **`aria-colspan` (optional)**: `number`
- **`aria-controls` (optional)**: `string`
- **`aria-current` (optional)**: `boolean | "location" | "date" | "time" | "step" | "true" | "false" | "page"`
- **`aria-describedby` (optional)**: `string`
- **`aria-description` (optional)**: `string`
- **`aria-details` (optional)**: `string`
- **`aria-disabled` (optional)**: `boolean | "true" | "false"`
- **`aria-dropeffect` (optional)**: `"link" | "copy" | "none" | "execute" | "move" | "popup"`
- **`aria-errormessage` (optional)**: `string`
- **`aria-expanded` (optional)**: `boolean | "true" | "false"`
- **`aria-flowto` (optional)**: `string`
- **`aria-grabbed` (optional)**: `boolean | "true" | "false"`
- **`aria-haspopup` (optional)**: `boolean | "grid" | "dialog" | "menu" | "true" | "false" | "listbox" | "tree"`
- **`aria-hidden` (optional)**: `boolean | "true" | "false"`
- **`aria-invalid` (optional)**: `boolean | "true" | "false" | "grammar" | "spelling"`
- **`aria-keyshortcuts` (optional)**: `string`
- **`aria-label` (optional)**: `string`
- **`aria-labelledby` (optional)**: `string`
- **…**: (and 242 more)

**Example**:

```tsx
import { ResizablePanelGroup } from "@/components/ui/resizable";

export function Example() {
  return <ResizablePanelGroup direction={undefined as any} />;
}
```

### `@/components/ui/scroll-area`

- **Source**: `src/components/ui/scroll-area.tsx`

#### `ScrollArea`

- **Import**: `import { ScrollArea } from "@/components/ui/scroll-area";`
- **Kind**: Component
- **Signature**: `ScrollArea(props: P): ReactNode`

**Example**:

```tsx
import { ScrollArea } from "@/components/ui/scroll-area";

export function Example() {
  return <ScrollArea />;
}
```

#### `ScrollBar`

- **Import**: `import { ScrollBar } from "@/components/ui/scroll-area";`
- **Kind**: Component
- **Signature**: `ScrollBar(props: P): ReactNode`

**Example**:

```tsx
import { ScrollBar } from "@/components/ui/scroll-area";

export function Example() {
  return <ScrollBar />;
}
```

### `@/components/ui/select`

- **Source**: `src/components/ui/select.tsx`

#### `Select`

- **Import**: `import { Select } from "@/components/ui/select";`
- **Kind**: Component
- **Signature**: `Select(props: P, deprecatedLegacyContext?: any): ReactNode`

**Example**:

```tsx
import { Select } from "@/components/ui/select";

export function Example() {
  return <Select />;
}
```

#### `SelectContent`

- **Import**: `import { SelectContent } from "@/components/ui/select";`
- **Kind**: Component
- **Signature**: `SelectContent(props: P): ReactNode`

**Example**:

```tsx
import { SelectContent } from "@/components/ui/select";

export function Example() {
  return <SelectContent />;
}
```

#### `SelectGroup`

- **Import**: `import { SelectGroup } from "@/components/ui/select";`
- **Kind**: Component
- **Signature**: `SelectGroup(props: P): ReactNode`

**Example**:

```tsx
import { SelectGroup } from "@/components/ui/select";

export function Example() {
  return <SelectGroup />;
}
```

#### `SelectItem`

- **Import**: `import { SelectItem } from "@/components/ui/select";`
- **Kind**: Component
- **Signature**: `SelectItem(props: P): ReactNode`

**Example**:

```tsx
import { SelectItem } from "@/components/ui/select";

export function Example() {
  return <SelectItem />;
}
```

#### `SelectLabel`

- **Import**: `import { SelectLabel } from "@/components/ui/select";`
- **Kind**: Component
- **Signature**: `SelectLabel(props: P): ReactNode`

**Example**:

```tsx
import { SelectLabel } from "@/components/ui/select";

export function Example() {
  return <SelectLabel />;
}
```

#### `SelectScrollDownButton`

- **Import**: `import { SelectScrollDownButton } from "@/components/ui/select";`
- **Kind**: Component
- **Signature**: `SelectScrollDownButton(props: P): ReactNode`

**Example**:

```tsx
import { SelectScrollDownButton } from "@/components/ui/select";

export function Example() {
  return <SelectScrollDownButton />;
}
```

#### `SelectScrollUpButton`

- **Import**: `import { SelectScrollUpButton } from "@/components/ui/select";`
- **Kind**: Component
- **Signature**: `SelectScrollUpButton(props: P): ReactNode`

**Example**:

```tsx
import { SelectScrollUpButton } from "@/components/ui/select";

export function Example() {
  return <SelectScrollUpButton />;
}
```

#### `SelectSeparator`

- **Import**: `import { SelectSeparator } from "@/components/ui/select";`
- **Kind**: Component
- **Signature**: `SelectSeparator(props: P): ReactNode`

**Example**:

```tsx
import { SelectSeparator } from "@/components/ui/select";

export function Example() {
  return <SelectSeparator />;
}
```

#### `SelectTrigger`

- **Import**: `import { SelectTrigger } from "@/components/ui/select";`
- **Kind**: Component
- **Signature**: `SelectTrigger(props: P): ReactNode`

**Example**:

```tsx
import { SelectTrigger } from "@/components/ui/select";

export function Example() {
  return <SelectTrigger />;
}
```

#### `SelectValue`

- **Import**: `import { SelectValue } from "@/components/ui/select";`
- **Kind**: Component
- **Signature**: `SelectValue(props: P): ReactNode`

**Example**:

```tsx
import { SelectValue } from "@/components/ui/select";

export function Example() {
  return <SelectValue />;
}
```

### `@/components/ui/separator`

- **Source**: `src/components/ui/separator.tsx`

#### `Separator`

- **Import**: `import { Separator } from "@/components/ui/separator";`
- **Kind**: Component
- **Signature**: `Separator(props: P): ReactNode`

**Example**:

```tsx
import { Separator } from "@/components/ui/separator";

export function Example() {
  return <Separator />;
}
```

### `@/components/ui/sheet`

- **Source**: `src/components/ui/sheet.tsx`

#### `Sheet`

- **Import**: `import { Sheet } from "@/components/ui/sheet";`
- **Kind**: Component
- **Signature**: `Sheet(props: P, deprecatedLegacyContext?: any): ReactNode`

**Example**:

```tsx
import { Sheet } from "@/components/ui/sheet";

export function Example() {
  return <Sheet />;
}
```

#### `SheetClose`

- **Import**: `import { SheetClose } from "@/components/ui/sheet";`
- **Kind**: Component
- **Signature**: `SheetClose(props: P): ReactNode`

**Example**:

```tsx
import { SheetClose } from "@/components/ui/sheet";

export function Example() {
  return <SheetClose />;
}
```

#### `SheetContent`

- **Import**: `import { SheetContent } from "@/components/ui/sheet";`
- **Kind**: Component
- **Signature**: `SheetContent(props: P): ReactNode`

**Example**:

```tsx
import { SheetContent } from "@/components/ui/sheet";

export function Example() {
  return <SheetContent />;
}
```

#### `SheetDescription`

- **Import**: `import { SheetDescription } from "@/components/ui/sheet";`
- **Kind**: Component
- **Signature**: `SheetDescription(props: P): ReactNode`

**Example**:

```tsx
import { SheetDescription } from "@/components/ui/sheet";

export function Example() {
  return <SheetDescription />;
}
```

#### `SheetFooter`

- **Import**: `import { SheetFooter } from "@/components/ui/sheet";`
- **Kind**: Component
- **Signature**: `SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element`

**Props**:
- **`about` (optional)**: `string`
- **`accessKey` (optional)**: `string`
- **`aria-activedescendant` (optional)**: `string`
- **`aria-atomic` (optional)**: `Booleanish`
- **`aria-autocomplete` (optional)**: `"list" | "none" | "inline" | "both"`
- **`aria-braillelabel` (optional)**: `string`
- **`aria-brailleroledescription` (optional)**: `string`
- **`aria-busy` (optional)**: `Booleanish`
- **`aria-checked` (optional)**: `boolean | "true" | "false" | "mixed"`
- **`aria-colcount` (optional)**: `number`
- **`aria-colindex` (optional)**: `number`
- **`aria-colindextext` (optional)**: `string`
- **`aria-colspan` (optional)**: `number`
- **`aria-controls` (optional)**: `string`
- **`aria-current` (optional)**: `boolean | "location" | "date" | "time" | "step" | "true" | "false" | "page"`
- **`aria-describedby` (optional)**: `string`
- **`aria-description` (optional)**: `string`
- **`aria-details` (optional)**: `string`
- **`aria-disabled` (optional)**: `Booleanish`
- **`aria-dropeffect` (optional)**: `"link" | "copy" | "none" | "execute" | "move" | "popup"`
- **`aria-errormessage` (optional)**: `string`
- **`aria-expanded` (optional)**: `Booleanish`
- **`aria-flowto` (optional)**: `string`
- **`aria-grabbed` (optional)**: `Booleanish`
- **`aria-haspopup` (optional)**: `boolean | "grid" | "dialog" | "menu" | "true" | "false" | "listbox" | "tree"`
- **`aria-hidden` (optional)**: `Booleanish`
- **`aria-invalid` (optional)**: `boolean | "true" | "false" | "grammar" | "spelling"`
- **`aria-keyshortcuts` (optional)**: `string`
- **`aria-label` (optional)**: `string`
- **`aria-labelledby` (optional)**: `string`
- **…**: (and 234 more)

**Example**:

```tsx
import { SheetFooter } from "@/components/ui/sheet";

export function Example() {
  return <SheetFooter />;
}
```

#### `SheetHeader`

- **Import**: `import { SheetHeader } from "@/components/ui/sheet";`
- **Kind**: Component
- **Signature**: `SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element`

**Props**:
- **`about` (optional)**: `string`
- **`accessKey` (optional)**: `string`
- **`aria-activedescendant` (optional)**: `string`
- **`aria-atomic` (optional)**: `Booleanish`
- **`aria-autocomplete` (optional)**: `"list" | "none" | "inline" | "both"`
- **`aria-braillelabel` (optional)**: `string`
- **`aria-brailleroledescription` (optional)**: `string`
- **`aria-busy` (optional)**: `Booleanish`
- **`aria-checked` (optional)**: `boolean | "true" | "false" | "mixed"`
- **`aria-colcount` (optional)**: `number`
- **`aria-colindex` (optional)**: `number`
- **`aria-colindextext` (optional)**: `string`
- **`aria-colspan` (optional)**: `number`
- **`aria-controls` (optional)**: `string`
- **`aria-current` (optional)**: `boolean | "location" | "date" | "time" | "step" | "true" | "false" | "page"`
- **`aria-describedby` (optional)**: `string`
- **`aria-description` (optional)**: `string`
- **`aria-details` (optional)**: `string`
- **`aria-disabled` (optional)**: `Booleanish`
- **`aria-dropeffect` (optional)**: `"link" | "copy" | "none" | "execute" | "move" | "popup"`
- **`aria-errormessage` (optional)**: `string`
- **`aria-expanded` (optional)**: `Booleanish`
- **`aria-flowto` (optional)**: `string`
- **`aria-grabbed` (optional)**: `Booleanish`
- **`aria-haspopup` (optional)**: `boolean | "grid" | "dialog" | "menu" | "true" | "false" | "listbox" | "tree"`
- **`aria-hidden` (optional)**: `Booleanish`
- **`aria-invalid` (optional)**: `boolean | "true" | "false" | "grammar" | "spelling"`
- **`aria-keyshortcuts` (optional)**: `string`
- **`aria-label` (optional)**: `string`
- **`aria-labelledby` (optional)**: `string`
- **…**: (and 234 more)

**Example**:

```tsx
import { SheetHeader } from "@/components/ui/sheet";

export function Example() {
  return <SheetHeader />;
}
```

#### `SheetOverlay`

- **Import**: `import { SheetOverlay } from "@/components/ui/sheet";`
- **Kind**: Component
- **Signature**: `SheetOverlay(props: P): ReactNode`

**Example**:

```tsx
import { SheetOverlay } from "@/components/ui/sheet";

export function Example() {
  return <SheetOverlay />;
}
```

#### `SheetPortal`

- **Import**: `import { SheetPortal } from "@/components/ui/sheet";`
- **Kind**: Component
- **Signature**: `SheetPortal(props: P, deprecatedLegacyContext?: any): ReactNode`

**Example**:

```tsx
import { SheetPortal } from "@/components/ui/sheet";

export function Example() {
  return <SheetPortal />;
}
```

#### `SheetTitle`

- **Import**: `import { SheetTitle } from "@/components/ui/sheet";`
- **Kind**: Component
- **Signature**: `SheetTitle(props: P): ReactNode`

**Example**:

```tsx
import { SheetTitle } from "@/components/ui/sheet";

export function Example() {
  return <SheetTitle />;
}
```

#### `SheetTrigger`

- **Import**: `import { SheetTrigger } from "@/components/ui/sheet";`
- **Kind**: Component
- **Signature**: `SheetTrigger(props: P): ReactNode`

**Example**:

```tsx
import { SheetTrigger } from "@/components/ui/sheet";

export function Example() {
  return <SheetTrigger />;
}
```

### `@/components/ui/sidebar`

- **Source**: `src/components/ui/sidebar.tsx`

#### `Sidebar`

- **Import**: `import { Sidebar } from "@/components/ui/sidebar";`
- **Kind**: Component
- **Signature**: `Sidebar(props: P): ReactNode`

**Example**:

```tsx
import { Sidebar } from "@/components/ui/sidebar";

export function Example() {
  return <Sidebar />;
}
```

#### `SidebarContent`

- **Import**: `import { SidebarContent } from "@/components/ui/sidebar";`
- **Kind**: Component
- **Signature**: `SidebarContent(props: P): ReactNode`

**Example**:

```tsx
import { SidebarContent } from "@/components/ui/sidebar";

export function Example() {
  return <SidebarContent />;
}
```

#### `SidebarFooter`

- **Import**: `import { SidebarFooter } from "@/components/ui/sidebar";`
- **Kind**: Component
- **Signature**: `SidebarFooter(props: P): ReactNode`

**Example**:

```tsx
import { SidebarFooter } from "@/components/ui/sidebar";

export function Example() {
  return <SidebarFooter />;
}
```

#### `SidebarGroup`

- **Import**: `import { SidebarGroup } from "@/components/ui/sidebar";`
- **Kind**: Component
- **Signature**: `SidebarGroup(props: P): ReactNode`

**Example**:

```tsx
import { SidebarGroup } from "@/components/ui/sidebar";

export function Example() {
  return <SidebarGroup />;
}
```

#### `SidebarGroupAction`

- **Import**: `import { SidebarGroupAction } from "@/components/ui/sidebar";`
- **Kind**: Component
- **Signature**: `SidebarGroupAction(props: P): ReactNode`

**Example**:

```tsx
import { SidebarGroupAction } from "@/components/ui/sidebar";

export function Example() {
  return <SidebarGroupAction />;
}
```

#### `SidebarGroupContent`

- **Import**: `import { SidebarGroupContent } from "@/components/ui/sidebar";`
- **Kind**: Component
- **Signature**: `SidebarGroupContent(props: P): ReactNode`

**Example**:

```tsx
import { SidebarGroupContent } from "@/components/ui/sidebar";

export function Example() {
  return <SidebarGroupContent />;
}
```

#### `SidebarGroupLabel`

- **Import**: `import { SidebarGroupLabel } from "@/components/ui/sidebar";`
- **Kind**: Component
- **Signature**: `SidebarGroupLabel(props: P): ReactNode`

**Example**:

```tsx
import { SidebarGroupLabel } from "@/components/ui/sidebar";

export function Example() {
  return <SidebarGroupLabel />;
}
```

#### `SidebarHeader`

- **Import**: `import { SidebarHeader } from "@/components/ui/sidebar";`
- **Kind**: Component
- **Signature**: `SidebarHeader(props: P): ReactNode`

**Example**:

```tsx
import { SidebarHeader } from "@/components/ui/sidebar";

export function Example() {
  return <SidebarHeader />;
}
```

#### `SidebarInput`

- **Import**: `import { SidebarInput } from "@/components/ui/sidebar";`
- **Kind**: Component
- **Signature**: `SidebarInput(props: P): ReactNode`

**Example**:

```tsx
import { SidebarInput } from "@/components/ui/sidebar";

export function Example() {
  return <SidebarInput />;
}
```

#### `SidebarInset`

- **Import**: `import { SidebarInset } from "@/components/ui/sidebar";`
- **Kind**: Component
- **Signature**: `SidebarInset(props: P): ReactNode`

**Example**:

```tsx
import { SidebarInset } from "@/components/ui/sidebar";

export function Example() {
  return <SidebarInset />;
}
```

#### `SidebarMenu`

- **Import**: `import { SidebarMenu } from "@/components/ui/sidebar";`
- **Kind**: Component
- **Signature**: `SidebarMenu(props: P): ReactNode`

**Example**:

```tsx
import { SidebarMenu } from "@/components/ui/sidebar";

export function Example() {
  return <SidebarMenu />;
}
```

#### `SidebarMenuAction`

- **Import**: `import { SidebarMenuAction } from "@/components/ui/sidebar";`
- **Kind**: Component
- **Signature**: `SidebarMenuAction(props: P): ReactNode`

**Example**:

```tsx
import { SidebarMenuAction } from "@/components/ui/sidebar";

export function Example() {
  return <SidebarMenuAction />;
}
```

#### `SidebarMenuBadge`

- **Import**: `import { SidebarMenuBadge } from "@/components/ui/sidebar";`
- **Kind**: Component
- **Signature**: `SidebarMenuBadge(props: P): ReactNode`

**Example**:

```tsx
import { SidebarMenuBadge } from "@/components/ui/sidebar";

export function Example() {
  return <SidebarMenuBadge />;
}
```

#### `SidebarMenuButton`

- **Import**: `import { SidebarMenuButton } from "@/components/ui/sidebar";`
- **Kind**: Component
- **Signature**: `SidebarMenuButton(props: P): ReactNode`

**Example**:

```tsx
import { SidebarMenuButton } from "@/components/ui/sidebar";

export function Example() {
  return <SidebarMenuButton />;
}
```

#### `SidebarMenuItem`

- **Import**: `import { SidebarMenuItem } from "@/components/ui/sidebar";`
- **Kind**: Component
- **Signature**: `SidebarMenuItem(props: P): ReactNode`

**Example**:

```tsx
import { SidebarMenuItem } from "@/components/ui/sidebar";

export function Example() {
  return <SidebarMenuItem />;
}
```

#### `SidebarMenuSkeleton`

- **Import**: `import { SidebarMenuSkeleton } from "@/components/ui/sidebar";`
- **Kind**: Component
- **Signature**: `SidebarMenuSkeleton(props: P): ReactNode`

**Example**:

```tsx
import { SidebarMenuSkeleton } from "@/components/ui/sidebar";

export function Example() {
  return <SidebarMenuSkeleton />;
}
```

#### `SidebarMenuSub`

- **Import**: `import { SidebarMenuSub } from "@/components/ui/sidebar";`
- **Kind**: Component
- **Signature**: `SidebarMenuSub(props: P): ReactNode`

**Example**:

```tsx
import { SidebarMenuSub } from "@/components/ui/sidebar";

export function Example() {
  return <SidebarMenuSub />;
}
```

#### `SidebarMenuSubButton`

- **Import**: `import { SidebarMenuSubButton } from "@/components/ui/sidebar";`
- **Kind**: Component
- **Signature**: `SidebarMenuSubButton(props: P): ReactNode`

**Example**:

```tsx
import { SidebarMenuSubButton } from "@/components/ui/sidebar";

export function Example() {
  return <SidebarMenuSubButton />;
}
```

#### `SidebarMenuSubItem`

- **Import**: `import { SidebarMenuSubItem } from "@/components/ui/sidebar";`
- **Kind**: Component
- **Signature**: `SidebarMenuSubItem(props: P): ReactNode`

**Example**:

```tsx
import { SidebarMenuSubItem } from "@/components/ui/sidebar";

export function Example() {
  return <SidebarMenuSubItem />;
}
```

#### `SidebarProvider`

- **Import**: `import { SidebarProvider } from "@/components/ui/sidebar";`
- **Kind**: Component
- **Signature**: `SidebarProvider(props: P): ReactNode`

**Example**:

```tsx
import { SidebarProvider } from "@/components/ui/sidebar";

export function Example() {
  return <SidebarProvider />;
}
```

#### `SidebarRail`

- **Import**: `import { SidebarRail } from "@/components/ui/sidebar";`
- **Kind**: Component
- **Signature**: `SidebarRail(props: P): ReactNode`

**Example**:

```tsx
import { SidebarRail } from "@/components/ui/sidebar";

export function Example() {
  return <SidebarRail />;
}
```

#### `SidebarSeparator`

- **Import**: `import { SidebarSeparator } from "@/components/ui/sidebar";`
- **Kind**: Component
- **Signature**: `SidebarSeparator(props: P): ReactNode`

**Example**:

```tsx
import { SidebarSeparator } from "@/components/ui/sidebar";

export function Example() {
  return <SidebarSeparator />;
}
```

#### `SidebarTrigger`

- **Import**: `import { SidebarTrigger } from "@/components/ui/sidebar";`
- **Kind**: Component
- **Signature**: `SidebarTrigger(props: P): ReactNode`

**Example**:

```tsx
import { SidebarTrigger } from "@/components/ui/sidebar";

export function Example() {
  return <SidebarTrigger />;
}
```

#### `useSidebar`

- **Import**: `import { useSidebar } from "@/components/ui/sidebar";`
- **Kind**: Hook
- **Signature**: `useSidebar(): SidebarContext`

**Example**:

```tsx
import { useSidebar } from "@/components/ui/sidebar";

export function Example() {
  const result = useSidebar();
  void result;
  return null;
}
```

### `@/components/ui/skeleton`

- **Source**: `src/components/ui/skeleton.tsx`

#### `Skeleton`

- **Import**: `import { Skeleton } from "@/components/ui/skeleton";`
- **Kind**: Component
- **Signature**: `Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>): JSX.Element`

**Props**:
- **`about` (optional)**: `string`
- **`accessKey` (optional)**: `string`
- **`aria-activedescendant` (optional)**: `string`
- **`aria-atomic` (optional)**: `Booleanish`
- **`aria-autocomplete` (optional)**: `"list" | "none" | "inline" | "both"`
- **`aria-braillelabel` (optional)**: `string`
- **`aria-brailleroledescription` (optional)**: `string`
- **`aria-busy` (optional)**: `Booleanish`
- **`aria-checked` (optional)**: `boolean | "true" | "false" | "mixed"`
- **`aria-colcount` (optional)**: `number`
- **`aria-colindex` (optional)**: `number`
- **`aria-colindextext` (optional)**: `string`
- **`aria-colspan` (optional)**: `number`
- **`aria-controls` (optional)**: `string`
- **`aria-current` (optional)**: `boolean | "location" | "date" | "time" | "step" | "true" | "false" | "page"`
- **`aria-describedby` (optional)**: `string`
- **`aria-description` (optional)**: `string`
- **`aria-details` (optional)**: `string`
- **`aria-disabled` (optional)**: `Booleanish`
- **`aria-dropeffect` (optional)**: `"link" | "copy" | "none" | "execute" | "move" | "popup"`
- **`aria-errormessage` (optional)**: `string`
- **`aria-expanded` (optional)**: `Booleanish`
- **`aria-flowto` (optional)**: `string`
- **`aria-grabbed` (optional)**: `Booleanish`
- **`aria-haspopup` (optional)**: `boolean | "grid" | "dialog" | "menu" | "true" | "false" | "listbox" | "tree"`
- **`aria-hidden` (optional)**: `Booleanish`
- **`aria-invalid` (optional)**: `boolean | "true" | "false" | "grammar" | "spelling"`
- **`aria-keyshortcuts` (optional)**: `string`
- **`aria-label` (optional)**: `string`
- **`aria-labelledby` (optional)**: `string`
- **…**: (and 234 more)

**Example**:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export function Example() {
  return <Skeleton />;
}
```

### `@/components/ui/slider`

- **Source**: `src/components/ui/slider.tsx`

#### `Slider`

- **Import**: `import { Slider } from "@/components/ui/slider";`
- **Kind**: Component
- **Signature**: `Slider(props: P): ReactNode`

**Example**:

```tsx
import { Slider } from "@/components/ui/slider";

export function Example() {
  return <Slider />;
}
```

### `@/components/ui/sonner`

- **Source**: `src/components/ui/sonner.tsx`

#### `toast`

- **Import**: `import { toast } from "@/components/ui/sonner";`
- **Kind**: Function
- **Signature**: `toast(message: titleT, data?: ExternalToast): string | number`

**Example**:

```tsx
import { toast } from "@/components/ui/sonner";

const result = toast(/* ...args */);
void result;
```

#### `Toaster`

- **Import**: `import { Toaster } from "@/components/ui/sonner";`
- **Kind**: Component
- **Signature**: `Toaster({ ...props }: ToasterProps & RefAttributes<HTMLElement>): JSX.Element`

**Props**:
- **`className` (optional)**: `string`
- **`closeButton` (optional)**: `boolean`
- **`containerAriaLabel` (optional)**: `string`
- **`dir` (optional)**: `"auto" | "ltr" | "rtl"`
- **`duration` (optional)**: `number`
- **`expand` (optional)**: `boolean`
- **`gap` (optional)**: `number`
- **`hotkey` (optional)**: `string[]`
- **`icons` (optional)**: `ToastIcons`
- **`invert` (optional)**: `boolean`
- **`key` (optional)**: `Key`
- **`loadingIcon` (optional)**: `React.ReactNode`
- **`mobileOffset` (optional)**: `Offset`
- **`offset` (optional)**: `Offset`
- **`pauseWhenPageIsHidden` (optional)**: `boolean`
- **`position` (optional)**: `Position`
- **`ref` (optional)**: `LegacyRef<HTMLElement>`
- **`richColors` (optional)**: `boolean`
- **`style` (optional)**: `React.CSSProperties`
- **`swipeDirections` (optional)**: `SwipeDirection[]`
- **`theme` (optional)**: `"light" | "dark" | "system"`
- **`toastOptions` (optional)**: `ToastOptions`
- **`visibleToasts` (optional)**: `number`

**Example**:

```tsx
import { Toaster } from "@/components/ui/sonner";

export function Example() {
  return <Toaster />;
}
```

### `@/components/ui/switch`

- **Source**: `src/components/ui/switch.tsx`

#### `Switch`

- **Import**: `import { Switch } from "@/components/ui/switch";`
- **Kind**: Component
- **Signature**: `Switch(props: P): ReactNode`

**Example**:

```tsx
import { Switch } from "@/components/ui/switch";

export function Example() {
  return <Switch />;
}
```

### `@/components/ui/table`

- **Source**: `src/components/ui/table.tsx`

#### `Table`

- **Import**: `import { Table } from "@/components/ui/table";`
- **Kind**: Component
- **Signature**: `Table(props: P): ReactNode`

**Example**:

```tsx
import { Table } from "@/components/ui/table";

export function Example() {
  return <Table />;
}
```

#### `TableBody`

- **Import**: `import { TableBody } from "@/components/ui/table";`
- **Kind**: Component
- **Signature**: `TableBody(props: P): ReactNode`

**Example**:

```tsx
import { TableBody } from "@/components/ui/table";

export function Example() {
  return <TableBody />;
}
```

#### `TableCaption`

- **Import**: `import { TableCaption } from "@/components/ui/table";`
- **Kind**: Component
- **Signature**: `TableCaption(props: P): ReactNode`

**Example**:

```tsx
import { TableCaption } from "@/components/ui/table";

export function Example() {
  return <TableCaption />;
}
```

#### `TableCell`

- **Import**: `import { TableCell } from "@/components/ui/table";`
- **Kind**: Component
- **Signature**: `TableCell(props: P): ReactNode`

**Example**:

```tsx
import { TableCell } from "@/components/ui/table";

export function Example() {
  return <TableCell />;
}
```

#### `TableFooter`

- **Import**: `import { TableFooter } from "@/components/ui/table";`
- **Kind**: Component
- **Signature**: `TableFooter(props: P): ReactNode`

**Example**:

```tsx
import { TableFooter } from "@/components/ui/table";

export function Example() {
  return <TableFooter />;
}
```

#### `TableHead`

- **Import**: `import { TableHead } from "@/components/ui/table";`
- **Kind**: Component
- **Signature**: `TableHead(props: P): ReactNode`

**Example**:

```tsx
import { TableHead } from "@/components/ui/table";

export function Example() {
  return <TableHead />;
}
```

#### `TableHeader`

- **Import**: `import { TableHeader } from "@/components/ui/table";`
- **Kind**: Component
- **Signature**: `TableHeader(props: P): ReactNode`

**Example**:

```tsx
import { TableHeader } from "@/components/ui/table";

export function Example() {
  return <TableHeader />;
}
```

#### `TableRow`

- **Import**: `import { TableRow } from "@/components/ui/table";`
- **Kind**: Component
- **Signature**: `TableRow(props: P): ReactNode`

**Example**:

```tsx
import { TableRow } from "@/components/ui/table";

export function Example() {
  return <TableRow />;
}
```

### `@/components/ui/tabs`

- **Source**: `src/components/ui/tabs.tsx`

#### `Tabs`

- **Import**: `import { Tabs } from "@/components/ui/tabs";`
- **Kind**: Component
- **Signature**: `Tabs(props: P): ReactNode`

**Example**:

```tsx
import { Tabs } from "@/components/ui/tabs";

export function Example() {
  return <Tabs />;
}
```

#### `TabsContent`

- **Import**: `import { TabsContent } from "@/components/ui/tabs";`
- **Kind**: Component
- **Signature**: `TabsContent(props: P): ReactNode`

**Example**:

```tsx
import { TabsContent } from "@/components/ui/tabs";

export function Example() {
  return <TabsContent />;
}
```

#### `TabsList`

- **Import**: `import { TabsList } from "@/components/ui/tabs";`
- **Kind**: Component
- **Signature**: `TabsList(props: P): ReactNode`

**Example**:

```tsx
import { TabsList } from "@/components/ui/tabs";

export function Example() {
  return <TabsList />;
}
```

#### `TabsTrigger`

- **Import**: `import { TabsTrigger } from "@/components/ui/tabs";`
- **Kind**: Component
- **Signature**: `TabsTrigger(props: P): ReactNode`

**Example**:

```tsx
import { TabsTrigger } from "@/components/ui/tabs";

export function Example() {
  return <TabsTrigger />;
}
```

### `@/components/ui/textarea`

- **Source**: `src/components/ui/textarea.tsx`

#### `Textarea`

- **Import**: `import { Textarea } from "@/components/ui/textarea";`
- **Kind**: Component
- **Signature**: `Textarea(props: P): ReactNode`

**Example**:

```tsx
import { Textarea } from "@/components/ui/textarea";

export function Example() {
  return <Textarea />;
}
```

#### `TextareaProps`

- **Import**: `import { TextareaProps } from "@/components/ui/textarea";`
- **Kind**: Type

**Definition**:

```ts
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
```

**Example**:

```tsx
import { TextareaProps } from "@/components/ui/textarea";

// Use TextareaProps in your code where appropriate.
```

### `@/components/ui/toast`

- **Source**: `src/components/ui/toast.tsx`

#### `Toast`

- **Import**: `import { Toast } from "@/components/ui/toast";`
- **Kind**: Component
- **Signature**: `Toast(props: P): ReactNode`

**Example**:

```tsx
import { Toast } from "@/components/ui/toast";

export function Example() {
  return <Toast />;
}
```

#### `ToastAction`

- **Import**: `import { ToastAction } from "@/components/ui/toast";`
- **Kind**: Component
- **Signature**: `ToastAction(props: P): ReactNode`

**Example**:

```tsx
import { ToastAction } from "@/components/ui/toast";

export function Example() {
  return <ToastAction />;
}
```

#### `ToastActionElement`

- **Import**: `import { ToastActionElement } from "@/components/ui/toast";`
- **Kind**: Type

**Definition**:

```ts
type ToastActionElement = React.ReactElement<typeof ToastAction>;
```

**Example**:

```tsx
import { ToastActionElement } from "@/components/ui/toast";

// Use ToastActionElement in your code where appropriate.
```

#### `ToastClose`

- **Import**: `import { ToastClose } from "@/components/ui/toast";`
- **Kind**: Component
- **Signature**: `ToastClose(props: P): ReactNode`

**Example**:

```tsx
import { ToastClose } from "@/components/ui/toast";

export function Example() {
  return <ToastClose />;
}
```

#### `ToastDescription`

- **Import**: `import { ToastDescription } from "@/components/ui/toast";`
- **Kind**: Component
- **Signature**: `ToastDescription(props: P): ReactNode`

**Example**:

```tsx
import { ToastDescription } from "@/components/ui/toast";

export function Example() {
  return <ToastDescription />;
}
```

#### `ToastProps`

- **Import**: `import { ToastProps } from "@/components/ui/toast";`
- **Kind**: Type

**Definition**:

```ts
type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;
```

**Example**:

```tsx
import { ToastProps } from "@/components/ui/toast";

// Use ToastProps in your code where appropriate.
```

#### `ToastProvider`

- **Import**: `import { ToastProvider } from "@/components/ui/toast";`
- **Kind**: Component
- **Signature**: `ToastProvider(props: P, deprecatedLegacyContext?: any): ReactNode`

**Example**:

```tsx
import { ToastProvider } from "@/components/ui/toast";

export function Example() {
  return <ToastProvider />;
}
```

#### `ToastTitle`

- **Import**: `import { ToastTitle } from "@/components/ui/toast";`
- **Kind**: Component
- **Signature**: `ToastTitle(props: P): ReactNode`

**Example**:

```tsx
import { ToastTitle } from "@/components/ui/toast";

export function Example() {
  return <ToastTitle />;
}
```

#### `ToastViewport`

- **Import**: `import { ToastViewport } from "@/components/ui/toast";`
- **Kind**: Component
- **Signature**: `ToastViewport(props: P): ReactNode`

**Example**:

```tsx
import { ToastViewport } from "@/components/ui/toast";

export function Example() {
  return <ToastViewport />;
}
```

### `@/components/ui/toaster`

- **Source**: `src/components/ui/toaster.tsx`

#### `Toaster`

- **Import**: `import { Toaster } from "@/components/ui/toaster";`
- **Kind**: Component
- **Signature**: `Toaster(): JSX.Element`

**Example**:

```tsx
import { Toaster } from "@/components/ui/toaster";

export function Example() {
  return <Toaster />;
}
```

### `@/components/ui/toggle`

- **Source**: `src/components/ui/toggle.tsx`

#### `Toggle`

- **Import**: `import { Toggle } from "@/components/ui/toggle";`
- **Kind**: Component
- **Signature**: `Toggle(props: P): ReactNode`

**Example**:

```tsx
import { Toggle } from "@/components/ui/toggle";

export function Example() {
  return <Toggle />;
}
```

#### `toggleVariants`

- **Import**: `import { toggleVariants } from "@/components/ui/toggle";`
- **Kind**: Function
- **Signature**: `toggleVariants(props?: Props<T>): string`

**Example**:

```tsx
import { toggleVariants } from "@/components/ui/toggle";

const result = toggleVariants(/* ...args */);
void result;
```

### `@/components/ui/toggle-group`

- **Source**: `src/components/ui/toggle-group.tsx`

#### `ToggleGroup`

- **Import**: `import { ToggleGroup } from "@/components/ui/toggle-group";`
- **Kind**: Component
- **Signature**: `ToggleGroup(props: P): ReactNode`

**Example**:

```tsx
import { ToggleGroup } from "@/components/ui/toggle-group";

export function Example() {
  return <ToggleGroup />;
}
```

#### `ToggleGroupItem`

- **Import**: `import { ToggleGroupItem } from "@/components/ui/toggle-group";`
- **Kind**: Component
- **Signature**: `ToggleGroupItem(props: P): ReactNode`

**Example**:

```tsx
import { ToggleGroupItem } from "@/components/ui/toggle-group";

export function Example() {
  return <ToggleGroupItem />;
}
```

### `@/components/ui/tooltip`

- **Source**: `src/components/ui/tooltip.tsx`

#### `Tooltip`

- **Import**: `import { Tooltip } from "@/components/ui/tooltip";`
- **Kind**: Component
- **Signature**: `Tooltip(props: P, deprecatedLegacyContext?: any): ReactNode`

**Example**:

```tsx
import { Tooltip } from "@/components/ui/tooltip";

export function Example() {
  return <Tooltip />;
}
```

#### `TooltipContent`

- **Import**: `import { TooltipContent } from "@/components/ui/tooltip";`
- **Kind**: Component
- **Signature**: `TooltipContent(props: P): ReactNode`

**Example**:

```tsx
import { TooltipContent } from "@/components/ui/tooltip";

export function Example() {
  return <TooltipContent />;
}
```

#### `TooltipProvider`

- **Import**: `import { TooltipProvider } from "@/components/ui/tooltip";`
- **Kind**: Component
- **Signature**: `TooltipProvider(props: P, deprecatedLegacyContext?: any): ReactNode`

**Example**:

```tsx
import { TooltipProvider } from "@/components/ui/tooltip";

export function Example() {
  return <TooltipProvider />;
}
```

#### `TooltipTrigger`

- **Import**: `import { TooltipTrigger } from "@/components/ui/tooltip";`
- **Kind**: Component
- **Signature**: `TooltipTrigger(props: P): ReactNode`

**Example**:

```tsx
import { TooltipTrigger } from "@/components/ui/tooltip";

export function Example() {
  return <TooltipTrigger />;
}
```

### `@/components/ui/use-toast`

- **Source**: `src/components/ui/use-toast.ts`

#### `toast`

- **Import**: `import { toast } from "@/components/ui/use-toast";`
- **Kind**: Function
- **Signature**: `toast({ ...props }: Toast): { id: string; dismiss: () => void; update: (props: ToasterToast) => void; }`

**Example**:

```tsx
import { toast } from "@/components/ui/use-toast";

const result = toast(/* ...args */);
void result;
```

#### `useToast`

- **Import**: `import { useToast } from "@/components/ui/use-toast";`
- **Kind**: Hook
- **Signature**: `useToast(): { toast: typeof toast; dismiss: (toastId?: string) => void; toasts: ToasterToast[]; }`

**Example**:

```tsx
import { useToast } from "@/components/ui/use-toast";

export function Example() {
  const result = useToast();
  void result;
  return null;
}
```
