# 🛡️ AI-Powered Content Moderation Pipeline

> **The internet is messy. Moderating it shouldn't be.** > A full-stack, AI-powered content moderation system built to detect harmful, unsafe, or policy-violating user-generated content with nuance and transparency.

This pipeline isn't just a simple "safe/unsafe" toggle. It combines multi-category AI classification, highly configurable platform-specific rules, confidence-based routing, and a human-in-the-loop review workflow. The result? A moderation engine that is scalable, explainable, and practical for real-world communities.

---

## ✨ Key Features

Instead of relying on rigid keyword filters, our system analyzes content across several harm types, returning individual confidence scores for each category.

* **🧠 Multi-Category Classification:** Independently detects and scores Hate Speech, Harassment, Spam, Misinformation, Graphic Violence, Adult Content, and Self-Harm.
* **🕵️ Context-Aware Moderation:** We don't just look at the message in a vacuum. The pipeline evaluates the current content, conversation thread context, user history, and platform-specific policies.
* **🚦 Confidence-Based Routing:** * 🟢 **Auto-Approve:** Confidently safe content passes right through.
* 🟡 **Human Review:** Uncertain, borderline, or highly contextual content is routed to a human moderator.
* 🔴 **Auto-Reject:** High-confidence policy violations are instantly blocked.


* **💡 Explainable AI Decisions:** No "black box" decisions. Every moderation result includes the detected category, confidence score, triggering segment, and clear AI-generated reasoning.
* **🧑‍⚖️ Human Review Queue:** A dedicated workspace for moderators to view flagged content, read the AI's reasoning, check scores, and make the final call (with the ability to leave audit notes).
* **⚙️ Platform Policy Configuration:** Different platforms have different risk tolerances. Admins can configure enabled categories, custom thresholds, and routing behaviors to fit their unique community standards.

---

## 🛠️ Tech Stack

We built this pipeline using modern, scalable technologies to ensure it can handle high volumes of content seamlessly.

| Area | Technologies Used |
| --- | --- |
| **Backend** | FastAPI, PostgreSQL, SQLAlchemy 2.0, Alembic, Redis, Pydantic v2 |
| **AI Engine** | Google Gemini API |
| **Frontend** | Next.js, TypeScript, Tailwind CSS, ShadCN UI |

---

## 🔄 How It Works

Our architecture is designed to evaluate content, check it against custom platform rules, and route it efficiently.

### System Architecture

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
 Auto Approve         Human Review         Auto Reject

```

### Moderation Decision Flow

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
    Low Risk                Possible Violation
        |                           |
        v                           v
  Auto Approve              Confidence Check
                                    |
                    +---------------+---------------+
                    |                               |
                    v                               v
              Human Review                     Auto Reject

```

---

## 📂 Project Structure

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

## 📡 API Examples

Curious about what the data looks like under the hood? Here's how our system talks.

### 📥 Example Request

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

### 📤 Example Response

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

## 🎯 Core Moderation Categories

Our AI engine evaluates content across these 7 primary vectors:

| Category | Description |
| --- | --- |
| **Hate Speech** | Content attacking or demeaning protected groups |
| **Harassment** | Insults, threats, bullying, or targeted abuse |
| **Spam** | Repetitive, promotional, or low-quality unwanted content |
| **Misinformation** | Potentially false or misleading claims |
| **Graphic Violence** | Violent, disturbing, or graphic descriptions |
| **Adult Content** | Sexual or explicit content |
| **Self-Harm** | Content involving self-harm, suicide, or dangerous behavior |

---

## ⚙️ Environment Variables

To run this project locally, you will need to set up the following environment variables:

**Backend (`backend/.env`)**

```env
DATABASE_URL=postgresql+psycopg://username:password@localhost:5432/moderation_db
REDIS_URL=redis://localhost:6379/0
GEMINI_API_KEY=your_gemini_api_key
ENVIRONMENT=development
BACKEND_CORS_ORIGINS=http://localhost:3000

```

**Frontend (`frontend/.env.local`)**

```env
NEXT_PUBLIC_API_URL=http://localhost:8000

```

---

## 🚀 Roadmap

We are constantly looking to improve this pipeline. Future enhancements include:

* [ ] Authentication and role-based access control (RBAC)
* [ ] Moderator analytics and health dashboard
* [ ] Bulk moderation support
* [ ] Webhook support for real-time external platform alerts
* [ ] Feedback loops to continuously fine-tune AI decisions based on moderator overrides
* [ ] Multi-LLM support (adding alternative AI providers alongside Gemini)

---

## 🔒 Security & Privacy Notes

Content moderation inherently involves processing sensitive user-generated data. **Treat this data with care.**

* Keep all API keys and secrets in your environment variables.
* **Never** commit `.env` files.
* Restrict access to moderation databases and protect moderator UI routes with strong authentication.
* Avoid logging sensitive content in plain text to your monitoring services unnecessarily.

---
