## Hooks

Generated on 2026-01-07T04:31:56.431Z. Regenerate with `npm run docs:generate`.

### `@/hooks/use-mobile`

- **Source**: `src/hooks/use-mobile.tsx`

#### `useIsMobile`

- **Import**: `import { useIsMobile } from "@/hooks/use-mobile";`
- **Kind**: Hook
- **Signature**: `useIsMobile(): boolean`

**Example**:

```tsx
import { useIsMobile } from "@/hooks/use-mobile";

export function Example() {
  const result = useIsMobile();
  void result;
  return null;
}
```

### `@/hooks/use-toast`

- **Source**: `src/hooks/use-toast.ts`

#### `reducer`

- **Import**: `import { reducer } from "@/hooks/use-toast";`
- **Kind**: Function
- **Signature**: `reducer(state: State, action: Action): State`

**Example**:

```tsx
import { reducer } from "@/hooks/use-toast";

const result = reducer(/* ...args */);
void result;
```

#### `toast`

- **Import**: `import { toast } from "@/hooks/use-toast";`
- **Kind**: Function
- **Signature**: `toast({ ...props }: Toast): { id: string; dismiss: () => void; update: (props: ToasterToast) => void; }`

**Example**:

```tsx
import { toast } from "@/hooks/use-toast";

const result = toast(/* ...args */);
void result;
```

#### `useToast`

- **Import**: `import { useToast } from "@/hooks/use-toast";`
- **Kind**: Hook
- **Signature**: `useToast(): { toast: typeof toast; dismiss: (toastId?: string) => void; toasts: ToasterToast[]; }`

**Example**:

```tsx
import { useToast } from "@/hooks/use-toast";

export function Example() {
  const result = useToast();
  void result;
  return null;
}
```

### `@/hooks/useActivityLogger`

- **Source**: `src/hooks/useActivityLogger.tsx`

#### `useActivityLogger`

- **Import**: `import { useActivityLogger } from "@/hooks/useActivityLogger";`
- **Kind**: Hook
- **Signature**: `useActivityLogger(): { logActivity: (actionType: string, actionDescription: string, metadata?: Record<string, any>, projectId?: string | null) => Promise<void>; }`

**Example**:

```tsx
import { useActivityLogger } from "@/hooks/useActivityLogger";

export function Example() {
  const result = useActivityLogger();
  void result;
  return null;
}
```

### `@/hooks/useCalculationSettings`

- **Source**: `src/hooks/useCalculationSettings.tsx`

#### `CalculationSettings`

- **Import**: `import { CalculationSettings } from "@/hooks/useCalculationSettings";`
- **Kind**: Type

**Definition**:

```ts
export interface CalculationSettings {
  voltage_drop_limit_400v: number;
  voltage_drop_limit_230v: number;
  power_factor_power: number;
  power_factor_lighting: number;
  power_factor_motor: number;
  power_factor_hvac: number;
  ambient_temp_baseline: number;
  grouping_factor_2_circuits: number;
  grouping_factor_3_circuits: number;
  grouping_factor_4plus_circuits: number;
  cable_safety_margin: number;
  max_amps_per_cable: number;
  preferred_amps_per_cable: number;
  k_factor_copper: number;
  k_factor_aluminium: number;
  calculation_standard: string;
  default_installation_method: string;
  default_cable_material: string;
  default_insulation_type: string;
}
```

**Example**:

```tsx
import { CalculationSettings } from "@/hooks/useCalculationSettings";

// Use CalculationSettings in your code where appropriate.
```

#### `useCalculationSettings`

- **Import**: `import { useCalculationSettings } from "@/hooks/useCalculationSettings";`
- **Kind**: Hook
- **Signature**: `useCalculationSettings(projectId: string): UseQueryResult<CalculationSettings, Error>`

**Example**:

```tsx
import { useCalculationSettings } from "@/hooks/useCalculationSettings";

export function Example() {
  const result = useCalculationSettings();
  void result;
  return null;
}
```

### `@/hooks/useClientAccess`

- **Source**: `src/hooks/useClientAccess.tsx`

#### `ReportType`

- **Import**: `import { ReportType } from "@/hooks/useClientAccess";`
- **Kind**: Type

**Definition**:

```ts
export type ReportType = 'tenant_report' | 'generator_report' | 'cost_report' | 'project_documents';
```

**Example**:

```tsx
import { ReportType } from "@/hooks/useClientAccess";

// Use ReportType in your code where appropriate.
```

#### `useClientAccess`

