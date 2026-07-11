import os
import asyncio  
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from pypdf import PdfReader
from backend.database import get_db
from backend.models import User, UserRole, Job, Application, InterviewStateTrack, InterviewStatus, HiringVerdict
from backend.security import get_current_user
from backend.workers.interview_task import run_crew_1_async, run_crew_2_async, run_crew_3_async

router = APIRouter(prefix="/api/interviews", tags=["Interviews"])
UPLOAD_DIR = "output/cv_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/apply/{job_id}", status_code=status.HTTP_201_CREATED)
async def apply_for_job(
    job_id: int, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Endpoint: Convert incoming binary PDF, map parameters, and fire Crew 1 safely"""
    if current_user.role != UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Only candidate profiles can initialize applications.")
        
    job = db.query(Job).filter(Job.id == job_id, Job.is_active == True).first()
    if not job:
        raise HTTPException(status_code=404, detail="Target job campaign data not found or inactive.")

    file_name = f"{current_user.id}_cv.pdf"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    with open(file_path, "wb") as f:
        f.write(file.file.read())

    try:
        reader = PdfReader(file_path)
        extracted_text = "".join([page.extract_text() + "\n" for page in reader.pages if page.extract_text()])
    except Exception as err:
        raise HTTPException(status_code=420, detail=f"Failed to read file characters: {err}")

    # Establish atomic tracking states
    new_app = Application(candidate_id=current_user.id, job_id=job.id, cv_text=extracted_text, cv_file_path=file_path)
    db.add(new_app)
    db.flush()

    new_track = InterviewStateTrack(application_id=new_app.id, status=InterviewStatus.NOT_STARTED)
    db.add(new_track)
    db.commit()

    # FIXED: Non-blocking async loop task generation to eliminate background thread freezes
    asyncio.create_task(run_crew_1_async(new_track.id, job.description, extracted_text))
    
    return {"message": "Application received.", "application_id": new_app.id}


@router.get("/status/{application_id}")
def get_interview_status(application_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Endpoint: Dynamic state tracker checking processing milestones for UI updates"""
    track = db.query(InterviewStateTrack).filter(InterviewStateTrack.application_id == application_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Interview process tracking index not found.")

    raw_primary = track.primary_questions or ""
    raw_followup = track.followup_questions or ""

    # SECURITY FILTER FOR CANDIDATES: Strip internal analytical text reports from the string
    if current_user.role == UserRole.CANDIDATE:
        # If Crew 2 injected a breakdown text string above the follow-up queries, isolate the questions section
        if "### Probing Questions" in raw_primary:
            raw_primary = raw_primary.split("### Probing Questions")[-1].strip()
        elif "### Cross-Examination Breakdown" in raw_primary:
            raw_primary = raw_primary.split("###")[-1].strip()
            
        if "###" in raw_followup:
            raw_followup = raw_followup.split("###")[-1].strip()

    response_data = {
        "status": track.status.value if hasattr(track.status, 'value') else str(track.status),
        "primary_questions": raw_primary.strip(),
        "followup_questions": raw_followup.strip()
    }

    if current_user.role == UserRole.ADMIN:
        response_data["final_scorecard"] = track.final_scorecard
        response_data["verdict"] = track.verdict.value if hasattr(track.verdict, 'value') else str(track.verdict)
        
    return response_data



@router.post("/submit-primary/{application_id}")
async def submit_primary_answers(
    application_id: int, 
    answers: dict, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Endpoint: Log primary responses and trigger Crew 2 safely"""
    track = db.query(InterviewStateTrack).filter(InterviewStateTrack.application_id == application_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Invalid operational timeline.")

    primary_text_ans = answers.get("answers", "")
    track.primary_answers = primary_text_ans
    track.status = InterviewStatus.PRIMARY_ANSWERS_SUBMITTED
    db.commit()

    # FIXED: Non-blocking async loop task generation to eliminate background thread freezes
    asyncio.create_task(run_crew_2_async(track.id, track.application.job.description, track.application.cv_text, primary_text_ans))
    return {"message": "Primary responses logged."}


@router.post("/submit-followup/{application_id}")
async def submit_followup_answers(
    application_id: int, 
    answers: dict, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Endpoint: Log candidate responses and trigger Crew 3 safely"""
    track = db.query(InterviewStateTrack).filter(InterviewStateTrack.application_id == application_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Invalid tracking timeline operations.")

    followup_text_ans = answers.get("answers", "")
    track.followup_answers = followup_text_ans
    
    # FIX: Change the database status instantly so the frontend knows Crew 3 is compiling records
    track.status = InterviewStatus.PRIMARY_ANSWERS_SUBMITTED  # Re-uses the load-state indicator to re-trigger the UI loader box
    db.commit()

    asyncio.create_task(run_crew_3_async(
        track.id, track.application.job.description, track.application.cv_text, 
        track.primary_questions, track.primary_answers, track.followup_questions, followup_text_ans
    ))
    return {"message": "Final interview metrics submitted cleanly."}
