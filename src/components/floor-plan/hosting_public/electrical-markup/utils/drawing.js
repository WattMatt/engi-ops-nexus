import { EquipmentType } from '../types.js';
import { TOOL_COLORS, EQUIPMENT_REAL_WORLD_SIZES } from '../constants.js';
import { getCableColor, getZoneColor, getContainmentStyle } from './styleUtils.js';
import { isPointInPolygon } from './geometry.js';

// This function was originally inside Canvas.tsx
const drawEquipmentIcon = (
    ctx,
    item,
    isSelected,
    zoom,
    scaleInfo
) => {
    ctx.save();
    ctx.translate(item.position.x, item.position.y);
    ctx.rotate(item.rotation * Math.PI / 180);
    
    let realSizeInMeters;
    if (item.type === EquipmentType.LED_STRIP_LIGHT || item.type === EquipmentType.RECESSED_LIGHT_1200 || item.type === EquipmentType.FLUORESCENT_2_TUBE) {
        realSizeInMeters = { w: 1.2, h: 0.15 };
    } else if (item.type === EquipmentType.RECESSED_LIGHT_600) {
        realSizeInMeters = { w: 0.6, h: 0.6 };
    } else {
        realSizeInMeters = EQUIPMENT_REAL_WORLD_SIZES[item.type] || 0.5;
    }

    let size_w, size_h;
    const fixedSize = 12 / zoom;

    if (scaleInfo.ratio) {
        if (typeof realSizeInMeters === 'number') {
            size_w = size_h = realSizeInMeters / scaleInfo.ratio;
        } else {
            size_w = realSizeInMeters.w / scaleInfo.ratio;
            size_h = realSizeInMeters.h / scaleInfo.ratio;
        }
    } else {
        size_w = size_h = fixedSize;
        if (typeof realSizeInMeters !== 'number') {
            size_w = fixedSize * (realSizeInMeters.w / (realSizeInMeters.w > 1 ? 1.2 : 0.6));
            size_h = fixedSize * (realSizeInMeters.h / 0.6);
        }
    }
    
    const size = Math.max(size_w, size_h); // For circle radius and general sizing

    const baseLineWidth = 1.5 / zoom;
    ctx.lineWidth = baseLineWidth;
    ctx.strokeStyle = isSelected ? '#34D399' : '#000000';
    ctx.fillStyle = '#000000';
    
    const font = (fontSize, weight = 'normal') => `${weight} ${fontSize / zoom}px sans-serif`;
    const drawText = (text, x, y, color = ctx.strokeStyle) => {
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
        ctx.fillStyle = '#000000';
    };
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Simplified drawing logic based on EquipmentIcon SVGs
    switch (item.type) {
        case EquipmentType.RMU: ctx.strokeRect(-size/2, -size/2, size, size); ctx.beginPath(); ctx.moveTo(-size/2, -size/6); ctx.lineTo(size/2, -size/6); ctx.stroke(); break;
        case EquipmentType.SUBSTATION: ctx.strokeRect(-size_w/2, -size_h/2, size_w, size_h); ctx.beginPath(); ctx.arc(-size_w/4, 0, size_h/4, 0, 2 * Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(size_w/4, 0, size_h/4, 0, 2 * Math.PI); ctx.stroke(); break;
        case EquipmentType.MAIN_BOARD: ctx.strokeRect(-size_w/2, -size_h/2, size_w, size_h); ctx.beginPath(); ctx.moveTo(-size_w/2, size_h/2); ctx.lineTo(size_w/2, -size_h/2); ctx.lineTo(size_w/2, size_h/2); ctx.closePath(); ctx.fill(); break;
        case EquipmentType.SUB_BOARD: ctx.strokeRect(-size_w/2, -size_h/2, size_w, size_h); ctx.beginPath(); ctx.moveTo(-size_w/2, size_h/2); ctx.lineTo(size_w/2, -size_h/2); ctx.stroke(); break;
        case EquipmentType.GENERATOR: ctx.beginPath(); ctx.arc(0, 0, size/2, 0, 2*Math.PI); ctx.stroke(); ctx.font = font(size*0.8); drawText("G", 0, 0); break;
        case EquipmentType.POLE_LIGHT: ctx.beginPath(); ctx.arc(0, 0, size/2, 0, 2*Math.PI); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-size/3, -size/3); ctx.lineTo(size/3, size/3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(size/3, -size/3); ctx.lineTo(-size/3, size/3); ctx.stroke(); break;
        case EquipmentType.INVERTER: ctx.strokeRect(-size/2, -size/2.5, size, size/1.25); ctx.font = font(size*0.6); drawText("~", size*0.1, 0); drawText("=", -size*0.2, 0); break;
        case EquipmentType.DC_COMBINER: ctx.strokeRect(-size/2, -size/2, size, size); ctx.font = font(size, 'bold'); drawText("+", 0, 0); break;
        case EquipmentType.AC_DISCONNECT: ctx.strokeRect(-size/2, -size/2, size, size); ctx.beginPath(); ctx.moveTo(-size/3, -size/3); ctx.lineTo(size/3, size/3); ctx.stroke(); break;
        case EquipmentType.GENERAL_LIGHT_SWITCH: ctx.beginPath(); ctx.arc(0,0,size/2,0,2*Math.PI); ctx.stroke(); break;
        case EquipmentType.DIMMER_SWITCH: ctx.beginPath(); ctx.arc(0,0,size/2,0,2*Math.PI); ctx.stroke(); ctx.font = font(size*0.7); drawText("D", 0,0); break;
        case EquipmentType.MOTION_SENSOR: ctx.beginPath(); ctx.arc(0,0,size/2,0,2*Math.PI); ctx.fill(); ctx.font = font(size*0.7); drawText("M", 0,0,'white'); break;
        case EquipmentType.TWO_WAY_LIGHT_SWITCH: ctx.beginPath(); ctx.arc(0,0,size/2,0,2*Math.PI); ctx.fill(); break;
        case EquipmentType.WATERTIGHT_LIGHT_SWITCH: ctx.beginPath(); ctx.arc(0,0,size/2,0,2*Math.PI); ctx.stroke(); ctx.font = font(size*0.5); drawText("WT", 0,0); break;
        case EquipmentType.LED_STRIP_LIGHT: ctx.lineWidth = baseLineWidth * 2; ctx.beginPath(); ctx.moveTo(-size_w/2, 0); ctx.lineTo(size_w/2, 0); ctx.setLineDash([5/zoom, 3/zoom]); ctx.stroke(); ctx.setLineDash([]); break;
        case EquipmentType.FLUORESCENT_2_TUBE: ctx.strokeRect(-size_w/2, -size_h/2, size_w, size_h); ctx.beginPath(); ctx.arc(0,0,size_h/1.5,0,2*Math.PI); ctx.stroke(); break;
        case EquipmentType.FLUORESCENT_1_TUBE: ctx.strokeRect(-size_w/2, -size_h/2, size_w, size_h); ctx.beginPath(); ctx.arc(0,0,size_h/1.5,0,2*Math.PI); ctx.stroke(); break;
        case EquipmentType.CEILING_FLOODLIGHT: ctx.strokeRect(-size/2, -size/2, size, size); ctx.beginPath(); ctx.moveTo(-size/2, -size/2); ctx.lineTo(0, size/2); ctx.stroke(); break;
        case EquipmentType.CEILING_LIGHT: ctx.beginPath(); ctx.arc(0,0,size/2,0,2*Math.PI); ctx.stroke(); break;
        case EquipmentType.POLE_MOUNTED_LIGHT: ctx.beginPath(); ctx.arc(0,0,size/2,0,2*Math.PI); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0,-size/2); ctx.lineTo(0,size/2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-size/2,0); ctx.lineTo(size/2,0); ctx.stroke(); break;
        case EquipmentType.WALL_MOUNTED_LIGHT: ctx.beginPath(); ctx.arc(0,0,size/2, -Math.PI/2, Math.PI/2); ctx.fill(); ctx.beginPath(); ctx.moveTo(0,-size/2); ctx.lineTo(0,size/2); ctx.stroke(); break;
        case EquipmentType.RECESSED_LIGHT_600: ctx.strokeRect(-size_w/2,-size_h/2,size_w,size_h); ctx.strokeRect(-size_w/4,-size_h/4,size_w/2,size_h/2); break;
        case EquipmentType.RECESSED_LIGHT_1200: ctx.strokeRect(-size_w/2,-size_h/2,size_w,size_h); ctx.strokeRect(-size_w/2 + 5/zoom, -size_h/2 + 3/zoom, size_w - 10/zoom, size_h - 6/zoom); break;
        case EquipmentType.FLOODLIGHT: ctx.beginPath(); ctx.arc(-size/2, size/2, size, Math.PI*1.5, 0); ctx.lineTo(size/2, size/2); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0,size/2); ctx.lineTo(size*1.2, size/2); ctx.stroke(); break;
        case EquipmentType.PHOTO_CELL: ctx.beginPath(); ctx.arc(0,0,size/2,0,2*Math.PI); ctx.stroke(); ctx.font=font(size*0.5); drawText("PC",0,0); break;
        case EquipmentType.FLUSH_FLOOR_OUTLET: ctx.strokeRect(-size/2,-size/2,size,size); ctx.beginPath(); ctx.arc(0,0,size/8,0,2*Math.PI); ctx.fill(); break;
        case EquipmentType.BOX_FLUSH_FLOOR: ctx.strokeRect(-size/2,-size/2,size,size); ctx.beginPath(); ctx.moveTo(-size/2, -size/2); ctx.lineTo(size/2,size/2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(size/2,-size/2); ctx.lineTo(-size/2,size/2); ctx.stroke(); break;
        case EquipmentType.SOCKET_16A: ctx.beginPath(); ctx.arc(0,0,size/2, -Math.PI/2, Math.PI/2, true); ctx.closePath(); ctx.stroke(); break;
        case EquipmentType.SOCKET_DOUBLE: ctx.beginPath(); ctx.arc(0,0,size/2, -Math.PI/2, Math.PI/2, true); ctx.closePath(); ctx.fill(); break;
        case EquipmentType.CLEAN_POWER_OUTLET: ctx.beginPath(); ctx.arc(0,0,size/2, -Math.PI/2, Math.PI/2, true); ctx.closePath(); ctx.fillStyle = '#000000'; ctx.fill(); break;
        case EquipmentType.EMERGENCY_SOCKET: ctx.beginPath(); ctx.arc(0,0,size/2, -Math.PI/2, Math.PI/2, true); ctx.closePath(); ctx.fillStyle = '#000000'; ctx.fill(); break;
        case EquipmentType.UPS_SOCKET: ctx.beginPath(); ctx.arc(0,0,size/2, -Math.PI/2, Math.PI/2, true); ctx.closePath(); ctx.fillStyle = '#000000'; ctx.fill(); break;
        case EquipmentType.DATA_SOCKET: ctx.beginPath(); ctx.moveTo(-size/2,size/2); ctx.lineTo(0,-size/2); ctx.lineTo(size/2,size/2); ctx.closePath(); ctx.fill(); break;
        case EquipmentType.TELEPHONE_OUTLET: ctx.beginPath(); ctx.moveTo(-size/2,size/2); ctx.lineTo(0,-size/2); ctx.lineTo(size/2,size/2); ctx.closePath(); ctx.stroke(); break;
        case EquipmentType.SINGLE_PHASE_OUTLET: ctx.beginPath(); ctx.arc(0,0,size/2,0,2*Math.PI); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-size/3,size/3); ctx.lineTo(size/3,-size/3); ctx.stroke(); break;
        case EquipmentType.THREE_PHASE_OUTLET: ctx.beginPath(); ctx.arc(0,0,size/2,0,2*Math.PI); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-size/3,size/3); ctx.lineTo(size/3,-size/3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0,-size/2*0.8); ctx.lineTo(0,size/2*0.8); ctx.stroke(); break;
        case EquipmentType.SOCKET_16A_TP: ctx.beginPath(); ctx.arc(0,0,size/2,0,2*Math.PI); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-size/3,size/3); ctx.lineTo(size/3,-size/3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0,-size/2*0.8); ctx.lineTo(0,size/2*0.8); ctx.stroke(); ctx.beginPath(); ctx.arc(0,size/2*0.5, size/10, 0, 2*Math.PI); ctx.fill(); break;
        case EquipmentType.GEYSER_OUTLET: ctx.beginPath(); ctx.arc(0,0,size/2,0,Math.PI); ctx.fill(); ctx.beginPath(); ctx.arc(0,0,size/2,Math.PI, 2*Math.PI); ctx.stroke(); break;
        case EquipmentType.TV_OUTLET: ctx.strokeRect(-size/2, -size/2, size, size); ctx.font=font(size*0.7); drawText('TV',0,0); break;
        case EquipmentType.MANHOLE: ctx.strokeRect(-size/2,-size/2,size,size); ctx.beginPath(); ctx.moveTo(-size/2,-size/2); ctx.lineTo(size/2,size/2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(size/2,-size/2); ctx.lineTo(-size/2,size/2); ctx.stroke(); break;
        case EquipmentType.DISTRIBUTION_BOARD: ctx.fillRect(-size_w/2, -size_h/2, size_w, size_h); break;
        case EquipmentType.TELEPHONE_BOARD: ctx.strokeRect(-size_w/2, -size_h/2, size_w, size_h); ctx.fillRect(-size_w/2, -size_h/2, size_w/2, size_h); break;
        case EquipmentType.AC_CONTROLLER_BOX: ctx.strokeRect(-size/2,-size/2,size,size); ctx.font=font(size*0.7); drawText("AC", 0,0); break;
        case EquipmentType.BREAK_GLASS_UNIT: ctx.beginPath(); ctx.arc(0,0,size/2,0,2*Math.PI); ctx.stroke(); ctx.font=font(size*0.5); drawText("BG", 0,0); break;
        case EquipmentType.DRAWBOX_50: ctx.beginPath(); ctx.moveTo(0,-size/2); ctx.lineTo(size/2*0.866, -size/4); ctx.lineTo(size/2*0.866, size/4); ctx.lineTo(0,size/2); ctx.lineTo(-size/2*0.866, size/4); ctx.lineTo(-size/2*0.866, -size/4); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.arc(0,0,size/8,0,2*Math.PI); ctx.fill(); break;
        case EquipmentType.DRAWBOX_100: ctx.beginPath(); ctx.moveTo(0,-size/2); ctx.lineTo(size/2*0.866, -size/4); ctx.lineTo(size/2*0.866, size/4); ctx.lineTo(0,size/2); ctx.lineTo(-size/2*0.866, size/4); ctx.lineTo(-size/2*0.866, -size/4); ctx.closePath(); ctx.stroke(); break;
        case EquipmentType.WORKSTATION_OUTLET: ctx.strokeRect(-size_w/2, -size_h/2, size_w, size_h); ctx.fillRect(-size_w/2, -size_h/2, size_w/2, size_h); ctx.font=font(size_h*0.7); drawText("A", size_w/4, 0, 'white'); break;
        case EquipmentType.CCTV_CAMERA: ctx.strokeRect(-size/2, -size/2, size, size*0.7); ctx.beginPath(); ctx.arc(size/2, 0, size/4, 0, 2*Math.PI); ctx.stroke(); break;
        default:
          ctx.strokeRect(-size / 2, -size / 2, size, size);
          ctx.font = font(size * 0.6);
          drawText('?', 0, 0);
          break;
    }
    ctx.restore();
}

