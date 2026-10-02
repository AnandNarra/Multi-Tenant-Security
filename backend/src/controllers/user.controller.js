import { and, eq, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { campaigns, campaignUsers } from '../db/schema/index.js';
import { createUser, getOrganizationUsers } from './admin.controller.js';

/**
 * Get Dashboard Data for USER role
 * Scoped to req.user.id and req.user.organizationId
 */
export const getUserDashboard = async (req, res) => {
  try {
    if (!req.user || !req.user.id || !req.user.organizationId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const userId = req.user.id;
    const organizationId = req.user.organizationId;

    // Fetch assigned campaigns for this authenticated user
    const assigned = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        description: campaigns.description,
        status: campaigns.status,
        createdAt: campaigns.createdAt,
        updatedAt: campaigns.updatedAt,
      })
      .from(campaigns)
      .innerJoin(campaignUsers, eq(campaignUsers.campaignId, campaigns.id))
      .where(
        and(
          eq(campaigns.organizationId, organizationId),
          eq(campaignUsers.userId, userId)
        )
      )
      .orderBy(desc(campaigns.updatedAt));

    const totalAssigned = assigned.length;
    const activeCount = assigned.filter((c) => c.status === 'ACTIVE').length;
    const completedCount = assigned.filter((c) => c.status === 'COMPLETED').length;

    const recentCampaigns = assigned.slice(0, 5);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role || 'USER',
        },
        stats: {
          assignedCampaigns: totalAssigned,
          activeCampaigns: activeCount,
          completedCampaigns: completedCount,
        },
        recentCampaigns,
      },
    });
  } catch (error) {
    console.error('Get user dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to process dashboard request',
    });
  }
};

export { createUser, getOrganizationUsers };
export default { getUserDashboard, createUser, getOrganizationUsers };
