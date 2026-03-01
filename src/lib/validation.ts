import { z } from 'zod';

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be under 100 characters'),
  schoolName: z.string().trim().min(2, 'School name must be at least 2 characters').max(200, 'School name must be under 200 characters'),
});

export const lessonPlanSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  classLevel: z.string().min(1, 'Class level is required'),
  topic: z.string().trim().min(1, 'Topic is required').max(200, 'Topic must be under 200 characters'),
  subTopic: z.string().trim().max(200, 'Sub-topic must be under 200 characters').optional(),
  duration: z.string().trim().max(50, 'Duration must be under 50 characters'),
  objectives: z.array(z.string().trim().max(500, 'Each objective must be under 500 characters')),
  entryBehaviour: z.string().trim().max(1000, 'Entry behaviour must be under 1000 characters').optional(),
  references: z.string().trim().max(500, 'References must be under 500 characters').optional(),
  evaluation: z.string().trim().max(2000, 'Evaluation must be under 2000 characters').optional(),
  assignment: z.string().trim().max(1000, 'Assignment must be under 1000 characters').optional(),
  steps: z.array(z.object({
    teacherActivity: z.string().trim().max(1000, 'Teacher activity must be under 1000 characters'),
    studentActivity: z.string().trim().max(1000, 'Student activity must be under 1000 characters'),
  })),
});

export type ValidationErrors = Record<string, string>;

export function validateField(schema: z.ZodObject<any>, field: string, value: unknown): string | null {
  try {
    const fieldSchema = schema.shape[field];
    if (fieldSchema) fieldSchema.parse(value);
    return null;
  } catch (e) {
    if (e instanceof z.ZodError) return e.errors[0]?.message || 'Invalid input';
    return null;
  }
}

export function validateAll(schema: z.ZodObject<any>, data: Record<string, unknown>): ValidationErrors {
  try {
    schema.parse(data);
    return {};
  } catch (e) {
    if (e instanceof z.ZodError) {
      const errors: ValidationErrors = {};
      e.errors.forEach(err => {
        const path = err.path.join('.');
        if (!errors[path]) errors[path] = err.message;
      });
      return errors;
    }
    return {};
  }
}
