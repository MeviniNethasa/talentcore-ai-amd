import os
import asyncio  
from backend.database import get_db
from backend.database import SessionLocal
from backend.models import InterviewStateTrack, InterviewStatus
from interviewer_agent.crews.interview_crew.interview_crew import InterviewCrew

# ─── SECURE ISOLATED RUNNER UTILITIES ───
def _sync_kickoff_crew1(job_desc: str, cv_text: str):
    return InterviewCrew().question_generation_crew().kickoff(inputs={
        "job_description": job_desc,
        "cv_text": cv_text,
        "primary_answers": "Pending collection in frontend text fields"
    })

def _sync_kickoff_crew2(job_desc: str, cv_text: str, prim_q_report: str, primary_ans: str):
    """Bridges inputs cleanly to satisfy the updated templates inside tasks.yaml"""
    return InterviewCrew().followup_generation_crew().kickoff(inputs={
        "cv_text": cv_text,
        "job_description": job_desc,
        "primary_questions_report": prim_q_report,  # ◄─── FIXED: Standardized dictionary key
        "primary_answers": primary_ans
    })


def _sync_kickoff_crew3(job_desc: str, cv_text: str, prim_q: str, prim_a: str, foll_q: str, foll_a: str):
    return InterviewCrew().final_grading_crew().kickoff(inputs={
        "cv_text": cv_text,
        "job_description": job_desc,
        "primary_questions_report": prim_q,
        "primary_answers": prim_a,
        "followup_questions_report": foll_q,
        "followup_answers": foll_a
    })

# ─── ASYNCHRONOUS NON-BLOCKING CORE AGENTS ───
async def run_crew_1_async(track_id: int, job_desc: str, cv_text: str):
    """Offloads the heavy CrewAI processing into a separate thread safely to prevent freezes"""
    try:
        print("[BACKEND SYSTEM]: Offloading Crew 1 processing to isolated execution thread...")
        
        # FIXED: Runs the crew on an isolated thread while keeping the async event loop active
        result = await asyncio.to_thread(_sync_kickoff_crew1, job_desc, cv_text)
        
        db = SessionLocal()
        track = db.query(InterviewStateTrack).filter(InterviewStateTrack.id == track_id).first()
        if track:
            track.primary_questions = result.raw
            track.status = InterviewStatus.PRIMARY_QUESTIONS_READY
            db.commit()
            print("[BACKEND SYSTEM SUCCESS]: Crew 1 execution complete. State modified to READY.")
        db.close()
    except Exception as err:
        print(f"[CRITICAL ERROR IN CREW 1 RUNNER]: {err}")

async def run_crew_2_async(track_id: int, job_desc: str, cv_text: str, prim_q_report: str, primary_ans: str):
    """Asynchronous worker task that handles thread offloading for Crew 2"""
    # Executes the heavy synchronous token loop completely isolated from FastAPI's event pool
    result = await asyncio.to_thread(_sync_kickoff_crew2, job_desc, cv_text, prim_q_report, primary_ans)
    
    # Commit the resulting follow-up questions payload to your relational database
    db = next(get_db())
    track = db.query(InterviewStateTrack).filter(InterviewStateTrack.id == track_id).first()
    if track:
        track.followup_questions = str(result)
        track.status = InterviewStatus.FOLLOWUP_QUESTIONS_READY
        db.commit()
    print("[BACKEND SYSTEM SUCCESS]: Crew 2 execution complete. State modified to FOLLOWUP_QUESTIONS_READY.")

async def run_crew_3_async(track_id: int, job_desc: str, cv_text: str, prim_q: str, prim_a: str, foll_q: str, foll_a: str):
    try:
        print("[BACKEND SYSTEM]: Offloading Crew 3 processing to isolated execution thread...")
        result = await asyncio.to_thread(_sync_kickoff_crew3, job_desc, cv_text, prim_q, prim_a, foll_q, foll_a)
        
        db = SessionLocal()
        track = db.query(InterviewStateTrack).filter(InterviewStateTrack.id == track_id).first()
        if track:
            track.final_scorecard = result.raw
            track.status = InterviewStatus.COMPLETED
            db.commit()
            print("[BACKEND SYSTEM SUCCESS]: Crew 3 evaluation complete.")
        db.close()
    except Exception as err:
        print(f"[CRITICAL ERROR IN CREW 3 RUNNER]: {err}")