// This function was originally inside Canvas.tsx
const drawPvArray = (
    ctx,
    array,
    isPreview,
    pvPanelConfig,
    scaleInfo,
    roofMasks,
    zoom
) => {
    if (!pvPanelConfig || !scaleInfo.ratio) return;
    
    ctx.save();
    if (isPreview) {
        ctx.globalAlpha = 0.6;
    }
    ctx.translate(array.position.x, array.position.y);
    ctx.rotate(array.rotation * Math.PI / 180);

    const panelIsOnMask = roofMasks.find(mask => isPointInPolygon(array.position, mask.points));

    const pitch = panelIsOnMask ? panelIsOnMask.pitch : 0;
    const pitchRad = pitch * Math.PI / 180;

    let panelW_px = (pvPanelConfig.width / scaleInfo.ratio);
    let panelL_px = (pvPanelConfig.length / scaleInfo.ratio);
    
    // Adjust for projection based on pitch
    panelL_px *= Math.cos(pitchRad);
    
    const arrayPanelW = array.orientation === 'portrait' ? panelW_px : panelL_px;
    const arrayPanelL = array.orientation === 'portrait' ? panelL_px : panelW_px;
    
    const totalWidth = array.columns * arrayPanelW;
    const totalHeight = array.rows * arrayPanelL;

    ctx.strokeStyle = '#38bdf8'; // light-blue-400
    ctx.lineWidth = 1.5 / zoom;

    for (let r = 0; r < array.rows; r++) {
        for (let c = 0; c < array.columns; c++) {
            const x = c * arrayPanelW - totalWidth / 2;
            const y = r * arrayPanelL - totalHeight / 2;
            ctx.strokeRect(x, y, arrayPanelW, arrayPanelL);
        }
    }

    ctx.restore();
}

