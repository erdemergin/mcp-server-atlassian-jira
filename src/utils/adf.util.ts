/**
 * Utility functions for converting Atlassian Document Format (ADF) to Markdown
 */

import { Logger } from './logger.util.js';
import { AdfDocument } from '../services/vendor.atlassian.issues.types.js';

// Create a contextualized logger for this file
const adfLogger = Logger.forContext('utils/adf.util.ts');

// Log ADF utility initialization
adfLogger.debug('ADF utility initialized');

/**
 * Interface for ADF node
 */
interface AdfNode {
	type: string;
	text?: string;
	content?: AdfNode[];
	attrs?: Record<string, unknown>;
	marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

/**
 * Convert Atlassian Document Format (ADF) to Markdown
 *
 * @param adf - The ADF content to convert (can be string or object)
 * @returns The converted Markdown content
 */
export function adfToMarkdown(adf: unknown): string {
	const methodLogger = Logger.forContext(
		'utils/adf.util.ts',
		'adfToMarkdown',
	);

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
		methodLogger.error(
			'[src/utils/adf.util.ts@adfToMarkdown] Error converting ADF to Markdown:',
			error,
		);
		return '*Error converting description format*';
	}
}

/**
 * Process ADF content nodes
 */
function processAdfContent(content: AdfNode[]): string {
	if (!content || !Array.isArray(content)) {
		return '';
	}

	return content.map((node) => processAdfNode(node)).join('\n\n');
}

/**
 * Process mention node
 */
function processMention(node: AdfNode): string {
	if (!node.attrs) {
		return '';
	}

	const text = node.attrs.text || node.attrs.displayName || '';
	if (!text) {
		return '';
	}

	// Format as @username to preserve the mention format
	// Remove any existing @ symbol to avoid double @@ in the output
	const cleanText =
		typeof text === 'string' && text.startsWith('@')
			? text.substring(1)
			: text;
	return `@${cleanText}`;
}

/**
 * Process a single ADF node
 */
function processAdfNode(node: AdfNode): string {
	if (!node || !node.type) {
		return '';
	}

	switch (node.type) {
		case 'paragraph':
			return processParagraph(node);
		case 'heading':
			return processHeading(node);
		case 'bulletList':
			return processBulletList(node);
		case 'orderedList':
			return processOrderedList(node);
		case 'listItem':
			return processListItem(node);
		case 'codeBlock':
			return processCodeBlock(node);
		case 'blockquote':
			return processBlockquote(node);
		case 'rule':
			return '---';
		case 'mediaGroup':
			return processMediaGroup(node);
		case 'table':
			return processTable(node);
		case 'text':
			return processText(node);
		case 'mention':
			return processMention(node);
		default:
			// For unknown node types, try to process content if available
			if (node.content) {
				return processAdfContent(node.content);
			}
			return '';
	}
}

/**
 * Process paragraph node
 */
function processParagraph(node: AdfNode): string {
	if (!node.content) {
		return '';
	}

	// Process each child node and join them with proper spacing
	return node.content
		.map((childNode, index) => {
			// Add a space between text nodes if needed
			const needsSpace =
				index > 0 &&
				childNode.type === 'text' &&
				node.content![index - 1].type === 'text' &&
				!childNode.text?.startsWith(' ') &&
				!node.content![index - 1].text?.endsWith(' ');

			return (needsSpace ? ' ' : '') + processAdfNode(childNode);
		})
		.join('');
}

/**
 * Process heading node
 */
function processHeading(node: AdfNode): string {
	if (!node.content || !node.attrs) {
		return '';
	}

	const level = typeof node.attrs.level === 'number' ? node.attrs.level : 1;
	const headingMarker = '#'.repeat(level);
	const content = node.content
		.map((childNode) => processAdfNode(childNode))
		.join('');

	return `${headingMarker} ${content}`;
}

/**
 * Process bullet list node
 */
function processBulletList(node: AdfNode): string {
	if (!node.content) {
		return '';
	}

	return node.content.map((item) => processAdfNode(item)).join('\n');
}

/**
 * Process ordered list node
 */
function processOrderedList(node: AdfNode): string {
	if (!node.content) {
		return '';
	}

	return node.content
		.map((item, index) => {
			const processedItem = processAdfNode(item);
			// Replace the first "- " with "1. ", "2. ", etc.
			return processedItem.replace(/^- /, `${index + 1}. `);
		})
		.join('\n');
}

