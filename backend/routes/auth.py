from fastapi import APIRouter, Depends, HTTPException
from firebase_admin import auth
from services.firebase_service import get_db
from pydantic import BaseModel, EmailStr
from datetime import datetime
import re
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

# Assam districts
ASSAM_DISTRICTS = [
    "Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo",
    "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Dima Hasao",
    "Goalpara", "Golaghat", "Hailakandi", "Hojai", "Jorhat", "Kamrup",
    "Kamrup Metropolitan", "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur",
    "Majuli", "Morigaon", "Nagaon", "Nalbari", "Sivasagar", "Sonitpur",
    "South Salmara-Mankachar", "Tinsukia", "Udalguri", "West Karbi Anglong"
]

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    organization_name: str
    organization_type: str  # 'phc' or 'lab'
    district: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

def normalize_district_id(district: str) -> str:
    """Convert district name to normalized ID"""
    return re.sub(r"[^a-z0-9]+", "_", district.strip().lower()).strip("_")

@router.post("/register")
async def register(data: RegisterRequest, db = Depends(get_db)):
    """Register PHC or Water Lab user"""
    try:
        # Validate organization type
        if data.organization_type not in ['phc', 'lab']:
            raise HTTPException(status_code=400, detail="Invalid organization type. Must be 'phc' or 'lab'")
        
        # Validate district
        if data.district not in ASSAM_DISTRICTS:
            raise HTTPException(status_code=400, detail="Invalid district")
        
        # Create Firebase Auth user
        user = auth.create_user(
            email=data.email,
            password=data.password
        )
        
        # Store user data in Firestore
        district_id = normalize_district_id(data.district)
        user_data = {
            "uid": user.uid,
            "email": data.email,
            "organization_name": data.organization_name,
            "organization_type": data.organization_type,
            "district": data.district,
            "district_id": district_id,
            "created_at": datetime.utcnow().isoformat(),
            "status": "active"
        }
        
        db.collection('users').document(user.uid).set(user_data)
        
        # Generate custom token
        custom_token = auth.create_custom_token(user.uid)
        
        return {
            "success": True,
            "message": "Registration successful",
            "token": custom_token.decode('utf-8'),
            "user": user_data
        }
        
    except auth.EmailAlreadyExistsError:
        raise HTTPException(status_code=400, detail="Email already registered")
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login")
async def login(data: LoginRequest, db = Depends(get_db)):
    """Login PHC or Water Lab user"""
    try:
        # Get user by email
        user = auth.get_user_by_email(data.email)
        
        # Get user data from Firestore
        user_doc = db.collection('users').document(user.uid).get()
        
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = user_doc.to_dict()
        
        # Generate custom token
        custom_token = auth.create_custom_token(user.uid)
        
        return {
            "success": True,
            "message": "Login successful",
            "token": custom_token.decode('utf-8'),
            "user": user_data
        }
        
    except auth.UserNotFoundError:
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/districts")
async def get_districts():
    """Get list of Assam districts"""
    return {"districts": ASSAM_DISTRICTS}
