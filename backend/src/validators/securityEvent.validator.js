import { z } from 'zod';
import {
  SECURITY_EVENT_TYPES,
  SECURITY_EVENT_SEVERITIES,
  SECURITY_EVENT_STATUSES,
} from '../utils/securityEventStatus.js';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const createSecurityEventSchema = z
  .object({
    eventType: z
      .string({ required_error: 'eventType is required' })
      .trim()
      .min(1, 'eventType is required')
      .refine(
        (val) => SECURITY_EVENT_TYPES.includes(val) || val.length > 0,
        { message: 'Invalid eventType' }
      ),
    severity: z.enum(SECURITY_EVENT_SEVERITIES, {
      required_error: 'severity is required (LOW, MEDIUM, HIGH, CRITICAL)',
      invalid_type_error: 'severity must be LOW, MEDIUM, HIGH, or CRITICAL',
    }),
    status: z
      .enum(SECURITY_EVENT_STATUSES, {
        invalid_type_error: 'status must be OPEN, INVESTIGATING, or RESOLVED',
      })
      .default('OPEN')
      .optional(),
    description: z
      .string({ required_error: 'description is required' })
      .trim()
      .min(3, 'description must be at least 3 characters')
      .max(2000, 'description must not exceed 2000 characters'),
    userId: z
      .string()
      .regex(uuidRegex, 'Invalid user ID format')
      .optional()
      .nullable(),
  })
  .strict();

const updateSecurityEventStatusSchema = z
  .object({
    status: z.enum(SECURITY_EVENT_STATUSES, {
      required_error: 'status is required',
      invalid_type_error: 'status must be OPEN, INVESTIGATING, or RESOLVED',
    }),
  })
  .strict();

export const validateCreateSecurityEvent = (data) => {
  return createSecurityEventSchema.safeParse(data);
};

export const validateUpdateSecurityEventStatus = (data) => {
  return updateSecurityEventStatusSchema.safeParse(data);
};
