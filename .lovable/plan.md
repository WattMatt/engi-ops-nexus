
# Electrical Handover Documentation Improvements

## Executive Summary
This plan proposes enhancements to the handover documentation module from an electrical engineering perspective, adding missing critical document types, improving organization, and enhancing the client/contractor sharing portal for electrical project handovers.

---

## Current State Analysis

### Existing Tenant Document Types (6 types)
| Type | Description |
|------|-------------|
| Electrical COC | Certificate of Compliance |
| As Built Drawing | Final installation drawings |
| Line Diagram | Single-line diagrams |
| QC Inspection Report | Quality control reports |
| Lighting Guarantee | Lighting warranty docs |
| DB Guarantee | Distribution board warranty |

### Existing Equipment Categories (8 tabs)
- Generators, Transformers, Main Boards, Lighting, CCTV & Access, Lightning Protection, Specifications, Test Certificates, Warranties, Manuals, Commissioning, Compliance

### Gaps Identified
1. **Missing critical electrical document types** for comprehensive handovers
2. **No cable certification tracking** despite having cable schedule features
3. **Limited SANS compliance documentation** structure
4. **No metering documentation** category
5. **Missing surge protection/earthing** dedicated sections

---

## Proposed Improvements

### 1. Expand Tenant Document Types

Add essential electrical documents to the tenant handover checklist:

```text
NEW TENANT DOCUMENT TYPES
├── electrical_coc (existing)
├── as_built_drawing (existing)
├── line_diagram (existing)
├── qc_inspection_report (existing)
├── lighting_guarantee (existing)
├── db_guarantee (existing)
├── cable_certificate (NEW) - Cable test certificates
├── metering_certificate (NEW) - Metering installation sign-off
├── earth_continuity_test (NEW) - Earthing test results
├── insulation_resistance_test (NEW) - IR test certificates
├── loop_impedance_test (NEW) - Loop impedance results
├── rcd_test_certificate (NEW) - RCD trip time tests
└── tenant_load_schedule (NEW) - Final load calculations
```

**Technical Implementation:**
- Update `TENANT_DOCUMENT_TYPES` constant across:
  - `useTenantHandoverProgress.ts`
  - `TenantDocumentUpload.tsx`
  - `HandoverDashboard.tsx`

---

### 2. Add New Equipment Categories

Add dedicated tabs for critical electrical systems:

| New Category | Icon | Key Documents |
|--------------|------|---------------|
| **Switchgear** | `ToggleRight` | MV/LV switchgear drawings, type tests, FAT reports |
| **Earthing & Bonding** | `Unplug` | Earth electrode tests, equipotential bonding certs |
| **Surge Protection** | `Shield` | SPD installation certs, coordination studies |
| **Metering** | `Gauge` | Meter certificates, CTs/VTs calibration |
| **Cable Installation** | `Cable` | Cable schedules, test certificates, route drawings |
| **Emergency Systems** | `Siren` | Emergency lighting tests, exit sign locations |

---

### 3. Structured Sub-Folders per Category

Enhance the FolderBrowser with recommended sub-folder templates:

```text
Generators/
├── Drawings/
│   ├── Layout Drawings/
│   └── Schematic Diagrams/
├── Test Certificates/
│   ├── Factory Acceptance Tests (FAT)/
│   └── Site Acceptance Tests (SAT)/
├── Commissioning/
│   ├── Commissioning Procedures/
│   └── Commissioning Reports/
├── O&M Manuals/
├── Spares Lists/
└── Warranty Documents/

Transformers/
├── Drawings/
├── Type Test Certificates/
├── Routine Test Certificates/
├── Oil Analysis Reports/
├── Commissioning Reports/
└── Protection Settings/

Main Boards/
├── GA Drawings/
├── Single Line Diagrams/
├── Protection Settings/
├── Type Test Certificates/
├── Thermal Imaging Reports/
└── Arc Flash Studies/
```

---

### 4. SANS 10142 Compliance Checklist

