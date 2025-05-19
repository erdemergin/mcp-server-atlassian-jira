/**
 * Re-exports from the modularized ADF utilities
 */

// Re-export from the new modular structure
export type { AdfNode, AdfDocument } from './adf/index.js';

export { adfToMarkdown, textToAdf, markdownToAdf } from './adf/index.js';

// Log initialization for backward compatibility
import { Logger } from './logger.util.js';
const adfLogger = Logger.forContext('utils/adf.util.ts');
adfLogger.debug('ADF utility initialized (using modular implementation)');
