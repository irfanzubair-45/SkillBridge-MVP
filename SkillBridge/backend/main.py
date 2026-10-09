from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Literal
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="SkillBridge API",
    version="1.0.0",
    description="Hackathon demo API for complementary-skill team matching.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SKILL_CATALOG = [
    "Python", "AI/ML", "Cloud", "UI/UX", "Figma", "IoT", "Electronics",
    "Product Strategy", "Research", "React", "Node.js", "Data Analysis",
    "Mobile Development", "Cybersecurity", "Public Speaking",
]

PROJECT_READY_SKILLS = [
    "Python", "AI/ML", "Cloud", "UI/UX", "Figma", "IoT", "Electronics", "Product Strategy", "Research",
]
DATABASE_PATH = Path(__file__).with_name("skillbridge.db")


class StudentProfile(BaseModel):
    name: Annotated[str, Field(min_length=2, max_length=40)]
    college: Annotated[str, Field(max_length=80)] = ""
    skills: list[str] = Field(min_length=1, max_length=12)
    interests: list[str] = Field(default_factory=list, max_length=8)
    availability: Literal["Weekdays", "Evenings", "Weekends", "Flexible"] = "Flexible"
    experience: Literal["Beginner", "Intermediate", "Advanced"] = "Beginner"


class CandidateProfile(StudentProfile):
    """A profile supplied by the client for the current matching session."""

    id: Annotated[str, Field(min_length=1, max_length=100)]


class MatchRequest(BaseModel):
    student: StudentProfile
    candidates: list[CandidateProfile] = Field(min_length=1, max_length=50)


class IdeaRequest(BaseModel):
    team_skills: list[str] = Field(min_length=1, max_length=30)


class ProjectRequest(BaseModel):
    name: Annotated[str, Field(min_length=3, max_length=100)]
    description: Annotated[str, Field(min_length=12, max_length=1000)]
    category: Annotated[str, Field(min_length=2, max_length=40)]
    status: Literal["Open", "Draft"] = "Open"
    launch_mode: Literal["now", "invites_pending", "draft"] = "now"
    owner: dict
    members: list[dict] = Field(default_factory=list, max_length=50)
    open_roles: list[str] = Field(default_factory=list, max_length=30)
    invites_pending: list[dict] = Field(default_factory=list, max_length=50)


def database_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> None:
    with database_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS profiles (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                college TEXT NOT NULL,
                skills TEXT NOT NULL,
                interests TEXT NOT NULL,
                availability TEXT NOT NULL,
                experience TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                category TEXT NOT NULL,
                status TEXT NOT NULL,
                launch_mode TEXT NOT NULL,
                owner TEXT NOT NULL,
                members TEXT NOT NULL,
                open_roles TEXT NOT NULL,
                invites_pending TEXT NOT NULL,
                milestones TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )


def validate_profile(profile: StudentProfile) -> None:
    unknown_skills = sorted(set(profile.skills) - set(SKILL_CATALOG))
    if unknown_skills:
        raise HTTPException(status_code=422, detail=f"Unknown skills: {', '.join(unknown_skills)}")


def profile_from_row(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "college": row["college"],
        "skills": json.loads(row["skills"]),
        "interests": json.loads(row["interests"]),
        "availability": row["availability"],
        "experience": row["experience"],
        "created_at": row["created_at"],
    }


initialize_database()


def availability_score(current: str, candidate: str) -> float:
    if current == "Flexible" or candidate == "Flexible":
        return 15
    if current == candidate:
        return 15
    compatible = {"Weekdays", "Evenings"}
    return 9 if {current, candidate} == compatible else 5


def create_match(student: StudentProfile, candidate: CandidateProfile) -> dict:
    student_skills = set(student.skills)
    student_interests = set(student.interests)
    candidate_skills = set(candidate.skills)
    # The score focuses on the capabilities needed to ship the demo idea, rather
    # than rewarding a long, unrelated list of duplicate skills.
    missing_skills = set(PROJECT_READY_SKILLS) - student_skills
    complementary = candidate_skills & missing_skills
    shared_interests = student_interests & set(candidate.interests)

    complement_score = 0 if not missing_skills else (len(complementary) / len(missing_skills)) * 65
    interest_score = 0 if not student_interests else (len(shared_interests) / len(student_interests)) * 20
    availability = availability_score(student.availability, candidate.availability)
    total = round(min(99, complement_score + interest_score + availability))

    reason_bits = []
    if complementary:
        reason_bits.append("adds " + ", ".join(sorted(complementary)))
    if shared_interests:
        reason_bits.append("shares an interest in " + ", ".join(sorted(shared_interests)))
    if candidate.availability == student.availability or "Flexible" in {candidate.availability, student.availability}:
        reason_bits.append("has a compatible schedule")
    if not reason_bits:
        reason_bits.append("brings a different perspective to the team")

    return {
        "candidate": candidate.model_dump(),
        "score": total,
        "complementary_skills": sorted(complementary),
        "shared_interests": sorted(shared_interests),
        "why": "; ".join(reason_bits).capitalize() + ".",
        "score_breakdown": {
            "complementary_coverage": round(complement_score),
            "shared_interests": round(interest_score),
            "availability": round(availability),
        },
    }


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "matching_source": "saved profiles and runtime candidates",
        "project_generator_mode": "demo / fallback",
        "message": "SkillBridge API is ready for runtime profiles.",
    }


@app.get("/api/skills")
def skills() -> dict:
    return {"skills": SKILL_CATALOG, "project_ready_skills": PROJECT_READY_SKILLS}


