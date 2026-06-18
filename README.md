# AI-Powered Content Moderation Pipeline

A full-stack AI-powered content moderation system for detecting harmful, unsafe, or policy-violating user-generated content.

The pipeline combines AI classification, platform-specific rules, confidence-based routing, explainable moderation decisions, and human review workflows to help platforms moderate content more consistently and transparently.

---

## Overview

This project is designed to moderate user-generated content across multiple safety categories. Instead of using one simple “safe” or “unsafe” label, the system analyzes content across several harm types and returns individual confidence scores for each category.

Based on platform policy settings, the content can be:

- Automatically approved
- Sent to a human moderator for review
- Automatically rejected

The goal is to create a moderation workflow that is scalable, configurable, explainable, and practical for real-world use.

---

## Key Features

### Multi-Category Classification

The system can detect and score multiple moderation categories independently:

- Hate Speech
- Harassment
- Spam
- Misinformation
- Graphic Violence
- Adult Content
- Self-Harm

Each category returns its own confidence score, allowing more flexible moderation decisions.

---

### Context-Aware Moderation

Moderation decisions can take more than just the submitted message into account.

The system can evaluate:

- The current content
- Conversation thread context
- User history
- Platform-specific policies
- Enabled or disabled moderation categories

This makes the moderation result more accurate because the same message may require different actions depending on context.

---

### Confidence-Based Routing

The pipeline supports three main moderation outcomes.

#### Auto Approve

Content that is confidently safe is approved automatically.

#### Human Review

Content that is uncertain, borderline, or context-sensitive is routed to a moderator.

#### Auto Reject

Content with high-confidence policy violations is rejected automatically.

---

### Explainable AI Decisions

Every moderation result includes clear reasoning behind the decision.

A decision can include:

- Detected harm category
- Confidence score
- Triggering content segment
- AI-generated reasoning
- Final moderation action

This helps moderators understand why content was flagged and makes the moderation process more transparent.

---

### Human Review Queue

Moderators can review content that requires manual judgment.

The review workflow supports:

- Viewing flagged content
- Reading AI reasoning
- Checking category confidence scores
- Approving or rejecting content
- Overriding automated decisions
- Adding moderator notes

---

### Platform Policy Configuration

Different platforms can use different moderation rules.

Each platform can configure:

- Enabled moderation categories
- Category-specific thresholds
- Auto-approval rules
- Auto-rejection rules
- Human review routing behavior

This allows the same moderation engine to support different community standards and risk levels.

---

## Tech Stack

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

## How It Works

```text
User submits content
        |
        v
Backend receives moderation request
        |
        v
Relevant context and platform policy are loaded
        |
        v
Content is analyzed using Gemini AI
        |
        v
Category scores and reasoning are generated
        |
        v
Policy thresholds are applied
        |
        v
Final action is selected
        |
        +-------------------+-------------------+
        |                   |                   |
        v                   v                   v
 Auto Approve        Human Review        Auto Reject
```

---

## Moderation Decision Flow

```text
Submitted Content
        |
        v
AI Classification
        |
        v
Category Confidence Scores
        |
        v
Platform Policy Evaluation
        |
        +---------------------------+
        |                           |
        v                           v
Low Risk                    Possible Violation
        |                           |
        v                           v
Auto Approve              Confidence Check
                                    |
                    +---------------+---------------+
                    |                               |
                    v                               v
              Human Review                    Auto Reject
```

---

## Project Structure

```text
backend/
│
├── app/
│   ├── api/              # API routes and endpoint handlers
│   ├── core/             # Configuration, constants, and app settings
│   ├── database/         # Database connection and session setup
│   ├── models/           # SQLAlchemy database models
│   ├── repositories/     # Database access layer
│   ├── schemas/          # Pydantic request and response schemas
│   ├── services/         # Business logic and moderation services
│   └── utils/            # Utility functions
│
├── alembic/              # Database migrations
├── seed/                 # Seed data
├── requirements.txt
└── main.py

frontend/
│
├── src/                  # Next.js application source
├── public/               # Static files
├── package.json
└── next.config.js
```

---

## Example Moderation Request

```json
{
  "platform_id": "platform_001",
  "content_id": "content_123",
  "user_id": "user_456",
  "content": "Text that needs to be moderated",
  "context": {
    "thread": [
      {
        "user_id": "user_111",
        "content": "Previous message in the conversation"
      }
    ],
    "user_history": {
      "previous_violations": 1
    }
  }
}
```

