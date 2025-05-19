/**
 * Converts Atlassian Document Format (ADF) to Markdown
 */

import { Logger } from './logger.util.js';
import { AdfDocument } from './adf-types.util.js';
import { processAdfContent } from './adf-node-processors.util.js';

const toMarkdownLogger = Logger.forContext('utils/adf-to-markdown.util.ts');

/**
 * Convert Atlassian Document Format (ADF) to Markdown
 *
 * @param adf - The ADF content to convert (can be string or object)
 * @returns The converted Markdown content
 */
export function adfToMarkdown(adf: unknown): string {
	const methodLogger = toMarkdownLogger.forMethod('adfToMarkdown');

	try {
		// Handle empty or undefined input
		if (!adf) {
			return '';
		}

		// Parse ADF if it's a string
		let adfDoc: AdfDocument;
		if (typeof adf === 'string') {
			try {
				adfDoc = JSON.parse(adf);
			} catch {
				return adf; // Return as-is if not valid JSON
			}
		} else if (typeof adf === 'object') {
			adfDoc = adf as AdfDocument;
		} else {
			return String(adf);
		}

		// Check if it's a valid ADF document
		if (!adfDoc.content || !Array.isArray(adfDoc.content)) {
			return '';
		}

		// Process the document
		const markdown = processAdfContent(adfDoc.content);
		methodLogger.debug(
			`Converted ADF to Markdown, length: ${markdown.length}`,
		);
		return markdown;
	} catch (error) {
		methodLogger.error('Error converting ADF to Markdown:', error);
		return '*Error converting description format*';
	}
}
