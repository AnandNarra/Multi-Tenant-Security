import { z } from 'zod';

export const createUserSchema = z.object({
  name: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters'),
  email: z
    .string({ required_error: 'Email address is required' })
    .trim()
    .toLowerCase()
    .email('Invalid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long'),
  role: z.enum(['MANAGER', 'USER'], {
    errorMap: () => ({ message: 'Role must be either MANAGER or USER' }),
  }),
  status: z
    .enum(['ACTIVE', 'INACTIVE'], {
      errorMap: () => ({ message: 'Status must be either ACTIVE or INACTIVE' }),
    })
    .default('ACTIVE'),
});

export const validateCreateUser = (data) => {
  return createUserSchema.safeParse(data);
};
