import React from 'react';
import { EquipmentType } from '../types.js';

// Base Icons
const RMUIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className }, React.createElement("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2", ry: "2" }), React.createElement("line", { x1: "3", y1: "9", x2: "21", y2: "9" })) );
const SubstationIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className }, React.createElement("rect", { x: "1", y: "5", width: "22", height: "14", rx: "2", ry: "2" }), React.createElement("circle", { cx: "8", cy: "12", r: "3" }), React.createElement("circle", { cx: "16", cy: "12", r: "3" })) );
const MainBoardIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className }, React.createElement("rect", { x: "1", y: "5", width: "22", height: "14", rx: "2", ry: "2", fill: "none", stroke: "currentColor" }), React.createElement("path", { d: "M1 19 L23 5 L23 19 Z", fill: "currentColor", stroke: "currentColor" })) );
const SubBoardIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className }, React.createElement("rect", { x: "3", y: "5", width: "18", height: "14", rx: "2", ry: "2" }), React.createElement("line", { x1: "3", y1: "19", x2: "21", y2: "5" })) );
const GeneratorIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className }, React.createElement("circle", { cx: "12", cy: "12", r: "9" }), React.createElement("text", { x: "12", y: "12", textAnchor: "middle", dy: ".3em", fontSize: "12", fill: "currentColor" }, "G")) );
const PoleLightIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className }, React.createElement("circle", { cx: "12", cy: "12", r: "9" }), React.createElement("line", { x1: "17.65", y1: "6.35", x2: "6.35", y2: "17.65" }), React.createElement("line", { x1: "17.65", y1: "17.65", x2: "6.35", y2: "6.35" })) );

// PV Icons
const InverterIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", className: className }, React.createElement("rect", { x: "3", y: "7", width: "18", height: "10", rx: "1" }), React.createElement("path", { d: "M7 10h2" }), React.createElement("path", { d: "M7 14h2" }), React.createElement("path", { d: "M15 12c.83.5 1.17.5 2 0" })) );
const DCCombinerIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", className: className }, React.createElement("rect", { x: "4", y: "4", width: "16", height: "16", rx: "1" }), React.createElement("line", { x1: "8", y1: "12", x2: "16", y2: "12" }), React.createElement("line", { x1: "12", y1: "8", x2: "12", y2: "16" })) );
const ACDisconnectIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", className: className }, React.createElement("rect", { x: "4", y: "4", width: "16", height: "16", rx: "1" }), React.createElement("line", { x1: "8", y1: "16", x2: "16", y2: "8" })) );

