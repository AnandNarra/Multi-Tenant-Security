import { z } from 'zod';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../utils/auditActions.js';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const auditLogQuerySchema = z
  .object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .refine((val) => !isNaN(val) && val >= 1, {
        message: 'page must be an integer greater than or equal to 1',
      }),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 20))
      .refine((val) => !isNaN(val) && val >= 1 && val <= 100, {
        message: 'limit must be an integer between 1 and 100',
      }),
    action: z
      .string()
      .trim()
      .optional()
      .refine(
        (val) => !val || Object.values(AUDIT_ACTIONS).includes(val) || val.length > 0,
        { message: 'Invalid audit action' }
      ),
    resourceType: z
      .string()
      .trim()
      .optional()
      .refine(
        (val) => !val || Object.values(AUDIT_RESOURCE_TYPES).includes(val) || val.length > 0,
        { message: 'Invalid resourceType' }
      ),
    userId: z
      .string()
      .regex(uuidRegex, 'Invalid user ID format')
      .optional(),
    dateFrom: z
      .string()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: 'dateFrom must be a valid ISO date format',
      }),
    dateTo: z
      .string()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: 'dateTo must be a valid ISO date format',
      }),
  })
  .refine(
    (data) => {
      if (data.dateFrom && data.dateTo) {
        return new Date(data.dateFrom) <= new Date(data.dateTo);
      }
      return true;
    },
    {
      message: 'dateFrom cannot be later than dateTo',
      path: ['dateFrom'],
    }
  );

export const validateAuditLogQuery = (params) => {
  return auditLogQuerySchema.safeParse(params);
};
