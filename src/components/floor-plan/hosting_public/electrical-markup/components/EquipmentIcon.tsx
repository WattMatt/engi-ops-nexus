import React from 'react';
import { EquipmentType } from '../types';

interface EquipmentIconProps {
  type: EquipmentType;
  className?: string;
}

// Base Icons
const RMUIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /></svg> );
const SubstationIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="1" y="5" width="22" height="14" rx="2" ry="2" /><circle cx="8" cy="12" r="3" /><circle cx="16" cy="12" r="3" /></svg> );
const MainBoardIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="1" y="5" width="22" height="14" rx="2" ry="2" fill="none" stroke="currentColor" /><path d="M1 19 L23 5 L23 19 Z" fill="currentColor" stroke="currentColor" /></svg> );
const SubBoardIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="5" width="18" height="14" rx="2" ry="2" /><line x1="3" y1="19" x2="21" y2="5" /></svg> );
const GeneratorIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="9" /><text x="12" y="12" textAnchor="middle" dy=".3em" fontSize="12" fill="currentColor">G</text></svg> );
const PoleLightIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="9" /><line x1="17.65" y1="6.35" x2="6.35" y2="17.65" /><line x1="17.65" y1="17.65" x2="6.35" y2="6.35" /></svg> );

// PV Icons
const InverterIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="7" width="18" height="10" rx="1" /><path d="M7 10h2" /><path d="M7 14h2" /><path d="M15 12c.83.5 1.17.5 2 0" /></svg> );
const DCCombinerIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="4" y="4" width="16" height="16" rx="1" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="12" y1="8" x2="12" y2="16" /></svg> );
const ACDisconnectIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="4" y="4" width="16" height="16" rx="1" /><line x1="8" y1="16" x2="16" y2="8" /></svg> );