// Line Shop Icons
const GeneralLightSwitchIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("circle", { cx: "12", cy: "12", r: "8" })) );
const DimmerSwitchIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("circle", { cx: "12", cy: "12", r: "8", fill: "none" }), React.createElement("text", { x: "12", y: "12", textAnchor: "middle", dy: ".3em", fontSize: "10", fill: "currentColor" }, "D")) );
const MotionSensorIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("circle", { cx: "12", cy: "12", r: "8", fill: "currentColor" }), React.createElement("text", { x: "12", y: "12", textAnchor: "middle", dy: ".3em", fontSize: "10", fill: "white" }, "M")) );
const TwoWayLightSwitchIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: "2", fill: "currentColor", className: className }, React.createElement("circle", { cx: "12", cy: "12", r: "8" })) );
const WatertightLightSwitchIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: "2", fill: "none", className: className }, React.createElement("circle", { cx: "12", cy: "12", r: "10" }), React.createElement("text", { x: "12", y: "12", textAnchor: "middle", dy: ".3em", fontSize: "8", fill: "currentColor" }, "WT")) );
const LedStripLightIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", stroke: "currentColor", fill: "none", strokeWidth: "4", strokeLinecap: "round", className: className }, React.createElement("path", { strokeDasharray: "8, 4", d: "M2 12 H 22" })) );
const Fluorescent2TubeIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("rect", { x: "1", y: "8", width: "22", height: "8" }), React.createElement("circle", { cx: "12", cy: "12", r: "4" }), React.createElement("path", { d: "M1 12H8" }), React.createElement("path", { d: "M16 12H23" })) );
const Fluorescent1TubeIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("rect", { x: "4", y: "8", width: "16", height: "8" }), React.createElement("circle", { cx: "12", cy: "12", r: "4" })) );
const CeilingFloodlightIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("rect", { x: "4", y: "4", width: "16", height: "16" }), React.createElement("line", { x1: "4", y1: "4", x2: "16", y2: "16" })) );
const CeilingLightIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("circle", { cx: "12", cy: "12", r: "10" })) );
const PoleMountedLightIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("circle", { cx: "12", cy: "12", r: "10" }), React.createElement("path", { d: "M12 2V22" }), React.createElement("path", { d: "M2 12H22" })) );
const WallMountedLightIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "currentColor", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("path", { d: "M12 2 V 22" }), React.createElement("path", { d: "M12 12 A 8 8 0 0 1 12 20", fill: "none" }), React.createElement("path", { d: "M12 12 A 8 8 0 0 0 12 4", fill: "none" })) );
const RecessedLight600Icon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("rect", { x: "1", y: "1", width: "22", height: "22" }), React.createElement("rect", { x: "5", y: "5", width: "14", height: "14" })) );
const RecessedLight1200Icon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("rect", { x: "1", y: "6", width: "22", height: "12" }), React.createElement("rect", { x: "3", y: "8", width: "18", height: "8" })) );
const FloodlightIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("path", { d: "M18 18 A 12 12 0 0 0 6 6" }), React.createElement("path", { d: "M6 18 V 6 H 18" }), React.createElement("path", { d: "M12 12 H 22" })) );
const PhotoCellIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: "2", fill: "none", className: className }, React.createElement("circle", { cx: "12", cy: "12", r: "10" }), React.createElement("text", { x: "12", y: "12", textAnchor: "middle", dy: ".3em", fontSize: "8", fill: "currentColor" }, "PC")) );
const FlushFloorOutletIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("rect", { x: "4", y: "4", width: "16", height: "16", fill: "none" }), React.createElement("circle", { cx: "12", cy: "12", r: "2", fill: "currentColor" })) );
const BoxFlushFloorIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("rect", { x: "4", y: "4", width: "16", height: "16" }), React.createElement("path", { d: "M4 4 L 20 20" }), React.createElement("path", { d: "M20 4 L 4 20" })) );
const Socket16AIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("path", { d: "M12 2 A 10 10 0 0 1 12 22 Z" })) );
const SocketDoubleIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "currentColor", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("path", { d: "M12 2 A 10 10 0 0 1 12 22 Z" })) );
const CleanPowerOutletIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("path", { fill: "currentColor", d: "M12 2 A 10 10 0 0 1 12 22 Z" })) );
const EmergencySocketIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: "1", className: className }, React.createElement("path", { fill: "currentColor", d: "M12 2 A 10 10 0 0 1 12 22 Z" }), React.createElement("path", { stroke: "white", strokeWidth: "1.5", d: "M12 5 v14 m-7-7 h14 m-5-5 l10 10 m-10 0 l10-10" })) );
const UpsSocketIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("path", { fill: "currentColor", d: "M12 2 A 10 10 0 0 1 12 22 Z" })) );
const DataSocketIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "currentColor", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("path", { d: "M12 2 L 22 22 L 2 22 Z" })) );
const TelephoneOutletIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("path", { d: "M12 2 L 22 22 L 2 22 Z" })) );
const SinglePhaseOutletIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("circle", { cx: "12", cy: "12", r: "10" }), React.createElement("line", { x1: "4", y1: "20", x2: "20", y2: "4" })) );
const ThreePhaseOutletIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("circle", { cx: "12", cy: "12", r: "10" }), React.createElement("line", { x1: "4", y1: "20", x2: "20", y2: "4" }), React.createElement("line", { x1: "4", y1: "4", x2: "20", y2: "20" }), React.createElement("line", { x1: "2", y1: "12", x2: "22", y2: "12" })) );
const Socket16ATPIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("circle", { cx: "12", cy: "12", r: "10" }), React.createElement("line", { x1: "4", y1: "20", x2: "20", y2: "4" }), React.createElement("line", { x1: "4", y1: "4", x2: "20", y2: "20" }), React.createElement("line", { x1: "2", y1: "12", x2: "22", y2: "12" }), React.createElement("circle", { cx: "12", cy: "17", r: "1.5", fill: "currentColor" })) );
const GeyserOutletIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("circle", { cx: "12", cy: "12", r: "10", fill: "none" }), React.createElement("path", { d: "M2 12 A 10 10 0 0 0 22 12 Z", fill: "currentColor" })) );
const TvOutletIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: "2", fill: "none", className: className }, React.createElement("rect", { x: "4", y: "4", width: "16", height: "16" }), React.createElement("text", { x: "12", y: "12", textAnchor: "middle", dy: ".3em", fontSize: "10", fill: "currentColor" }, "TV")) );
const ManholeIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("rect", { x: "2", y: "2", width: "20", height: "20" }), React.createElement("path", { d: "M2 2 L 22 22" }), React.createElement("path", { d: "M22 2 L 2 22" })) );
const DistributionBoardIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", className: className }, React.createElement("rect", { x: "2", y: "7", width: "20", height: "10", fill: "currentColor" })) );
const TelephoneBoardIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("rect", { x: "2", y: "7", width: "20", height: "10", fill: "none" }), React.createElement("path", { d: "M2 7 H 12 V 17 H 2 Z", fill: "currentColor" })) );
const AcControllerBoxIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: "2", fill: "none", className: className }, React.createElement("rect", { x: "4", y: "4", width: "16", height: "16" }), React.createElement("text", { x: "12", y: "12", textAnchor: "middle", dy: ".3em", fontSize: "8", fill: "currentColor" }, "AC")) );
const BreakGlassUnitIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: "2", fill: "none", className: className }, React.createElement("circle", { cx: "12", cy: "12", r: "10" }), React.createElement("text", { x: "12", y: "12", textAnchor: "middle", dy: ".3em", fontSize: "8", fill: "currentColor" }, "BG")) );
const Drawbox50Icon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: "2", fill: "none", className: className }, React.createElement("path", { d: "M12 2 L 21 7 V 17 L 12 22 L 3 17 V 7 Z" }), React.createElement("circle", { cx: "12", cy: "12", r: "2", fill: "currentColor" })) );
const Drawbox100Icon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: "2", fill: "none", className: className }, React.createElement("path", { d: "M12 2 L 21 7 V 17 L 12 22 L 3 17 V 7 Z" })) );
const WorkstationOutletIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: "2", className: className }, React.createElement("rect", { x: "2", y: "7", width: "20", height: "10", fill: "none" }), React.createElement("path", { d: "M2 7 H 12 V 17 H 2 Z", fill: "currentColor" }), React.createElement("text", { x: "17", y: "12", textAnchor: "middle", dy: ".3em", fontSize: "10", fill: "currentColor", strokeWidth: "1" }, "A")) );
const CctvCameraIcon = ({ className }) => ( React.createElement("svg", { viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: "2", fill: "none", className: className }, React.createElement("rect", { x: "2", y: "7", width: "14", height: "10" }), React.createElement("path", { d: "M16 12 L 22 9 L 22 15 Z" })) );