@app.get("/api/students")
def students() -> dict:
    """Backward-compatible alias for the saved profile list."""
    return profiles()


@app.get("/api/profiles")
def profiles() -> dict:
    with database_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM profiles ORDER BY created_at DESC, name COLLATE NOCASE"
        ).fetchall()
    return {
        "profiles": [profile_from_row(row) for row in rows],
        "source": "user-created profiles",
        "message": "Only profiles published by users are shown. No student names are preloaded.",
    }


@app.post("/api/profiles", status_code=201)
def save_profile(profile: StudentProfile) -> dict:
    """Persist a voluntarily published profile for later discovery."""
    validate_profile(profile)
    profile_id = str(uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    with database_connection() as connection:
        connection.execute(
            """
            INSERT INTO profiles (id, name, college, skills, interests, availability, experience, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                profile_id,
                profile.name.strip(),
                profile.college.strip(),
                json.dumps(profile.skills),
                json.dumps(profile.interests),
                profile.availability,
                profile.experience,
                created_at,
            ),
        )
    return {
        "profile": {
            "id": profile_id,
            **profile.model_dump(),
            "name": profile.name.strip(),
            "college": profile.college.strip(),
            "created_at": created_at,
        },
        "message": "Profile published. It can now appear in discovery for other local users.",
    }


@app.post("/api/matches")
def matches(request: MatchRequest) -> dict:
    validate_profile(request.student)
    for candidate in request.candidates:
        validate_profile(candidate)

    results = [create_match(request.student, candidate) for candidate in request.candidates]
    results.sort(key=lambda item: (-item["score"], item["candidate"]["name"]))
    return {
        "mode": "runtime",
        "student": request.student.model_dump(),
        "matches": results,
        "algorithm_note": "Scores prioritize missing skill coverage, then shared interests and compatible availability.",
    }


@app.post("/api/project-idea")
def project_idea(request: IdeaRequest) -> dict:
    team_skills = set(request.team_skills)
    covered = [skill for skill in PROJECT_READY_SKILLS if skill in team_skills]
    gaps = [skill for skill in PROJECT_READY_SKILLS if skill not in team_skills]
    return {
        "mode": "demo / fallback",
        "disclaimer": "This is a deterministic demo response. Plug a real AI provider into this endpoint for production generation.",
        "readiness": round((len(covered) / len(PROJECT_READY_SKILLS)) * 100),
        "idea": {
            "title": "Smart Campus Waste Management",
            "tagline": "Make every bin a signal for a cleaner, more efficient campus.",
            "problem": "Campus facilities teams often discover overflowing bins only after students report them, while recycling quality remains invisible.",
            "solution": "Low-cost fill-level sensors send bin status to a cloud dashboard. Students see nearby recycling guidance, while staff receive prioritized collection routes.",
            "features": [
                "Live map with bin fill level and collection priority",
                "Image-assisted waste sorting tips for students",
                "Route queue for facilities staff",
                "Weekly diversion and collection insights",
            ],
            "technology": ["Python + AI/ML", "IoT sensors", "Cloud API", "React dashboard", "Figma prototype"],
            "prototype_plan": [
                "Day 1: Map the user journey and prototype the student and staff flows in Figma.",
                "Day 2: Simulate three sensor-equipped bins and publish their fill data to the API.",
                "Day 3: Build the live dashboard, priority logic, and a two-minute walkthrough.",
            ],
        },
        "covered_skills": covered,
        "remaining_gaps": gaps,
    }


def project_from_row(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "description": row["description"],
        "category": row["category"],
        "status": row["status"],
        "launch_mode": row["launch_mode"],
        "owner": json.loads(row["owner"]),
        "members": json.loads(row["members"]),
        "open_roles": json.loads(row["open_roles"]),
        "invites_pending": json.loads(row["invites_pending"]),
        "milestones": json.loads(row["milestones"]),
        "created_at": row["created_at"],
    }


@app.post("/api/projects", status_code=201)
def create_project(request: ProjectRequest) -> dict:
    """Persist a project review from Team Builder as Open or Draft."""
    if not request.owner.get("name") or not request.owner.get("skills"):
        raise HTTPException(status_code=422, detail="A project owner with profile skills is required.")
    project_id = str(uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    milestones = [
        {"id": "first-brief", "label": "Share the project brief", "done": False},
        {"id": "first-build", "label": "Define the first build milestone", "done": False},
        {"id": "first-checkin", "label": "Schedule a team check-in", "done": False},
    ]
    with database_connection() as connection:
        connection.execute(
            """
            INSERT INTO projects (id, name, description, category, status, launch_mode, owner, members, open_roles, invites_pending, milestones, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                project_id,
                request.name.strip(),
                request.description.strip(),
                request.category.strip(),
                request.status,
                request.launch_mode,
                json.dumps(request.owner),
                json.dumps(request.members),
                json.dumps(request.open_roles),
                json.dumps(request.invites_pending),
                json.dumps(milestones),
                created_at,
            ),
        )
        row = connection.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    return {"project": project_from_row(row), "message": "Project saved to the SkillBridge database."}


@app.get("/api/projects")
def list_projects() -> dict:
    with database_connection() as connection:
        rows = connection.execute("SELECT * FROM projects ORDER BY created_at DESC").fetchall()
    return {"projects": [project_from_row(row) for row in rows]}


@app.get("/api/projects/{project_id}")
def get_project(project_id: str) -> dict:
    with database_connection() as connection:
        row = connection.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Project not found.")
    return {"project": project_from_row(row)}
