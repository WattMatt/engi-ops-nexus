interface AlignmentGuide {
  type: 'vertical' | 'horizontal';
  position: number;
  color: string;
}

interface AlignmentGuidesProps {
  guides: AlignmentGuide[];
}

export const AlignmentGuides = ({ guides }: AlignmentGuidesProps) => {
  if (guides.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      <svg className="w-full h-full">
        {guides.map((guide, index) => (
          <line
            key={`${guide.type}-${guide.position}-${index}`}
            x1={guide.type === 'vertical' ? guide.position : 0}
            y1={guide.type === 'vertical' ? 0 : guide.position}
            x2={guide.type === 'vertical' ? guide.position : '100%'}
            y2={guide.type === 'vertical' ? '100%' : guide.position}
            stroke={guide.color}
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="animate-pulse"
          />
        ))}
      </svg>
    </div>
  );
};

export interface ElementBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

export const SNAP_THRESHOLD = 8; // pixels

export function calculateAlignmentGuides(
  draggingBounds: ElementBounds,
  otherElements: { key: string; bounds: ElementBounds }[],
  snapThreshold: number = SNAP_THRESHOLD
): {
  guides: AlignmentGuide[];
  snapX: number | null;
  snapY: number | null;
} {
  const guides: AlignmentGuide[] = [];
  let snapX: number | null = null;
  let snapY: number | null = null;

  // Check alignment with each other element
  otherElements.forEach(({ bounds }) => {
    // Vertical alignment checks (X axis)
    // Left edge alignment
    if (Math.abs(draggingBounds.left - bounds.left) < snapThreshold) {
      guides.push({ type: 'vertical', position: bounds.left, color: '#3b82f6' });
      snapX = bounds.left;
    }
    // Right edge alignment
    else if (Math.abs(draggingBounds.right - bounds.right) < snapThreshold) {
      guides.push({ type: 'vertical', position: bounds.right, color: '#3b82f6' });
      snapX = bounds.right - draggingBounds.width;
    }
    // Center X alignment
    else if (Math.abs(draggingBounds.centerX - bounds.centerX) < snapThreshold) {
      guides.push({ type: 'vertical', position: bounds.centerX, color: '#ef4444' });
      snapX = bounds.centerX - draggingBounds.width / 2;
    }
    // Left to right edge alignment
    else if (Math.abs(draggingBounds.left - bounds.right) < snapThreshold) {
      guides.push({ type: 'vertical', position: bounds.right, color: '#3b82f6' });
      snapX = bounds.right;
    }
    // Right to left edge alignment
    else if (Math.abs(draggingBounds.right - bounds.left) < snapThreshold) {
      guides.push({ type: 'vertical', position: bounds.left, color: '#3b82f6' });
      snapX = bounds.left - draggingBounds.width;
    }

    // Horizontal alignment checks (Y axis)
    // Top edge alignment
    if (Math.abs(draggingBounds.top - bounds.top) < snapThreshold) {
      guides.push({ type: 'horizontal', position: bounds.top, color: '#3b82f6' });
      snapY = bounds.top;
    }
    // Bottom edge alignment
    else if (Math.abs(draggingBounds.bottom - bounds.bottom) < snapThreshold) {
      guides.push({ type: 'horizontal', position: bounds.bottom, color: '#3b82f6' });
      snapY = bounds.bottom - draggingBounds.height;
    }
    // Center Y alignment
    else if (Math.abs(draggingBounds.centerY - bounds.centerY) < snapThreshold) {
      guides.push({ type: 'horizontal', position: bounds.centerY, color: '#ef4444' });
      snapY = bounds.centerY - draggingBounds.height / 2;
    }
    // Top to bottom edge alignment
    else if (Math.abs(draggingBounds.top - bounds.bottom) < snapThreshold) {
      guides.push({ type: 'horizontal', position: bounds.bottom, color: '#3b82f6' });
      snapY = bounds.bottom;
    }
    // Bottom to top edge alignment
    else if (Math.abs(draggingBounds.bottom - bounds.top) < snapThreshold) {
      guides.push({ type: 'horizontal', position: bounds.top, color: '#3b82f6' });
      snapY = bounds.top - draggingBounds.height;
    }
  });

  // Remove duplicate guides (same position and type)
  const uniqueGuides = guides.reduce((acc, guide) => {
    const key = `${guide.type}-${guide.position}`;
    if (!acc.some(g => `${g.type}-${g.position}` === key)) {
      acc.push(guide);
    }
    return acc;
  }, [] as AlignmentGuide[]);

  return { guides: uniqueGuides, snapX, snapY };
}

export function getElementBounds(
  position: { x: number; y: number },
  element: HTMLElement | null
): ElementBounds | null {
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  return {
    left: position.x,
    right: position.x + width,
    top: position.y,
    bottom: position.y + height,
    centerX: position.x + width / 2,
    centerY: position.y + height / 2,
    width,
    height,
  };
}
