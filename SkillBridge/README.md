# SkillBridge

SkillBridge is a hackathon-ready team formation MVP. Rather than proposing classmates with duplicate abilities, it discovers teammates whose skills fill the gaps in a student's idea team.

> **Demo / fallback mode:** the project generator is deliberately deterministic. It does not claim to be a live proprietary AI service. Its API contract is ready for a real provider to replace the fallback later.

## What it demonstrates

- A responsive React + Vite student experience
- Student profile setup with multi-select skills and interests
- A runtime candidate pool: names, skills, interests, and availability are entered for the current session
- Voluntary profile publishing to a local SQLite database, so real profiles survive a refresh and can be discovered by other local users
- Match scores with plain-language explanations
- Add/remove teammate selection and a team-readiness dashboard
- Skill strengths, remaining gaps, and coverage indicator
- A deterministic Smart Campus Waste Management project brief
- Backend health status and useful empty/error states

## Matching approach

The API ranks candidates from three transparent factors:

1. **Complementary skill coverage (65 points):** candidates earn the most credit for skills the current student lacks.
2. **Shared interests (20 points):** overlapping challenge areas help ensure the team wants to solve a similar problem.
3. **Availability (15 points):** compatible schedules help the team get the work done.

Candidate profiles are never preloaded. People can be added to a one-session candidate pool, or voluntarily published to the local SQLite database and later discovered from the profile screen. Every match score uses profiles supplied at runtime—there are no fictional fallback names.

## Run locally

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Vite development server proxies `/api` requests to FastAPI on port 8000.

To create a production frontend bundle:

```powershell
npm run build
```

## API surface

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Backend readiness, runtime matching status, and project-generator mode |
| `GET /api/skills` | Skill catalog and project-ready skills |
| `GET /api/profiles` | Returns only user-published profiles from the local SQLite database |
| `POST /api/profiles` | Publishes a voluntary real student profile for local discovery |
| `POST /api/matches` | Ranks the candidate profiles supplied in that request |
| `POST /api/project-idea` | Smart Campus Waste Management fallback brief |

## Judge walkthrough (1–2 minutes)

1. Enter your profile and skills.
2. Optionally select **Publish my profile**, then use **Discover published profiles** to load profiles saved by local users. You can also add candidates manually.
3. Show how the rankings change based on the names and skills just entered, then add complementary people to the team.
4. Point out the readiness indicator and any remaining gap.
5. Generate the project and walk through Smart Campus Waste Management's features, stack, and three-day prototype plan.

## Project layout

```text
backend/
  main.py
  requirements.txt
frontend/
  index.html
  package.json
  vite.config.js
  src/
    main.jsx
    styles.css
README.md
```
