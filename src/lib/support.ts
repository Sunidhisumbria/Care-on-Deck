import { z } from 'zod';

/** The Contact Us form, as the screen and the server both check it. */
export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(200),
  email: z.string().trim().min(1, 'Enter your email address.').email('Enter a valid email address.').max(320),
  subject: z.string().trim().min(3, 'Enter a subject.').max(200, 'Keep the subject under 200 characters.'),
  message: z.string().trim().min(10, 'Tell us a little more -- at least 10 characters.').max(5000, 'Keep the message under 5,000 characters.'),
});

export type ContactValues = z.infer<typeof contactSchema>;
