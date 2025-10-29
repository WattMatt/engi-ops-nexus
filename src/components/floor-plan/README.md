# Prompt: Electrical Floor Plan Markup Tool

## 1. High-Level Goal

Create a world-class, browser-based application for electrical engineers and quantity surveyors to perform markups on architectural floor plans. The tool should allow users to load a PDF, set a scale, place standard electrical symbols, draw supply routes, and automatically quantify all components for scheduling and reporting. The application must be intuitive, performant, and feature-rich, catering to various design purposes from budget estimates to detailed solar PV layouts.

## 2. Core Features & Specifications

### 2.1. Project Setup & PDF Handling

-   **File Loading:** The user must be able to load a local PDF file, which will serve as the background for the canvas.
-   **Design Purpose:** Upon loading a PDF, prompt the user to select a `DesignPurpose` (e.g., 'Budget mark up', 'Line shop measurements', 'PV design'). This selection should dynamically configure the available toolset to keep the UI relevant to the task.
-   **UI Structure:** The layout should consist of three main panels: a **Toolbar** on the left, the main interactive **Canvas** in the center, and a **Project Overview/Details Panel** on the right.

### 2.2. Canvas & Scaling

-   **Infinite Canvas:** Implement a pannable and zoomable canvas to allow users to navigate large floor plans easily. Use mouse wheel for zoom and middle-mouse-button drag (or a Pan tool) for panning.
-   **Critical Scaling Tool:** The first step after loading a plan must be to set the scale.
    -   The user activates a 'Scale' tool.
    -   They draw a line between two points of a known distance on the PDF.
    -   A modal prompts them to enter the real-world length of that line in meters.
    -   The application calculates a pixels-to-meters ratio (`scaleInfo.ratio`) that will be used for all subsequent measurements. No measurement-based tools should be usable until the scale is set.

### 2.3. Markup & Drawing Tools

-   **General Tools:** `Select`, `Pan`, `Scale`. The `Select` tool allows users to click on any placed item to view/edit its properties or to move/delete it.
-   **Drawing Tools:**
    -   **Lines (`LINE_MV`, `LINE_LV`, `LINE_DC`):** Allow drawing multi-point polylines. Lines for different voltage types should have distinct colors.
    -   **LV/AC Cable Details:** When an `LINE_LV` is completed, a modal must appear to capture details like `Supply From`, `Supply To`, `Cable Type`, `Line Label`, and vertical heights (`Start Height`, `End Height`). The total cable length must be calculated as `pathLength + startHeight + endHeight`.
    -   **Zones (`ZONE`):** Allow drawing closed polygons. The area (in m²) should be automatically calculated and displayed.
    -   **Containment:** Implement tools for drawing various cable containment types (e.g., `Cable Tray`, `Powerskirting`). Some types should prompt for a `size` after being drawn.
-   **Equipment Placement:**
    -   Provide a comprehensive library of `EquipmentType` symbols.
    -   When an equipment tool is selected, a preview of the symbol should follow the user's cursor.
    -   Users must be able to rotate the symbol in 45-degree increments (using the 'R' key or a UI button) before placing it.
    -   The placed symbol's size on the canvas must be rendered based on its real-world dimensions and the current drawing scale.

### 2.4. Specialized PV Design Module

For the `PV design` purpose, implement a specific, guided workflow:
1.  **Panel Configuration:** After setting the scale, prompt the user to define the PV panel specifications (length, width, wattage).
2.  **Roof Masking:** The user draws `RoofMask` polygons on valid roof areas.
3.  **Pitch & Direction:**
    -   After drawing a mask, a modal prompts for the roof's `pitch` (slope in degrees).
    -   The tool then automatically switches to a 'Roof Direction' mode. The user must click on the highest point and then the lowest point within the mask to define the slope's azimuth. An arrow should be drawn on the mask to visualize this.
4.  **Array Configuration & Placement:**
    -   A 'Place PV Array' tool opens a modal where the user defines the array layout (`rows`, `columns`) and panel `orientation` (portrait/landscape).
    -   The user then clicks on a valid roof mask to place the array.
    -   Implement a snapping feature to help align new arrays with existing ones (corner-to-corner and edge-to-edge).

### 2.5. Project Overview Panel (Right Side)

-   This panel should be the single source of truth for all project data, updating in real-time.
-   **Selection Details:** When an item is selected on the canvas, its properties (e.g., `name`, `area`) should be displayed here and be editable. A 'Delete' button should also be present.
-   **Tabbed Interface:** Organize the data into tabs:
    -   **Summary:** A high-level overview of quantities, tailored to the current `DesignPurpose`.
    -   **Equipment:** A list of all placed equipment, grouped by type with counts.
    -   **Cables:** A detailed schedule of all LV/AC cables with their properties.
    -   **Containment/Zones:** Lists of all drawn containment routes and zones with their measured lengths/areas.
    -   **Tasks:** A view for managing project tasks (see below).

### 2.6. Task Management

-   Allow users to create `Task`s linked to any equipment item or zone.
-   A task must have a `title`, `description` (optional), `status` ('To Do', 'In Progress', 'Completed'), and an optional `assignedTo` field.
-   Selected items in the overview panel should have a section to view and add linked tasks.
-   The main 'Tasks' tab should provide an aggregated view of all tasks, filterable/groupable by status and assignee.

### 2.7. Data Persistence & Authentication

-   Integrate with **Supabase** for backend services. The application should be configurable via a message from a host page to allow for easy deployment.
-   **Authentication:** Allow users to sign in via Google OAuth.
-   **Cloud Save/Load:** Authenticated users must be able to:
    -   Save the entire design state (all markup data, scale info, purpose, etc.) along with the associated PDF file to the cloud.
    -   View a list of their saved designs and load any of them back into the application.

### 2.8. Exporting & AI Integration

-   **PDF Report Generation:** Implement an 'Export as PDF' feature. This should generate a professional multi-page report containing:
    1.  A title page.
    2.  The marked-up floor plan.
    3.  Detailed schedules and quantity summaries in tabular format.
-   **AI-Powered Bill of Quantities (BoQ):**
    -   Create a 'Generate BoQ (AI)' button.
    -   When clicked, send the quantified project data to a backend function.
    -   This function will use the **Gemini API** to generate a professionally formatted Bill of Quantities in Markdown.
    -   Display the response in a modal, with an option to copy the content to the clipboard.

### 2.9. UI/UX & Technical Stack

-   **Stack:** Use **React**, **TypeScript**, and **TailwindCSS**. For PDF rendering, use **pdf.js-dist**.
-   **State Management:** Implement a robust state management system that includes **Undo/Redo** functionality for all markup actions.
-   **Visuals:** Use a modern, dark theme. Employ a clean icon set (e.g., Lucide React) for the toolbar.
-   **User Feedback:** Provide clear feedback through loading states for long operations (e.g., saving to cloud, AI generation) and toast notifications for success/error messages.