/**
 * Process list item node
 */
function processListItem(node: AdfNode): string {
	if (!node.content) {
		return '';
	}

	const content = node.content
		.map((childNode) => {
			const processed = processAdfNode(childNode);
			// For nested lists, add indentation
			if (
				childNode.type === 'bulletList' ||
				childNode.type === 'orderedList'
			) {
				return processed
					.split('\n')
					.map((line) => `  ${line}`)
					.join('\n');
			}
			return processed;
		})
		.join('\n');

	return `- ${content}`;
}

/**
 * Process code block node
 */
function processCodeBlock(node: AdfNode): string {
	if (!node.content) {
		return '```\n```';
	}

	const language = node.attrs?.language || '';
	const code = node.content
		.map((childNode) => processAdfNode(childNode))
		.join('');

	return `\`\`\`${language}\n${code}\n\`\`\``;
}

/**
 * Process blockquote node
 */
function processBlockquote(node: AdfNode): string {
	if (!node.content) {
		return '';
	}

	const content = node.content
		.map((childNode) => processAdfNode(childNode))
		.join('\n\n');

	// Add > to each line
	return content
		.split('\n')
		.map((line) => `> ${line}`)
		.join('\n');
}

/**
 * Process media group node
 */
function processMediaGroup(node: AdfNode): string {
	if (!node.content) {
		return '';
	}

	return node.content
		.map((mediaNode) => {
			if (mediaNode.type === 'media' && mediaNode.attrs) {
				const { id, type } = mediaNode.attrs;
				if (type === 'file') {
					return `[Attachment: ${id}]`;
				} else if (type === 'link') {
					return `[External Link]`;
				}
			}
			return '';
		})
		.filter(Boolean)
		.join('\n');
}

/**
 * Process table node
 */
function processTable(node: AdfNode): string {
	if (!node.content) {
		return '';
	}

	const rows: string[][] = [];

	// Process table rows
	node.content.forEach((row) => {
		if (row.type === 'tableRow' && row.content) {
			const cells: string[] = [];

			row.content.forEach((cell) => {
				if (
					(cell.type === 'tableCell' ||
						cell.type === 'tableHeader') &&
					cell.content
				) {
					const cellContent = cell.content
						.map((cellNode) => processAdfNode(cellNode))
						.join('');
					cells.push(cellContent.trim());
				}
			});

			if (cells.length > 0) {
				rows.push(cells);
			}
		}
	});

	if (rows.length === 0) {
		return '';
	}

	// Create markdown table
	const columnCount = Math.max(...rows.map((row) => row.length));

	// Ensure all rows have the same number of columns
	const normalizedRows = rows.map((row) => {
		while (row.length < columnCount) {
			row.push('');
		}
		return row;
	});

	// Create header row
	const headerRow = normalizedRows[0].map((cell) => cell || '');

	// Create separator row
	const separatorRow = headerRow.map(() => '---');

	// Create content rows
	const contentRows = normalizedRows.slice(1);

	// Build the table
	const tableRows = [
		headerRow.join(' | '),
		separatorRow.join(' | '),
		...contentRows.map((row) => row.join(' | ')),
	];

	return tableRows.join('\n');
}

/**
 * Process text node
 */
function processText(node: AdfNode): string {
	if (!node.text) {
		return '';
	}

	let text = node.text;

	// Apply marks if available
	if (node.marks && node.marks.length > 0) {
		// Process link marks last to avoid issues with other formatting
		const linkMark = node.marks.find((mark) => mark.type === 'link');
		const otherMarks = node.marks.filter((mark) => mark.type !== 'link');

		// Apply non-link marks first
		otherMarks.forEach((mark) => {
			switch (mark.type) {
				case 'strong':
					text = `**${text}**`;
					break;
				case 'em':
					text = `*${text}*`;
					break;
				case 'code':
					text = `\`${text}\``;
					break;
				case 'strike':
					text = `~~${text}~~`;
					break;
				case 'underline':
					// Markdown doesn't support underline, use emphasis instead
					text = `_${text}_`;
					break;
			}
		});

		// Apply link mark last
		if (linkMark && linkMark.attrs && linkMark.attrs.href) {
			text = `[${text}](${linkMark.attrs.href})`;
		}
	}

	return text;
}