- **Import**: `import { useClientAccess } from "@/hooks/useClientAccess";`
- **Kind**: Hook
- **Signature**: `useClientAccess(): { isClient: boolean; clientProjects: ClientProjectAccess[]; loading: boolean; hasReportAccess: (projectId: string, reportType: ReportType, permission: "view" | "comment" | "approve") => boolean; refetch: () => Promise<void>; }`

**Example**:

```tsx
import { useClientAccess } from "@/hooks/useClientAccess";

export function Example() {
  const result = useClientAccess();
  void result;
  return null;
}
```

### `@/hooks/useConversations`

- **Source**: `src/hooks/useConversations.tsx`

#### `Conversation`

- **Import**: `import { Conversation } from "@/hooks/useConversations";`
- **Kind**: Type

**Definition**:

```ts
export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'project_thread';
  project_id?: string;
  title?: string;
  participants: string[];
  last_message_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  has_attachments?: boolean;
  attachment_count?: number;
}
```

**Example**:

```tsx
import { Conversation } from "@/hooks/useConversations";

// Use Conversation in your code where appropriate.
```

#### `useConversations`

- **Import**: `import { useConversations } from "@/hooks/useConversations";`
- **Kind**: Hook
- **Signature**: `useConversations(): { conversations: { has_attachments: boolean; attachment_count: number; id: string; type: "direct" | "group" | "project_thread"; project_id?: string; title?: string; participants: string[]; last_message_at?: string; created_by: string; created_at: string; updated_at: string; }[]; isLoading: boolean; createConversation: UseMutateFunction<{ created_at: string; created_by: string; id: string; last_message_at: string | null; participants: Json; project_id: string | null; title: string | null; type: string; updated_at: string; }, Error, { type: Conversation["type"]; title?: string; participants: string[]; project_id?: string; }, unknown>; }`

**Example**:

```tsx
import { useConversations } from "@/hooks/useConversations";

export function Example() {
  const result = useConversations();
  void result;
  return null;
}
```

### `@/hooks/useFeedbackNotifications`

- **Source**: `src/hooks/useFeedbackNotifications.tsx`

#### `useFeedbackNotifications`

- **Import**: `import { useFeedbackNotifications } from "@/hooks/useFeedbackNotifications";`
- **Kind**: Hook
- **Signature**: `useFeedbackNotifications(): { unverifiedCount: number; refetch: (options?: aq) => Promise<aH<number, Error>>; }`

**Example**:

```tsx
import { useFeedbackNotifications } from "@/hooks/useFeedbackNotifications";

export function Example() {
  const result = useFeedbackNotifications();
  void result;
  return null;
}
```

### `@/hooks/useHandoverLinkStatus`

- **Source**: `src/hooks/useHandoverLinkStatus.tsx`

#### `useHandoverLinkStatus`

- **Import**: `import { useHandoverLinkStatus } from "@/hooks/useHandoverLinkStatus";`
- **Kind**: Hook
- **Signature**: `useHandoverLinkStatus(projectId: string): UseQueryResult<{ linkedTenantIds: string[]; totalLinked: number; }, Error>`

**Example**:

```tsx
import { useHandoverLinkStatus } from "@/hooks/useHandoverLinkStatus";

export function Example() {
  const result = useHandoverLinkStatus();
  void result;
  return null;
}
```

### `@/hooks/useImageCompression`

- **Source**: `src/hooks/useImageCompression.ts`

#### `compressImages`

- **Import**: `import { compressImages } from "@/hooks/useImageCompression";`
- **Kind**: Function
- **Signature**: `compressImages(files: File[], options?: CompressionOptions): Promise<File[]>`

Utility function to compress multiple images


**Example**:

```tsx
import { compressImages } from "@/hooks/useImageCompression";

const result = compressImages(/* ...args */);
void result;
```

#### `useImageCompression`

- **Import**: `import { useImageCompression } from "@/hooks/useImageCompression";`
- **Kind**: Hook
- **Signature**: `useImageCompression(): UseImageCompressionReturn`

Hook for compressing images before upload to reduce bandwidth and storage costs.
Uses browser-image-compression library for efficient client-side compression.


**Example**:

```tsx
import { useImageCompression } from "@/hooks/useImageCompression";

export function Example() {
  const result = useImageCompression();
  void result;
  return null;
}
```

### `@/hooks/useMessages`

- **Source**: `src/hooks/useMessages.tsx`

#### `Message`

- **Import**: `import { Message } from "@/hooks/useMessages";`
- **Kind**: Type

**Definition**:

```ts
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  mentions: string[];
  attachments: any[];
  is_read: boolean;
  read_by: string[];
  created_at: string;
  updated_at: string;
}
```

