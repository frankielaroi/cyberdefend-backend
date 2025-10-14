# Anonymous Assessment API Documentation

## Overview
The Anonymous Assessment feature allows users to complete security assessments without requiring authentication. After completion, users can register and claim their assessment results.

## Flow Diagram
```
1. Frontend generates UUID session ID
2. Create anonymous assessment → Returns assessment ID
3. Submit responses (multiple times allowed)
4. Complete assessment → Returns results
5. User registers/logs in
6. Transfer assessment → Links to user account
```

## API Endpoints

### 1. Get Assessment Questions (Public)
**Endpoint:** `GET /api/defendx/questions`

**Description:** Get all active assessment questions. No authentication required for anonymous assessments.

**Query Parameters:**
- `categoryId` (optional): Filter questions by category

**Response:**
```json
{
  "total": 25,
  "categories": [
    {
      "category": {
        "id": "cat-uuid",
        "name": "Network Security",
        "description": "Questions about network security practices",
        "weight": 1.5,
        "order": 1
      },
      "questions": [
        {
          "id": "q1",
          "text": "Do you have a firewall installed?",
          "type": "YES_NO",
          "description": "A firewall helps protect your network",
          "weight": 1,
          "order": 1,
          "required": true,
          "options": [
            {
              "id": "opt1",
              "text": "Yes",
              "value": "yes",
              "order": 1
            },
            {
              "id": "opt2",
              "text": "No",
              "value": "no",
              "order": 2
            }
          ]
        }
      ]
    }
  ]
}
```

### 2. Get Question Categories (Public)
**Endpoint:** `GET /api/defendx/questions/categories`

**Description:** Get all question categories with question counts.

**Response:**
```json
{
  "total": 5,
  "categories": [
    {
      "id": "cat-uuid",
      "name": "Network Security",
      "description": "Network security practices and controls",
      "weight": 1.5,
      "order": 1,
      "questionCount": 8
    },
    {
      "id": "cat-uuid-2",
      "name": "Access Control",
      "description": "User access and authentication controls",
      "weight": 1.2,
      "order": 2,
      "questionCount": 6
    }
  ]
}
```

### 3. Check Session Availability
**Endpoint:** `GET /api/defendx/assessments/anonymous/check/{sessionId}`

**Description:** Check if a session ID is already in use before creating an assessment.

**Response:**
```json
{
  "exists": false,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Session ID is available"
}
```

Or if exists:
```json
{
  "exists": true,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "assessmentId": "assessment-uuid",
  "status": "IN_PROGRESS",
  "isExpired": false,
  "createdAt": "2025-10-14T10:00:00Z",
  "expiresAt": "2025-10-16T10:00:00Z"
}
```

### 4. Create Anonymous Assessment
**Endpoint:** `POST /api/defendx/assessments/anonymous`

**Request Body:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "My Security Assessment",
  "type": "CSI_ASSESSMENT"
}
```

**Response:**
```json
{
  "id": "assessment-uuid",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "DRAFT",
  "createdAt": "2025-10-14T10:00:00Z",
  "isAnonymous": true
}
```

**Error Cases:**
- `400`: Invalid session ID format (must be UUID)
- `400`: Session ID already in use

### 5. Submit Anonymous Responses
**Endpoint:** `POST /api/defendx/assessments/{assessmentId}/responses/bulk/anonymous`

**Request Body:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "responses": [
    {
      "sessionId": "550e8400-e29b-41d4-a716-446655440000",
      "questionId": "q1",
      "answer": "Yes",
      "timeSpent": 30
    },
    {
      "sessionId": "550e8400-e29b-41d4-a716-446655440000",
      "questionId": "q2",
      "answer": 4,
      "timeSpent": 45
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "submitted": 2,
  "assessmentId": "assessment-uuid",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Cases:**
- `404`: Assessment not found or invalid session
- `403`: Invalid session ID
- `400`: Assessment has expired

### 6. Complete Anonymous Assessment
**Endpoint:** `POST /api/defendx/assessments/{assessmentId}/complete/anonymous`

**Request Body:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "assessmentId": "assessment-uuid",
  "score": 72.5,
  "tier": "MEDIUM",
  "completedAt": "2025-10-14T12:00:00Z",
  "responses": 20,
  "questionsCount": 20,
  "isAnonymous": true
}
```