Add a compliance checklist component for South African electrical standards:

**Key Sections:**
1. **Part 1: LV Installations**
   - Installation certificates
   - Inspection checklists
   - Test records

2. **Part 2: MV Installations**
   - Health and safety file
   - Protection coordination studies
   - MV switching procedures

3. **Occupational Certificate Requirements**
   - Certificate of Occupancy supporting docs
   - Municipal inspection records

---

### 5. Enhanced Client Portal Document Permissions

Expand the document category permissions in portal settings:

```text
Current Categories:
├── as_built, generators, transformers, main_boards, lighting
├── cctv_access_control, lightning_protection
├── specifications, test_certificates, warranties, manuals
├── commissioning_docs, compliance_certs

New Categories to Add:
├── switchgear
├── earthing_bonding  
├── surge_protection
├── metering
├── cable_installation
├── emergency_systems
├── protection_settings
├── arc_flash_studies
└── energy_management
```

---

### 6. Document Validation Enhancements

Add smart validation and metadata for electrical documents:

**PDF Metadata Extraction:**
- COC Certificate numbers
- Expiry dates for certificates
- ECSA registration numbers
- Test equipment calibration status

**Document Status Workflow:**
- Draft → Under Review → Approved → Superseded
- Version control with revision tracking
- Automatic expiry notifications for time-limited certs

---

### 7. Bulk Import from Cable Schedule

Create integration with existing cable schedule data:

**Auto-Generate:**
- Cable test certificate placeholders per cable
- Link verification portal results to handover docs
- Import cable route drawings from schedule

---

### 8. Contractor Portal Enhancements

Extend contractor portal with electrical-specific features:

**New Tabs:**
1. **Cable Installation Status** - Real-time cable schedule visibility
2. **Inspection Requests** - Request QC inspections
3. **Document Submissions** - Upload test certificates directly
4. **Punch List** - Electrical snag tracking

**RFI Categories for Electrical:**
- Clarification on drawings
- Material substitution requests
- Installation method queries
- Protection settings confirmation

---

## Implementation Phases

### Phase 1: Core Document Types (Priority: High)
1. Add 7 new tenant document types
2. Update progress calculations
3. Add new equipment category tabs

### Phase 2: Folder Templates (Priority: Medium)
1. Create recommended folder structures
2. Add "Initialize Folders" button per category
3. Implement folder templates for common setups

### Phase 3: Compliance & Validation (Priority: Medium)
1. SANS 10142 compliance checklist component
2. Document metadata extraction
3. Certificate expiry tracking

### Phase 4: Portal Enhancements (Priority: Lower)
1. Contractor portal electrical tabs
2. Client portal additional categories
3. Direct contractor document uploads

---

## File Changes Summary

| File | Changes |
|------|---------|
| `useTenantHandoverProgress.ts` | Add 7 new document types |
| `TenantDocumentUpload.tsx` | Expand TENANT_DOCUMENT_TYPES |
| `HandoverDashboard.tsx` | Update document type constants |
| `HandoverDocuments.tsx` | Add 6 new equipment tabs |
| `ClientDocumentsPage.tsx` | Add matching categories |
| `ContractorPortalSettings.tsx` | Add category permissions |
| `UploadHandoverDocumentDialog.tsx` | Expand document types |
| `NEW: ComplianceChecklist.tsx` | SANS 10142 tracking |
| `NEW: FolderTemplates.ts` | Pre-defined folder structures |
| `NEW: DocumentMetadata.tsx` | Certificate metadata capture |

---

## Additional Recommendations

1. **QR Code Integration**: Generate QR codes linking to handover documents for physical equipment labels

2. **Mobile Upload App**: Capacitor integration for site electricians to upload test certificates directly from mobile

3. **Integration with Cable Verification Portal**: Auto-link verified cables to handover documentation

4. **PDF Report Enhancements**: Include document index in generated handover reports with hyperlinks

5. **Document Expiry Dashboard**: Alert panel for certificates nearing expiry (annual COCs, calibration certs)
