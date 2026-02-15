import React from "react";
import { UniversalFloorPlanViewer, ViewerPin, Coordinate } from "@/components/viewers/UniversalFloorPlanViewer";

// Re-export types for compatibility
export type { ViewerPin as SnagPin, Coordinate };

interface InteractiveMapProps {
  imageUrl?: string;
  pins?: ViewerPin[];
  onPinAdd?: (coordinate: Coordinate) => void;
  onPinClick?: (pin: ViewerPin) => void;
  readOnly?: boolean;
  className?: string;
}

/**
 * @deprecated Use UniversalFloorPlanViewer instead
 */
export const InteractiveMap: React.FC<InteractiveMapProps> = (props) => {
  return (
    <UniversalFloorPlanViewer
      {...props}
      imageUrl={props.imageUrl || null}
      allowFileUpload={!props.readOnly}
    />
  );
};
