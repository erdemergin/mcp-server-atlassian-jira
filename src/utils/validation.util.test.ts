import { z } from 'zod';

describe('Zod Schema Validation', () => {
	// Define a simple schema for testing
	const TestSchema = z.object({
		id: z.number(),
		name: z.string(),
		isActive: z.boolean(),
	});

	describe('Basic validation', () => {
		it('should validate valid data correctly', () => {
			const testData = {
				id: 123,
				name: 'Test Item',
				isActive: true,
			};

			const result = TestSchema.parse(testData);
			expect(result).toEqual(testData);
		});

		it('should throw when data is invalid', () => {
			const invalidData = {
				id: 'not-a-number' as any, // should be a number
				name: 'Test Item',
				isActive: true,
			};

			expect(() => {
				TestSchema.parse(invalidData);
			}).toThrow();
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

			const result = ExtractSchema.parse(fullObject);
			expect(result).toEqual({
				id: 456,
				name: 'Extract Test',
			});
		});

		it('should throw when required fields are missing', () => {
			const missingFieldsObject = {
				id: 789,
				// name is missing
				otherField: 'some value',
			};

			expect(() => {
				ExtractSchema.parse(missingFieldsObject);
			}).toThrow();
		});
	});
});