// Line Shop Icons (omitted for brevity, assume they are unchanged)
// ... all line shop icons ...
const GeneralLightSwitchIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="12" cy="12" r="8" /></svg> );
const DimmerSwitchIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={className}><circle cx="12" cy="12" r="8" fill="none" /><text x="12" y="12" textAnchor="middle" dy=".3em" fontSize="10" fill="currentColor">D</text></svg> );
const MotionSensorIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={className}><circle cx="12" cy="12" r="8" fill="currentColor" /><text x="12" y="12" textAnchor="middle" dy=".3em" fontSize="10" fill="white">M</text></svg> );
const TwoWayLightSwitchIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="currentColor" className={className}><circle cx="12" cy="12" r="8" /></svg> );
const WatertightLightSwitchIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" className={className}><circle cx="12" cy="12" r="10" /><text x="12" y="12" textAnchor="middle" dy=".3em" fontSize="8" fill="currentColor">WT</text></svg> );
const LedStripLightIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="4" strokeLinecap="round" className={className}><path strokeDasharray="8, 4" d="M2 12 H 22" /></svg> );
const Fluorescent2TubeIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect x="1" y="8" width="22" height="8" /><circle cx="12" cy="12" r="4" /><path d="M1 12H8" /><path d="M16 12H23" /></svg> );
const Fluorescent1TubeIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect x="4" y="8" width="16" height="8" /><circle cx="12" cy="12" r="4" /></svg> );
const CeilingFloodlightIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect x="4" y="4" width="16" height="16" /><line x1="4" y1="4" x2="16" y2="16" /></svg> );
const CeilingLightIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="12" cy="12" r="10" /></svg> );
const PoleMountedLightIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="12" cy="12" r="10" /><path d="M12 2V22" /><path d="M2 12H22" /></svg> );
const WallMountedLightIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" className={className}><path d="M12 2 V 22" /><path d="M12 12 A 8 8 0 0 1 12 20" fill="none" /><path d="M12 12 A 8 8 0 0 0 12 4" fill="none" /></svg> );
const RecessedLight600Icon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect x="1" y="1" width="22" height="22" /><rect x="5" y="5" width="14" height="14" /></svg> );
const RecessedLight1200Icon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect x="1" y="6" width="22" height="12" /><rect x="3" y="8" width="18" height="8" /></svg> );
const FloodlightIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M18 18 A 12 12 0 0 0 6 6" /><path d="M6 18 V 6 H 18" /><path d="M12 12 H 22" /></svg> );
const PhotoCellIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" className={className}><circle cx="12" cy="12" r="10" /><text x="12" y="12" textAnchor="middle" dy=".3em" fontSize="8" fill="currentColor">PC</text></svg> );
const FlushFloorOutletIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={className}><rect x="4" y="4" width="16" height="16" fill="none" /><circle cx="12" cy="12" r="2" fill="currentColor" /></svg> );
const BoxFlushFloorIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect x="4" y="4" width="16" height="16" /><path d="M4 4 L 20 20" /><path d="M20 4 L 4 20" /></svg> );
const Socket16AIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M12 2 A 10 10 0 0 1 12 22 Z" /></svg> );
const SocketDoubleIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" className={className}><path d="M12 2 A 10 10 0 0 1 12 22 Z" /></svg> );
const CleanPowerOutletIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={className}><path fill="currentColor" d="M12 2 A 10 10 0 0 1 12 22 Z" /></svg> );
const EmergencySocketIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1" className={className}><path fill="currentColor" d="M12 2 A 10 10 0 0 1 12 22 Z" /><path stroke="white" strokeWidth="1.5" d="M12 5 v14 m-7-7 h14 m-5-5 l10 10 m-10 0 l10-10" /></svg> );
const UpsSocketIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={className}><path fill="currentColor" d="M12 2 A 10 10 0 0 1 12 22 Z" /></svg> );
const DataSocketIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" className={className}><path d="M12 2 L 22 22 L 2 22 Z" /></svg> );
const TelephoneOutletIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M12 2 L 22 22 L 2 22 Z" /></svg> );
const SinglePhaseOutletIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="12" cy="12" r="10" /><line x1="4" y1="20" x2="20" y2="4" /></svg> );
const ThreePhaseOutletIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="12" cy="12" r="10" /><line x1="4" y1="20" x2="20" y2="4" /><line x1="4" y1="4" x2="20" y2="20" /><line x1="2" y1="12" x2="22" y2="12" /></svg> );
const Socket16ATPIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="12" cy="12" r="10" /><line x1="4" y1="20" x2="20" y2="4" /><line x1="4" y1="4" x2="20" y2="20" /><line x1="2" y1="12" x2="22" y2="12" /><circle cx="12" cy="17" r="1.5" fill="currentColor" /></svg> );
const GeyserOutletIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={className}><circle cx="12" cy="12" r="10" fill="none" /><path d="M2 12 A 10 10 0 0 0 22 12 Z" fill="currentColor" /></svg> );
const TvOutletIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" className={className}><rect x="4" y="4" width="16" height="16" /><text x="12" y="12" textAnchor="middle" dy=".3em" fontSize="10" fill="currentColor">TV</text></svg> );
const ManholeIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect x="2" y="2" width="20" height="20" /><path d="M2 2 L 22 22" /><path d="M22 2 L 2 22" /></svg> );
const DistributionBoardIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" className={className}><rect x="2" y="7" width="20" height="10" fill="currentColor" /></svg> );
const TelephoneBoardIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={className}><rect x="2" y="7" width="20" height="10" fill="none" /><path d="M2 7 H 12 V 17 H 2 Z" fill="currentColor" /></svg> );
const AcControllerBoxIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" className={className}><rect x="4" y="4" width="16" height="16" /><text x="12" y="12" textAnchor="middle" dy=".3em" fontSize="8" fill="currentColor">AC</text></svg> );
const BreakGlassUnitIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" className={className}><circle cx="12" cy="12" r="10" /><text x="12" y="12" textAnchor="middle" dy=".3em" fontSize="8" fill="currentColor">BG</text></svg> );
const Drawbox50Icon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" className={className}><path d="M12 2 L 21 7 V 17 L 12 22 L 3 17 V 7 Z" /><circle cx="12" cy="12" r="2" fill="currentColor" /></svg> );
const Drawbox100Icon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" className={className}><path d="M12 2 L 21 7 V 17 L 12 22 L 3 17 V 7 Z" /></svg> );
const WorkstationOutletIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={className}><rect x="2" y="7" width="20" height="10" fill="none" /><path d="M2 7 H 12 V 17 H 2 Z" fill="currentColor" /><text x="17" y="12" textAnchor="middle" dy=".3em" fontSize="10" fill="currentColor" strokeWidth="1">A</text></svg> );
const CctvCameraIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" className={className}><rect x="2" y="7" width="14" height="10" /><path d="M16 12 L 22 9 L 22 15 Z" /></svg> );

