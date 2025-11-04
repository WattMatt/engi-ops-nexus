# PDF Export Documentation Index

## 📖 Documentation Files

All PDF exports in this application follow standardized guidelines. Choose the appropriate documentation based on your needs:

### For Developers Adding New PDF Exports

1. **[PDF_QUICK_START.md](./PDF_QUICK_START.md)** - Start here!
   - Quick copy-paste templates
   - Common patterns
   - 5-minute implementation guide

2. **[PDF_EXPORT_STANDARDS.md](./PDF_EXPORT_STANDARDS.md)** - Complete reference
   - Full implementation guide
   - Real-world examples
   - Best practices
   - Common mistakes to avoid

### For Developers Maintaining Existing Exports

3. **[pdfCoverPage.ts](./pdfCoverPage.ts)** - Source code
   - Utility functions
   - TypeScript interfaces
   - JSDoc comments

## 🎯 Which Document Do I Need?

### "I'm adding a new PDF export feature"
→ Start with **PDF_QUICK_START.md**, copy a template, then refer to **PDF_EXPORT_STANDARDS.md** for details

### "I need to modify the cover page style"
→ Edit **pdfCoverPage.ts** (but read standards first!)

### "I want to see working examples"
→ Check these files:
- `src/components/tenant/GeneratorReportExportPDFButton.tsx`
- `src/components/cable-schedules/CableScheduleExportPDFButton.tsx`
- `src/components/cost-reports/ExportPDFButton.tsx`

### "I need to understand the requirements"
→ Read **PDF_EXPORT_STANDARDS.md**

## ⚠️ MANDATORY FOR ALL PDF EXPORTS

All PDF export features **MUST**:
1. Use `fetchCompanyDetails()` to get company info
2. Use `generateCoverPage()` for the first page
3. Follow the standardized format
4. Not create custom cover pages

## 🚀 Quick Links

- [Quick Start Guide](./PDF_QUICK_START.md)
- [Full Standards](./PDF_EXPORT_STANDARDS.md)
- [Source Code](./pdfCoverPage.ts)

## 📦 Existing PDF Exports

Current implementations:
- ✅ Generator Reports
- ✅ Cable Schedules
- ✅ Cost Reports
- ⚠️ Floor Plans (needs migration to standard format)
- ⚠️ Specifications (needs implementation)
- ⚠️ Final Accounts (needs implementation)
- ⚠️ Electrical Budgets (needs implementation)

## 🔍 Need Help?

1. Read the Quick Start Guide
2. Copy an existing implementation
3. Check the Standards document
4. Review the utility source code
