/**
 * Converts Markdown to Atlassian Document Format (ADF)
 */

import { Logger } from './logger.util.js';
import { AdfDocument, AdfNode } from './adf-types.util.js';
import { textToAdf } from './adf-from-text.util.js';

const fromMarkdownLogger = Logger.forContext('utils/adf/from-markdown.ts');

/**
 * Convert Markdown text to an Atlassian Document Format (ADF) document
 * Supports a wide range of Markdown formatting:
 * - Headings (# text) converted to proper ADF heading nodes with levels 1-6
 * - Bold (**text**)
 * - Italic (*text*)
 * - Code (`text`)
 * - Strikethrough (~~text~~)
 * - Links ([text](url))
 * - Unordered lists (- item or * item)
 * - Ordered lists (1. item)
 * - Blockquotes (> text)
 * - Code blocks (```language\ncode\n```)
 * - Horizontal rules (---, ***, ___)
 * - Tables (| Column | Column |)
 *
 * @param markdown - Markdown text to convert to ADF
 * @returns ADF document object
 */
export function markdownToAdf(markdown: string): AdfDocument {
	const methodLogger = fromMarkdownLogger.forMethod('markdownToAdf');

	try {
		// Replace literal '\n' string with actual newlines
		const processedMarkdown = markdown.replace(/\\n/g, '\n');

		// Split text into paragraphs
		const paragraphs = processedMarkdown.split('\n');

		// Create basic document structure
		const adfDoc: AdfDocument = {
			version: 1,
			type: 'doc',
			content: [],
		};

		// Process paragraphs in a loop to handle multi-line structures
		for (let i = 0; i < paragraphs.length; i++) {
			const paragraph = paragraphs[i].trim();

			// Skip empty paragraphs
			if (paragraph === '') {
				continue;
			}

			// Handle headings (lines starting with # symbol)
			if (paragraph.startsWith('#')) {
				const headingMatch = paragraph.match(/^(#+)\s*(.+?)\s*$/);
				if (headingMatch) {
					// Get heading level (number of # symbols)
					const level = headingMatch[1].length;
					// Get heading text
					const headingText = headingMatch[2];

					// Create proper ADF heading node with appropriate level
					// Process inline markdown within heading text
					adfDoc.content.push({
						type: 'heading',
						attrs: { level },
						content: parseMarkdownText(headingText),
					});
				}
				continue;
			}

			// Handle code blocks (lines starting with ```)
			if (paragraph.startsWith('```')) {
				const language = paragraph.substring(3).trim();
				const codeLines = [];
				let j = i + 1;

				// Collect code lines until closing ```
				while (
					j < paragraphs.length &&
					!paragraphs[j].trim().startsWith('```')
				) {
					codeLines.push(paragraphs[j]);
					j++;
				}

				// Skip the closing ``` if found
				if (
					j < paragraphs.length &&
					paragraphs[j].trim().startsWith('```')
				) {
					j++;
				}

				// Update loop counter
				i = j - 1;

				// Create code block
				adfDoc.content.push({
					type: 'codeBlock',
					attrs: language ? { language } : {},
					content: [
						{
							type: 'text',
							text: codeLines.join('\n'),
						},
					],
				});
				continue;
			}

			// Handle horizontal rules
			if (/^(\*\*\*|---|_{3,})$/.test(paragraph)) {
				adfDoc.content.push({
					type: 'rule',
				});
				continue;
			}

			// Handle tables - detect a line that starts and ends with pipe
			if (
				paragraph.trim().startsWith('|') &&
				paragraph.trim().endsWith('|')
			) {
				// Look ahead to see if there's a separator row (|---|---|)
				const nextLine =
					i + 1 < paragraphs.length ? paragraphs[i + 1].trim() : '';
				const isSeparatorRow =
					nextLine.startsWith('|') &&
					nextLine.endsWith('|') &&
					/^\|[\s\-:|]+\|$/.test(
						nextLine.replace(/\|[^|]+/g, '|---'),
					);

				if (isSeparatorRow) {
					// This is a table
					// Extract rows starting with header, then separator, then data rows
					const tableRows = [];
					let j = i;

					// Collect all table rows (rows starting and ending with |)
					while (
						j < paragraphs.length &&
						paragraphs[j].trim().startsWith('|') &&
						paragraphs[j].trim().endsWith('|')
					) {
						tableRows.push(paragraphs[j].trim());
						j++;
					}

					// Update loop counter to skip processed rows
					i = j - 1;

					// Parse and create ADF table
					if (tableRows.length >= 2) {
						// Need at least header and separator
						const tableContent = parseMarkdownTable(tableRows);
						adfDoc.content.push(tableContent);
					}
					continue;
				}
			}

			// Handle blockquotes (lines starting with >)
			if (paragraph.startsWith('>')) {
				const quoteText = paragraph.substring(1).trim();
				adfDoc.content.push({
					type: 'blockquote',
					content: [
						{
							type: 'paragraph',
							content: parseMarkdownText(quoteText),
						},
					],
				});
				continue;
			}

			// Handle ordered lists (lines starting with number and period)
			if (/^\d+\.\s/.test(paragraph)) {
				// Extract all list items starting from this paragraph
				const listItems = [];
				let j = i;

				// Collect consecutive list items
				while (
					j < paragraphs.length &&
					/^\d+\.\s/.test(paragraphs[j].trim())
				) {
					const itemText = paragraphs[j]
						.trim()
						.replace(/^\d+\.\s/, '');
					listItems.push(itemText);
					j++;
				}

				// Update loop counter to skip processed items
				i = j - 1;

				// Create ordered list structure
				const orderedListContent = listItems.map((item) => ({
					type: 'listItem',
					content: [
						{
							type: 'paragraph',
							content: parseMarkdownText(item),
						},
					],
				}));

				adfDoc.content.push({
					type: 'orderedList',
					content: orderedListContent,
				});

				continue;
			}

			// Handle unordered lists (lines starting with - or *)
			if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
				// Extract all list items starting from this paragraph
				const listItems = [];
				let j = i;

				// Collect consecutive list items
				while (
					j < paragraphs.length &&
					(paragraphs[j].trim().startsWith('- ') ||
						paragraphs[j].trim().startsWith('* '))
				) {
					const itemText = paragraphs[j].trim().substring(2);
					listItems.push(itemText);
					j++;
				}

				// Update loop counter to skip processed items
				i = j - 1;

				// Create bullet list structure
				const bulletListContent = listItems.map((item) => ({
					type: 'listItem',
					content: [
						{
							type: 'paragraph',
							content: parseMarkdownText(item),
						},
					],
				}));

				adfDoc.content.push({
					type: 'bulletList',
					content: bulletListContent,
				});

				continue;
			}

			// Handle regular paragraphs with inline formatting
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
 * Handles inline formatting: bold, italic, code, strikethrough, and links
 */
function parseMarkdownText(text: string): Array<{
	type: string;
	text?: string;
	marks?: Array<{ type: string; attrs?: { [key: string]: string } }>;
}> {
	const result: Array<{
		type: string;
		text?: string;
		marks?: Array<{ type: string; attrs?: { [key: string]: string } }>;
	}> = [];

	// Regex patterns for inline Markdown formatting
	const patterns = [
		// Links: [text](url)
		{
			regex: /\[([^\]]+)\]\(([^)]+)\)/g,
			process: (match: RegExpExecArray) => ({
				type: 'text',
				text: match[1],
				marks: [
					{
						type: 'link',
						attrs: {
							href: match[2],
						},
					},
				],
			}),
		},
		// Bold: **text**
		{
			regex: /\*\*(.*?)\*\*/g,
			process: (match: RegExpExecArray) => ({
				type: 'text',
				text: match[1],
				marks: [{ type: 'strong' }],
			}),
		},
		// Italic: *text*
		{
			regex: /\*(.*?)\*/g,
			process: (match: RegExpExecArray) => ({
				type: 'text',
				text: match[1],
				marks: [{ type: 'em' }],
			}),
		},
		// Code: `text`
		{
			regex: /`(.*?)`/g,
			process: (match: RegExpExecArray) => ({
				type: 'text',
				text: match[1],
				marks: [{ type: 'code' }],
			}),
		},
		// Strikethrough: ~~text~~
		{
			regex: /~~(.*?)~~/g,
			process: (match: RegExpExecArray) => ({
				type: 'text',
				text: match[1],
				marks: [{ type: 'strike' }],
			}),
		},
	];

	// Process text with multiple patterns
	let remainingText = text;
	let nextStartIndex = Number.MAX_SAFE_INTEGER;
	let nextPattern = null;
	let nextMatch = null;

	// Find all pattern matches and their positions
	while (remainingText.length > 0) {
		nextStartIndex = Number.MAX_SAFE_INTEGER;
		nextPattern = null;
		nextMatch = null;

		// Find the next earliest match
		for (const pattern of patterns) {
			pattern.regex.lastIndex = 0;
			const match = pattern.regex.exec(remainingText);
			if (match && match.index < nextStartIndex) {
				nextStartIndex = match.index;
				nextPattern = pattern;
				nextMatch = match;
			}
		}

		// No more matches found
		if (!nextPattern || !nextMatch) {
			// Add remaining text as plain text
			if (remainingText.length > 0) {
				result.push({
					type: 'text',
					text: remainingText,
				});
			}
			break;
		}

		// Add text before the match as plain text
		if (nextStartIndex > 0) {
			result.push({
				type: 'text',
				text: remainingText.substring(0, nextStartIndex),
			});
		}

		// Add the formatted text
		result.push(nextPattern.process(nextMatch));

		// Update the remaining text
		remainingText = remainingText.substring(
			nextStartIndex + nextMatch[0].length,
		);
	}

	return result.length > 0 ? result : [{ type: 'text', text: text }];
}

/**
 * Parse a markdown table into an ADF table structure
 * @param tableRows - Array of table row strings including header, separator, and data rows
 * @returns ADF table node
 */
function parseMarkdownTable(tableRows: string[]): AdfNode {
	// Create the basic table structure
	const tableNode: AdfNode = {
		type: 'table',
		attrs: {
			isNumberColumnEnabled: false,
			layout: 'default',
		},
		content: [],
	};

	// Process each row
	tableRows.forEach((row, rowIndex) => {
		// Skip separator row (row index 1)
		if (rowIndex === 1) {
			return;
		}

		// Split the row into cells, removing first and last empty entries from split
		const cells = row
			.split('|')
			.slice(1, -1)
			.map((cell) => cell.trim());

		// Create a row node
		const rowNode: AdfNode = {
			type: 'tableRow',
			content: [],
		};

		// Process each cell
		cells.forEach((cellText) => {
			// Determine if this is a header cell (first row)
			const cellType = rowIndex === 0 ? 'tableHeader' : 'tableCell';

			// Create cell node
			const cellNode: AdfNode = {
				type: cellType,
				content: [
					{
						type: 'paragraph',
						content: parseMarkdownText(cellText),
					},
				],
			};

			// Add cell to row
			if (rowNode.content) {
				rowNode.content.push(cellNode);
			}
		});

		// Add row to table
		if (
			tableNode.content &&
			rowNode.content &&
			rowNode.content.length > 0
		) {
			tableNode.content.push(rowNode);
		}
	});

	return tableNode;
}
