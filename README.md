# AI-Powered Content Moderation Pipeline

A full-stack moderation dashboard for classifying user-generated content, routing risky cases for human review, and auditing every moderation decision.

The project includes a FastAPI backend and a React/TanStack frontend. It supports category-level scoring, platform-specific policy thresholds, explainable decisions, analytics, and a moderator review queue.

## What It Does

- Classifies content across harm categories such as hate speech, harassment, spam, misinformation, graphic violence, adult content, and self-harm.
- Applies platform policy settings to convert category scores into moderation actions.
- Routes decisions to auto-approve, human review, or auto-reject paths.
- Shows explanations, confidence scores, adjusted scores, and audit history.
- Gives moderators a queue for reviewing flagged content and recording overrides.

## Tech Stack

**Backend**
- FastAPI
- SQLAlchemy
- SQLite local database
- Pydantic

**Frontend**
- React
- TanStack Router / TanStack Start
- TypeScript
- Tailwind CSS
- shadcn/ui components

## Project Structure

```text
.
├── backend/
│   ├── main.py
│   ├── classifier.py
│   ├── database.py
│   ├── models.py
│   ├── policy.py
│   ├── review_queue.py
│   ├── router_engine.py
│   ├── schemas.py
│   ├── seed.py
│   └── docs/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   └── routes/
│   ├── package.json
│   └── vite.config.ts
├── moderation.db
└── README.md
```

## Running Locally

### Backend

```bash
cd backend
pip install -r requirements.txt
python seed.py
uvicorn main:app --reload
```

The API runs at `http://127.0.0.1:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on the Vite dev server, usually `http://localhost:5173`.

## Main Screens

- **Playground**: submit content and inspect AI moderation results.
- **Review Queue**: review cases that need human judgment.
- **Policy Config**: tune category thresholds and routing behavior.
- **Analytics**: view moderation volume and category patterns.
- **Audit Log**: inspect saved moderation decisions.

## Notes

This is a local project prototype. The checked-in `moderation.db` is useful for demo data, but production usage should move secrets, database configuration, and deployment settings into environment-specific configuration.
