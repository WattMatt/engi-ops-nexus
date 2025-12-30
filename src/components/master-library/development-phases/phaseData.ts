export interface PhaseChecklistItem {
  id: string;
  label: string;
}

export interface DevelopmentPhase {
  id: string;
  number: number;
  title: string;
  goal: string;
  prompt: string;
  checklist: PhaseChecklistItem[];
  verificationQuery: string;
  dependencies: string[];
}

export const developmentPhases: DevelopmentPhase[] = [
  // ============= DRAWING SHEET VIEW DEVELOPMENT PHASES =============
  {
    id: "dsv-phase-1-cable-schedule",
    number: 1,
    title: "Cable Schedule System",
    goal: "Create cable types definition and cable schedule components for Drawing Sheet View",
    prompt: `PHASE 1: Cable Schedule System

OBJECTIVE: Create a comprehensive cable schedule system with cable type definitions and schedule components.

CABLE TYPES FILE (cable-types.ts):
Create src/components/drawing-sheet/cable-types.ts with:

1. GP 4mm² Cable:
   - Live conductor: 4mm² copper
   - Neutral conductor: 4mm² copper  
   - Earth conductor: 2.5mm² copper
   - Used for: Power circuits (P1, P2)

2. GP 2.5mm² Cable:
   - Live conductor: 2.5mm² copper
   - Neutral conductor: 2.5mm² copper
   - Earth conductor: 1.5mm² copper
   - Used for: Light circuits (L1, L2)

3. Flattex Cables:
   - 2.5mm² for light switches
   - 4mm² for socket outlets
   - 6mm² for high load circuits

4. T&E (Twin & Earth):
   - Standard installation cable
   - Available in 1.5mm², 2.5mm², 4mm², 6mm²

5. Circuit Type Mappings:
   - L1, L2: Lighting circuits → GP 2.5mm or Flattex 2.5mm
   - P1, P2: Power circuits → GP 4mm or Flattex 4mm
   - KS: Kitchen socket → Flattex 4mm
   - S1: Spare → varies by specification

CABLE SCHEDULE COMPONENT (CableSchedule.tsx):
Create src/components/drawing-sheet/schedules/CableSchedule.tsx with:

1. Cable Takeoff Table:
   - Circuit column (L1, L2, P1, etc.)
   - Cable type column
   - Live length (m)
   - Neutral length (m)
   - Earth length (m)
   - Total length (m)

2. Cable Quantity Summary:
   - Aggregate by cable type
   - Total meters per type
   - Group by size (2.5mm², 4mm², 6mm²)

3. Integration:
   - Add to DrawingSheetView tabs
   - Pull data from equipment and containment

VERIFICATION:
- Check cable-types.ts exports all definitions
- CableSchedule renders in DrawingSheetView
- Quantities calculate from placed equipment`,
    checklist: [
      { id: "dsv1-1", label: "Create cable-types.ts with cable definitions" },
      { id: "dsv1-2", label: "Define GP 4mm (L-N-E configuration)" },
      { id: "dsv1-3", label: "Define GP 2.5mm (L-N-E configuration)" },
      { id: "dsv1-4", label: "Define Flattex cables (2.5mm, 4mm, 6mm)" },
      { id: "dsv1-5", label: "Define circuit type mappings (L1, L2, P1, KS, S1)" },
      { id: "dsv1-6", label: "Create CableSchedule.tsx component" },
      { id: "dsv1-7", label: "Cable Takeoff table with circuit column" },
      { id: "dsv1-8", label: "Live/Neutral/Earth length columns" },
      { id: "dsv1-9", label: "Cable Quantity Summary with aggregates" },
      { id: "dsv1-10", label: "Integration with DrawingSheetView" },
    ],
    verificationQuery: `-- Verify cable schedule data structure
SELECT 
  'cable_types' as component,
  COUNT(*) as definition_count
FROM information_schema.tables
WHERE table_name LIKE '%cable%';`,
    dependencies: [],
  },
  {
    id: "dsv-phase-2-schedules",
    number: 2,
    title: "Enhance Existing Schedules",
    goal: "Improve fixture, equipment, lighting, and conduit schedules with type marks and descriptions",
    prompt: `PHASE 2: Enhance Existing Schedules

OBJECTIVE: Add Type Mark columns, descriptions, and additional fields to all schedule tables in DrawingSheetView.

ELECTRICAL FIXTURE SCHEDULE ENHANCEMENTS:
- Add Type Mark column (F1, F2, F3, etc.)
- Add Description column with full fixture description
- Add Length column for linear fixtures
- Match format from reference PDF

EQUIPMENT SCHEDULE ENHANCEMENTS:
- Add Panel Name column (DB-01, DB-02, etc.)
- Add Rating column (amperage rating)
- Add Type Mark for equipment categorization

LIGHTING FIXTURE SCHEDULE ENHANCEMENTS:
- Add Type Mark column (A, B, C, D)
- A = Standard downlight
- B = Linear LED
- C = Emergency light
- D = Feature/decorative
- Add full descriptions matching PDF format:
  "600x600 LED Panel, 40W, 4000K, 4000lm"

LIGHTING DEVICE SCHEDULE (NEW):
Create LightingDeviceSchedule.tsx for:
- Light switches (single, double, dimmer)
- Motion sensors
- Daylight sensors
- Include Type Mark, Description, Quantity

CONDUIT RUN SCHEDULE ENHANCEMENTS:
- Add Outside Diameter column
- Show total length per conduit size
- Group by conduit type (steel, PVC, flexible)

FORMATTING:
- Consistent column widths across schedules
- Professional header styling
- Zebra striping for readability

VERIFICATION:
- All schedules show Type Mark column
- Descriptions match professional format
- New LightingDeviceSchedule renders correctly`,
    checklist: [
      { id: "dsv2-1", label: "Add Type Mark column to Electrical Fixture Schedule" },
      { id: "dsv2-2", label: "Add Description and Length columns to fixtures" },
      { id: "dsv2-3", label: "Add Panel Name to Equipment Schedule" },
      { id: "dsv2-4", label: "Add Rating column to Equipment Schedule" },
      { id: "dsv2-5", label: "Add Type Mark (A,B,C,D) to Lighting Fixture Schedule" },
      { id: "dsv2-6", label: "Add full descriptions matching PDF format" },
      { id: "dsv2-7", label: "Create LightingDeviceSchedule for switches/sensors" },
      { id: "dsv2-8", label: "Add Outside Diameter to Conduit Run Schedule" },
      { id: "dsv2-9", label: "Show total length per conduit size" },
    ],
    verificationQuery: `-- Check schedule components exist
SELECT 'Schedule Enhancement' as phase, 'Complete' as status;`,
    dependencies: ["dsv-phase-1-cable-schedule"],
  },
  {
    id: "dsv-phase-3-room-sizing",
    number: 3,
    title: "Dynamic Room Sizing",
    goal: "Auto-calculate room bounds from equipment and containment positions",
    prompt: `PHASE 3: Dynamic Room Sizing

OBJECTIVE: Automatically calculate room dimensions based on placed equipment and containment positions.

CALCULATION LOGIC:
1. Scan all equipment positions:
   - Get X coordinates of all placed items
   - Get Y coordinates of all placed items
   - Calculate min/max bounds

2. Scan containment paths:
   - Get all containment route coordinates
   - Include in bounds calculation

3. Calculate room dimensions:
   - minX = minimum X position - padding
   - maxX = maximum X position + padding
   - minY = minimum Y position - padding
   - maxY = maximum Y position + padding
   - roomWidth = maxX - minX
   - roomLength = maxY - minY

4. Padding:
   - Add 2m padding on each side
   - Ensures equipment isn't at room edge

IMPLEMENTATION:
1. Create useRoomBounds hook:
   - Takes equipment array and containment array
   - Returns { width, length, minX, minY, maxX, maxY }

2. Update Isometric3DViewer props:
   - Accept roomWidth and roomLength
   - Pass calculated dimensions

3. Camera adjustment:
   - Auto-position camera based on room size
   - Ensure entire room is visible
   - Scale view proportionally

EDGE CASES:
- Empty room: Use default 10m x 10m
- Single item: Add minimum 4m each direction
- Very large rooms: Limit max dimensions for performance

VERIFICATION:
- Room scales with equipment placement
- Camera shows entire room
- Padding is consistent`,
    checklist: [
      { id: "dsv3-1", label: "Calculate min/max X from equipment positions" },
      { id: "dsv3-2", label: "Calculate min/max Y from equipment positions" },
      { id: "dsv3-3", label: "Calculate bounds from containment paths" },
      { id: "dsv3-4", label: "Add padding (2m each side)" },
      { id: "dsv3-5", label: "Pass dimensions to Isometric3DViewer props" },
      { id: "dsv3-6", label: "Auto-adjust camera position based on room size" },
      { id: "dsv3-7", label: "Scale 3D view proportionally" },
    ],
    verificationQuery: `-- Room sizing is calculated client-side
SELECT 'Dynamic Room Sizing' as feature, 'Check 3D viewer' as verification;`,
    dependencies: ["dsv-phase-2-schedules"],
  },
  {
    id: "dsv-phase-4-3d-view",
    number: 4,
    title: "Enhanced 3D Isometric View",
    goal: "Add wall thickness, ceiling grid, floor patterns, and equipment height differentiation",
    prompt: `PHASE 4: Enhanced 3D Isometric View

OBJECTIVE: Improve the Isometric3DViewer with realistic architectural elements and proper equipment positioning.

WALL REPRESENTATION:
- Add proper wall thickness (200mm typical)
- Show wall as extruded geometry
- Different color for inner/outer surfaces
- Optional door/window cutouts

CEILING GRID:
- 600x600mm suspended ceiling tiles
- Show grid prominently
- Grid lines in contrasting color
- Ceiling height: 2.7m typical

FLOOR PATTERNS:
- Add floor tiles or pattern
- 600x600mm or 300x300mm tiles
- Subtle grid lines
- Different finish options

EQUIPMENT HEIGHT POSITIONING:

Ceiling-mounted (at ceiling height):
- Downlights
- LED panels
- Emergency lights
- Ceiling fans
- Motion sensors (ceiling type)

Wall-mounted (at appropriate heights):
- Light switches: 1.2m from floor
- Socket outlets: 300mm or 450mm from floor
- Isolators: 1.8m from floor
- Air conditioning units: 2.1m from floor

Floor-mounted (on floor level):
- Distribution boards
- Manholes
- Floor boxes
- Cable risers

CABLE ROUTE VISUALIZATION:
- Show cable routes as colored lines
- Different colors for different circuits
- Connect equipment to distribution boards
- Route through containment paths

MATERIALS AND LIGHTING:
- Ambient lighting for visibility
- Equipment glow/highlight on hover
- Shadows for depth perception

VERIFICATION:
- Ceiling grid visible at correct height
- Equipment at appropriate heights
- Cable routes connect equipment to DBs`,
    checklist: [
      { id: "dsv4-1", label: "Add proper wall thickness representation" },
      { id: "dsv4-2", label: "Show ceiling grid prominently (600x600 tiles)" },
      { id: "dsv4-3", label: "Add floor pattern/tiles" },
      { id: "dsv4-4", label: "Ceiling-mounted items at ceiling height" },
      { id: "dsv4-5", label: "Wall-mounted items at appropriate heights" },
      { id: "dsv4-6", label: "Floor-mounted items on floor level" },
      { id: "dsv4-7", label: "Show cable routes as colored lines" },
      { id: "dsv4-8", label: "Connect equipment to distribution boards visually" },
    ],
    verificationQuery: `-- 3D view verification is visual
SELECT 'Enhanced 3D View' as feature, 'Visual inspection required' as verification;`,
    dependencies: ["dsv-phase-3-room-sizing"],
  },
  {
    id: "dsv-phase-5-pdf",
    number: 5,
    title: "PDF Generator Update",
    goal: "Add cable schedules and professional layout to PDF output",
    prompt: `PHASE 5: PDF Generator Update

OBJECTIVE: Update pdfGenerator.ts to include cable schedules and match professional drawing sheet format.

CABLE TAKEOFF SCHEDULE TABLE:
Add to PDF output:
| Circuit | Cable Type | Live (m) | Neutral (m) | Earth (m) | Total (m) |
|---------|------------|----------|-------------|-----------|-----------|
| L1      | GP 2.5mm   | 45.5     | 45.5        | 45.5      | 136.5     |
| L2      | GP 2.5mm   | 38.2     | 38.2        | 38.2      | 114.6     |
| P1      | GP 4mm     | 52.0     | 52.0        | 35.0      | 139.0     |

CABLE QUANTITY SUMMARY TABLE:
Add summary section:
| Cable Type    | Size   | Total Length (m) | Reels Required |
|---------------|--------|------------------|----------------|
| GP            | 2.5mm² | 251.1            | 3              |
| GP            | 4mm²   | 139.0            | 2              |
| Flattex       | 4mm²   | 85.5             | 1              |

FORMATTING REQUIREMENTS:
1. Match Excel export column widths
2. Position schedules consistently on page
3. Use same column widths as drawings
4. Include Type Marks in all schedule tables
5. Professional header with project info
6. Page numbers and revision info
7. Match professional layout format

PAGE LAYOUT:
- A3 or A4 landscape
- Title block in corner
- Schedule tables with headers
- Legend for symbols
- Notes section
- Revision table

VERIFICATION:
- PDF includes Cable Takeoff Schedule
- PDF includes Cable Quantity Summary
- Formatting matches professional standards
- All Type Marks displayed correctly`,
    checklist: [
      { id: "dsv5-1", label: "Add Cable Takeoff Schedule table to PDF" },
      { id: "dsv5-2", label: "Add Cable Quantity Summary table" },
      { id: "dsv5-3", label: "Format matching Excel output columns" },
      { id: "dsv5-4", label: "Position schedules consistently on page" },
      { id: "dsv5-5", label: "Use same column widths as drawings" },
      { id: "dsv5-6", label: "Include Type Marks in all tables" },
      { id: "dsv5-7", label: "Match professional layout format" },
    ],
    verificationQuery: `-- PDF generation verification
SELECT 'PDF Generator' as feature, 'Generate and inspect PDF' as verification;`,
    dependencies: ["dsv-phase-1-cable-schedule", "dsv-phase-2-schedules"],
  },
];
