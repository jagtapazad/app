# Auth-Gated App Testing Playbook

## Step 1: Create Test User & Session
```bash
mongosh --eval "
use('sagent_ai');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test Backend API
```bash
# Test auth endpoint
curl -X GET "${REACT_APP_BACKEND_URL}/api/auth/me" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# Test agents
curl -X GET "${REACT_APP_BACKEND_URL}/api/agents" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

## Step 3: Clean Test Data
```bash
mongosh --eval "
use('sagent_ai');
db.users.deleteMany({email: /test\.user\./});
db.user_sessions.deleteMany({session_token: /test_session/});
"
```
