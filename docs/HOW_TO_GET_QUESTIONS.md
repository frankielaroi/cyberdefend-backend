# How to Get Questions for Anonymous Assessments

## 🎯 Quick Answer

To get questions for anonymous assessments, use this **public endpoint** (no authentication required):

```bash
GET /api/defendx/questions
```

---

## 📚 Available Endpoints

### 1. Get All Questions
```javascript
fetch('http://your-api-url/defendx/questions')
  .then(res => res.json())
  .then(data => {
    console.log(`Total questions: ${data.total}`);
    console.log(`Categories: ${data.categories.length}`);
  });
```

### 2. Get Questions by Category
```javascript
const categoryId = 'your-category-id';
fetch(`http://your-api-url/defendx/questions?categoryId=${categoryId}`)
  .then(res => res.json())
  .then(data => console.log(data));
```

### 3. Get All Categories
```javascript
fetch('http://your-api-url/defendx/questions/categories')
  .then(res => res.json())
  .then(data => {
    data.categories.forEach(cat => {
      console.log(`${cat.name}: ${cat.questionCount} questions`);
    });
  });
```

---

## 📦 Response Format

```json
{
  "total": 25,
  "categories": [
    {
      "category": {
        "id": "cat-uuid",
        "name": "Network Security",
        "description": "Network security best practices",
        "weight": 1.5,
        "order": 1
      },
      "questions": [
        {
          "id": "question-uuid",
          "text": "Do you have a firewall installed?",
          "type": "YES_NO",
          "description": "Firewalls help protect your network from unauthorized access",
          "weight": 1,
          "order": 1,
          "required": true,
          "options": [
            {
              "id": "option-uuid-1",
              "text": "Yes",
              "value": "yes",
              "order": 1
            },
            {
              "id": "option-uuid-2",
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

---

## 🔧 Implementation Examples

### React Hook
```javascript
import { useState, useEffect } from 'react';

function useAssessmentQuestions() {
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/defendx/questions')
      .then(res => res.json())
      .then(data => {
        setQuestions(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, []);

  return { questions, loading, error };
}

// Usage in component
function AssessmentForm() {
  const { questions, loading, error } = useAssessmentQuestions();

  if (loading) return <div>Loading questions...</div>;
  if (error) return <div>Error loading questions</div>;

  return (
    <div>
      {questions.categories.map(cat => (
        <div key={cat.category.id}>
          <h2>{cat.category.name}</h2>
          {cat.questions.map(q => (
            <div key={q.id}>
              <p>{q.text}</p>
              {/* Render question based on type */}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

### Vue.js Composition API
```javascript
import { ref, onMounted } from 'vue';

export function useAssessmentQuestions() {
  const questions = ref(null);
  const loading = ref(true);
  const error = ref(null);

  const fetchQuestions = async () => {
    try {
      const response = await fetch('/api/defendx/questions');
      questions.value = await response.json();
    } catch (err) {
      error.value = err;
    } finally {
      loading.value = false;
    }
  };

  onMounted(fetchQuestions);

  return { questions, loading, error };
}
```

### Vanilla JavaScript
```javascript
async function loadQuestions() {
  try {
    const response = await fetch('/api/defendx/questions');
    if (!response.ok) {
      throw new Error('Failed to fetch questions');
    }
    
    const data = await response.json();
    
    // Render questions
    renderQuestions(data);
    
    return data;
  } catch (error) {
    console.error('Error loading questions:', error);
    showError('Failed to load assessment questions');
  }
}

function renderQuestions(data) {
  const container = document.getElementById('questions-container');
  
  data.categories.forEach(categoryGroup => {
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'category';
    
    const categoryTitle = document.createElement('h2');
    categoryTitle.textContent = categoryGroup.category.name;
    categoryDiv.appendChild(categoryTitle);
    
    categoryGroup.questions.forEach(question => {
      const questionDiv = createQuestionElement(question);
      categoryDiv.appendChild(questionDiv);
    });
    
    container.appendChild(categoryDiv);
  });
}

function createQuestionElement(question) {
  const div = document.createElement('div');
  div.className = 'question';
  
  const questionText = document.createElement('p');
  questionText.textContent = question.text;
  if (question.required) {
    questionText.innerHTML += ' <span class="required">*</span>';
  }
  div.appendChild(questionText);
  
  // Add options based on question type
  if (question.type === 'YES_NO' || question.type === 'SINGLE_CHOICE') {
    const optionsDiv = document.createElement('div');
    question.options.forEach(option => {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = question.id;
      radio.value = option.value;
      label.appendChild(radio);
      label.appendChild(document.createTextNode(option.text));
      optionsDiv.appendChild(label);
    });
    div.appendChild(optionsDiv);
  }
  
  return div;
}

// Call on page load
document.addEventListener('DOMContentLoaded', loadQuestions);
```

---

## 📝 Question Types & How to Handle Them

### YES_NO
```javascript
{
  "type": "YES_NO",
  "options": [
    { "text": "Yes", "value": "yes" },
    { "text": "No", "value": "no" }
  ]
}
```
**Render as:** Radio buttons
**Answer format:** String (`"yes"` or `"no"`)

### SINGLE_CHOICE
```javascript
{
  "type": "SINGLE_CHOICE",
  "options": [...]
}
```
**Render as:** Radio buttons or dropdown
**Answer format:** String (option value)

### MULTIPLE_CHOICE
```javascript
{
  "type": "MULTIPLE_CHOICE",
  "options": [...]
}
```
**Render as:** Checkboxes
**Answer format:** Array of strings (option values)

### SCALE
```javascript
{
  "type": "SCALE",
  "description": "Rate from 1 to 5"
}
```
**Render as:** Slider or number input (1-5)
**Answer format:** Number

### TEXT
```javascript
{
  "type": "TEXT"
}
```
**Render as:** Text input or textarea
**Answer format:** String

---

## ✅ Complete Flow

```javascript
// 1. Load questions
const questions = await fetch('/api/defendx/questions').then(r => r.json());

// 2. Generate session ID
const sessionId = crypto.randomUUID();

// 3. Create anonymous assessment
const assessment = await fetch('/api/defendx/assessments/anonymous', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId })
}).then(r => r.json());

// 4. User answers questions
const answers = {};
questions.categories.forEach(cat => {
  cat.questions.forEach(q => {
    answers[q.id] = getUserAnswer(q); // Your UI logic
  });
});

// 5. Submit responses
const responses = Object.entries(answers).map(([qId, answer]) => ({
  sessionId,
  questionId: qId,
  answer,
  timeSpent: 30
}));

await fetch(`/api/defendx/assessments/${assessment.id}/responses/bulk/anonymous`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId, responses })
});

// 6. Complete assessment
const result = await fetch(
  `/api/defendx/assessments/${assessment.id}/complete/anonymous`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId })
  }
).then(r => r.json());

