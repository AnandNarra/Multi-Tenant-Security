import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = `http://localhost:${process.env.PORT || 5000}/api`;

const testResults = [];

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    testResults.push({ message, status: 'PASS' });
  } else {
    console.error(`❌ FAIL: ${message}`);
    testResults.push({ message, status: 'FAIL' });
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE VERIFICATION TESTS ---');

  const randomSuffix = Math.floor(Math.random() * 1000000);
  const orgAEmail = `admin_a_${randomSuffix}@example.com`;
  const orgBEmail = `admin_b_${randomSuffix}@example.com`;
  const userAEmail = `user_a_${randomSuffix}@example.com`;

  // 1. Register Organization A
  console.log('\n1. Registering Organization A...');
  const regARes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organizationName: `Org A ${randomSuffix}`,
      organizationEmail: orgAEmail,
      password: 'Password123!',
    }),
  });
  const regAData = await regARes.json();
  if (!regARes.ok) console.error('Register A error:', regAData);
  assert(regARes.status === 201 && regAData.success, 'Organization A registered successfully');

  // 2. Login as Admin A
  console.log('\n2. Logging in as Admin A...');
  const loginARes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: orgAEmail,
      password: 'Password123!',
    }),
  });
  const loginAData = await loginARes.json();
  assert(loginARes.status === 200 && loginAData.success, 'Admin A logged in successfully');
  const tokenA = loginAData.data.accessToken;

  // 3. Failed Login Test (to verify LOGIN_FAILED security event & audit log)
  console.log('\n3. Testing failed login attempt...');
  const failedLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: orgAEmail,
      password: 'WrongPassword!',
    }),
  });
  assert(failedLoginRes.status === 401, 'Failed login returns 401');

  // 4. Create Security Event (Admin A)
  console.log('\n4. Creating Security Event...');
  const createEventRes = await fetch(`${BASE_URL}/security-events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      eventType: 'SUSPICIOUS_ACTIVITY',
      severity: 'HIGH',
      status: 'OPEN',
      description: 'Multiple failed password attempts detected on gateway',
    }),
  });
  const createEventData = await createEventRes.json();
  assert(createEventRes.status === 201 && createEventData.success, 'Security event created by Admin A');
  const eventId = createEventData.data.event.id;

  // 5. List Security Events with Pagination & Filter
  console.log('\n5. Listing Security Events with filters & pagination...');
  const listEventsRes = await fetch(`${BASE_URL}/security-events?page=1&limit=10&severity=HIGH`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const listEventsData = await listEventsRes.json();
  assert(listEventsRes.status === 200 && listEventsData.success, 'Security events listed successfully');
  assert(listEventsData.data.pagination.page === 1, 'Pagination page matches');
  assert(Array.isArray(listEventsData.data.events), 'Events list is array');

  // 6. Update Security Event Status (Valid: OPEN -> INVESTIGATING)
  console.log('\n6. Updating Security Event status: OPEN -> INVESTIGATING...');
  const updateStatus1Res = await fetch(`${BASE_URL}/security-events/${eventId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({ status: 'INVESTIGATING' }),
  });
  const updateStatus1Data = await updateStatus1Res.json();
  assert(updateStatus1Res.status === 200 && updateStatus1Data.data.event.status === 'INVESTIGATING', 'Security event updated to INVESTIGATING');

  // 7. Update Security Event Status (Valid: INVESTIGATING -> RESOLVED)
  console.log('\n7. Updating Security Event status: INVESTIGATING -> RESOLVED...');
  const updateStatus2Res = await fetch(`${BASE_URL}/security-events/${eventId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({ status: 'RESOLVED' }),
  });
  const updateStatus2Data = await updateStatus2Res.json();
  assert(updateStatus2Res.status === 200 && updateStatus2Data.data.event.status === 'RESOLVED', 'Security event resolved');

  // 8. Invalid Status Transition (RESOLVED -> OPEN => 422)
  console.log('\n8. Testing invalid status transition: RESOLVED -> OPEN...');
  const invalidStatusRes = await fetch(`${BASE_URL}/security-events/${eventId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({ status: 'OPEN' }),
  });
  assert(invalidStatusRes.status === 422, 'Invalid transition RESOLVED -> OPEN returns 422');

  // 9. Admin creates user in Org A (triggers USER_CREATED audit log)
  console.log('\n9. Admin A creating a regular user (triggers USER_CREATED audit)...');
  const createUserRes = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      name: 'User A',
      email: userAEmail,
      password: 'UserPassword123!',
      role: 'USER',
    }),
  });
  const createUserData = await createUserRes.json();
  assert(createUserRes.status === 201 && createUserData.success, 'User created by Admin A');
  const userAId = createUserData.data.user.id;

  // 10. Campaign CRUD Actions (triggers CAMPAIGN_* audit logs)
  console.log('\n10. Admin A performing campaign operations (triggers CAMPAIGN audit logs)...');
  // Create Campaign
  const createCampRes = await fetch(`${BASE_URL}/campaigns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      name: 'Q4 Marketing Blitz',
      description: 'Audit test campaign',
      status: 'DRAFT',
    }),
  });
  const createCampData = await createCampRes.json();
  assert(createCampRes.status === 201 && createCampData.success, 'Campaign created');
  const campaignId = createCampData.data.campaign.id;

  // Update Campaign
  const updateCampRes = await fetch(`${BASE_URL}/campaigns/${campaignId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      name: 'Q4 Marketing Blitz Updated',
      status: 'ACTIVE',
    }),
  });
  assert(updateCampRes.status === 200, 'Campaign updated');

  // Assign User to Campaign
  const assignRes = await fetch(`${BASE_URL}/campaigns/${campaignId}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      userId: userAId,
    }),
  });
  assert(assignRes.status === 201, 'User assigned to campaign');

  // Remove User from Campaign
  const removeRes = await fetch(`${BASE_URL}/campaigns/${campaignId}/users/${userAId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
  });
  assert(removeRes.status === 200, 'User removed from campaign');

  // Delete Campaign
  const deleteCampRes = await fetch(`${BASE_URL}/campaigns/${campaignId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
  });
  assert(deleteCampRes.status === 200, 'Campaign deleted');

  // 11. Test User A permissions (USER role should get 403 on audit logs and security event creation)
  console.log('\n11. Logging in as regular User A to test 403 authorization...');
  const loginUserRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userAEmail,
      password: 'UserPassword123!',
    }),
  });
  const loginUserData = await loginUserRes.json();
  const tokenUserA = loginUserData.data.accessToken;

  const userViewAuditRes = await fetch(`${BASE_URL}/audit-logs`, {
    headers: { Authorization: `Bearer ${tokenUserA}` },
  });
  assert(userViewAuditRes.status === 403, 'USER role receives 403 on GET /api/audit-logs');

  const userCreateEventRes = await fetch(`${BASE_URL}/security-events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenUserA}`,
    },
    body: JSON.stringify({
      eventType: 'SECURITY_ALERT',
      severity: 'LOW',
      description: 'Attempted from user',
    }),
  });
  assert(userCreateEventRes.status === 403, 'USER role receives 403 on POST /api/security-events');

  // 12. Admin A retrieves Audit Logs
  console.log('\n12. Admin A viewing Audit Logs with filters and pagination...');
  const auditLogsRes = await fetch(`${BASE_URL}/audit-logs?page=1&limit=50`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const auditLogsData = await auditLogsRes.json();
  assert(auditLogsRes.status === 200 && auditLogsData.success, 'Audit logs retrieved by Admin A');
  assert(auditLogsData.data.logs.length > 0, 'Audit logs are not empty');

  const actionsFound = auditLogsData.data.logs.map((l) => l.action);
  console.log('Found audit actions:', actionsFound);
  assert(actionsFound.includes('LOGIN_SUCCESS'), 'LOGIN_SUCCESS audit log exists');
  assert(actionsFound.includes('LOGIN_FAILED'), 'LOGIN_FAILED audit log exists');
  assert(actionsFound.includes('USER_CREATED'), 'USER_CREATED audit log exists');
  assert(actionsFound.includes('CAMPAIGN_CREATED'), 'CAMPAIGN_CREATED audit log exists');
  assert(actionsFound.includes('CAMPAIGN_UPDATED'), 'CAMPAIGN_UPDATED audit log exists');
  assert(actionsFound.includes('CAMPAIGN_USER_ASSIGNED'), 'CAMPAIGN_USER_ASSIGNED audit log exists');
  assert(actionsFound.includes('CAMPAIGN_USER_REMOVED'), 'CAMPAIGN_USER_REMOVED audit log exists');
  assert(actionsFound.includes('CAMPAIGN_DELETED'), 'CAMPAIGN_DELETED audit log exists');

  // Test single audit log retrieval
  const singleAuditId = auditLogsData.data.logs[0].id;
  const singleAuditRes = await fetch(`${BASE_URL}/audit-logs/${singleAuditId}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const singleAuditData = await singleAuditRes.json();
  assert(singleAuditRes.status === 200 && singleAuditData.data.log.id === singleAuditId, 'Single audit log retrieved');

  // Test date validation: dateFrom > dateTo should return 422
  const invalidDateRes = await fetch(`${BASE_URL}/audit-logs?dateFrom=2026-12-31&dateTo=2026-01-01`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert(invalidDateRes.status === 422, 'Invalid date range dateFrom > dateTo returns 422');

  // 13. Organization Isolation Test (Register Org B and check)
  console.log('\n13. Testing Organization Isolation with Organization B...');
  const regBRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organizationName: `Org B ${randomSuffix}`,
      organizationEmail: orgBEmail,
      password: 'Password123!',
    }),
  });
  const regBData = await regBRes.json();
  if (!regBRes.ok) console.error('Register B error:', regBData);
  assert(regBRes.status === 201, 'Organization B registered');

  const loginBRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: orgBEmail,
      password: 'Password123!',
    }),
  });
  const loginBData = await loginBRes.json();
  const tokenB = loginBData.data.accessToken;

  // Org B queries audit logs: should NOT see any of Org A's audit logs
  const auditLogsBRes = await fetch(`${BASE_URL}/audit-logs`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const auditLogsBData = await auditLogsBRes.json();
  const orgBLogIds = auditLogsBData.data.logs.map((l) => l.id);
  assert(!orgBLogIds.includes(singleAuditId), 'Org B cannot see Org A audit logs (Organization Isolation verified)');

  // Org B queries security events: should NOT see Org A security event
  const eventsBRes = await fetch(`${BASE_URL}/security-events`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const eventsBData = await eventsBRes.json();
  const orgBEventIds = eventsBData.data.events.map((e) => e.id);
  assert(!orgBEventIds.includes(eventId), 'Org B cannot see Org A security events (Organization Isolation verified)');

  // Org B tries to fetch single security event of Org A by ID -> 404
  const crossOrgEventRes = await fetch(`${BASE_URL}/security-events/${eventId}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert(crossOrgEventRes.status === 404, 'Cross-org security event access returns 404');

  // Org B tries to fetch single audit log of Org A by ID -> 404
  const crossOrgAuditRes = await fetch(`${BASE_URL}/audit-logs/${singleAuditId}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert(crossOrgAuditRes.status === 404, 'Cross-org audit log access returns 404');

  console.log('\n========================================');
  console.log('🎉 ALL SECURITY & AUDIT LOG TESTS PASSED SUCCESSFULLY!');
  console.log('========================================');
}

runTests().catch((err) => {
  console.error('\n❌ Test execution encountered an error:', err);
  process.exit(1);
});