export const EquipmentIcon: React.FC<EquipmentIconProps> = ({ type, className = "h-5 w-5" }) => {
  switch (type) {
    case EquipmentType.RMU: return <RMUIcon className={className} />;
    case EquipmentType.SUBSTATION: return <SubstationIcon className={className} />;
    case EquipmentType.MAIN_BOARD: return <MainBoardIcon className={className} />;
    case EquipmentType.SUB_BOARD: return <SubBoardIcon className={className} />;
    case EquipmentType.GENERATOR: return <GeneratorIcon className={className} />;
    case EquipmentType.POLE_LIGHT: return <PoleLightIcon className={className} />;
    case EquipmentType.INVERTER: return <InverterIcon className={className} />;
    case EquipmentType.DC_COMBINER: return <DCCombinerIcon className={className} />;
    case EquipmentType.AC_DISCONNECT: return <ACDisconnectIcon className={className} />;

    // Line Shop Icons
    case EquipmentType.GENERAL_LIGHT_SWITCH: return <GeneralLightSwitchIcon className={className} />;
    case EquipmentType.DIMMER_SWITCH: return <DimmerSwitchIcon className={className} />;
    case EquipmentType.MOTION_SENSOR: return <MotionSensorIcon className={className} />;
    case EquipmentType.TWO_WAY_LIGHT_SWITCH: return <TwoWayLightSwitchIcon className={className} />;
    case EquipmentType.WATERTIGHT_LIGHT_SWITCH: return <WatertightLightSwitchIcon className={className} />;
    case EquipmentType.LED_STRIP_LIGHT: return <LedStripLightIcon className={className} />;
    case EquipmentType.FLUORESCENT_2_TUBE: return <Fluorescent2TubeIcon className={className} />;
    case EquipmentType.FLUORESCENT_1_TUBE: return <Fluorescent1TubeIcon className={className} />;
    case EquipmentType.CEILING_FLOODLIGHT: return <CeilingFloodlightIcon className={className} />;
    case EquipmentType.CEILING_LIGHT: return <CeilingLightIcon className={className} />;
    case EquipmentType.POLE_MOUNTED_LIGHT: return <PoleMountedLightIcon className={className} />;
    case EquipmentType.WALL_MOUNTED_LIGHT: return <WallMountedLightIcon className={className} />;
    case EquipmentType.RECESSED_LIGHT_600: return <RecessedLight600Icon className={className} />;
    case EquipmentType.RECESSED_LIGHT_1200: return <RecessedLight1200Icon className={className} />;
    case EquipmentType.FLOODLIGHT: return <FloodlightIcon className={className} />;
    case EquipmentType.PHOTO_CELL: return <PhotoCellIcon className={className} />;
    case EquipmentType.FLUSH_FLOOR_OUTLET: return <FlushFloorOutletIcon className={className} />;
    case EquipmentType.BOX_FLUSH_FLOOR: return <BoxFlushFloorIcon className={className} />;
    case EquipmentType.SOCKET_16A: return <Socket16AIcon className={className} />;
    case EquipmentType.SOCKET_DOUBLE: return <SocketDoubleIcon className={className} />;
    case EquipmentType.CLEAN_POWER_OUTLET: return <CleanPowerOutletIcon className={className} />;
    case EquipmentType.EMERGENCY_SOCKET: return <EmergencySocketIcon className={className} />;
    case EquipmentType.UPS_SOCKET: return <UpsSocketIcon className={className} />;
    case EquipmentType.DATA_SOCKET: return <DataSocketIcon className={className} />;
    case EquipmentType.TELEPHONE_OUTLET: return <TelephoneOutletIcon className={className} />;
    case EquipmentType.SINGLE_PHASE_OUTLET: return <SinglePhaseOutletIcon className={className} />;
    case EquipmentType.THREE_PHASE_OUTLET: return <ThreePhaseOutletIcon className={className} />;
    case EquipmentType.SOCKET_16A_TP: return <Socket16ATPIcon className={className} />;
    case EquipmentType.GEYSER_OUTLET: return <GeyserOutletIcon className={className} />;
    case EquipmentType.TV_OUTLET: return <TvOutletIcon className={className} />;
    case EquipmentType.MANHOLE: return <ManholeIcon className={className} />;
    case EquipmentType.DISTRIBUTION_BOARD: return <DistributionBoardIcon className={className} />;
    case EquipmentType.TELEPHONE_BOARD: return <TelephoneBoardIcon className={className} />;
    case EquipmentType.AC_CONTROLLER_BOX: return <AcControllerBoxIcon className={className} />;
    case EquipmentType.BREAK_GLASS_UNIT: return <BreakGlassUnitIcon className={className} />;
    case EquipmentType.DRAWBOX_50: return <Drawbox50Icon className={className} />;
    case EquipmentType.DRAWBOX_100: return <Drawbox100Icon className={className} />;
    case EquipmentType.WORKSTATION_OUTLET: return <WorkstationOutletIcon className={className} />;
    case EquipmentType.CCTV_CAMERA: return <CctvCameraIcon className={className} />;
    default:
      return null;
  }
};