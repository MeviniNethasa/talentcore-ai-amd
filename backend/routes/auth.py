from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User, UserRole
from backend.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(user_data: dict, db: Session = Depends(get_db)):
    """Endpoint: Secure user registration processing for both roles"""
    email = user_data.get("email", "").strip().lower()
    password = user_data.get("password", "")
    full_name = user_data.get("full_name", "").strip()
    role_string = user_data.get("role", "candidate").strip().lower()

    if not email or not password or not full_name:
        raise HTTPException(status_code=400, detail="Missing required registration data strings.")

    # Prevent duplicate account generations
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this email is already registered.")

    # Enforce strict enumeration boundary limits for safety
    if role_string not in ["candidate", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid operational role target parameter.")

    new_user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        role=UserRole(role_string)
    )
    db.add(new_user)
    db.commit()
    return {"message": f"Account successfully created for {full_name} as a {role_string}!"}

@router.post("/login")
def login_user(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Endpoint: Standard OAuth2 login route returning signed access token metadata"""
    user = db.query(User).filter(User.email == form_data.username.strip().lower()).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password combination.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Inject the user's role and database ID straight into the signature block
    token_payload = {
        "sub": user.email,
        "role": user.role.value,
        "user_id": user.id
    }
    
    access_token = create_access_token(data=token_payload)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role.value,
        "full_name": user.full_name
    }