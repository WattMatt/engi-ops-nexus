// Platform detection
export { 
  getPlatform, 
  isNative, 
  isNativeIOS, 
  isNativeAndroid, 
  isWeb, 
  isPluginAvailable,
  getDeviceInfo 
} from './platform';

// Haptic feedback
export {
  lightImpact,
  mediumImpact,
  heavyImpact,
  successHaptic,
  warningHaptic,
  errorHaptic,
  selectionHaptic,
  vibrate,
} from './haptics';

// Native sharing
export { share, canShare } from './share';

// Filesystem operations
export {
  saveFile,
  readFile,
  deleteFile,
  listFiles,
  shareFile,
} from './filesystem';
