/**
 * Report Type Registrations
 * 
 * This file imports and initializes all built-in report type registrations.
 * Each report type is defined in its own file for maintainability.
 */

// Import all registrations to trigger their registration
import './roadmapReview';
import './costReport';
import './tenantEvaluation';
import './generatorReport';
import './cableSchedule';
import './tenantCompletion';
import './payslip';
import './custom';

console.log('[PDFRegistry] All built-in report types registered');