**Error Cases:**
- `404`: Assessment not found
- `403`: Invalid session ID
- `400`: Assessment must be in progress to complete
- `400`: Assessment has expired

### 7. Transfer Anonymous Assessment (Authenticated)
**Endpoint:** `POST /api/defendx/assessments/transfer`

**Headers:**
```
Authorization: Bearer {jwt-token}
```

**Request Body:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-uuid",
  "organizationId": "org-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "assessmentId": "assessment-uuid",
  "transferredTo": {
    "userId": "user-uuid",
    "organizationId": "org-uuid"
  }
}
```

**Error Cases:**
- `404`: Assessment not found or already transferred
- `403`: User doesn't have access to organization
- `400`: Assessment has expired

## Session Management

### Session ID Generation
The frontend must generate a valid UUID v4 session ID:

```javascript
// Using crypto.randomUUID() (modern browsers)
const sessionId = crypto.randomUUID();

// Or using uuid library
import { v4 as uuidv4 } from 'uuid';
const sessionId = uuidv4();
```

### Session Expiration
- Anonymous assessments expire **48 hours** after creation
- Expired assessments cannot be completed or transferred
- Cleanup job runs hourly to remove expired assessments

### Session Storage
Store the session ID in:
- LocalStorage for persistence across page refreshes
- SessionStorage for single-session only
- Cookie for cross-domain scenarios

```javascript
// Save session
localStorage.setItem('assessment_session_id', sessionId);

// Retrieve session
const sessionId = localStorage.getItem('assessment_session_id');
```

## Frontend Integration Example

### Complete Flow
```javascript
import { v4 as uuidv4 } from 'uuid';

// Step 1: Generate or retrieve session ID
let sessionId = localStorage.getItem('assessment_session_id');
if (!sessionId) {
  sessionId = uuidv4();
  localStorage.setItem('assessment_session_id', sessionId);
}

// Step 2: Fetch assessment questions (no auth required)
const questionsResponse = await fetch('/api/defendx/questions');
const questionsData = await questionsResponse.json();
console.log(`Loaded ${questionsData.total} questions in ${questionsData.categories.length} categories`);

// Optional: Get categories first
const categoriesResponse = await fetch('/api/defendx/questions/categories');
const categoriesData = await categoriesResponse.json();

// Step 3: Check if session exists
const checkResponse = await fetch(
  `/api/defendx/assessments/anonymous/check/${sessionId}`
);
const checkData = await checkResponse.json();

let assessmentId;

if (checkData.exists && !checkData.isExpired) {
  // Resume existing assessment
  assessmentId = checkData.assessmentId;
} else {
  // Step 4: Create new anonymous assessment
  const createResponse = await fetch('/api/defendx/assessments/anonymous', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      title: 'My Security Assessment',
      type: 'CSI_ASSESSMENT'
    })
  });
  const createData = await createResponse.json();
  assessmentId = createData.id;
}

// Step 5: Submit responses (build from questionsData)
const userResponses = questionsData.categories.flatMap(cat => 
  cat.questions.map(q => ({
    sessionId,
    questionId: q.id,
    answer: getUserAnswerForQuestion(q), // Your logic to get user's answer
    timeSpent: getTimeSpentOnQuestion(q.id) // Track time spent
  }))
);

await fetch(`/api/defendx/assessments/${assessmentId}/responses/bulk/anonymous`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId,
    responses: userResponses
  })
});

// Step 6: Complete assessment
const completeResponse = await fetch(
  `/api/defendx/assessments/${assessmentId}/complete/anonymous`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId })
  }
);
const results = await completeResponse.json();

// Step 7: After user registers/logs in, transfer assessment
const token = localStorage.getItem('jwt_token');
await fetch('/api/defendx/assessments/transfer', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    sessionId,
    userId: currentUser.id,
    organizationId: currentUser.organizationId
  })
});

// Step 8: Clear session after transfer
localStorage.removeItem('assessment_session_id');
```

### Example: Displaying Questions to User

```javascript
// Fetch and display questions
async function loadAssessmentQuestions() {
  const response = await fetch('/api/defendx/questions');
  const data = await response.json();
  
  // Iterate through categories
  data.categories.forEach(categoryGroup => {
    const { category, questions } = categoryGroup;
    
    console.log(`\n=== ${category.name} ===`);
    console.log(category.description);
    
    questions.forEach((question, index) => {
      console.log(`\nQ${index + 1}. ${question.text}`);
      
      if (question.description) {
        console.log(`   ${question.description}`);
      }
      
      // Display options
      if (question.options && question.options.length > 0) {
        question.options.forEach(option => {
          console.log(`   ${option.order}. ${option.text}`);
        });
      }
      
      // Mark required questions
      if (question.required) {
        console.log('   * Required');
      }
    });
  });
  
  return data;
}

