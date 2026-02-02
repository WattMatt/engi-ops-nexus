/**
 * Common Components Index
 * 
 * This file exports all shared/reusable components for easy importing.
 * Import like: import { StatusCard, EmptyState } from "@/components/common";
 */

// Feedback States
export { EmptyState, LoadingState, ErrorState, NoResults } from "./FeedbackStates";
export { StatusCard } from "./StatusCard";
export { ErrorBoundary, withErrorBoundary } from "./ErrorBoundary";

// Form Components
export { FormField } from "./FormField";
export { FormTextarea } from "./FormTextarea";

// Display Components
export { MetricCard, MetricGrid } from "./MetricCard";
export { VirtualizedTable } from "./VirtualizedTable";
export { PaginationControls } from "./PaginationControls";

// Accessibility Components
export { AccessibleButton } from "./AccessibleButton";
export { AccessibleTable } from "./AccessibleTable";
export { FocusTrap } from "./FocusTrap";
export { LiveRegion, useAnnounce } from "./LiveRegion";
export { SkipLink } from "./SkipLink";

// Layout Components
export { PageLoadingSpinner } from "./PageLoadingSpinner";
export { ProjectContextHeader } from "./ProjectContextHeader";
export { OfflineSyncIndicator } from "./OfflineSyncIndicator";
