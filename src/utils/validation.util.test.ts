import { z } from 'zod';
import { validateResponse, extractAndValidate } from './validation.util.js';
import { createApiError } from './error.util.js';

// Mock createApiError to test error handling
jest.mock('./error.util.js', () => ({
	createApiError: jest.fn().mockImplementation((message) => {
		throw new Error(`Mocked API Error: ${message}`);
	}),
}));

describe('Validation Utility', () => {
	// Define a simple schema for testing
	const TestSchema = z.object({
		id: z.number(),
		name: z.string(),
		isActive: z.boolean(),
	});

	// Save original NODE_ENV
	const originalEnv = process.env.NODE_ENV;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	afterAll(() => {
		// Restore original environment
		process.env.NODE_ENV = originalEnv;
	});

	describe('Basic validation', () => {
		it('should validate valid data correctly', () => {
			const testData = {
				id: 123,
				name: 'Test Item',
				isActive: true,
			};

			const result = validateResponse(
				testData,
				TestSchema,
				'test object',
			);
			expect(result).toEqual(testData);
		});
	});

	describe('Data extraction', () => {
		const ExtractSchema = z.object({
			id: z.number(),
			name: z.string(),
		});

		it('should extract fields from a larger object', () => {
			const fullObject = {
				id: 456,
				name: 'Extract Test',
				isActive: true,
				created: '2023-01-01',
			};

			const result = extractAndValidate(
				fullObject,
				ExtractSchema,
				'extract test',
			);
			expect(result).toEqual({
				id: 456,
				name: 'Extract Test',
			});
		});
	});
});
