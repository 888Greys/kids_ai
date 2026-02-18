# API Contracts (MVP v1)

Base path: `/api/v1`  
Content type: `application/json`  
Auth: `Authorization: Bearer <token>` (parent session token)

## 1. Contract Rules
- All IDs are UUID strings.
- Time values use ISO-8601 UTC timestamps.
- Numeric learning scores are `0..100`.
- Endpoints are parent-scoped: parent can only access linked children.

## 2. Shared Error Shape
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "childId is required",
    "details": [
      { "field": "childId", "reason": "missing" }
    ]
  }
}
```

## 3. Student Session APIs

### 3.1 Start Session
`POST /sessions`

Request:
```json
{
  "childId": "uuid",
  "mode": "practice",
  "focusTopicCode": "G4-MATH-FRC-001",
  "aiModel": "gpt-5-mini",
  "promptVersion": "math-v1.0"
}
```

Response `201`:
```json
{
  "sessionId": "uuid",
  "childId": "uuid",
  "mode": "practice",
  "focusTopic": {
    "id": "uuid",
    "topicCode": "G4-MATH-FRC-001",
    "title": "Equivalent Fractions"
  },
  "startedAt": "2026-02-18T14:00:00Z"
}
```

Validation:
- `mode` in `practice|challenge|revision`.
- `focusTopicCode` must exist and be grade-appropriate for child.

### 3.2 Generate Next Question
`POST /sessions/{sessionId}/questions:generate`

Request:
```json
{
  "childId": "uuid",
  "targetDifficulty": "adaptive",
  "maxHints": 3
}
```

Response `201`:
```json
{
  "questionId": "uuid",
  "sessionId": "uuid",
  "topic": {
    "id": "uuid",
    "topicCode": "G4-MATH-FRC-001",
    "title": "Equivalent Fractions",
    "strand": "Numbers",
    "subStrand": "Fractions"
  },
  "difficulty": "adaptive",
  "questionText": "Which fraction is equivalent to 1/2?",
  "answerFormat": "multiple_choice",
  "options": ["2/4", "3/5", "4/5"],
  "hintCount": 3,
  "createdAt": "2026-02-18T14:02:10Z"
}
```

Generation requirements:
- Must include KICD topic tag in payload.
- Must be a fresh item (no duplicate question text in same session).
- Backend stores `correct_answer`, `hint_ladder`, `explanation` server-side.

### 3.3 Get Progressive Hint
`POST /questions/{questionId}/hints`

Request:
```json
{
  "childId": "uuid",
  "hintLevel": 1
}
```

Response `200`:
```json
{
  "questionId": "uuid",
  "hintLevel": 1,
  "hintText": "Think about multiplying both numerator and denominator by the same number."
}
```

Validation:
- `hintLevel` must be `1..3`.
- Cannot request level 2 before level 1 (same for level 3).

### 3.4 Submit Attempt
`POST /questions/{questionId}/attempts`

Request:
```json
{
  "childId": "uuid",
  "submittedAnswer": { "value": "2/4" },
  "hintsUsed": 1,
  "responseTimeSeconds": 18
}
```

Response `201`:
```json
{
  "attemptId": "uuid",
  "isCorrect": true,
  "feedbackText": "Great job. 2/4 is equal to 1/2.",
  "explanation": "Equivalent fractions represent the same value.",
  "masteryUpdate": {
    "topicId": "uuid",
    "topicCode": "G4-MATH-FRC-001",
    "accuracyPercent": 78.5,
    "hintDependencyPercent": 22.0,
    "masteryScore": 74.3,
    "proficiency": "developing"
  },
  "sessionProgress": {
    "totalQuestions": 4,
    "correctAnswers": 3,
    "avgHintsUsed": 0.75
  },
  "nextRecommendedDifficulty": "medium"
}
```

Behavior:
- Attempt writes to `question_attempts`.
- Session aggregates update in `learning_sessions`.
- Daily topic row updates/inserts in `mastery_snapshots`.

### 3.5 End Session
`POST /sessions/{sessionId}/complete`

Request:
```json
{
  "childId": "uuid",
  "engagementScore": 82.4
}
```

Response `200`:
```json
{
  "sessionId": "uuid",
  "endedAt": "2026-02-18T14:12:45Z",
  "summary": {
    "totalQuestions": 8,
    "correctAnswers": 6,
    "avgHintsUsed": 1.12
  }
}
```

## 4. Parent Dashboard APIs

### 4.1 List Parent Children
`GET /parent/children`

Response `200`:
```json
{
  "children": [
    {
      "childId": "uuid",
      "firstName": "Amina",
      "gradeLevel": 4
    }
  ]
}
```

### 4.2 Child Dashboard Summary
`GET /parent/children/{childId}/dashboard?days=7`

Response `200`:
```json
{
  "child": {
    "childId": "uuid",
    "name": "Amina",
    "gradeLevel": 4
  },
  "overview": {
    "attempts": 42,
    "accuracyPercent": 73.8,
    "avgHintsUsed": 1.04,
    "streakDays": 4
  },
  "dailyTrend": [
    {
      "date": "2026-02-12",
      "attempts": 6,
      "accuracyPercent": 66.7,
      "avgHintsUsed": 1.33
    }
  ],
  "topicMastery": [
    {
      "topicId": "uuid",
      "topicCode": "G4-MATH-FRC-001",
      "topicTitle": "Equivalent Fractions",
      "masteryScore": 58.2,
      "proficiency": "needs_support",
      "accuracyPercent": 54.0,
      "hintDependencyPercent": 48.5
    }
  ],
  "recommendations": [
    {
      "generatedOn": "2026-02-18",
      "focusTopicCode": "G4-MATH-FRC-001",
      "text": "Practice equivalent fractions using visual pie models for 10 minutes."
    }
  ]
}
```

Data sources:
- `v_child_daily_progress`
- `v_child_topic_mastery_latest`
- `parent_recommendations`

### 4.3 Topic Drilldown
`GET /parent/children/{childId}/topics/{topicCode}?days=30`

Response `200`:
```json
{
  "topicCode": "G4-MATH-FRC-001",
  "topicTitle": "Equivalent Fractions",
  "attemptHistory": [
    {
      "date": "2026-02-14",
      "attempts": 3,
      "correctAttempts": 1,
      "avgHintsUsed": 2.0
    }
  ],
  "latestMastery": {
    "masteryScore": 58.2,
    "proficiency": "needs_support"
  }
}
```

## 5. Auth and Security Notes
- Parent tokens required for all endpoints.
- Student-facing app still calls APIs using parent session + selected child context.
- Server enforces parent-child ownership check before every query.
- Rate limit on generation endpoints recommended (`questions:generate`, `hints`).

## 6. Suggested Validation Schemas
- `startSessionSchema`
- `generateQuestionSchema`
- `requestHintSchema`
- `submitAttemptSchema`
- `dashboardQuerySchema`

Use Zod on API boundary and reject requests before DB writes.