/**
 * Convert plain text to an Atlassian Document Format (ADF) document
 * This is useful for creating comments in Jira
 *
 * @param {string} text - Plain text to convert to ADF
 * @returns {AdfDocument} - ADF document object
 */
export function textToAdf(text: string): AdfDocument {
	// Split text into paragraphs
	const paragraphs = text.split('\n').filter((p) => p.trim() !== '');

	// Create ADF document structure
	return {
		version: 1,
		type: 'doc',
		content:
			paragraphs.length === 0
				? [{ type: 'paragraph', content: [] }] // Empty paragraph if no content
				: paragraphs.map((paragraph) => ({
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: paragraph,
							},
						],
					})),
	};
}

/**
 * Convert Markdown text to an Atlassian Document Format (ADF) document
 * Supports basic Markdown formatting including **bold**, *italic*, `code`, and line breaks
 *
 * @param {string} markdown - Markdown text to convert to ADF
 * @returns {AdfDocument} - ADF document object
 */
export function markdownToAdf(markdown: string): AdfDocument {
	const methodLogger = Logger.forContext(
		'utils/adf.util.ts',
		'markdownToAdf',
	);

	try {
		// Split text into paragraphs
		const paragraphs = markdown.split('\n').filter((p) => p !== '');

		// Create basic document structure
		const adfDoc: AdfDocument = {
			version: 1,
			type: 'doc',
			content: [],
		};

		// Process each paragraph
		for (const paragraph of paragraphs) {
			adfDoc.content.push({
				type: 'paragraph',
				content: parseMarkdownText(paragraph),
			});
		}

		methodLogger.debug(
			`Converted Markdown to ADF, length: ${JSON.stringify(adfDoc).length}`,
		);

		return adfDoc;
	} catch (error) {
		methodLogger.error('Error converting Markdown to ADF:', error);
		// Fall back to plain text if parsing fails
		return textToAdf(markdown);
	}
}

/**
 * Parse Markdown text into ADF nodes
 * Handles bold, italic, code, and plain text
 */
function parseMarkdownText(text: string): Array<{
	type: string;
	text?: string;
	marks?: Array<{ type: string }>;
}> {
	const result: Array<{
		type: string;
		text?: string;
		marks?: Array<{ type: string }>;
	}> = [];

	// Regex patterns for basic Markdown
	const patterns = [
		// Bold: **text**
		{ regex: /\*\*(.*?)\*\*/g, mark: 'strong' },
		// Italic: *text*
		{ regex: /\*(.*?)\*/g, mark: 'em' },
		// Code: `text`
		{ regex: /`(.*?)`/g, mark: 'code' },
	];

	// Track segments that have been processed
	let segments: Array<{
		text: string;
		start: number;
		end: number;
		marks: Array<{ type: string }>;
	}> = [{ text, start: 0, end: text.length - 1, marks: [] }];

	// Process each pattern
	for (const { regex, mark } of patterns) {
		const newSegments: typeof segments = [];

		for (const segment of segments) {
			let lastIndex = 0;
			const segmentText = segment.text;

			// Reset regex state
			regex.lastIndex = 0;

			let match;
			while ((match = regex.exec(segmentText)) !== null) {
				// Text before the match
				if (match.index > lastIndex) {
					newSegments.push({
						text: segmentText.substring(lastIndex, match.index),
						start: segment.start + lastIndex,
						end: segment.start + match.index - 1,
						marks: [...segment.marks],
					});
				}

				// The matched text (without markers)
				newSegments.push({
					text: match[1],
					start: segment.start + match.index,
					end: segment.start + match.index + match[0].length - 1,
					marks: [...segment.marks, { type: mark }],
				});

				lastIndex = match.index + match[0].length;
			}

			// Text after the last match
			if (lastIndex < segmentText.length) {
				newSegments.push({
					text: segmentText.substring(lastIndex),
					start: segment.start + lastIndex,
					end: segment.end,
					marks: [...segment.marks],
				});
			}
		}

		// If no matches were found, keep the original segments
		segments = newSegments.length > 0 ? newSegments : segments;
	}

	// Convert segments to ADF nodes
	for (const segment of segments) {
		if (segment.text.length > 0) {
			result.push({
				type: 'text',
				text: segment.text,
				...(segment.marks.length > 0 ? { marks: segment.marks } : {}),
			});
		}
	}

	return result.length > 0 ? result : [{ type: 'text', text: '' }];
}