---

## Example Moderation Response

```json
{
  "content_id": "content_123",
  "action": "human_review",
  "categories": [
    {
      "category": "harassment",
      "confidence": 0.78,
      "triggering_segment": "Flagged part of the content",
      "reasoning": "The message may contain targeted hostile language toward another user."
    }
  ],
  "final_reasoning": "The harassment score is above the review threshold but below the auto-reject threshold.",
  "requires_human_review": true
}
```

---

## Example Platform Policy

```json
{
  "platform_id": "platform_001",
  "enabled_categories": [
    "hate_speech",
    "harassment",
    "spam",
    "misinformation",
    "graphic_violence",
    "adult_content",
    "self_harm"
  ],
  "thresholds": {
    "hate_speech": {
      "review": 0.55,
      "reject": 0.85
    },
    "harassment": {
      "review": 0.50,
      "reject": 0.80
    },
    "spam": {
      "review": 0.60,
      "reject": 0.90
    },
    "misinformation": {
      "review": 0.55,
      "reject": 0.82
    },
    "graphic_violence": {
      "review": 0.50,
      "reject": 0.85
    },
    "adult_content": {
      "review": 0.50,
      "reject": 0.85
    },
    "self_harm": {
      "review": 0.40,
      "reject": 0.75
    }
  }
}
```

---

## Human Review Workflow

1. Content is submitted for moderation.
2. AI analyzes the content and returns category scores.
3. The decision engine applies platform-specific thresholds.
4. Safe content is approved automatically.
5. High-confidence violations are rejected automatically.
6. Uncertain cases are added to the human review queue.
7. A moderator reviews the content, AI reasoning, and confidence scores.
8. The moderator makes the final decision and can add review notes.
9. The final action is stored for future reference and auditability.

---

## Core Moderation Categories

| Category | Description |
|---|---|
| Hate Speech | Content attacking or demeaning protected groups |
| Harassment | Insults, threats, bullying, or targeted abuse |
| Spam | Repetitive, promotional, or low-quality unwanted content |
| Misinformation | Potentially false or misleading claims |
| Graphic Violence | Violent, disturbing, or graphic descriptions |
| Adult Content | Sexual or explicit content |
| Self-Harm | Content involving self-harm, suicide, or dangerous behavior |

---

## Environment Variables

The project uses environment variables for configuration.

Example backend variables:

```env
DATABASE_URL=postgresql+psycopg://username:password@localhost:5432/moderation_db
REDIS_URL=redis://localhost:6379/0
GEMINI_API_KEY=your_gemini_api_key
ENVIRONMENT=development
BACKEND_CORS_ORIGINS=http://localhost:3000
```

Example frontend variable:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Design Goals

- **Scalable** — Supports automated moderation for large volumes of content.
- **Configurable** — Allows platforms to define their own policy rules.
- **Explainable** — Provides reasoning behind every AI-assisted decision.
- **Human-in-the-loop** — Sends uncertain cases to moderators instead of relying only on automation.
- **Context-aware** — Uses conversation and user context where available.
- **Auditable** — Stores moderation decisions, notes, and overrides.
- **Flexible** — Supports multiple moderation categories and policy thresholds.

---

## Possible Use Cases

This moderation pipeline can be adapted for:

- Social media platforms
- Community forums
- Chat applications
- Comment sections
- Marketplace listings
- User profile moderation
- Messaging platforms
- Content publishing tools

---

## Roadmap

Planned improvements may include:

- Authentication and role-based access control
- Moderator analytics dashboard
- Bulk moderation support
- Audit logs for policy changes
- Feedback loops for improving AI decisions
- Webhook support for external platforms
- More advanced policy configuration
- Moderator activity tracking
- Support for additional AI providers

---

## Security and Privacy Notes

This project may process sensitive user-generated content, so careful handling is important.

Recommended practices:

- Keep API keys and secrets in environment variables.
- Do not commit `.env` files.
- Restrict access to moderation data.
- Protect moderator routes with authentication.
- Store only the data needed for moderation.
- Avoid logging sensitive content unnecessarily.
- Review automated decisions before using them in high-risk environments.

---

## License

Add your preferred license for the project.
