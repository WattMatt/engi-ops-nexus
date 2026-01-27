// Dropbox Integration Components - Bi-directional file management
// Use these components throughout the app for consistent Dropbox integration

// File Import Components
export { ImportFromDropboxDialog } from './ImportFromDropboxDialog';
export { DropboxFileInput } from './DropboxFileInput';

// File Save Components  
export { DropboxSaveDialog } from './DropboxSaveDialog';
export { DropboxSaveButton } from './DropboxSaveButton';

// Legacy/Original components (still available)
export { SaveToDropboxButton } from './SaveToDropboxButton';
export { DropboxFolderPicker } from './DropboxFolderPicker';
export { DropboxBrowser } from './DropboxBrowser';
export { DropboxConnector } from './DropboxConnector';
export { DropboxConnectionBanner } from './DropboxConnectionBanner';
export { DropboxStatusIndicator } from './DropboxStatusIndicator';
export { DropboxActivityLogs } from './DropboxActivityLogs';
export { DropboxBackupSync } from './DropboxBackupSync';

/**
 * USAGE GUIDE:
 * 
 * == FOR IMPORTING FILES ==
 * 
 * Option 1: DropboxFileInput (Recommended for most cases)
 * A drop-in replacement for <input type="file"> that adds Dropbox import
 * 
 * ```tsx
 * <DropboxFileInput
 *   onFileSelect={(file) => handleFile(file)}
 *   allowedExtensions={['.xlsx', '.xls', '.csv']}
 *   accept=".xlsx,.xls,.csv"
 *   placeholder="Upload an Excel file or import from Dropbox"
 * />
 * ```
 * 
 * Option 2: ImportFromDropboxDialog (For custom integration)
 * Use when you need more control over the import flow
 * 
 * ```tsx
 * const [showDialog, setShowDialog] = useState(false);
 * 
 * <Button onClick={() => setShowDialog(true)}>
 *   Import from Dropbox
 * </Button>
 * 
 * <ImportFromDropboxDialog
 *   open={showDialog}
 *   onOpenChange={setShowDialog}
 *   onFileSelect={(file, content) => {
 *     // file: DropboxFile metadata
 *     // content: ArrayBuffer of file data
 *   }}
 *   allowedExtensions={['.pdf', '.xlsx']}
 * />
 * ```
 * 
 * == FOR SAVING/EXPORTING FILES ==
 * 
 * Option 1: DropboxSaveButton (Recommended for most cases)
 * A button that opens the save dialog
 * 
 * ```tsx
 * <DropboxSaveButton
 *   fileContent={pdfBlob}
 *   filename="report.pdf"
 *   contentType="application/pdf"
 *   onSuccess={(path) => console.log('Saved to:', path)}
 * />
 * ```
 * 
 * Option 2: DropboxSaveDialog (For custom integration)
 * Use when you need to control the dialog state
 * 
 * ```tsx
 * const [showDialog, setShowDialog] = useState(false);
 * 
 * <DropboxSaveDialog
 *   open={showDialog}
 *   onOpenChange={setShowDialog}
 *   fileContent={pdfBlob}
 *   filename="report.pdf"
 *   defaultFolder="/Projects/MyProject"
 * />
 * ```
 */