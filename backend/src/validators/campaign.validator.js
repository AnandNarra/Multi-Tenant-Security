import { z } from 'zod';

export const CAMPAIGN_STATUSES = ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

export const createCampaignSchema = z.object({
  name: z
    .string({ required_error: 'Campaign name is required' })
    .trim()
    .min(2, 'Campaign name must be at least 2 characters')
    .max(200, 'Campaign name cannot exceed 200 characters'),
  description: z.string().trim().nullable().optional(),
  status: z
    .enum(CAMPAIGN_STATUSES, {
      errorMap: () => ({ message: 'Status must be DRAFT, ACTIVE, COMPLETED, or CANCELLED' }),
    })
    .default('DRAFT')
    .optional(),
});

export const updateCampaignSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Campaign name must be at least 2 characters')
      .max(200, 'Campaign name cannot exceed 200 characters')
      .optional(),
    description: z.string().trim().nullable().optional(),
    status: z
      .enum(CAMPAIGN_STATUSES, {
        errorMap: () => ({ message: 'Status must be DRAFT, ACTIVE, COMPLETED, or CANCELLED' }),
      })
      .optional(),
  })
  .refine(
    (data) => {
      return (
        Object.keys(data).length > 0 &&
        Object.values(data).some((val) => val !== undefined)
      );
    },
    {
      message: 'At least one field is required',
    }
  );

export const assignUserSchema = z.object({
  userId: z
    .string({ required_error: 'User ID is required' })
    .uuid('Invalid user ID format'),
});

export const validateCreateCampaign = (data) => createCampaignSchema.safeParse(data);
export const validateUpdateCampaign = (data) => updateCampaignSchema.safeParse(data);
export const validateAssignUser = (data) => assignUserSchema.safeParse(data);