**Example**:

```tsx
import { Message } from "@/hooks/useMessages";

// Use Message in your code where appropriate.
```

#### `useMessages`

- **Import**: `import { useMessages } from "@/hooks/useMessages";`
- **Kind**: Hook
- **Signature**: `useMessages(conversationId?: string): { messages: Message[]; isLoading: boolean; sendMessage: UseMutateFunction<{ attachments: Json | null; content: string; conversation_id: string; created_at: string; id: string; is_read: boolean | null; mentions: Json | null; read_by: Json | null; sender_id: string; updated_at: string; }, Error, { conversation_id: string; content: string; mentions?: string[]; attachments?: any[]; }, unknown>; markAsRead: UseMutateFunction<void, Error, string, unknown>; }`

**Example**:

```tsx
import { useMessages } from "@/hooks/useMessages";

export function Example() {
  const result = useMessages();
  void result;
  return null;
}
```

### `@/hooks/useMunicipalityQuery`

- **Source**: `src/hooks/useMunicipalityQuery.ts`

#### `useMunicipalityQuery`

- **Import**: `import { useMunicipalityQuery } from "@/hooks/useMunicipalityQuery";`
- **Kind**: Hook
- **Signature**: `useMunicipalityQuery(): { queryMunicipality: (lng: number, lat: number) => Promise<QueryResult | null>; isQuerying: boolean; lastResult: QueryResult; }`

**Example**:

```tsx
import { useMunicipalityQuery } from "@/hooks/useMunicipalityQuery";

export function Example() {
  const result = useMunicipalityQuery();
  void result;
  return null;
}
```

### `@/hooks/useNotifications`

- **Source**: `src/hooks/useNotifications.tsx`

#### `Notification`

- **Import**: `import { Notification } from "@/hooks/useNotifications";`
- **Kind**: Type

**Definition**:

```ts
export interface Notification {
  id: string;
  user_id: string;
  notification_type: 'status_update' | 'approval_request' | 'task_assigned' | 'mention' | 'client_request';
  title: string;
  description: string;
  link?: string;
  metadata: any;
  is_read: boolean;
  email_sent: boolean;
  created_at: string;
}
```

**Example**:

```tsx
import { Notification } from "@/hooks/useNotifications";

// Use Notification in your code where appropriate.
```

#### `useNotifications`

- **Import**: `import { useNotifications } from "@/hooks/useNotifications";`
- **Kind**: Hook
- **Signature**: `useNotifications(): { notifications: Notification[]; isLoading: boolean; unreadCount: number; markAsRead: UseMutateFunction<void, Error, string, unknown>; markAllAsRead: UseMutateFunction<void, Error, void, unknown>; }`

**Example**:

```tsx
import { useNotifications } from "@/hooks/useNotifications";

export function Example() {
  const result = useNotifications();
  void result;
  return null;
}
```

### `@/hooks/usePDFEditorHistory`

- **Source**: `src/hooks/usePDFEditorHistory.tsx`

#### `HistoryState`

- **Import**: `import { HistoryState } from "@/hooks/usePDFEditorHistory";`
- **Kind**: Type

**Definition**:

```ts
export interface HistoryState {
  extractedText: any[];
  editedTextItems: Map<string, string>;
}
```

**Example**:

```tsx
import { HistoryState } from "@/hooks/usePDFEditorHistory";

// Use HistoryState in your code where appropriate.
```

#### `usePDFEditorHistory`

- **Import**: `import { usePDFEditorHistory } from "@/hooks/usePDFEditorHistory";`
- **Kind**: Hook
- **Signature**: `usePDFEditorHistory(initialState: HistoryState): { canUndo: boolean; canRedo: boolean; pushState: (newState: HistoryState) => void; undo: () => HistoryState; redo: () => HistoryState; getCurrentState: () => HistoryState; }`

**Example**:

```tsx
import { usePDFEditorHistory } from "@/hooks/usePDFEditorHistory";

export function Example() {
  const result = usePDFEditorHistory();
  void result;
  return null;
}
```

### `@/hooks/useProjectCompletion`

- **Source**: `src/hooks/useProjectCompletion.tsx`

#### `useProjectCompletion`

- **Import**: `import { useProjectCompletion } from "@/hooks/useProjectCompletion";`
- **Kind**: Hook
- **Signature**: `useProjectCompletion(projectId: string): ProjectCompletion`

**Example**:

```tsx
import { useProjectCompletion } from "@/hooks/useProjectCompletion";

export function Example() {
  const result = useProjectCompletion();
  void result;
  return null;
}
```