// Load questions by category
async function loadQuestionsByCategory(categoryId) {
  const response = await fetch(`/api/defendx/questions?categoryId=${categoryId}`);
  return await response.json();
}
```

## Security Considerations

### Rate Limiting
Implement rate limiting on anonymous endpoints:
- Max 5 anonymous assessments per IP per hour
- Max 100 response submissions per assessment
- Max 3 transfer attempts per session

### Session Validation
- All session IDs must be valid UUIDs
- Session IDs are unique and cannot be reused
- Expired sessions are automatically cleaned up

### Data Privacy
- Anonymous data is encrypted at rest
- No personally identifiable information is stored
- Sessions expire after 48 hours

### CORS Configuration
Ensure CORS allows requests from your frontend:
```typescript
// main.ts
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true
});
```

## Error Handling

### Common Errors

**Invalid Session ID Format**
```json
{
  "statusCode": 400,
  "message": "Invalid session ID format. Must be a valid UUID.",
  "error": "Bad Request"
}
```

**Session Already Exists**
```json
{
  "statusCode": 400,
  "message": "This session ID is already in use. Please generate a new session ID.",
  "error": "Bad Request"
}
```

**Session Expired**
```json
{
  "statusCode": 400,
  "message": "Assessment session has expired",
  "error": "Bad Request"
}
```

**Assessment Already Transferred**
```json
{
  "statusCode": 404,
  "message": "Anonymous assessment not found or already transferred",
  "error": "Not Found"
}
```

## Testing

### Manual Testing with cURL

```bash
# Get all questions (no auth required)
curl http://localhost:3000/defendx/questions

# Get questions by category
curl http://localhost:3000/defendx/questions?categoryId=your-category-id

# Get question categories
curl http://localhost:3000/defendx/questions/categories

# Generate a session ID
SESSION_ID=$(uuidgen)

# Check session
curl http://localhost:3000/defendx/assessments/anonymous/check/$SESSION_ID

# Create assessment
curl -X POST http://localhost:3000/defendx/assessments/anonymous \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\"}"

# Submit responses
curl -X POST http://localhost:3000/defendx/assessments/{assessment-id}/responses/bulk/anonymous \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\",\"responses\":[{\"sessionId\":\"$SESSION_ID\",\"questionId\":\"q1\",\"answer\":\"Yes\"}]}"

# Complete assessment
curl -X POST http://localhost:3000/defendx/assessments/{assessment-id}/complete/anonymous \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\"}"

# Transfer (after login)
curl -X POST http://localhost:3000/defendx/assessments/transfer \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\",\"userId\":\"user-id\"}"
```

## Monitoring & Maintenance

### Cleanup Jobs

**Hourly Cleanup** (Expired Assessments)
- Runs every hour via `@Cron`
- Removes assessments expired >48 hours
- Deletes associated responses

**Daily Cleanup** (Old Data)
- Runs at 2 AM daily
- Archives anonymous data >90 days
- Cleans up orphaned session data

### Metrics to Monitor
- Number of anonymous assessments created per day
- Average time to completion
- Transfer success rate
- Session expiration rate
- Cleanup job performance

## Troubleshooting

### Issue: "Session ID already exists" error
**Solution:** Check if the frontend is reusing the same session ID. Always generate a new UUID for each new assessment.

### Issue: Assessment expired before completion
**Solution:** Increase expiration time or implement a session refresh mechanism.

### Issue: Transfer fails after login
**Solution:** Verify the user has access to the organization specified in the transfer request.

### Issue: High number of abandoned sessions
**Solution:** Implement reminders or notifications to encourage completion.

## Future Enhancements

- [ ] Session refresh/extension API
- [ ] Partial save indicators
- [ ] Email notification for completion
- [ ] Admin dashboard for anonymous assessment analytics
- [ ] Rate limiting configuration
- [ ] Session migration between devices
