/**
 * Formatter for Jira issue creation responses
 */

import {
	formatHeading,
	formatBulletList,
	formatUrl,
	formatDate,
	formatSeparator,
} from '../utils/formatter.util.js';
import {
	CreateMetaResponse,
	CreateMetaField,
	CreateIssueResponse,
} from '../services/vendor.atlassian.issues.types.js';

/**
 * Format create metadata response for display
 * @param metadata - Create metadata response from Jira API
 * @param projectKey - Project key for context
 * @returns Formatted string with create metadata in markdown format
 */
export function formatCreateMeta(
	metadata: CreateMetaResponse,
	projectKey: string,
): string {
	const lines: string[] = [];

	lines.push(formatHeading('Issue Creation Metadata', 1));
	lines.push(`Project: **${projectKey}**`);
	lines.push('');

	// Handle single issue type response (new API endpoint)
	if (metadata.fields && metadata.name) {
		lines.push(formatHeading(`Issue Type: ${metadata.name}`, 2));
		if (metadata.description) {
			lines.push(`*${metadata.description}*`);
			lines.push('');
		}

		lines.push(formatHeading('Required Fields', 3));
		const requiredFields = Object.entries(metadata.fields).filter(
			([, field]) => field.required,
		);
		lines.push(formatFieldList(requiredFields));

		lines.push('');
		lines.push(formatHeading('Optional Fields', 3));
		const optionalFields = Object.entries(metadata.fields).filter(
			([, field]) => !field.required,
		);
		lines.push(formatFieldList(optionalFields));
	}
	// Handle multiple issue types response (legacy API endpoint)
	else if (metadata.projects?.length) {
		const project = metadata.projects[0];
		lines.push(`**${project.name}** (${project.key})`);
		lines.push('');

		project.issuetypes.forEach((issueType, index) => {
			if (index > 0) {
				lines.push('');
				lines.push(formatSeparator());
				lines.push('');
			}

			lines.push(formatHeading(`${issueType.name}`, 2));
			lines.push(`**ID**: ${issueType.id}`);
			if (issueType.description) {
				lines.push(`**Description**: ${issueType.description}`);
			}
			lines.push(`**Subtask**: ${issueType.subtask ? 'Yes' : 'No'}`);
			lines.push('');

			lines.push(formatHeading('Required Fields', 3));
			const requiredFields = Object.entries(issueType.fields).filter(
				([, field]) => field.required,
			);
			lines.push(formatFieldList(requiredFields));

			lines.push('');
			lines.push(formatHeading('Optional Fields', 3));
			const optionalFields = Object.entries(issueType.fields).filter(
				([, field]) => !field.required,
			);
			if (optionalFields.length > 0) {
				lines.push(formatFieldList(optionalFields, true));
			} else {
				lines.push('*No optional fields available.*');
			}
		});
	} else {
		lines.push('*No issue types available for this project.*');
	}

	lines.push('');
	lines.push(formatSeparator());
	lines.push(`*Retrieved at: ${formatDate(new Date())}*`);

	return lines.join('\n');
}

/**
 * Format field list for display
 * @param fields - Array of field entries [fieldId, field]
 * @param limitOptional - Whether to limit optional fields display
 * @returns Formatted field list
 */
function formatFieldList(
	fields: [string, CreateMetaField][],
	limitOptional = false,
): string {
	if (fields.length === 0) {
		return '*None*';
	}

	const lines: string[] = [];

	// Limit optional fields to prevent overwhelming output
	const fieldsToShow = limitOptional ? fields.slice(0, 10) : fields;

	fieldsToShow.forEach(([fieldId, field]) => {
		const displayId = field.key || field.fieldId || fieldId;
		lines.push(`- **${field.name}** (\`${displayId}\`)`);

		const details: string[] = [];
		details.push(`Type: ${field.schema.type}`);

		if (field.schema.system) {
			details.push(`System: ${field.schema.system}`);
		}
		if (field.schema.custom) {
			details.push(`Custom: ${field.schema.custom}`);
		}

		if (field.allowedValues && Array.isArray(field.allowedValues)) {
			const values = field.allowedValues
				.slice(0, 5)
				.map((val: unknown) => {
					if (
						typeof val === 'object' &&
						val !== null &&
						'name' in val
					) {
						return String((val as { name: unknown }).name);
					}
					return String(val);
				});
			details.push(
				`Values: ${values.join(', ')}${field.allowedValues.length > 5 ? '...' : ''}`,
			);
		}

		if (field.defaultValue !== undefined && field.defaultValue !== null) {
			details.push(`Default: ${String(field.defaultValue)}`);
		}

		lines.push(`  ${details.join(' | ')}`);
	});

	if (limitOptional && fields.length > 10) {
		lines.push(`*... and ${fields.length - 10} more optional fields*`);
	}

	return lines.join('\n');
}

/**
 * Format create issue response for display
 * @param response - Create issue response from Jira API
 * @returns Formatted string with creation result in markdown format
 */
export function formatCreateIssueResponse(
	response: CreateIssueResponse,
): string {
	const lines: string[] = [];

	lines.push(formatHeading('✅ Issue Created Successfully', 1));
	lines.push('');

	const issueInfo = {
		'Issue Key': response.key,
		'Issue ID': response.id,
		'Jira URL': formatUrl(response.self, 'Open in Jira'),
		'Browse URL': formatUrl(
			response.self.replace('/rest/api/3/issue/', '/browse/'),
			'View in Browser',
		),
	};

	lines.push(formatBulletList(issueInfo));

	// Handle transition status if present
	if (response.transition) {
		lines.push('');
		lines.push(formatHeading('Creation Status', 2));
		lines.push(`Status Code: ${response.transition.status}`);

		if (response.transition.errorCollection) {
			const errors = response.transition.errorCollection;
			if (errors.errorMessages?.length) {
				lines.push('');
				lines.push('**Warnings:**');
				errors.errorMessages.forEach((msg) => {
					lines.push(`- ${msg}`);
				});
			}
			if (errors.errors && Object.keys(errors.errors).length > 0) {
				lines.push('');
				lines.push('**Field Errors:**');
				Object.entries(errors.errors).forEach(([field, error]) => {
					lines.push(`- **${field}**: ${error}`);
				});
			}
		}
	}

	lines.push('');
	lines.push(formatSeparator());
	lines.push(`*Issue created at: ${formatDate(new Date())}*`);

	return lines.join('\n');
}