### `@/hooks/useProjectIssues`

- **Source**: `src/hooks/useProjectIssues.tsx`

#### `ProjectIssue`

- **Import**: `import { ProjectIssue } from "@/hooks/useProjectIssues";`
- **Kind**: Type

**Definition**:

```ts
export interface ProjectIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'tenants' | 'documents' | 'deadlines' | 'configuration';
  title: string;
  description: string;
  count?: number;
  navigationPath: string;
  actionLabel: string;
}
```

**Example**:

```tsx
import { ProjectIssue } from "@/hooks/useProjectIssues";

// Use ProjectIssue in your code where appropriate.
```

#### `useProjectIssues`

- **Import**: `import { useProjectIssues } from "@/hooks/useProjectIssues";`
- **Kind**: Hook
- **Signature**: `useProjectIssues(projectId: string): UseQueryResult<ProjectIssue[], Error>`

**Example**:

```tsx
import { useProjectIssues } from "@/hooks/useProjectIssues";

export function Example() {
  const result = useProjectIssues();
  void result;
  return null;
}
```

### `@/hooks/useRoleAccess`

- **Source**: `src/hooks/useRoleAccess.tsx`

#### `AppRole`

- **Import**: `import { AppRole } from "@/hooks/useRoleAccess";`
- **Kind**: Type

**Definition**:

```ts
export type AppRole = "admin" | "moderator" | "user";
```

**Example**:

```tsx
import { AppRole } from "@/hooks/useRoleAccess";

// Use AppRole in your code where appropriate.
```

#### `useRoleAccess`

- **Import**: `import { useRoleAccess } from "@/hooks/useRoleAccess";`
- **Kind**: Hook
- **Signature**: `useRoleAccess(requiredRole?: AppRole): { userRole: AppRole; loading: boolean; isAdmin: boolean; isModerator: boolean; hasRole: (role: AppRole) => boolean; hasAccess: (role: AppRole) => boolean; }`

**Example**:

```tsx
import { useRoleAccess } from "@/hooks/useRoleAccess";

export function Example() {
  const result = useRoleAccess();
  void result;
  return null;
}
```

### `@/hooks/useTenantPresence`

- **Source**: `src/hooks/useTenantPresence.tsx`

#### `useTenantPresence`

- **Import**: `import { useTenantPresence } from "@/hooks/useTenantPresence";`
- **Kind**: Hook
- **Signature**: `useTenantPresence(projectId: string): { editingUsers: EditingUser[]; setEditing: (tenantId: string | null) => Promise<void>; getEditingUser: (tenantId: string) => EditingUser; currentUserId: string; }`

**Example**:

```tsx
import { useTenantPresence } from "@/hooks/useTenantPresence";

export function Example() {
  const result = useTenantPresence();
  void result;
  return null;
}
```

### `@/hooks/useTypingIndicator`

- **Source**: `src/hooks/useTypingIndicator.tsx`

#### `useTypingIndicator`

- **Import**: `import { useTypingIndicator } from "@/hooks/useTypingIndicator";`
- **Kind**: Hook
- **Signature**: `useTypingIndicator(conversationId: string): { typingUsers: TypingUser[]; setTyping: (isTyping: boolean) => Promise<void>; }`

**Example**:

```tsx
import { useTypingIndicator } from "@/hooks/useTypingIndicator";

export function Example() {
  const result = useTypingIndicator();
  void result;
  return null;
}
```

### `@/hooks/useUnreadMessages`

- **Source**: `src/hooks/useUnreadMessages.tsx`

#### `useUnreadMessages`

- **Import**: `import { useUnreadMessages } from "@/hooks/useUnreadMessages";`
- **Kind**: Hook
- **Signature**: `useUnreadMessages(): { totalUnread: number; unreadByConversation: Record<string, number>; refetch: (options?: aq) => Promise<aH<{ total: number; byConversation: Record<string, number>; }, Error>>; }`

**Example**:

```tsx
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

export function Example() {
  const result = useUnreadMessages();
  void result;
  return null;
}
```

### `@/hooks/useUserRole`

- **Source**: `src/hooks/useUserRole.tsx`

#### `useUserRole`

- **Import**: `import { useUserRole } from "@/hooks/useUserRole";`
- **Kind**: Hook
- **Signature**: `useUserRole(): { isAdmin: boolean; loading: boolean; }`

**Example**:

```tsx
import { useUserRole } from "@/hooks/useUserRole";

export function Example() {
  const result = useUserRole();
  void result;
  return null;
}
```
