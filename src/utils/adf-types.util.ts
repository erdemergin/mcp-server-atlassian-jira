/**
 * Type definitions for Atlassian Document Format (ADF) processing
 */

import { AdfDocument as ImportedAdfDocument } from '../services/vendor.atlassian.issues.types.js';

/**
 * Interface for ADF node
 */
export interface AdfNode {
	type: string;
	text?: string;
	content?: AdfNode[];
	attrs?: Record<string, unknown>;
	marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

// Re-export the imported type
export type AdfDocument = ImportedAdfDocument;