console.log('Score:', result.score);
console.log('Tier:', result.tier);
```

---

## 🔍 Testing

### Using cURL
```bash
# Get all questions
curl http://localhost:3000/defendx/questions

# Get specific category
curl "http://localhost:3000/defendx/questions?categoryId=your-category-id"

# Get categories
curl http://localhost:3000/defendx/questions/categories
```

### Using Postman
1. Create a new GET request
2. URL: `http://localhost:3000/defendx/questions`
3. No authentication required
4. Send request
5. View JSON response

### Using Browser
Simply navigate to:
```
http://localhost:3000/defendx/questions
```

---

## 💡 Pro Tips

1. **Cache the questions** - They don't change often, so cache them in localStorage
2. **Show progress** - Use category structure to show progress (Category 1 of 5)
3. **Save answers** - Save user answers to localStorage to prevent data loss
4. **Validate required** - Check `question.required` field before submitting
5. **Group by category** - Display questions grouped by their category for better UX

---

## 📖 Full Documentation

For complete details, see:
- `docs/ANONYMOUS_ASSESSMENTS.md` - Full API documentation
- `docs/QUESTIONS_API_GUIDE.md` - Detailed questions API guide

---

## 🆘 Troubleshooting

**Q: Questions not loading?**
- Check API URL is correct
- Verify backend is running
- Check browser console for errors

**Q: Empty response?**
- Ensure questions are seeded in database
- Run: `npm run db:seed`

**Q: CORS errors?**
- Backend must allow your frontend origin
- Check CORS configuration in `main.ts`

---

## ✨ Key Points

- ✅ **No authentication required** for getting questions
- ✅ Questions are **grouped by category**
- ✅ Each question has a **type** (YES_NO, SCALE, etc.)
- ✅ **Options** are included for choice-type questions
- ✅ **Required** field indicates mandatory questions
- ✅ Questions are **ordered** by category and question order

Happy coding! 🚀