/**
 * Renders all saved markups onto a given canvas context.
 * Does not handle transforms (save/restore/translate/scale), expects the caller to set them up.
 */
function renderMarkupsToContext(ctx, params) {
    const { equipment, lines, zones, containment, scaleInfo, roofMasks, pvPanelConfig, pvArrays, zoom, selectedItemId } = params;

    // Draw Roof Masks
    roofMasks.forEach(mask => {
        ctx.beginPath();
        mask.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fillStyle = TOOL_COLORS.ROOF_MASK;
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1 / zoom;
        ctx.stroke();

        // Draw direction arrow
        if (mask.points.length > 1) {
            const centerX = mask.points.reduce((sum, p) => sum + p.x, 0) / mask.points.length;
            const centerY = mask.points.reduce((sum, p) => sum + p.y, 0) / mask.points.length;
            const angle = (mask.direction - 90) * Math.PI / 180; // Adjust for canvas coords
            const arrowLength = 20 / zoom;
            
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, -arrowLength / 2);
            ctx.lineTo(0, arrowLength / 2);
            ctx.lineTo(arrowLength * 0.7, 0);
            ctx.closePath();
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.fill();
            ctx.restore();
        }
    });
    
    // Draw existing PV Arrays
    if (pvPanelConfig && pvArrays) {
        pvArrays.forEach(array => drawPvArray(ctx, array, false, pvPanelConfig, scaleInfo, roofMasks, zoom));
    }
    
    // Draw containment
    containment.forEach(item => {
        ctx.beginPath();
        item.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        const style = getContainmentStyle(item.type, item.size);
        ctx.strokeStyle = style.color;
        ctx.lineWidth = 3 / zoom;
        ctx.setLineDash(style.dash.map(d => d / zoom));
        ctx.stroke();
        ctx.setLineDash([]);
    });

    // Draw lines
    lines.forEach(line => {
      ctx.beginPath();
      line.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      if (line.type === 'mv') ctx.strokeStyle = TOOL_COLORS.LINE_MV;
      else if (line.type === 'dc') ctx.strokeStyle = TOOL_COLORS.LINE_DC;
      else ctx.strokeStyle = line.cableType ? getCableColor(line.cableType) : TOOL_COLORS.LINE_LV;
      ctx.lineWidth = 3 / zoom;
      ctx.stroke();
    });
    
    // Draw zones
    zones.forEach(zone => {
      ctx.beginPath();
      zone.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.fillStyle = `${zone.color}40`; // Use 25% alpha for the fill
      ctx.fill();
      if(zone.id === selectedItemId) {
          ctx.strokeStyle = '#34D399'; // Emerald-400 for selection glow
          ctx.lineWidth = 3 / zoom;
          ctx.stroke();

          // Draw resize handles
          zone.points.forEach(p => {
              ctx.beginPath();
              ctx.arc(p.x, p.y, 5 / zoom, 0, 2 * Math.PI);
              ctx.fillStyle = '#FFFFFF';
              ctx.fill();
              ctx.strokeStyle = '#34D399';
              ctx.lineWidth = 1.5 / zoom;
              ctx.stroke();
          });
      }
    });
    
    // Draw equipment
    equipment.forEach(item => drawEquipmentIcon(ctx, item, item.id === selectedItemId, zoom, scaleInfo));
}

export {
    drawEquipmentIcon,
    drawPvArray,
    renderMarkupsToContext
};
