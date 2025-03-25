/**
 * Default values for pagination across the application.
 * These values should be used consistently throughout the codebase.
 */

/**
 * Default page size for all list operations.
 * This value determines how many items are returned in a single page by default.
 */
export const DEFAULT_PAGE_SIZE = 25;

/**
 * Default values for project operations
 */
export const PROJECT_DEFAULTS = {
	/**
	 * Whether to include project components by default
	 */
	INCLUDE_COMPONENTS: true,

	/**
	 * Whether to include project versions by default
	 */
	INCLUDE_VERSIONS: true,
};

/**
 * Default values for issue operations
 */
export const ISSUE_DEFAULTS = {
	/**
	 * Whether to include issue fields by default
	 */
	INCLUDE_FIELDS: true,

	/**
	 * Whether to include issue changelog by default
	 */
	INCLUDE_CHANGELOG: false,

	/**
	 * Whether to include issue transitions by default
	 */
	INCLUDE_TRANSITIONS: false,
};

/**
 * Apply default values to options object.
 * This utility ensures that default values are consistently applied.
 *
 * @param options Options object that may have some values undefined
 * @param defaults Default values to apply when options values are undefined
 * @returns Options object with default values applied
 *
 * @example
 * const options = applyDefaults({ limit: 10 }, { limit: DEFAULT_PAGE_SIZE, includeDetails: true });
 * // Result: { limit: 10, includeDetails: true }
 */
export function applyDefaults<T extends Record<string, unknown>>(
	options: Partial<T>,
	defaults: T,
): T {
	return {
		...defaults,
		...Object.fromEntries(
			Object.entries(options).filter(([_, value]) => value !== undefined),
		),
	} as T;
}
