# Anonymous Assessment Quick Start Guide

## For Frontend Developers

### Getting Questions for Anonymous Assessments

You can fetch assessment questions **without authentication** using these public endpoints:

---

## 1️⃣ Get All Questions

```javascript
// Fetch all questions grouped by category
const response = await fetch('http://your-api-url/defendx/questions');
const data = await response.json();

console.log(data);
// Output:
// {
//   "total": 25,
//   "categories": [
//     {
//       "category": {
//         "id": "cat-uuid",
//         "name": "Network Security",
//         "description": "Questions about network security",
//         "weight": 1.5,
//         "order": 1
//       },
//       "questions": [
//         {
//           "id": "q1",
//           "text": "Do you have a firewall?",
//           "type": "YES_NO",
//           "description": "Firewall protection info",
//           "weight": 1,
//           "order": 1,
//           "required": true,
//           "options": [
//             { "id": "opt1", "text": "Yes", "value": "yes", "order": 1 },
//             { "id": "opt2", "text": "No", "value": "no", "order": 2 }
//           ]
//         }
//       ]
//     }
//   ]
// }
```

---

## 2️⃣ Get Questions by Category

```javascript
// Filter questions by a specific category
const categoryId = 'your-category-id';
const response = await fetch(`http://your-api-url/defendx/questions?categoryId=${categoryId}`);
const data = await response.json();
```

---

## 3️⃣ Get Categories First (Optional)

```javascript
// Get all categories with question counts
const response = await fetch('http://your-api-url/defendx/questions/categories');
const data = await response.json();

console.log(data);
// Output:
// {
//   "total": 5,
//   "categories": [
//     {
//       "id": "cat-uuid",
//       "name": "Network Security",
//       "description": "Network security practices",
//       "weight": 1.5,
//       "order": 1,
//       "questionCount": 8
//     }
//   ]
// }
```

---

## 📋 Complete Example: React Component

```jsx
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

