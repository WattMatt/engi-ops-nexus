import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkServicesDocument {
  id: string;
  project_id: string;
  document_number: string;
  revision: string;
  document_date: string;
  created_at: string;
  notes?: string | null;
  building_calculation_type?: string | null;
  project_area?: number | null;
  climatic_zone?: string | null;
  climatic_zone_city?: string | null;
  va_per_sqm?: number | null;
  diversity_factor?: number | null;
  future_expansion_factor?: number | null;
  maximum_demand?: number | null;
  total_connected_load?: number | null;
  primary_voltage?: string | null;
  connection_size?: string | null;
  supply_authority?: string | null;
  tariff_structure?: string | null;
}

interface BulkServicesSection {
  id: string;
  document_id: string;
  section_number: string;
  section_title: string;
  content?: string | null;
  sort_order: number;
}

interface RequestBody {
  document: BulkServicesDocument;
  sections: BulkServicesSection[];
  projectName?: string;
  revision: string;
  companyDetails?: {
    companyName?: string;
    companyLogoUrl?: string;
  };
}

const METHOD_NAMES: Record<string, string> = {
  'sans_204': 'SANS 204 - Commercial/Retail',
  'sans_10142': 'SANS 10142-1 - General Buildings',
  'residential': 'Residential ADMD Method',
};

const COLORS = {
  primary: '#1e3a5f',
  secondary: '#4a90a4',
  text: '#333333',
  textLight: '#6b7280',
  border: '#e5e7eb',
  background: '#f9fafb',
};

// Climatic zone colors and data
const ZONE_COLORS: Record<string, string> = {
  '1': '#3b82f6', // Blue - Cold Interior
  '2': '#fbbf24', // Yellow - Temperate Interior
  '3': '#f97316', // Orange - Hot Interior
  '4': '#60a5fa', // Light Blue - Temperate Coastal
  '5': '#22c55e', // Green - Sub-tropical Coastal
  '6': '#eab308', // Yellow/Gold - Arid Interior
};

const ZONE_DATA: Record<string, { name: string; temp: string; description: string; examples: string }> = {
  '1': {
    name: 'Cold Interior',
    temp: '14-16°C mean annual',
    description: 'High altitude, cold winters, moderate summers',
    examples: 'Johannesburg, Bloemfontein'
  },
  '2': {
    name: 'Temperate Interior',
    temp: '16-18°C mean annual',
    description: 'Moderate climate, warm summers, mild winters',
    examples: 'Pretoria, Polokwane'
  },
  '3': {
    name: 'Hot Interior',
    temp: '18-22°C mean annual',
    description: 'Hot summers, warm winters, summer rainfall',
    examples: 'Makhado, Nelspruit'
  },
  '4': {
    name: 'Temperate Coastal',
    temp: '14-18°C mean annual',
    description: 'Moderate climate, winter rainfall, ocean influence',
    examples: 'Cape Town, Port Elizabeth'
  },
  '5': {
    name: 'Sub-tropical Coastal',
    temp: '18-22°C mean annual',
    description: 'Humid, warm year-round, high rainfall',
    examples: 'Durban, Richards Bay, East London'
  },
  '6': {
    name: 'Arid Interior',
    temp: '16-20°C mean annual',
    description: 'Very hot dry summers, cold nights, low rainfall',
    examples: 'Kimberley, Upington'
  },
};

