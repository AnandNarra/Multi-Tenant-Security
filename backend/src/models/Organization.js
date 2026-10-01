// Organization Model Schema / Interface definition
export const OrganizationSchema = {
  name: { type: String, required: true },
  domain: { type: String, required: true, unique: true },
  plan: { type: String, default: 'Standard' },
  membersCount: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now }
};
