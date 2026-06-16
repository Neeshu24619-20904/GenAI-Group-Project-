# AI-Powered Content Moderation Pipeline

A full-stack AI-powered content moderation system that performs multi-category content classification, context-aware moderation, confidence-based routing, explainable decisions, human review workflows, and platform-specific policy enforcement.

---

## Features

### Multi-Category Classification

Detects:

- Hate Speech
- Harassment
- Spam
- Misinformation
- Graphic Violence
- Adult Content
- Self-Harm

Each category returns an independent confidence score.

---

### Context-Aware Analysis

Moderation decisions consider:

- Current content
- Conversation thread
- User history
- Platform policies

The same message can receive different moderation outcomes depending on context.

---

### Confidence-Based Routing

#### Auto Approve

Safe content is approved automatically.

#### Human Review

Ambiguous content is routed to moderators.

#### Auto Reject

High-confidence violations are automatically rejected.

---

### Explainable Decisions

Every moderation decision includes:

- Triggering content segment
- Harm category
- Confidence score
- AI reasoning
- Final moderation action

---

### Human Review Queue

Moderators can:

- Review flagged content
- View AI reasoning
- Override decisions
- Add review notes

---

### Platform Policy Configuration

Each platform can configure:

- Category thresholds
- Enabled categories
- Routing rules
- Moderation behavior

---

## Technology Stack

### Backend

- FastAPI
- PostgreSQL
- SQLAlchemy 2.0
- Alembic
- Redis
- Pydantic v2

### AI

- Gemini API

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- ShadCN UI

---

## Project Structure

```text
backend/
│
├── app/
│   ├── api/
│   ├── core/
│   ├── database/
│   ├── models/
│   ├── repositories/
│   ├── schemas/
│   ├── services/
│   └── utils/
│
├── alembic/
├── seed/
├── requirements.txt
└── main.py

frontend/
│
├── src/
├── public/
├── package.json
└── next.config.js
```