// Generate professional SVG map of South Africa with climatic zones
function generateZoneMapSVG(selectedZone: string | null): string {
  const getZoneStyle = (zone: string) => {
    const isSelected = selectedZone === zone;
    return {
      opacity: isSelected ? '1' : '0.7',
      stroke: isSelected ? '#1e293b' : '#64748b',
      strokeWidth: isSelected ? '2.5' : '0.8',
      filter: isSelected ? 'url(#selectedGlow)' : 'none',
    };
  };
  
  // Accurate South Africa boundary paths by zone (simplified but recognizable)
  return `
    <svg viewBox="0 0 500 400" xmlns="http://www.w3.org/2000/svg" style="width: 100%; max-width: 480px; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <defs>
        <!-- Gradients for each zone -->
        <linearGradient id="zone1Grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3b82f6"/>
          <stop offset="100%" stop-color="#1d4ed8"/>
        </linearGradient>
        <linearGradient id="zone2Grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fbbf24"/>
          <stop offset="100%" stop-color="#d97706"/>
        </linearGradient>
        <linearGradient id="zone3Grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f97316"/>
          <stop offset="100%" stop-color="#c2410c"/>
        </linearGradient>
        <linearGradient id="zone4Grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#60a5fa"/>
          <stop offset="100%" stop-color="#3b82f6"/>
        </linearGradient>
        <linearGradient id="zone5Grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#22c55e"/>
          <stop offset="100%" stop-color="#15803d"/>
        </linearGradient>
        <linearGradient id="zone6Grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#eab308"/>
          <stop offset="100%" stop-color="#a16207"/>
        </linearGradient>
        
        <!-- Ocean gradient -->
        <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#f0f9ff"/>
          <stop offset="100%" stop-color="#e0f2fe"/>
        </linearGradient>
        
        <!-- Selected zone glow effect -->
        <filter id="selectedGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#1e3a5f" flood-opacity="0.4"/>
        </filter>
        
        <!-- Subtle shadow for depth -->
        <filter id="countryShadow">
          <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.15"/>
        </filter>
      </defs>
      
      <!-- Background -->
      <rect width="500" height="400" fill="url(#oceanGradient)"/>
      
      <!-- Decorative border -->
      <rect x="5" y="5" width="490" height="390" fill="none" stroke="#cbd5e1" stroke-width="1" rx="6"/>
      
      <!-- Country outline group with shadow -->
      <g filter="url(#countryShadow)">
        
        <!-- Zone 6: Arid Interior (Northern Cape interior) -->
        <path d="M60,200 L75,170 L95,145 L130,125 L165,115 L195,120 L215,140 L210,175 L185,210 L155,235 L120,250 L85,250 L60,230 Z" 
              fill="url(#zone6Grad)" opacity="${getZoneStyle('6').opacity}"
              stroke="${getZoneStyle('6').stroke}" stroke-width="${getZoneStyle('6').strokeWidth}" stroke-linejoin="round"
              ${selectedZone === '6' ? 'filter="url(#selectedGlow)"' : ''}/>
        
        <!-- Zone 4: Temperate Coastal (Western Cape coast) -->
        <path d="M35,235 L60,200 L60,230 L85,250 L95,280 L75,310 L50,325 L30,310 L25,275 Z" 
              fill="url(#zone4Grad)" opacity="${getZoneStyle('4').opacity}"
              stroke="${getZoneStyle('4').stroke}" stroke-width="${getZoneStyle('4').strokeWidth}" stroke-linejoin="round"
              ${selectedZone === '4' ? 'filter="url(#selectedGlow)"' : ''}/>
        
        <!-- Zone 4: Temperate Coastal (Southern coast extension) -->
        <path d="M95,280 L120,250 L155,235 L185,245 L215,260 L235,280 L200,305 L150,320 L100,315 L75,310 Z" 
              fill="url(#zone4Grad)" opacity="${getZoneStyle('4').opacity}"
              stroke="${getZoneStyle('4').stroke}" stroke-width="${getZoneStyle('4').strokeWidth}" stroke-linejoin="round"
              ${selectedZone === '4' ? 'filter="url(#selectedGlow)"' : ''}/>
        
        <!-- Zone 1: Cold Interior (Highveld - Gauteng/Free State) -->
        <path d="M215,140 L260,125 L295,130 L320,150 L315,185 L290,215 L255,235 L215,240 L185,210 L210,175 Z" 
              fill="url(#zone1Grad)" opacity="${getZoneStyle('1').opacity}"
              stroke="${getZoneStyle('1').stroke}" stroke-width="${getZoneStyle('1').strokeWidth}" stroke-linejoin="round"
              ${selectedZone === '1' ? 'filter="url(#selectedGlow)"' : ''}/>
        
        <!-- Zone 2: Temperate Interior (North-central) -->
        <path d="M165,115 L195,95 L235,80 L280,75 L320,85 L350,105 L345,135 L320,150 L295,130 L260,125 L215,140 L195,120 Z" 
              fill="url(#zone2Grad)" opacity="${getZoneStyle('2').opacity}"
              stroke="${getZoneStyle('2').stroke}" stroke-width="${getZoneStyle('2').strokeWidth}" stroke-linejoin="round"
              ${selectedZone === '2' ? 'filter="url(#selectedGlow)"' : ''}/>
        
        <!-- Zone 3: Hot Interior (Limpopo/Mpumalanga) -->
        <path d="M320,85 L365,60 L410,55 L450,75 L465,115 L455,160 L420,195 L380,210 L345,190 L345,135 L350,105 Z" 
              fill="url(#zone3Grad)" opacity="${getZoneStyle('3').opacity}"
              stroke="${getZoneStyle('3').stroke}" stroke-width="${getZoneStyle('3').strokeWidth}" stroke-linejoin="round"
              ${selectedZone === '3' ? 'filter="url(#selectedGlow)"' : ''}/>
        
        <!-- Zone 5: Sub-tropical Coastal (KZN/Eastern Cape coast) -->
        <path d="M345,190 L380,210 L420,195 L455,160 L475,195 L470,245 L455,295 L420,330 L370,350 L320,345 L280,320 L260,290 L290,265 L315,240 L290,215 L315,185 L345,190 Z" 
              fill="url(#zone5Grad)" opacity="${getZoneStyle('5').opacity}"
              stroke="${getZoneStyle('5').stroke}" stroke-width="${getZoneStyle('5').strokeWidth}" stroke-linejoin="round"
              ${selectedZone === '5' ? 'filter="url(#selectedGlow)"' : ''}/>
        
        <!-- Zone 5: connection to south coast -->
        <path d="M235,280 L260,290 L280,320 L245,325 L215,315 L200,305 Z" 
              fill="url(#zone5Grad)" opacity="${getZoneStyle('5').opacity}"
              stroke="${getZoneStyle('5').stroke}" stroke-width="${getZoneStyle('5').strokeWidth}" stroke-linejoin="round"
              ${selectedZone === '5' ? 'filter="url(#selectedGlow)"' : ''}/>
              
        <!-- Zone 1 extension connecting Free State -->
        <path d="M185,210 L215,240 L255,235 L260,260 L235,280 L200,305 L185,245 L155,235 Z" 
              fill="url(#zone1Grad)" opacity="${getZoneStyle('1').opacity}"
              stroke="${getZoneStyle('1').stroke}" stroke-width="${getZoneStyle('1').strokeWidth}" stroke-linejoin="round"
              ${selectedZone === '1' ? 'filter="url(#selectedGlow)"' : ''}/>
      </g>
      
      <!-- Zone number labels with professional styling -->
      <g font-family="system-ui, -apple-system, sans-serif">
        <!-- Zone 6 label -->
        <circle cx="135" cy="180" r="14" fill="#fff" stroke="${ZONE_COLORS['6']}" stroke-width="2"/>
        <text x="135" y="185" font-size="13" font-weight="700" fill="${ZONE_COLORS['6']}" text-anchor="middle">6</text>
        
        <!-- Zone 4 labels -->
        <circle cx="65" cy="275" r="14" fill="#fff" stroke="${ZONE_COLORS['4']}" stroke-width="2"/>
        <text x="65" y="280" font-size="13" font-weight="700" fill="${ZONE_COLORS['4']}" text-anchor="middle">4</text>
        <circle cx="155" cy="290" r="14" fill="#fff" stroke="${ZONE_COLORS['4']}" stroke-width="2"/>
        <text x="155" y="295" font-size="13" font-weight="700" fill="${ZONE_COLORS['4']}" text-anchor="middle">4</text>
        
        <!-- Zone 1 label -->
        <circle cx="255" cy="185" r="14" fill="#fff" stroke="${ZONE_COLORS['1']}" stroke-width="2"/>
        <text x="255" y="190" font-size="13" font-weight="700" fill="${ZONE_COLORS['1']}" text-anchor="middle">1</text>
        
        <!-- Zone 2 label -->
        <circle cx="270" cy="105" r="14" fill="#fff" stroke="${ZONE_COLORS['2']}" stroke-width="2"/>
        <text x="270" y="110" font-size="13" font-weight="700" fill="${ZONE_COLORS['2']}" text-anchor="middle">2</text>
        
        <!-- Zone 3 label -->
        <circle cx="400" cy="125" r="14" fill="#fff" stroke="${ZONE_COLORS['3']}" stroke-width="2"/>
        <text x="400" y="130" font-size="13" font-weight="700" fill="${ZONE_COLORS['3']}" text-anchor="middle">3</text>
        
        <!-- Zone 5 label -->
        <circle cx="380" cy="265" r="14" fill="#fff" stroke="${ZONE_COLORS['5']}" stroke-width="2"/>
        <text x="380" y="270" font-size="13" font-weight="700" fill="${ZONE_COLORS['5']}" text-anchor="middle">5</text>
      </g>
      
      <!-- Title bar at bottom -->
      <rect x="0" y="365" width="500" height="35" fill="#1e3a5f"/>
      <text x="250" y="387" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600" fill="#fff" text-anchor="middle" letter-spacing="1">
        SOUTH AFRICA — SANS 10400-XA CLIMATIC ZONES
      </text>
      
      ${selectedZone ? `
        <!-- Selected zone badge -->
        <rect x="420" y="15" width="65" height="28" rx="14" fill="${ZONE_COLORS[selectedZone]}" stroke="#fff" stroke-width="2"/>
        <text x="452" y="34" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#fff" text-anchor="middle">Zone ${selectedZone}</text>
      ` : ''}
    </svg>
  `;
}

