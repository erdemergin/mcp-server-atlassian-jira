/**
 * Converts plain text to Atlassian Document Format (ADF)
 */

import { Logger } from './logger.util.js';
import { AdfDocument, AdfNode } from './adf-types.util.js';

const fromTextLogger = Logger.forContext('utils/adf-from-text.util.ts');

/**
 * Convert plain text to ADF
 *
 * @param text - Plain text to convert to ADF
 * @returns ADF document
 */
export function textToAdf(text: string): AdfDocument {
	const methodLogger = fromTextLogger.forMethod('textToAdf');

	try {
		if (!text) {
			// Return empty document
			return {
				version: 1,
				type: 'doc',
				content: [],
			};
		}

		// Split text into paragraphs
		const paragraphs = text.split(/\r?\n\r?\n/);

		// Convert each paragraph to an ADF node
		const content = paragraphs
			.map((paragraph) => {
				if (!paragraph.trim()) {
					return null; // Skip empty paragraphs
				}

				// Process paragraph line breaks
				const lines = paragraph.split(/\r?\n/);

				if (lines.length === 1) {
					// Simple paragraph
					return {
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: paragraph,
							},
						],
					};
				} else {
					// Paragraph with line breaks
					const textNodes = [];

					for (let i = 0; i < lines.length; i++) {
						// Add text node
						textNodes.push({
							type: 'text',
							text: lines[i],
						});

						// Add hard break if not the last line
						if (i < lines.length - 1) {
							textNodes.push({
								type: 'hardBreak',
							});
						}
					}

					return {
						type: 'paragraph',
						content: textNodes,
					};
				}
			})
			.filter(Boolean); // Remove nulls

		methodLogger.debug(
			`Converted text to ADF, paragraphs: ${content.length}`,
		);

		return {
			version: 1,
			type: 'doc',
			content: content as AdfNode[],
		};
	} catch (error) {
		methodLogger.error('Error converting text to ADF:', error);

		// Return a simple document with the error message
		return {
			version: 1,
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{
							type: 'text',
							text: 'Error converting text format',
						},
					],
				},
			],
		};
	}
}
