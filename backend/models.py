import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum, Boolean
from sqlalchemy.orm import declarative_base, relationship

Base=declarative_base()

class UserRole(enum.Enum):
  CANDIDATE="candidate"
  ADMIN="admin"

class InterviewStatus(enum.Enum):
  NOT_STARTED = "not_started"
  PRIMARY_QUESTIONS_READY = "primary_questions_ready"
  PRIMARY_ANSWERS_SUBMITTED = "primary_answers_submitted"
  FOLLOWUP_QUESTIONS_READY = "followup_questions_ready"
  COMPLETED = "completed"

class HiringVerdict(enum.Enum):
    PENDING = "pending"
    STRONG_HIRE = "strong_hire"
    PASS = "pass"
    NO_HIRE = "no_hire"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.CANDIDATE, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    applications = relationship("Application", back_populates="candidate")

class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    applications = relationship("Application", back_populates="job")


class Application(Base):
    __tablename__ = "applications"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    cv_text = Column(Text, nullable=False)  # Parsed PDF output string characters stored cleanly
    cv_file_path = Column(String, nullable=False)  # Raw reference location string
    created_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("User", back_populates="applications")
    job = relationship("Job", back_populates="applications")
    interview = relationship("InterviewStateTrack", uselist=False, back_populates="application")


class InterviewStateTrack(Base):
    __tablename__ = "interview_state_tracks"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), unique=True, nullable=False)
    status = Column(Enum(InterviewStatus), default=InterviewStatus.NOT_STARTED, nullable=False)
    
    primary_questions = Column(Text, default="")
    primary_answers = Column(Text, default="")
    followup_questions = Column(Text, default="")
    followup_answers = Column(Text, default="")
    final_scorecard = Column(Text, default="")
    
    verdict = Column(Enum(HiringVerdict), default=HiringVerdict.PENDING, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    application = relationship("Application", back_populates="interview")