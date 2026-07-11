from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from backend.database import get_db
from backend.models import User,UserRole,Job
from backend.security import get_current_user

router = APIRouter(prefix="/api/jobs", tags=["Job Postings"])

@router.post("", status_code=status.HTTP_201_CREATED)
def create_job(job_data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Endpoint: ALLOW ADMINS ONLY to post new recruitment campaigns"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Access denied. Only administrative profiles can post job listings."
        )

    title = job_data.get("title", "").strip()
    description = job_data.get("description", "").strip()

    if not title or not description:
        raise HTTPException(status_code=400, detail="Missing required parameters: title and description are mandatory.")

    new_job = Job(title=title, description=description, is_active=True)
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    
    return {"message": f"Job campaign '{title}' successfully created!", "job_id": new_job.id}

@router.get("")
def list_active_jobs(db: Session = Depends(get_db)):
    """Endpoint: ALLOW CANDIDATES to browse all open, active job vacancies"""
    jobs = db.query(Job).filter(Job.is_active == True).order_by(Job.created_at.desc()).all()
    return jobs

@router.get("/{job_id}")
def get_single_job_details(job_id: int, db: Session = Depends(get_db)):
    """Endpoint: Fetch explicit details for a specific position"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="The requested job posting could not be found.")
    return job

@router.put("/{job_id}")
def update_job(job_id: int, updated_data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Endpoint: ALLOW ADMINS ONLY to update descriptions or archive assignments"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized operation constraint.")

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Target job posting parameters not found.")

    if "title" in updated_data:
        job.title = updated_data["title"].strip()
    if "description" in updated_data:
        job.description = updated_data["description"].strip()
    if "is_active" in updated_data:
        job.is_active = bool(updated_data["is_active"])

    db.commit()
    return {"message": f"Job posting {job_id} successfully updated!"}