export const EquipmentIcon = ({ type, className = "h-5 w-5" }) => {
  switch (type) {
    case EquipmentType.RMU: return React.createElement(RMUIcon, { className: className });
    case EquipmentType.SUBSTATION: return React.createElement(SubstationIcon, { className: className });
    case EquipmentType.MAIN_BOARD: return React.createElement(MainBoardIcon, { className: className });
    case EquipmentType.SUB_BOARD: return React.createElement(SubBoardIcon, { className: className });
    case EquipmentType.GENERATOR: return React.createElement(GeneratorIcon, { className: className });
    case EquipmentType.POLE_LIGHT: return React.createElement(PoleLightIcon, { className: className });
    case EquipmentType.INVERTER: return React.createElement(InverterIcon, { className: className });
    case EquipmentType.DC_COMBINER: return React.createElement(DCCombinerIcon, { className: className });
    case EquipmentType.AC_DISCONNECT: return React.createElement(ACDisconnectIcon, { className: className });

    // Line Shop Icons
    case EquipmentType.GENERAL_LIGHT_SWITCH: return React.createElement(GeneralLightSwitchIcon, { className: className });
    case EquipmentType.DIMMER_SWITCH: return React.createElement(DimmerSwitchIcon, { className: className });
    case EquipmentType.MOTION_SENSOR: return React.createElement(MotionSensorIcon, { className: className });
    case EquipmentType.TWO_WAY_LIGHT_SWITCH: return React.createElement(TwoWayLightSwitchIcon, { className: className });
    case EquipmentType.WATERTIGHT_LIGHT_SWITCH: return React.createElement(WatertightLightSwitchIcon, { className: className });
    case EquipmentType.LED_STRIP_LIGHT: return React.createElement(LedStripLightIcon, { className: className });
    case EquipmentType.FLUORESCENT_2_TUBE: return React.createElement(Fluorescent2TubeIcon, { className: className });
    case EquipmentType.FLUORESCENT_1_TUBE: return React.createElement(Fluorescent1TubeIcon, { className: className });
    case EquipmentType.CEILING_FLOODLIGHT: return React.createElement(CeilingFloodlightIcon, { className: className });
    case EquipmentType.CEILING_LIGHT: return React.createElement(CeilingLightIcon, { className: className });
    case EquipmentType.POLE_MOUNTED_LIGHT: return React.createElement(PoleMountedLightIcon, { className: className });
    case EquipmentType.WALL_MOUNTED_LIGHT: return React.createElement(WallMountedLightIcon, { className: className });
    case EquipmentType.RECESSED_LIGHT_600: return React.createElement(RecessedLight600Icon, { className: className });
    case EquipmentType.RECESSED_LIGHT_1200: return React.createElement(RecessedLight1200Icon, { className: className });
    case EquipmentType.FLOODLIGHT: return React.createElement(FloodlightIcon, { className: className });
    case EquipmentType.PHOTO_CELL: return React.createElement(PhotoCellIcon, { className: className });
    case EquipmentType.FLUSH_FLOOR_OUTLET: return React.createElement(FlushFloorOutletIcon, { className: className });
    case EquipmentType.BOX_FLUSH_FLOOR: return React.createElement(BoxFlushFloorIcon, { className: className });
    case EquipmentType.SOCKET_16A: return React.createElement(Socket16AIcon, { className: className });
    case EquipmentType.SOCKET_DOUBLE: return React.createElement(SocketDoubleIcon, { className: className });
    case EquipmentType.CLEAN_POWER_OUTLET: return React.createElement(CleanPowerOutletIcon, { className: className });
    case EquipmentType.EMERGENCY_SOCKET: return React.createElement(EmergencySocketIcon, { className: className });
    case EquipmentType.UPS_SOCKET: return React.createElement(UpsSocketIcon, { className: className });
    case EquipmentType.DATA_SOCKET: return React.createElement(DataSocketIcon, { className: className });
    case EquipmentType.TELEPHONE_OUTLET: return React.createElement(TelephoneOutletIcon, { className: className });
    case EquipmentType.SINGLE_PHASE_OUTLET: return React.createElement(SinglePhaseOutletIcon, { className: className });
    case EquipmentType.THREE_PHASE_OUTLET: return React.createElement(ThreePhaseOutletIcon, { className: className });
    case EquipmentType.SOCKET_16A_TP: return React.createElement(Socket16ATPIcon, { className: className });
    case EquipmentType.GEYSER_OUTLET: return React.createElement(GeyserOutletIcon, { className: className });
    case EquipmentType.TV_OUTLET: return React.createElement(TvOutletIcon, { className: className });
    case EquipmentType.MANHOLE: return React.createElement(ManholeIcon, { className: className });
    case EquipmentType.DISTRIBUTION_BOARD: return React.createElement(DistributionBoardIcon, { className: className });
    case EquipmentType.TELEPHONE_BOARD: return React.createElement(TelephoneBoardIcon, { className: className });
    case EquipmentType.AC_CONTROLLER_BOX: return React.createElement(AcControllerBoxIcon, { className: className });
    case EquipmentType.BREAK_GLASS_UNIT: return React.createElement(BreakGlassUnitIcon, { className: className });
    case EquipmentType.DRAWBOX_50: return React.createElement(Drawbox50Icon, { className: className });
    case EquipmentType.DRAWBOX_100: return React.createElement(Drawbox100Icon, { className: className });
    case EquipmentType.WORKSTATION_OUTLET: return React.createElement(WorkstationOutletIcon, { className: className });
    case EquipmentType.CCTV_CAMERA: return React.createElement(CctvCameraIcon, { className: className });
    default:
      return null;
  }
};
