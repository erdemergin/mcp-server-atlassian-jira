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

import { Logger } from './logger.util.js';
const logger = Logger.forContext('utils/defaults.util.ts');

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
export function applyDefaults<T extends object>(
	options: Partial<T>,
	defaults: Partial<T>,
): T {
	const methodLogger = logger.forMethod('applyDefaults');

	// Log input
	methodLogger.debug('Options:', options);
	methodLogger.debug('Defaults:', defaults);

	// Filter out undefined values from the provided options
	const definedOptions = Object.fromEntries(
		Object.entries(options).filter(([_, value]) => value !== undefined),
	);
	methodLogger.debug('Defined options:', definedOptions);

	// Merge defaults and defined options
	const result = {
		...defaults,
		...definedOptions,
	};

	// Log final result
	methodLogger.debug('Result:', result);

	return result as T;
}