function AnonymousAssessment() {
  const [questions, setQuestions] = useState(null);
  const [answers, setAnswers] = useState({});
  const [sessionId, setSessionId] = useState(null);
  const [assessmentId, setAssessmentId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssessment();
  }, []);

  async function loadAssessment() {
    try {
      // Step 1: Get or generate session ID
      let sid = localStorage.getItem('assessment_session_id');
      if (!sid) {
        sid = uuidv4();
        localStorage.setItem('assessment_session_id', sid);
      }
      setSessionId(sid);

      // Step 2: Load questions
      const questionsRes = await fetch('/api/defendx/questions');
      const questionsData = await questionsRes.json();
      setQuestions(questionsData);

      // Step 3: Check if session exists
      const checkRes = await fetch(`/api/defendx/assessments/anonymous/check/${sid}`);
      const checkData = await checkRes.json();

      if (checkData.exists && !checkData.isExpired) {
        // Resume existing assessment
        setAssessmentId(checkData.assessmentId);
        console.log('Resuming existing assessment');
      } else {
        // Step 4: Create new assessment
        const createRes = await fetch('/api/defendx/assessments/anonymous', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sid })
        });
        const createData = await createRes.json();
        setAssessmentId(createData.id);
        console.log('Created new assessment');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading assessment:', error);
      setLoading(false);
    }
  }

  function handleAnswerChange(questionId, answer) {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  }

  async function submitAssessment() {
    if (!sessionId || !assessmentId) return;

    try {
      // Step 5: Submit all responses
      const responses = Object.entries(answers).map(([questionId, answer]) => ({
        sessionId,
        questionId,
        answer,
        timeSpent: 30 // You should track actual time
      }));

      const submitRes = await fetch(
        `/api/defendx/assessments/${assessmentId}/responses/bulk/anonymous`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, responses })
        }
      );

      if (!submitRes.ok) throw new Error('Failed to submit responses');

      // Step 6: Complete assessment
      const completeRes = await fetch(
        `/api/defendx/assessments/${assessmentId}/complete/anonymous`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        }
      );

      const results = await completeRes.json();
      console.log('Assessment completed:', results);

      // Show results to user and prompt for registration
      alert(`Assessment Complete! Your score: ${results.score}%`);
      
      // After user registers, transfer the assessment
      // await transferAssessment(sessionId, userId);

    } catch (error) {
      console.error('Error submitting assessment:', error);
    }
  }

  if (loading) return <div>Loading questions...</div>;

  return (
    <div className="assessment-container">
      <h1>Security Assessment</h1>
      
      {questions?.categories.map(categoryGroup => (
        <div key={categoryGroup.category.id} className="category-section">
          <h2>{categoryGroup.category.name}</h2>
          <p>{categoryGroup.category.description}</p>
          
          {categoryGroup.questions.map(question => (
            <div key={question.id} className="question">
              <h3>
                {question.text}
                {question.required && <span className="required">*</span>}
              </h3>
              {question.description && <p className="hint">{question.description}</p>}
              
              {question.type === 'YES_NO' && (
                <div className="options">
                  {question.options.map(option => (
                    <label key={option.id}>
                      <input
                        type="radio"
                        name={question.id}
                        value={option.value}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        checked={answers[question.id] === option.value}
                      />
                      {option.text}
                    </label>
                  ))}
                </div>
              )}
              
              {question.type === 'SCALE' && (
                <div className="scale">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={answers[question.id] || 3}
                    onChange={(e) => handleAnswerChange(question.id, parseInt(e.target.value))}
                  />
                  <span>{answers[question.id] || 3}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
      
      <button onClick={submitAssessment} className="submit-btn">
        Submit Assessment
      </button>
    </div>
  );
}

export default AnonymousAssessment;
```

---

## 🔄 Question Types

The API returns different question types:

### YES_NO
```json
{
  "type": "YES_NO",
  "options": [
    { "text": "Yes", "value": "yes" },
    { "text": "No", "value": "no" }
  ]
}
```
**Answer format:** `"yes"` or `"no"`

### SCALE
```json
{
  "type": "SCALE",
  "description": "Rate from 1 (poor) to 5 (excellent)"
}
```
**Answer format:** `1`, `2`, `3`, `4`, or `5` (number)

### MULTIPLE_CHOICE
```json
{
  "type": "MULTIPLE_CHOICE",
  "options": [
    { "text": "Option A", "value": "a" },
    { "text": "Option B", "value": "b" },
    { "text": "Option C", "value": "c" }
  ]
}
```
**Answer format:** `"a"`, `"b"`, or `"c"` (string)

### TEXT
```json
{
  "type": "TEXT",
  "description": "Provide a detailed answer"
}
```
**Answer format:** Any text string

---

## 📝 Submitting Answers

When submitting responses, use this format:

```javascript
{
  "sessionId": "your-session-uuid",
  "responses": [
    {
      "sessionId": "your-session-uuid",
      "questionId": "q1",
      "answer": "yes",           // String or number depending on question type
      "timeSpent": 30            // Optional: seconds spent on this question
    },
    {
      "sessionId": "your-session-uuid",
      "questionId": "q2",
      "answer": 4,
      "timeSpent": 45
    }
  ]
}
```

---

## ⚠️ Important Notes

1. **No Authentication Required** - Questions endpoint is public
2. **Session ID** - Must be valid UUID v4 format
3. **Question Order** - Questions are ordered by `category.order` then `question.order`
4. **Required Fields** - Check `question.required` field
5. **Options** - Not all questions have options (e.g., TEXT type)
6. **Security** - `isCorrect` field is NOT exposed in the API response

---

## 🎯 Best Practices

### 1. Cache Questions
```javascript
// Cache questions to avoid repeated API calls
const CACHE_KEY = 'assessment_questions';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

async function getQuestions() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) {
      return data;
    }
  }
  
  const response = await fetch('/api/defendx/questions');
  const data = await response.json();
  
  localStorage.setItem(CACHE_KEY, JSON.stringify({
    data,
    timestamp: Date.now()
  }));
  
  return data;
}
```

### 2. Track Progress
```javascript
// Save progress locally
function saveProgress(questionId, answer) {
  const progress = JSON.parse(localStorage.getItem('assessment_progress') || '{}');
  progress[questionId] = {
    answer,
    timestamp: Date.now()
  };
  localStorage.setItem('assessment_progress', JSON.stringify(progress));
}

// Load progress on page reload
function loadProgress() {
  return JSON.parse(localStorage.getItem('assessment_progress') || '{}');
}
```

### 3. Validate Before Submit
```javascript
function validateAnswers(questions, answers) {
  const errors = [];
  
  questions.categories.forEach(cat => {
    cat.questions.forEach(q => {
      if (q.required && !answers[q.id]) {
        errors.push(`Question "${q.text}" is required`);
      }
    });
  });
  
  return errors;
}
```

---

## 🚀 Quick Test

Test the API immediately:

```bash
# Get questions
curl http://localhost:3000/defendx/questions

# Get categories
curl http://localhost:3000/defendx/questions/categories

# Get questions by category
curl "http://localhost:3000/defendx/questions?categoryId=your-category-id"
```

---

## Need Help?

- Check full documentation: `docs/ANONYMOUS_ASSESSMENTS.md`
- API returns helpful error messages
- All endpoints return JSON
- Use browser DevTools Network tab to debug
