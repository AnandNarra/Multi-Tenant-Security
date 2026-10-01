// User Model Schema / Interface definition
export const UserSchema = {
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'member', 'guest'], default: 'member' },
  organizationId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
};