// Generate professional zone legend HTML
function generateZoneLegendHTML(selectedZone: string | null): string {
  return Object.entries(ZONE_DATA).map(([zone, data]) => {
    const isSelected = selectedZone === zone;
    const borderStyle = isSelected ? `2px solid ${ZONE_COLORS[zone]}` : `1px solid ${COLORS.border}`;
    const bgColor = isSelected ? `${ZONE_COLORS[zone]}08` : '#ffffff';
    const shadow = isSelected ? 'box-shadow: 0 2px 8px rgba(0,0,0,0.12);' : '';
    
    return `
      <div style="display: flex; align-items: flex-start; gap: 10px; padding: 8px 10px; background: ${bgColor}; border: ${borderStyle}; border-radius: 6px; margin-bottom: 6px; ${shadow}">
        <div style="width: 22px; height: 22px; background: linear-gradient(135deg, ${ZONE_COLORS[zone]}, ${ZONE_COLORS[zone]}cc); border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.15);">
          <span style="color: #fff; font-weight: 700; font-size: 10px;">${zone}</span>
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 600; color: ${COLORS.text}; font-size: 10px; line-height: 1.3;">
            ${data.name}${isSelected ? ' <span style="color: ' + ZONE_COLORS[zone] + ';">●</span>' : ''}
          </div>
          <div style="color: ${ZONE_COLORS[zone]}; font-size: 9px; font-weight: 600; margin-top: 1px;">${data.temp}</div>
          <div style="color: ${COLORS.textLight}; font-size: 8px; margin-top: 2px; line-height: 1.3;">${data.description}</div>
          <div style="color: #9ca3af; font-size: 8px; font-style: italic; margin-top: 1px;">e.g. ${data.examples}</div>
        </div>
      </div>
    `;
  }).join('');
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function generateHTML(data: RequestBody): string {
  const { document, sections, projectName, revision, companyDetails } = data;
  
  const logoHtml = companyDetails?.companyLogoUrl 
    ? `<img src="${companyDetails.companyLogoUrl}" alt="Company Logo" style="max-height: 80px; max-width: 200px;" />`
    : '';
  
  const methodName = METHOD_NAMES[document.building_calculation_type || 'sans_204'] || 'SANS 204';
  
  const sectionsHtml = sections.map((section, index) => `
    <div class="section" style="${index > 0 ? 'margin-top: 30px;' : ''}">
      <h3 style="font-size: 14px; color: ${COLORS.primary}; margin: 0 0 10px 0; padding-bottom: 5px; border-bottom: 1px solid ${COLORS.border};">
        ${section.section_number}. ${section.section_title}
      </h3>
      <p style="font-size: 11px; line-height: 1.6; color: ${COLORS.text}; margin: 0; white-space: pre-wrap;">
        ${section.content || '<em style="color: ' + COLORS.textLight + ';">No content provided for this section.</em>'}
      </p>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: ${COLORS.text};
      margin: 0;
      padding: 0;
    }
    .page-break {
      page-break-after: always;
    }
    .cover-page {
      text-align: center;
      padding-top: 80px;
    }
    .logo-container {
      margin-bottom: 40px;
    }
    .main-title {
      font-size: 32px;
      font-weight: bold;
      color: ${COLORS.primary};
      margin: 40px 0 10px;
    }
    .subtitle {
      font-size: 14px;
      color: ${COLORS.textLight};
      margin: 5px 0;
    }
    .divider {
      width: 200px;
      height: 3px;
      background: ${COLORS.primary};
      margin: 40px auto;
    }
    .meta-table {
      margin: 0 auto;
      text-align: left;
    }
    .meta-table td {
      padding: 6px 15px;
      font-size: 11px;
    }
    .meta-label {
      color: ${COLORS.textLight};
    }
    .meta-value {
      font-weight: 600;
    }
    .page-header {
      font-size: 16px;
      font-weight: bold;
      color: ${COLORS.primary};
      margin: 0 0 10px;
      padding-bottom: 10px;
      border-bottom: 2px solid ${COLORS.primary};
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin: 20px 0;
    }
    .info-card {
      background: ${COLORS.background};
      padding: 15px;
      border-radius: 4px;
    }
    .info-label {
      font-size: 10px;
      color: ${COLORS.textLight};
      margin-bottom: 5px;
    }
    .info-value {
      font-size: 16px;
      font-weight: bold;
      color: ${COLORS.primary};
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    .data-table td {
      padding: 8px 12px;
      border-bottom: 1px solid ${COLORS.border};
    }
    .data-table td:last-child {
      text-align: right;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <!-- COVER PAGE -->
  <div class="cover-page">
    <div class="logo-container">
      ${logoHtml}
    </div>
    <div class="main-title">BULK SERVICES REPORT</div>
    <div class="subtitle">ELECTRICAL INFRASTRUCTURE</div>
    <div class="subtitle">Document ${document.document_number}</div>
    <div class="divider"></div>
    <table class="meta-table">
      <tr>
        <td class="meta-label">Project:</td>
        <td class="meta-value">${projectName || 'Bulk Services'}</td>
      </tr>
      <tr>
        <td class="meta-label">Revision:</td>
        <td class="meta-value">${revision}</td>
      </tr>
      <tr>
        <td class="meta-label">Date:</td>
        <td class="meta-value">${formatDate(new Date().toISOString())}</td>
      </tr>
      <tr>
        <td class="meta-label">Method:</td>
        <td class="meta-value">${methodName}</td>
      </tr>
    </table>
    ${companyDetails?.companyName ? `<p style="margin-top: 80px; color: ${COLORS.textLight};">${companyDetails.companyName}</p>` : ''}
  </div>

  <div class="page-break"></div>

  <!-- DOCUMENT INFORMATION -->
  <h2 class="page-header">DOCUMENT INFORMATION</h2>
  <table class="data-table">
    <tr>
      <td style="color: ${COLORS.textLight};">Document Number</td>
      <td>${document.document_number}</td>
    </tr>
    <tr>
      <td style="color: ${COLORS.textLight};">Project</td>
      <td>${projectName || 'Not specified'}</td>
    </tr>
    <tr>
      <td style="color: ${COLORS.textLight};">Created</td>
      <td>${formatDate(document.created_at)}</td>
    </tr>
    ${document.building_calculation_type ? `
    <tr>
      <td style="color: ${COLORS.textLight};">Calculation Method</td>
      <td>${methodName}</td>
    </tr>
    ` : ''}
  </table>
  ${document.notes ? `
    <h3 style="font-size: 12px; margin-top: 20px;">Notes</h3>
    <p style="color: ${COLORS.textLight}; white-space: pre-wrap;">${document.notes}</p>
  ` : ''}

  <div class="page-break"></div>

  <!-- ELECTRICAL LOAD ANALYSIS -->
  <h2 class="page-header">ELECTRICAL LOAD ANALYSIS</h2>
  
  <div class="info-grid">
    <div class="info-card">
      <div class="info-label">Project Area</div>
      <div class="info-value">${document.project_area?.toLocaleString() || 'N/A'} m²</div>
    </div>
    <div class="info-card">
      <div class="info-label">Applied Load</div>
      <div class="info-value">${document.va_per_sqm || 'N/A'} VA/m²</div>
    </div>
    <div class="info-card">
      <div class="info-label">Climatic Zone</div>
      <div class="info-value">${document.climatic_zone || 'N/A'}</div>
    </div>
  </div>

  ${(document.total_connected_load || document.maximum_demand) ? `
    <h3 style="font-size: 12px; margin-top: 25px;">Calculated Values</h3>
    <table class="data-table">
      ${document.total_connected_load ? `<tr><td>Total Connected Load</td><td>${document.total_connected_load.toLocaleString()} kVA</td></tr>` : ''}
      ${document.diversity_factor ? `<tr><td>Diversity Factor</td><td>${document.diversity_factor}%</td></tr>` : ''}
      ${document.future_expansion_factor ? `<tr><td>Future Expansion</td><td>${document.future_expansion_factor}%</td></tr>` : ''}
      ${document.maximum_demand ? `<tr><td style="font-weight: bold;">Maximum Demand</td><td style="color: ${COLORS.primary}; font-size: 14px;">${document.maximum_demand.toLocaleString()} kVA</td></tr>` : ''}
    </table>
  ` : ''}

  ${(document.primary_voltage || document.connection_size || document.supply_authority) ? `
    <h3 style="font-size: 12px; margin-top: 25px;">Connection Details</h3>
    <table class="data-table">
      ${document.primary_voltage ? `<tr><td>Primary Voltage</td><td>${document.primary_voltage}</td></tr>` : ''}
      ${document.connection_size ? `<tr><td>Connection Size</td><td>${document.connection_size}</td></tr>` : ''}
      ${document.supply_authority ? `<tr><td>Supply Authority</td><td>${document.supply_authority}</td></tr>` : ''}
      ${document.tariff_structure ? `<tr><td>Tariff Structure</td><td>${document.tariff_structure}</td></tr>` : ''}
    </table>
  ` : ''}

  <!-- CLIMATIC ZONE SECTION -->
  ${document.climatic_zone ? `
    <div class="page-break"></div>
    
    <h2 class="page-header">CLIMATIC ZONE ANALYSIS</h2>
    
    <p style="color: ${COLORS.textLight}; font-size: 11px; margin-bottom: 20px;">
      The climatic zone classification follows SANS 10400-XA standards for energy efficiency in buildings.
      ${document.climatic_zone_city ? `Project location is near <strong>${document.climatic_zone_city}</strong>.` : ''}
    </p>
    
    <div style="display: flex; gap: 30px; align-items: flex-start;">
      <!-- Map -->
      <div style="flex: 1;">
        ${generateZoneMapSVG(document.climatic_zone)}
      </div>
      
      <!-- Legend -->
      <div style="flex: 1;">
        <h3 style="font-size: 12px; margin: 0 0 15px 0; color: ${COLORS.primary};">Zone Classifications</h3>
        ${generateZoneLegendHTML(document.climatic_zone)}
      </div>
    </div>
    
    <!-- Selected Zone Details -->
    ${ZONE_DATA[document.climatic_zone] ? `
      <div style="margin-top: 25px; padding: 20px; background: linear-gradient(135deg, ${ZONE_COLORS[document.climatic_zone]}15, ${ZONE_COLORS[document.climatic_zone]}05); border: 2px solid ${ZONE_COLORS[document.climatic_zone]}; border-radius: 8px;">
        <h3 style="margin: 0 0 10px 0; color: ${COLORS.primary}; font-size: 14px;">
          Selected Zone: Zone ${document.climatic_zone} - ${ZONE_DATA[document.climatic_zone].name}
        </h3>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
          <div>
            <div style="font-size: 10px; color: ${COLORS.textLight};">Mean Annual Temperature</div>
            <div style="font-size: 12px; font-weight: 600; color: ${ZONE_COLORS[document.climatic_zone]};">${ZONE_DATA[document.climatic_zone].temp}</div>
          </div>
          <div>
            <div style="font-size: 10px; color: ${COLORS.textLight};">Climate Characteristics</div>
            <div style="font-size: 11px; color: ${COLORS.text};">${ZONE_DATA[document.climatic_zone].description}</div>
          </div>
          <div>
            <div style="font-size: 10px; color: ${COLORS.textLight};">Example Cities</div>
            <div style="font-size: 11px; color: ${COLORS.text};">${ZONE_DATA[document.climatic_zone].examples}</div>
          </div>
        </div>
      </div>
    ` : ''}
  ` : ''}

  ${sections.length > 0 ? `
    <div class="page-break"></div>

    <!-- REPORT SECTIONS -->
    <h2 class="page-header">REPORT SECTIONS</h2>
    ${sectionsHtml}
  ` : ''}

</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[BulkServicesPDF] Edge function starting...');
    
    const pdfShiftApiKey = Deno.env.get('PDFSHIFT_API_KEY');
    if (!pdfShiftApiKey) {
      console.error('[BulkServicesPDF] PDFSHIFT_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'PDF generation service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestBody: RequestBody & { filename?: string; storageBucket?: string } = await req.json();
    console.log('[BulkServicesPDF] Request body keys:', Object.keys(requestBody));
    
    const { document, sections, projectName, revision, companyDetails, filename, storageBucket } = requestBody;

    if (!document || !document.id) {
      console.error('[BulkServicesPDF] Missing document data. Document:', document ? 'exists' : 'null', 'ID:', document?.id);
      return new Response(
        JSON.stringify({ error: 'Missing document data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[BulkServicesPDF] Generating PDF for document:', document.document_number);
    console.log('[BulkServicesPDF] Project:', projectName, 'Revision:', revision);

    // Generate HTML
    const html = generateHTML({ document, sections, projectName, revision, companyDetails });
    console.log('[BulkServicesPDF] HTML generated, length:', html.length);

    // Call PDFShift API
    console.log('[BulkServicesPDF] Calling PDFShift API...');
    const pdfShiftResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${pdfShiftApiKey}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: html,
        format: 'A4',
        margin: { top: '15mm', right: '15mm', bottom: '20mm', left: '15mm' },
      }),
    });

    if (!pdfShiftResponse.ok) {
      const errorText = await pdfShiftResponse.text();
      console.error('[BulkServicesPDF] PDFShift API error:', pdfShiftResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `PDF generation failed: ${pdfShiftResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pdfBuffer = await pdfShiftResponse.arrayBuffer();
    console.log('[BulkServicesPDF] PDF generated:', pdfBuffer.byteLength, 'bytes');

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const bucket = storageBucket || 'bulk-services-reports';
    const finalFilename = filename || `BulkServices_${document.document_number}_${revision}_${Date.now()}.pdf`;
    const filePath = `${document.project_id}/${finalFilename}`;

    console.log('[BulkServicesPDF] Uploading to storage:', bucket, filePath);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, new Uint8Array(pdfBuffer), {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('[BulkServicesPDF] Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: `Storage upload failed: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[BulkServicesPDF] Upload complete!');

    return new Response(
      JSON.stringify({
        success: true,
        filePath,
        fileName: finalFilename,
        fileSize: pdfBuffer.byteLength,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BulkServicesPDF] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
