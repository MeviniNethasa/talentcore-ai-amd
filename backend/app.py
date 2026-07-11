from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import engine
from backend.models import Base
from backend.routes import auth,jobs,interviews

# Force compile and create all storage tables automatically upon bootup parameters
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="🤖 Multi-Agent AI Recruitment Server Platform API",
    description="Full-Stack Backend System Interfacing CrewAI Agent Flows with Web Clients",
    version="1.0.0"
)

# Configure CORS Cross-Origin allowances to let your future React Frontend communicate securely
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register the architectural router modules seamlessly
app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(interviews.router)

@app.get("/")
def read_api_root_status():
    """Server heartbeat monitoring check"""
    return {
        "status": "online",
        "message": "AI Recruitment Hub Full-Stack API core active and listening."
    }