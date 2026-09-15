import { z } from 'zod';

export const dependentSchema = z.object({
  first_name: z.string().trim().min(1, 'Enter a first name').max(100),
  last_name: z.string().trim().min(1, 'Enter a last name').max(100),
  date_of_birth: z.string().min(1, 'Enter a date of birth').refine(value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T00:00:00Z');
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value &&
      value >= '1900-01-01' && value <= new Date().toISOString().slice(0, 10);
  }, 'Enter a valid date of birth that is not in the future'),
  gender: z.enum(['male', 'female', 'other'], { message: 'Select a gender' }),
  relationship: z.string().trim().min(1, 'Enter your relationship').max(40),
  phone: z.string().trim().max(20).refine(value => !value || /^\+?[\d\s().-]{7,20}$/.test(value), 'Enter a valid phone number'),
});
export type AddDependentInput = z.infer<typeof dependentSchema>;
