/**
 * Markdown utility functions for converting HTML to Markdown
 * Uses Turndown library for HTML to Markdown conversion
 *
 * @see https://github.com/mixmark-io/turndown
 */

import TurndownService from 'turndown';
import { Logger } from './logger.util.js';

// Create a contextualized logger for this file
const markdownLogger = Logger.forContext('utils/markdown.util.ts');

// Log markdown utility initialization
markdownLogger.debug('Markdown utility initialized');

// Create a singleton instance of TurndownService with default options
const turndownService = new TurndownService({
	headingStyle: 'atx', // Use # style headings
	bulletListMarker: '-', // Use - for bullet lists
	codeBlockStyle: 'fenced', // Use ``` for code blocks
	emDelimiter: '_', // Use _ for emphasis
	strongDelimiter: '**', // Use ** for strong
	linkStyle: 'inlined', // Use [text](url) for links
	linkReferenceStyle: 'full', // Use [text][id] + [id]: url for reference links
});

// Add custom rule for strikethrough
turndownService.addRule('strikethrough', {
	filter: ['del', 's', 'strike'],
	replacement: (content: string): string => `~~${content}~~`,
});

/**
 * Convert HTML content to Markdown
 *
 * @param html - The HTML content to convert
 * @returns The converted Markdown content
 */
export function htmlToMarkdown(html: string): string {
	const methodLogger = Logger.forContext(
		'utils/markdown.util.ts',
		'htmlToMarkdown',
	);

	if (!html || html.trim() === '') {
		return '';
	}

	try {
		const markdown = turndownService.turndown(html);
		methodLogger.debug(
			`Converted HTML (${html.length} chars) to Markdown (${markdown.length} chars)`,
		);
		return markdown;
	} catch (error) {
		methodLogger.error('Error converting HTML to Markdown', error);
		// Return the original HTML if conversion fails
		return html;
	}
}
