import { adfToMarkdown } from '../utils/adf-to-markdown.util.js';
import {
	formatHeading,
	formatBulletList,
	formatSeparator,
	formatDate,
} from '../utils/formatter.util.js';

/**
 * Interface for Jira comment objects
 */
interface IssueComment {
	id: string;
	self: string;
	author?: {
		accountId: string;
		active: boolean;
		displayName: string;
		self: string;
	};
	body?: string | unknown; // ContentRepresentation
	created: string;
	updated: string;
	updateAuthor?: {
		accountId: string;
		active: boolean;
		displayName: string;
		self: string;
	};
	visibility?: {
		identifier: string;
		type: string;
		value: string;
	};
}

/**
 * Format a list of comments for a Jira issue
 *
 * @param comments - Array of comment objects from the Jira API
 * @param issueIdOrKey - ID or key of the issue the comments belong to
 * @param baseUrl - Optional base URL for the Jira instance
 * @returns Formatted string with comments in markdown format
 */
export function formatCommentsList(
	comments: IssueComment[],
	issueIdOrKey: string,
	baseUrl?: string,
): string {
	if (!comments || comments.length === 0) {
		return 'No comments found for this issue.';
	}

	const lines: string[] = [
		formatHeading(`Comments for Issue ${issueIdOrKey}`, 1),
		'',
	];

	// Format each comment
	comments.forEach((comment, index) => {
		// Format the author and date information
		const author = comment.author?.displayName || 'Anonymous';
		const createdDate = formatDate(comment.created);
		const updatedDate =
			comment.updated !== comment.created
				? ` (edited: ${formatDate(comment.updated)})`
				: '';

		lines.push(
			formatHeading(`${author} - ${createdDate}${updatedDate}`, 2),
		);

		// Format the comment body
		if (typeof comment.body === 'string') {
			lines.push(comment.body);
		} else if (typeof comment.body === 'object') {
			try {
				lines.push(adfToMarkdown(comment.body));
			} catch {
				lines.push('*Error rendering comment content*');
			}
		} else {
			lines.push('*Comment content not available*');
		}

		// Add comment ID and visibility information if available
		const commentProperties: Record<string, unknown> = {
			'Comment ID': comment.id,
		};

		if (comment.visibility) {
			commentProperties['Visibility'] =
				`${comment.visibility.type}: ${comment.visibility.value}`;
		}

		lines.push('');
		lines.push(formatBulletList(commentProperties));

		// Add separator between comments (except after the last one)
		if (index < comments.length - 1) {
			lines.push('');
			lines.push(formatSeparator());
			lines.push('');
		}
	});

	// Add link to view the issue if base URL is provided
	if (baseUrl) {
		lines.push('\n\n' + formatSeparator());
		lines.push(`*Information retrieved at: ${formatDate(new Date())}*`);
		const issueUrl = `${baseUrl}/browse/${issueIdOrKey}`;
		lines.push(`*View this issue in Jira: ${issueUrl}*`);
	}

	return lines.join('\n');
}

/**
 * Format a confirmation message for a newly added comment
 *
 * @param comment - The newly created comment object from the Jira API
 * @param issueIdOrKey - ID or key of the issue the comment was added to
 * @param baseUrl - Optional base URL for the Jira instance
 * @returns Formatted string with confirmation message in markdown format
 */
export function formatAddedCommentConfirmation(
	comment: IssueComment,
	issueIdOrKey: string,
	baseUrl?: string,
): string {
	const lines: string[] = [
		formatHeading(`Comment Added Successfully`, 1),
		'',
	];

	const author = comment.author?.displayName || 'Anonymous';
	const createdDate = formatDate(comment.created);

	lines.push(
		`Comment #${comment.id} was successfully added to issue ${issueIdOrKey}.`,
	);
	lines.push('');

	// Summary of the added comment
	lines.push(formatHeading('Comment Summary', 2));

	const commentProperties: Record<string, unknown> = {
		Author: author,
		Created: createdDate,
		'Comment ID': comment.id,
	};

	if (comment.visibility) {
		commentProperties['Visibility'] =
			`${comment.visibility.type}: ${comment.visibility.value}`;
	}

	lines.push(formatBulletList(commentProperties));

	// Add a preview of the comment text
	lines.push('');
	lines.push(formatHeading('Preview', 2));

	if (typeof comment.body === 'string') {
		// For plain text comments, show preview or full text if short
		const previewText =
			comment.body.length > 150
				? comment.body.substring(0, 150) + '...'
				: comment.body;
		lines.push(previewText);
	} else if (typeof comment.body === 'object') {
		// For ADF comments, try to convert and show preview
		try {
			const markdown = adfToMarkdown(comment.body);
			const previewText =
				markdown.length > 150
					? markdown.substring(0, 150) + '...'
					: markdown;
			lines.push(previewText);
		} catch {
			lines.push('*Preview not available for this comment format*');
		}
	} else {
		lines.push('*Comment content not available*');
	}

	// Add a footer with link if base URL is provided
	lines.push('\n\n' + formatSeparator());
	lines.push(`*Comment added at: ${formatDate(new Date())}*`);

	if (baseUrl) {
		const issueUrl = `${baseUrl}/browse/${issueIdOrKey}`;
		lines.push(`*View the issue in Jira: ${issueUrl}*`);
	}

	return lines.join('\n');
}
