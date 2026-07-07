from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Body
from fastapi.responses import JSONResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
import re
import json
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
_use_mock_db = os.environ.get('USE_MOCK_DB', '').lower() in ('1', 'true', 'yes') or mongo_url.startswith('mock')
if _use_mock_db:
    # In-memory MongoDB replacement for local testing (no server required)
    from mongomock_motor import AsyncMongoMockClient
    client = AsyncMongoMockClient()
else:
    client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'freelancer_platform')]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'super_secret_key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 7

# Stripe Config
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

# Azure Blob Storage Config (portfolio media uploads)
AZURE_STORAGE_ACCOUNT = os.environ.get('AZURE_STORAGE_ACCOUNT')
AZURE_STORAGE_CONTAINER = os.environ.get('AZURE_STORAGE_CONTAINER', 'portfolio')
MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB
ALLOWED_MEDIA_TYPES = {
    "image": ["image/jpeg", "image/png", "image/gif", "image/webp"],
    "video": ["video/mp4", "video/webm", "video/quicktime"],
    "audio": ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg"],
}

_blob_service_client = None

def _get_blob_service():
    """Lazily create a BlobServiceClient authenticated via managed identity."""
    global _blob_service_client
    if _blob_service_client is None:
        if not AZURE_STORAGE_ACCOUNT:
            raise HTTPException(status_code=503, detail="File uploads are not configured")
        from azure.identity.aio import DefaultAzureCredential
        from azure.storage.blob.aio import BlobServiceClient
        _blob_service_client = BlobServiceClient(
            account_url=f"https://{AZURE_STORAGE_ACCOUNT}.blob.core.windows.net",
            credential=DefaultAzureCredential(),
        )
    return _blob_service_client

# Azure OpenAI / Foundry Config (CV parsing) — authenticated via managed identity
AZURE_OPENAI_ENDPOINT = os.environ.get('AZURE_OPENAI_ENDPOINT')
AZURE_OPENAI_DEPLOYMENT = os.environ.get('AZURE_OPENAI_DEPLOYMENT', 'gpt-5.4')
AZURE_OPENAI_API_VERSION = os.environ.get('AZURE_OPENAI_API_VERSION', '2024-12-01-preview')
MAX_CV_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_CV_TEXT_CHARS = 20000
CV_ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/msword": "docx",
}

_openai_client = None

def _get_openai_client():
    """Lazily create an AsyncAzureOpenAI client authenticated via managed identity."""
    global _openai_client
    if _openai_client is None:
        if not AZURE_OPENAI_ENDPOINT:
            raise HTTPException(status_code=503, detail="CV parsing is not configured")
        from azure.identity import DefaultAzureCredential, get_bearer_token_provider
        from openai import AsyncAzureOpenAI
        token_provider = get_bearer_token_provider(
            DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
        )
        _openai_client = AsyncAzureOpenAI(
            azure_endpoint=AZURE_OPENAI_ENDPOINT,
            azure_ad_token_provider=token_provider,
            api_version=AZURE_OPENAI_API_VERSION,
        )
    return _openai_client

# Subscription Plans (Server-side defined - NEVER accept from frontend)
SUBSCRIPTION_PLANS = {
    "monthly": {"amount": 19.99, "currency": "usd", "name": "Monthly Plan"},
    "yearly": {"amount": 149.99, "currency": "usd", "name": "Yearly Plan"}
}

# Create the main app
app = FastAPI(title="Freelancer Platform API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

# Auth Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "freelancer"  # freelancer or client

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str
    auth_provider: str

# Freelancer Models
class PortfolioItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    image_url: Optional[str] = None
    link: Optional[str] = None

class EmploymentHistoryItem(BaseModel):
    company: str
    title: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    currently_working: Optional[bool] = False
    description: Optional[str] = None

class EducationItem(BaseModel):
    school: str
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    start_year: Optional[str] = None
    end_year: Optional[str] = None

class LanguageItem(BaseModel):
    language: str
    proficiency: str  # basic, conversational, fluent, native

class FreelancerProfileCreate(BaseModel):
    title: str
    bio: str
    skills: List[str]
    category: str
    hourly_rate: float
    experience_years: int
    location: Optional[str] = None
    # Onboarding fields
    experience_level: Optional[str] = None  # brand_new, some_experience, expert
    goal: Optional[str] = None  # main_income, side_money, experience, undecided
    work_preference: Optional[str] = None  # find_work, sell_packages
    open_to_contract: Optional[bool] = None
    specialties: Optional[List[str]] = None
    employment_history: Optional[List[EmploymentHistoryItem]] = None
    education: Optional[List[EducationItem]] = None
    languages: Optional[List[LanguageItem]] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    country: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    profile_photo: Optional[str] = None

class FreelancerProfileUpdate(BaseModel):
    title: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    category: Optional[str] = None
    hourly_rate: Optional[float] = None
    experience_years: Optional[int] = None
    location: Optional[str] = None
    is_available: Optional[bool] = None
    # Onboarding fields
    experience_level: Optional[str] = None
    goal: Optional[str] = None
    work_preference: Optional[str] = None
    open_to_contract: Optional[bool] = None
    specialties: Optional[List[str]] = None
    employment_history: Optional[List[EmploymentHistoryItem]] = None
    education: Optional[List[EducationItem]] = None
    languages: Optional[List[LanguageItem]] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    country: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    profile_photo: Optional[str] = None

class ClientProfileCreate(BaseModel):
    company_name: Optional[str] = None
    website: Optional[str] = None
    org_size: Optional[str] = None  # just_me, 2_9, 10_99, 100_499, 500_4999, 5000_plus
    industry: Optional[str] = None
    description: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    logo: Optional[str] = None

class ClientProfileUpdate(ClientProfileCreate):
    pass

class AddPortfolioItem(BaseModel):
    title: str
    description: str
    image_url: Optional[str] = None
    link: Optional[str] = None
    media_type: Optional[str] = None  # image | video | audio | link
    media_url: Optional[str] = None

# Review Models
class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: str

# Message Models
class MessageCreate(BaseModel):
    receiver_id: str
    content: str

# Hiring Request Models
class HiringRequestCreate(BaseModel):
    freelancer_id: str
    project_title: str
    project_description: str
    budget: float

class HiringRequestUpdate(BaseModel):
    status: str  # accepted, rejected, completed

# Contract Models
class ContractUpdate(BaseModel):
    status: str  # active, completed, ended

class DiaryEntryCreate(BaseModel):
    note: str
    entry_date: Optional[str] = None  # ISO date; defaults to today

# Job application / proposal models
class JobApplicationCreate(BaseModel):
    cover_letter: Optional[str] = None
    proposed_rate: Optional[float] = None
    proposed_rate_type: Optional[str] = "fixed"  # fixed, hourly
    estimated_duration: Optional[str] = None

class ApplicationStatusUpdate(BaseModel):
    status: str  # shortlisted, declined, withdrawn

# Contract terms / milestone negotiation models
class MilestoneInput(BaseModel):
    title: str
    description: Optional[str] = None
    amount: float = 0
    due_date: Optional[str] = None  # ISO date

class ContractTermsProposal(BaseModel):
    payment_type: str = "milestone"  # fixed, hourly, milestone
    total_amount: Optional[float] = None
    timeline: Optional[str] = None
    note: Optional[str] = None
    milestones: List[MilestoneInput] = []

class MilestoneAction(BaseModel):
    action: str  # fund, start, submit, approve, release, request_changes
    note: Optional[str] = None

# Payment Models
class CheckoutRequest(BaseModel):
    package_type: str  # monthly or yearly
    origin_url: str

# Job Posting Models
class JobPostCreate(BaseModel):
    title: str
    description: str
    category: str
    skills_required: List[str]
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    budget_type: str = "fixed"  # fixed, hourly
    duration: Optional[str] = None  # e.g., "1-2 weeks", "1-3 months"
    location: Optional[str] = None
    remote: bool = True
    project_size: Optional[str] = None  # small, medium, large
    experience_level: Optional[str] = None  # entry, intermediate, expert
    contract_to_hire: Optional[bool] = None

class JobPostUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    skills_required: Optional[List[str]] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    budget_type: Optional[str] = None
    duration: Optional[str] = None
    location: Optional[str] = None
    remote: Optional[bool] = None
    project_size: Optional[str] = None
    experience_level: Optional[str] = None
    contract_to_hire: Optional[bool] = None
    status: Optional[str] = None  # open, closed, filled

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    payload = {
        "user_id": user_id,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

async def get_current_user(request: Request) -> Optional[dict]:
    # Check cookie first
    session_token = request.cookies.get("session_token")
    
    if session_token:
        # Check session in database
        session = await db.sessions.find_one({
            "session_token": session_token,
            "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
        })
        if session:
            user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
            if user and user.get("is_active", True) is False:
                return None
            return user
    
    # Check Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        payload = decode_jwt_token(token)
        if payload:
            user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
            if user and user.get("is_active", True) is False:
                return None
            return user
    
    return None

async def require_auth(request: Request) -> dict:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def require_admin(request: Request) -> dict:
    user = await require_auth(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=UserResponse)
async def register(data: UserRegister, response: Response):
    # Check if user exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": data.email,
        "name": data.name,
        "picture": None,
        "role": data.role,
        "password_hash": hash_password(data.password),
        "auth_provider": "email",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    
    # Create session token
    token = create_jwt_token(user_id)
    expires = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    
    await db.sessions.insert_one({
        "session_token": token,
        "user_id": user_id,
        "expires_at": expires.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRATION_DAYS * 24 * 60 * 60
    )
    
    return UserResponse(
        id=user_id,
        email=data.email,
        name=data.name,
        picture=None,
        role=data.role,
        auth_provider="email"
    )

@api_router.post("/auth/login", response_model=UserResponse)
async def login(data: UserLogin, response: Response):
    user = await db.users.find_one({"email": data.email})
    
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create session token
    token = create_jwt_token(user["id"])
    expires = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    
    await db.sessions.insert_one({
        "session_token": token,
        "user_id": user["id"],
        "expires_at": expires.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRATION_DAYS * 24 * 60 * 60
    )
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        picture=user.get("picture"),
        role=user["role"],
        auth_provider=user["auth_provider"]
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(request: Request):
    user = await require_auth(request)
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        picture=user.get("picture"),
        role=user["role"],
        auth_provider=user["auth_provider"]
    )

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    picture: Optional[str] = None

@api_router.put("/auth/me", response_model=UserResponse)
async def update_me(data: AccountUpdate, request: Request):
    """Update the current user's account details (display name / picture)."""
    user = await require_auth(request)
    updates = {}
    if data.name is not None and data.name.strip():
        updates["name"] = data.name.strip()
    if data.picture is not None:
        updates["picture"] = data.picture
    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
        user = await db.users.find_one({"id": user["id"]})
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        picture=user.get("picture"),
        role=user["role"],
        auth_provider=user["auth_provider"],
    )

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ==================== FREELANCER ENDPOINTS ====================

@api_router.get("/freelancers")
async def list_freelancers(
    request: Request,
    category: Optional[str] = None,
    skills: Optional[str] = None,
    min_rating: Optional[float] = None,
    country: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 12
):
    """List freelancers with filters - only show those with active subscriptions"""
    query = {"subscription_status": "active", "is_suspended": {"$ne": True}}
    
    if category:
        query["category"] = category
    
    if country:
        query["country"] = country
    
    if skills:
        skill_list = [s.strip() for s in skills.split(",")]
        query["skills"] = {"$in": skill_list}
    
    if min_rating:
        query["average_rating"] = {"$gte": min_rating}
    
    if search:
        # Match profile fields OR the freelancer's name (name lives on the users doc).
        name_matches = await db.users.find(
            {"role": "freelancer", "name": {"$regex": search, "$options": "i"}},
            {"id": 1, "_id": 0},
        ).to_list(1000)
        matching_ids = [u["id"] for u in name_matches]
        or_clauses = [
            {"title": {"$regex": search, "$options": "i"}},
            {"bio": {"$regex": search, "$options": "i"}},
            {"skills": {"$elemMatch": {"$regex": search, "$options": "i"}}},
        ]
        if matching_ids:
            or_clauses.append({"user_id": {"$in": matching_ids}})
        query["$or"] = or_clauses
    
    skip = (page - 1) * limit
    
    freelancers = await db.freelancer_profiles.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.freelancer_profiles.count_documents(query)
    
    # Get user info for each freelancer
    for f in freelancers:
        user = await db.users.find_one({"id": f["user_id"]}, {"_id": 0, "password_hash": 0})
        if user:
            f["user"] = user
    
    # Gate for logged-out visitors: only expose the professional title + review
    # score (no name/bio/skills/rate/contact) until they sign up.
    viewer = await get_current_user(request)
    if not viewer:
        freelancers = [
            {
                "id": f.get("id"),
                "title": f.get("title"),
                "category": f.get("category"),
                "average_rating": f.get("average_rating", 0),
                "total_reviews": f.get("total_reviews", 0),
                "is_featured": f.get("is_featured", False),
                "preview_only": True,
            }
            for f in freelancers
        ]
    
    return {
        "freelancers": freelancers,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@api_router.get("/freelancers/countries")
async def list_freelancer_countries():
    """Distinct countries that have active, visible freelancers (for filters)."""
    profiles = await db.freelancer_profiles.find(
        {"subscription_status": "active", "is_suspended": {"$ne": True}},
        {"_id": 0, "country": 1},
    ).to_list(2000)
    countries = sorted({(p.get("country") or "").strip() for p in profiles if (p.get("country") or "").strip()})
    return countries

@api_router.get("/freelancers/featured")
async def get_featured_freelancers():
    """Get top rated freelancers for homepage"""
    freelancers = await db.freelancer_profiles.find(
        {"subscription_status": "active", "is_suspended": {"$ne": True}},
        {"_id": 0}
    ).to_list(200)
    # Sort in Python (Cosmos RU does not support multi-field sort without a composite index)
    freelancers.sort(key=lambda f: (0 if f.get("is_featured") else 1, -(f.get("average_rating") or 0)))
    freelancers = freelancers[:6]

    for f in freelancers:
        user = await db.users.find_one({"id": f["user_id"]}, {"_id": 0, "password_hash": 0})
        if user:
            f["user"] = user
    
    return freelancers

@api_router.get("/freelancers/categories")
async def get_categories():
    """Get all available categories with counts"""
    pipeline = [
        {"$match": {"subscription_status": "active"}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    results = await db.freelancer_profiles.aggregate(pipeline).to_list(100)
    return [{"name": r["_id"], "count": r["count"]} for r in results if r["_id"]]

@api_router.get("/freelancers/{freelancer_id}")
async def get_freelancer(freelancer_id: str, request: Request):
    """Get single freelancer profile"""
    freelancer = await db.freelancer_profiles.find_one({"id": freelancer_id}, {"_id": 0})
    if not freelancer:
        raise HTTPException(status_code=404, detail="Freelancer not found")

    # Best-effort profile view tracking (skip the owner viewing their own profile)
    try:
        viewer = await get_current_user(request)
        if not viewer or viewer.get("id") != freelancer.get("user_id"):
            await db.freelancer_profiles.update_one(
                {"id": freelancer_id}, {"$inc": {"profile_views": 1}}
            )
            freelancer["profile_views"] = freelancer.get("profile_views", 0) + 1
    except Exception:
        pass

    user = await db.users.find_one({"id": freelancer["user_id"]}, {"_id": 0, "password_hash": 0})
    if user:
        freelancer["user"] = user

    return freelancer

@api_router.get("/freelancers/stats/me")
async def get_my_stats(request: Request):
    """Aggregated statistics for the current freelancer."""
    user = await require_auth(request)
    profile = await db.freelancer_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    followers = await db.follows.count_documents({"freelancer_id": profile["id"]})
    hiring_requests = await db.hiring_requests.count_documents({"freelancer_id": profile["id"]})
    applications = await db.job_applications.count_documents({"freelancer_id": user["id"]})

    return {
        "profile_views": profile.get("profile_views", 0),
        "followers": followers,
        "total_reviews": profile.get("total_reviews", 0),
        "average_rating": profile.get("average_rating", 0),
        "hiring_requests_received": hiring_requests,
        "applications_sent": applications,
        "portfolio_count": len(profile.get("portfolio_items", [])),
        "is_available": profile.get("is_available", True),
        "subscription_status": profile.get("subscription_status", "inactive"),
        "member_since": profile.get("created_at"),
    }

@api_router.get("/freelancers/profile/me")
async def get_my_profile(request: Request):
    """Get current user's freelancer profile"""
    user = await require_auth(request)
    
    profile = await db.freelancer_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    return profile

@api_router.post("/freelancers/profile")
async def create_freelancer_profile(data: FreelancerProfileCreate, request: Request):
    """Create freelancer profile"""
    user = await require_auth(request)
    
    if user["role"] != "freelancer":
        raise HTTPException(status_code=403, detail="Only freelancers can create profiles")
    
    existing = await db.freelancer_profiles.find_one({"user_id": user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists")
    
    profile_id = str(uuid.uuid4())
    profile = {
        "id": profile_id,
        "user_id": user["id"],
        "title": data.title,
        "bio": data.bio,
        "skills": data.skills,
        "category": data.category,
        "hourly_rate": data.hourly_rate,
        "experience_years": data.experience_years,
        "location": data.location,
        "experience_level": data.experience_level,
        "goal": data.goal,
        "work_preference": data.work_preference,
        "open_to_contract": data.open_to_contract,
        "specialties": data.specialties or [],
        "employment_history": [e.model_dump() for e in data.employment_history] if data.employment_history else [],
        "education": [e.model_dump() for e in data.education] if data.education else [],
        "languages": [l.model_dump() for l in data.languages] if data.languages else [],
        "phone": data.phone,
        "date_of_birth": data.date_of_birth,
        "country": data.country,
        "address": data.address,
        "city": data.city,
        "state": data.state,
        "zip_code": data.zip_code,
        "profile_photo": data.profile_photo,
        "portfolio_items": [],
        "is_available": True,
        "subscription_status": "inactive",
        "subscription_expires_at": None,
        "average_rating": 0,
        "total_reviews": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.freelancer_profiles.insert_one(profile)
    profile.pop("_id", None)
    return profile

@api_router.put("/freelancers/profile")
async def update_freelancer_profile(data: FreelancerProfileUpdate, request: Request):
    """Update freelancer profile"""
    user = await require_auth(request)
    
    profile = await db.freelancer_profiles.find_one({"user_id": user["id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.freelancer_profiles.update_one(
        {"user_id": user["id"]},
        {"$set": update_data}
    )
    
    updated = await db.freelancer_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    return updated

# ==================== CLIENT PROFILE ENDPOINTS ====================

@api_router.get("/clients/profile/me")
async def get_my_client_profile(request: Request):
    """Get the current client's business profile (or null if none yet)."""
    user = await require_auth(request)
    profile = await db.client_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    return profile

@api_router.post("/clients/profile")
async def upsert_client_profile(data: ClientProfileCreate, request: Request):
    """Create or update the current client's business profile (idempotent upsert)."""
    user = await require_auth(request)
    if user["role"] != "client":
        raise HTTPException(status_code=403, detail="Only clients can create a company profile")

    now = datetime.now(timezone.utc).isoformat()
    fields = {k: v for k, v in data.model_dump().items() if v is not None}
    fields["user_id"] = user["id"]
    fields["updated_at"] = now
    await db.client_profiles.update_one(
        {"user_id": user["id"]},
        {"$set": fields, "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": now}},
        upsert=True,
    )
    return await db.client_profiles.find_one({"user_id": user["id"]}, {"_id": 0})

@api_router.put("/clients/profile")
async def update_client_profile(data: ClientProfileUpdate, request: Request):
    """Update the current client's business profile."""
    return await upsert_client_profile(data, request)

@api_router.post("/freelancers/portfolio")
async def add_portfolio_item(data: AddPortfolioItem, request: Request):
    """Add portfolio item"""
    user = await require_auth(request)
    
    item = {
        "id": str(uuid.uuid4()),
        "title": data.title,
        "description": data.description,
        "image_url": data.image_url,
        "link": data.link,
        "media_type": data.media_type,
        "media_url": data.media_url,
    }
    
    await db.freelancer_profiles.update_one(
        {"user_id": user["id"]},
        {"$push": {"portfolio_items": item}}
    )
    
    return item

@api_router.delete("/freelancers/portfolio/{item_id}")
async def remove_portfolio_item(item_id: str, request: Request):
    """Remove portfolio item"""
    user = await require_auth(request)
    
    await db.freelancer_profiles.update_one(
        {"user_id": user["id"]},
        {"$pull": {"portfolio_items": {"id": item_id}}}
    )
    
    return {"message": "Item removed"}

# ==================== MEDIA UPLOAD ENDPOINTS ====================

@api_router.post("/uploads")
async def upload_media(request: Request, file: UploadFile = File(...)):
    """Upload a portfolio media file (image/video/audio) to Azure Blob Storage."""
    user = await require_auth(request)

    content_type = (file.content_type or "").lower()
    media_type = None
    for mt, allowed in ALLOWED_MEDIA_TYPES.items():
        if content_type in allowed:
            media_type = mt
            break
    if not media_type:
        raise HTTPException(status_code=400, detail="Unsupported file type. Upload an image, video, or audio file.")

    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 50 MB.")
    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")

    ext = os.path.splitext(file.filename or "")[1].lower()
    blob_name = f"{user['id']}/{uuid.uuid4().hex}{ext}"

    from azure.storage.blob import ContentSettings
    service = _get_blob_service()
    container = service.get_container_client(AZURE_STORAGE_CONTAINER)
    try:
        await container.create_container()
    except Exception:
        pass  # container already exists
    await container.upload_blob(
        name=blob_name,
        data=data,
        overwrite=True,
        content_settings=ContentSettings(content_type=content_type),
    )

    return {
        "media_type": media_type,
        "media_url": f"/api/uploads/file/{blob_name}",
        "content_type": content_type,
        "filename": file.filename,
    }

@api_router.get("/uploads/file/{blob_name:path}")
async def serve_media(blob_name: str):
    """Stream a stored media file through the backend using managed identity."""
    service = _get_blob_service()
    container = service.get_container_client(AZURE_STORAGE_CONTAINER)
    blob = container.get_blob_client(blob_name)
    try:
        props = await blob.get_blob_properties()
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")

    downloader = await blob.download_blob()

    async def _stream():
        async for chunk in downloader.chunks():
            yield chunk

    return StreamingResponse(
        _stream(),
        media_type=(props.content_settings.content_type if props.content_settings else None) or "application/octet-stream",
        headers={"Cache-Control": "public, max-age=86400"},
    )

# ==================== CV / RESUME PARSING ====================

CV_SYSTEM_PROMPT = """You extract structured profile data from a freelancer's CV/resume.
Return ONLY a JSON object (no prose, no markdown) matching EXACTLY this shape:
{
  "title": string,               // short professional headline, e.g. "Senior Full-Stack Developer"
  "bio": string,                 // 2-4 sentence professional summary written in first person
  "category": string,            // one broad field, e.g. "Software Development", "Design", "Marketing"
  "skills": [string],            // up to 15 concrete skills/tools
  "specialties": [string],       // up to 3 focus areas
  "languages": [{"language": string, "proficiency": "Basic"|"Conversational"|"Fluent"|"Native"}],
  "employment_history": [{"company": string, "title": string, "start_date": string, "end_date": string, "currently_working": boolean, "description": string}],
  "education": [{"school": string, "degree": string, "field_of_study": string, "start_year": string, "end_year": string}],
  "experience_years": number,    // total years of professional experience, integer
  "phone": string,
  "country": string,
  "city": string
}
Rules:
- Use "" for unknown strings, [] for unknown lists, and 0 for unknown numbers.
- Do NOT invent facts that are not in the CV.
- Keep dates as they appear in the CV (e.g. "Jan 2021", "2019").
- currently_working is true only if the role has no end date / says "Present"."""


def _extract_cv_text(data: bytes, kind: str) -> str:
    import io
    if kind == "pdf":
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(data))
        return "\n".join((page.extract_text() or "") for page in reader.pages)
    # DOCX: a .docx is a zip of XML parts. Read the text directly from the
    # document/header/footer parts using the stdlib (no python-docx/lxml needed).
    import zipfile
    import html
    parts = []
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        names = [n for n in zf.namelist() if re.match(r"word/(document|header\d*|footer\d*)\.xml$", n)]
        # Ensure the main document comes first, then headers/footers.
        names.sort(key=lambda n: (0 if "document" in n else 1, n))
        for name in names:
            try:
                xml = zf.read(name).decode("utf-8", errors="ignore")
            except KeyError:
                continue
            # Preserve paragraph and tab boundaries, then strip all tags.
            xml = xml.replace("</w:p>", "\n").replace("<w:tab/>", "\t").replace("<w:br/>", "\n")
            text = re.sub(r"<[^>]+>", "", xml)
            parts.append(html.unescape(text))
    return "\n".join(parts)


def _sanitize_cv(raw: dict) -> dict:
    def s(v):
        return v.strip() if isinstance(v, str) else ""

    prof_allowed = {"Basic", "Conversational", "Fluent", "Native"}
    skills = [s(x) for x in (raw.get("skills") or []) if s(x)][:15]
    specialties = [s(x) for x in (raw.get("specialties") or []) if s(x)][:3]

    languages = []
    for l in (raw.get("languages") or [])[:10]:
        if not isinstance(l, dict):
            continue
        lang = s(l.get("language"))
        if not lang:
            continue
        prof = l.get("proficiency")
        languages.append({"language": lang, "proficiency": prof if prof in prof_allowed else "Conversational"})

    employment = []
    for e in (raw.get("employment_history") or [])[:15]:
        if not isinstance(e, dict):
            continue
        if not (s(e.get("company")) or s(e.get("title"))):
            continue
        employment.append({
            "company": s(e.get("company")),
            "title": s(e.get("title")),
            "start_date": s(e.get("start_date")),
            "end_date": s(e.get("end_date")),
            "currently_working": bool(e.get("currently_working")),
            "description": s(e.get("description")),
        })

    education = []
    for e in (raw.get("education") or [])[:15]:
        if not isinstance(e, dict):
            continue
        if not s(e.get("school")):
            continue
        education.append({
            "school": s(e.get("school")),
            "degree": s(e.get("degree")),
            "field_of_study": s(e.get("field_of_study")),
            "start_year": s(e.get("start_year")),
            "end_year": s(e.get("end_year")),
        })

    try:
        yrs_val = raw.get("experience_years")
        experience_years = int(float(yrs_val)) if yrs_val not in (None, "") else None
        if experience_years is not None and (experience_years < 0 or experience_years > 70):
            experience_years = None
    except (TypeError, ValueError):
        experience_years = None

    return {
        "title": s(raw.get("title")),
        "bio": s(raw.get("bio")),
        "category": s(raw.get("category")),
        "skills": skills,
        "specialties": specialties,
        "languages": languages,
        "employment_history": employment,
        "education": education,
        "experience_years": experience_years,
        "phone": s(raw.get("phone")),
        "country": s(raw.get("country")),
        "city": s(raw.get("city")),
    }


async def _parse_cv_with_llm(text: str) -> dict:
    client = _get_openai_client()
    try:
        resp = await client.chat.completions.create(
            model=AZURE_OPENAI_DEPLOYMENT,
            messages=[
                {"role": "system", "content": CV_SYSTEM_PROMPT},
                {"role": "user", "content": f"CV text:\n\n{text}"},
            ],
            response_format={"type": "json_object"},
            max_completion_tokens=4000,
        )
    except Exception:
        logger.exception("CV LLM call failed")
        raise HTTPException(status_code=502, detail="The CV parser is temporarily unavailable. Please fill the form manually.")

    content = (resp.choices[0].message.content or "").strip() if resp.choices else ""
    try:
        raw = json.loads(content)
    except (ValueError, TypeError):
        raise HTTPException(status_code=502, detail="Could not understand the CV. Please fill the form manually.")
    if not isinstance(raw, dict):
        raise HTTPException(status_code=502, detail="Could not understand the CV. Please fill the form manually.")
    return _sanitize_cv(raw)


@api_router.post("/freelancers/parse-cv")
async def parse_cv(request: Request, file: UploadFile = File(...)):
    """Extract structured profile fields from an uploaded CV (PDF or DOCX)."""
    user = await require_auth(request)
    if user["role"] != "freelancer":
        raise HTTPException(status_code=403, detail="Only freelancers can parse CVs")

    content_type = (file.content_type or "").lower()
    kind = CV_ALLOWED_TYPES.get(content_type)
    if not kind:
        ext = os.path.splitext(file.filename or "")[1].lower()
        kind = {".pdf": "pdf", ".docx": "docx", ".doc": "docx"}.get(ext)
    if not kind:
        raise HTTPException(status_code=400, detail="Please upload a PDF or Word (.docx) file.")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")
    if len(data) > MAX_CV_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10 MB.")

    try:
        text = _extract_cv_text(data, kind)
    except Exception:
        logger.exception("CV text extraction failed")
        raise HTTPException(status_code=422, detail="Could not read that file. If it is a scanned image, please fill the form manually.")

    text = (text or "").strip()
    if len(text) < 30:
        raise HTTPException(status_code=422, detail="We couldn't find readable text in that CV. If it is a scanned image, please fill the form manually.")
    text = text[:MAX_CV_TEXT_CHARS]

    return await _parse_cv_with_llm(text)

@api_router.get("/account-health/me")
async def get_account_health(request: Request):
    """Account health & standing for the current freelancer."""
    user = await require_auth(request)
    profile = await db.freelancer_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    suspended = bool(profile.get("is_suspended")) if profile else False
    return {
        "platform_access": "suspended" if suspended else "full",
        "account_standing": "at_risk" if suspended else "good",
        "policy_violations": 0,
        "submitted_appeals": 0,
        "is_suspended": suspended,
        "subscription_status": profile.get("subscription_status", "inactive") if profile else "inactive",
        "member_since": profile.get("created_at") if profile else None,
    }

# ==================== REVIEWS ENDPOINTS ====================

@api_router.get("/freelancers/{freelancer_id}/reviews")
async def get_freelancer_reviews(freelancer_id: str, page: int = 1, limit: int = 10):
    """Get reviews for a freelancer"""
    skip = (page - 1) * limit
    
    # Cosmos (Mongo API) rejects server-side .sort() on non-indexed fields here,
    # so fetch and sort/paginate in Python.
    all_reviews = await db.reviews.find(
        {"freelancer_id": freelancer_id},
        {"_id": 0}
    ).to_list(1000)
    all_reviews.sort(key=lambda r: r.get("created_at") or "", reverse=True)
    total = len(all_reviews)
    reviews = all_reviews[skip:skip + limit]
    
    # Get client info
    for r in reviews:
        client = await db.users.find_one({"id": r["client_id"]}, {"_id": 0, "password_hash": 0})
        if client:
            r["client"] = client
    
    return {
        "reviews": reviews,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@api_router.post("/freelancers/{freelancer_id}/reviews")
async def create_review(freelancer_id: str, data: ReviewCreate, request: Request):
    """Create a review for a freelancer"""
    user = await require_auth(request)
    
    if user["role"] != "client":
        raise HTTPException(status_code=403, detail="Only clients can leave reviews")
    
    # Check if already reviewed
    existing = await db.reviews.find_one({
        "freelancer_id": freelancer_id,
        "client_id": user["id"]
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already reviewed this freelancer")
    
    review = {
        "id": str(uuid.uuid4()),
        "freelancer_id": freelancer_id,
        "client_id": user["id"],
        "rating": data.rating,
        "comment": data.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.reviews.insert_one(review)
    
    # Update freelancer's average rating
    pipeline = [
        {"$match": {"freelancer_id": freelancer_id}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}}
    ]
    result = await db.reviews.aggregate(pipeline).to_list(1)
    
    if result:
        await db.freelancer_profiles.update_one(
            {"id": freelancer_id},
            {"$set": {
                "average_rating": round(result[0]["avg"], 1),
                "total_reviews": result[0]["count"]
            }}
        )

    # Notify the freelancer of the new review
    freelancer_profile = await db.freelancer_profiles.find_one({"id": freelancer_id})
    if freelancer_profile:
        await _notify(freelancer_profile.get("user_id"), "review", "New review",
                      f"{user['name']} left you a {data.rating}-star review.",
                      f"/freelancers/{freelancer_id}")

    review.pop("_id", None)
    return review

# ==================== MESSAGES ENDPOINTS ====================

@api_router.get("/messages")
async def get_conversations(request: Request):
    """Get all conversations for current user"""
    user = await require_auth(request)
    
    # Get unique conversation partners
    pipeline = [
        {"$match": {"$or": [{"sender_id": user["id"]}, {"receiver_id": user["id"]}]}},
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id": {
                "$cond": [
                    {"$eq": ["$sender_id", user["id"]]},
                    "$receiver_id",
                    "$sender_id"
                ]
            },
            "last_message": {"$first": "$$ROOT"},
            "unread_count": {
                "$sum": {
                    "$cond": [
                        {"$and": [
                            {"$eq": ["$receiver_id", user["id"]]},
                            {"$eq": ["$is_read", False]}
                        ]},
                        1,
                        0
                    ]
                }
            }
        }}
    ]
    
    conversations = await db.messages.aggregate(pipeline).to_list(100)
    
    # Get user info for each conversation
    result = []
    for conv in conversations:
        other_user = await db.users.find_one({"id": conv["_id"]}, {"_id": 0, "password_hash": 0})
        if other_user:
            result.append({
                "user": other_user,
                "last_message": conv["last_message"]["content"],
                "last_message_at": conv["last_message"]["created_at"],
                "unread_count": conv["unread_count"]
            })
    
    return result

@api_router.get("/messages/{other_user_id}")
async def get_conversation(other_user_id: str, request: Request):
    """Get messages with specific user"""
    user = await require_auth(request)
    
    messages = await db.messages.find(
        {
            "$or": [
                {"sender_id": user["id"], "receiver_id": other_user_id},
                {"sender_id": other_user_id, "receiver_id": user["id"]}
            ]
        },
        {"_id": 0}
    ).to_list(1000)
    messages.sort(key=lambda d: d.get("created_at") or "")
    
    # Mark messages as read
    await db.messages.update_many(
        {"sender_id": other_user_id, "receiver_id": user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    return messages

@api_router.post("/messages")
async def send_message(data: MessageCreate, request: Request):
    """Send a message"""
    user = await require_auth(request)
    
    message = {
        "id": str(uuid.uuid4()),
        "sender_id": user["id"],
        "receiver_id": data.receiver_id,
        "content": data.content,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.messages.insert_one(message)
    
    # Create notification for receiver
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": data.receiver_id,
        "type": "new_message",
        "title": "New Message",
        "message": f"{user['name']} sent you a message",
        "link": "/dashboard/messages",
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    message.pop("_id", None)
    return message

# ==================== HIRING REQUESTS ENDPOINTS ====================

@api_router.get("/hiring-requests")
async def get_hiring_requests(request: Request):
    """Get hiring requests for current user"""
    user = await require_auth(request)
    
    if user["role"] == "client":
        query = {"client_id": user["id"]}
    else:
        # Get freelancer profile
        profile = await db.freelancer_profiles.find_one({"user_id": user["id"]})
        if not profile:
            return []
        query = {"freelancer_id": profile["id"]}
    
    requests = await db.hiring_requests.find(query, {"_id": 0}).to_list(1000)
    requests.sort(key=lambda d: d.get("created_at") or "", reverse=True)
    
    # Enrich with user/freelancer info
    for req in requests:
        if user["role"] == "client":
            freelancer = await db.freelancer_profiles.find_one({"id": req["freelancer_id"]}, {"_id": 0})
            if freelancer:
                f_user = await db.users.find_one({"id": freelancer["user_id"]}, {"_id": 0, "password_hash": 0})
                req["freelancer"] = {**freelancer, "user": f_user}
        else:
            client = await db.users.find_one({"id": req["client_id"]}, {"_id": 0, "password_hash": 0})
            req["client"] = client
    
    return requests

@api_router.post("/hiring-requests")
async def create_hiring_request(data: HiringRequestCreate, request: Request):
    """Create a hiring request"""
    user = await require_auth(request)
    
    if user["role"] != "client":
        raise HTTPException(status_code=403, detail="Only clients can create hiring requests")
    
    hiring_request = {
        "id": str(uuid.uuid4()),
        "client_id": user["id"],
        "freelancer_id": data.freelancer_id,
        "project_title": data.project_title,
        "project_description": data.project_description,
        "budget": data.budget,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.hiring_requests.insert_one(hiring_request)
    
    # Create notification for freelancer
    freelancer = await db.freelancer_profiles.find_one({"id": data.freelancer_id})
    if freelancer:
        notification = {
            "id": str(uuid.uuid4()),
            "user_id": freelancer["user_id"],
            "type": "hiring_request",
            "title": "New Hiring Request",
            "message": f"{user['name']} sent you a hiring request for '{data.project_title}'",
            "link": "/dashboard/requests",
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
    
    hiring_request.pop("_id", None)
    return hiring_request

@api_router.put("/hiring-requests/{request_id}")
async def update_hiring_request(request_id: str, data: HiringRequestUpdate, request: Request):
    """Update hiring request status"""
    user = await require_auth(request)
    
    hiring_req = await db.hiring_requests.find_one({"id": request_id})
    if not hiring_req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Only freelancer can accept/reject
    if data.status in ["accepted", "rejected"]:
        profile = await db.freelancer_profiles.find_one({"user_id": user["id"]})
        if not profile or profile["id"] != hiring_req["freelancer_id"]:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.hiring_requests.update_one(
        {"id": request_id},
        {"$set": {"status": data.status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    # When accepted, spin up a contract (once) so both parties can track the engagement
    if data.status == "accepted":
        existing = await db.contracts.find_one({"hiring_request_id": request_id})
        if not existing:
            freelancer_profile = await db.freelancer_profiles.find_one({"id": hiring_req["freelancer_id"]})
            now_iso = datetime.now(timezone.utc).isoformat()
            contract = {
                "id": str(uuid.uuid4()),
                "hiring_request_id": request_id,
                "job_id": hiring_req.get("job_id"),
                "client_id": hiring_req["client_id"],
                "freelancer_id": hiring_req["freelancer_id"],
                "freelancer_user_id": freelancer_profile["user_id"] if freelancer_profile else None,
                "title": hiring_req["project_title"],
                "description": hiring_req["project_description"],
                "budget": hiring_req.get("budget"),
                "status": "active",
                "payment_type": None,
                "total_amount": None,
                "timeline": None,
                "agreement_status": "negotiating",
                "client_agreed": False,
                "freelancer_agreed": False,
                "proposed_terms": None,
                "milestones": [],
                "diary": [],
                "started_at": now_iso,
                "ended_at": None,
                "created_at": now_iso,
                "updated_at": now_iso,
            }
            await db.contracts.insert_one(contract)
            # Notify the client that the contract is active
            notification = {
                "id": str(uuid.uuid4()),
                "user_id": hiring_req["client_id"],
                "type": "contract",
                "title": "Contract started",
                "message": f"{user['name']} accepted your request \u2014 the contract for '{hiring_req['project_title']}' is now active.",
                "link": "/dashboard/contracts",
                "is_read": False,
                "created_at": now_iso,
            }
            await db.notifications.insert_one(notification)

    # Keep the linked contract in sync when the request is completed
    if data.status == "completed":
        await db.contracts.update_one(
            {"hiring_request_id": request_id, "status": {"$ne": "ended"}},
            {"$set": {
                "status": "completed",
                "ended_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
    
    return {"message": "Request updated"}

# ==================== CONTRACT ENDPOINTS ====================

async def _enrich_contract(contract: dict, viewer_role: str):
    """Attach client + freelancer summaries to a contract document."""
    client = await db.users.find_one({"id": contract["client_id"]}, {"_id": 0, "password_hash": 0})
    contract["client"] = client
    freelancer = await db.freelancer_profiles.find_one({"id": contract["freelancer_id"]}, {"_id": 0})
    if freelancer:
        f_user = await db.users.find_one({"id": freelancer["user_id"]}, {"_id": 0, "password_hash": 0})
        contract["freelancer"] = {**freelancer, "user": f_user}
    return contract


async def _get_contract_for_user(contract_id: str, user: dict):
    """Fetch a contract and ensure the current user is a participant."""
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    is_client = contract["client_id"] == user["id"]
    is_freelancer = contract.get("freelancer_user_id") == user["id"]
    if not (is_client or is_freelancer):
        raise HTTPException(status_code=403, detail="Not authorized")
    return contract, is_client, is_freelancer


@api_router.get("/contracts")
async def get_contracts(request: Request, status: Optional[str] = None,
                        search: Optional[str] = None, sort: str = "started_at",
                        order: str = "desc"):
    """List contracts for the current user (client or freelancer)."""
    user = await require_auth(request)

    if user["role"] == "client":
        query = {"client_id": user["id"]}
    else:
        query = {"freelancer_user_id": user["id"]}

    if status and status != "all":
        query["status"] = status
    if search:
        query["title"] = {"$regex": search, "$options": "i"}

    sort_field = sort if sort in ("started_at", "created_at", "title") else "started_at"
    direction = 1 if order == "asc" else -1

    contracts = await db.contracts.find(query, {"_id": 0}).to_list(1000)
    contracts.sort(key=lambda d: d.get(sort_field) or "", reverse=(direction == -1))
    contracts = contracts[:200]
    for c in contracts:
        await _enrich_contract(c, user["role"])
    return contracts


@api_router.get("/contracts/summary")
async def get_contracts_summary(request: Request):
    """Counts of contracts by status for the current user."""
    user = await require_auth(request)
    base = {"client_id": user["id"]} if user["role"] == "client" else {"freelancer_user_id": user["id"]}
    active = await db.contracts.count_documents({**base, "status": "active"})
    completed = await db.contracts.count_documents({**base, "status": "completed"})
    ended = await db.contracts.count_documents({**base, "status": "ended"})
    total = await db.contracts.count_documents(base)
    return {"active": active, "completed": completed, "ended": ended, "total": total}


@api_router.get("/contracts/{contract_id}")
async def get_contract(contract_id: str, request: Request):
    """Get a single contract with diary entries."""
    user = await require_auth(request)
    contract, _, _ = await _get_contract_for_user(contract_id, user)
    await _enrich_contract(contract, user["role"])
    contract.setdefault("diary", [])
    contract["diary"].sort(key=lambda e: e.get("entry_date", ""), reverse=True)
    return contract


@api_router.put("/contracts/{contract_id}")
async def update_contract(contract_id: str, data: ContractUpdate, request: Request):
    """Update a contract's status (active -> completed/ended)."""
    user = await require_auth(request)
    contract, _, _ = await _get_contract_for_user(contract_id, user)

    if data.status not in ("active", "completed", "ended"):
        raise HTTPException(status_code=400, detail="Invalid status")

    update = {"status": data.status, "updated_at": datetime.now(timezone.utc).isoformat()}
    if data.status in ("completed", "ended"):
        update["ended_at"] = datetime.now(timezone.utc).isoformat()
    else:
        update["ended_at"] = None

    await db.contracts.update_one({"id": contract_id}, {"$set": update})
    return {"message": "Contract updated"}


@api_router.post("/contracts/{contract_id}/diary")
async def add_diary_entry(contract_id: str, data: DiaryEntryCreate, request: Request):
    """Add a dated activity-log entry to a contract."""
    user = await require_auth(request)
    contract, _, _ = await _get_contract_for_user(contract_id, user)

    note = data.note.strip()
    if not note:
        raise HTTPException(status_code=400, detail="Note cannot be empty")

    entry = {
        "id": str(uuid.uuid4()),
        "author_id": user["id"],
        "author_name": user["name"],
        "note": note,
        "entry_date": data.entry_date or datetime.now(timezone.utc).date().isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.contracts.update_one(
        {"id": contract_id},
        {"$push": {"diary": entry}, "$set": {"updated_at": entry["created_at"]}}
    )
    return entry


@api_router.delete("/contracts/{contract_id}/diary/{entry_id}")
async def delete_diary_entry(contract_id: str, entry_id: str, request: Request):
    """Delete a diary entry (author only)."""
    user = await require_auth(request)
    contract, _, _ = await _get_contract_for_user(contract_id, user)

    entry = next((e for e in contract.get("diary", []) if e.get("id") == entry_id), None)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    if entry.get("author_id") != user["id"]:
        raise HTTPException(status_code=403, detail="You can only delete your own entries")

    await db.contracts.update_one(
        {"id": contract_id},
        {"$pull": {"diary": {"id": entry_id}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Entry deleted"}

# ==================== CONTRACT TERMS & MILESTONES ====================

async def _notify(user_id: Optional[str], ntype: str, title: str, message: str, link: str):
    """Insert a notification for a user (no-op if user_id is falsy)."""
    if not user_id:
        return
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": ntype,
        "title": title,
        "message": message,
        "link": link,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


@api_router.post("/contracts/{contract_id}/terms")
async def propose_contract_terms(contract_id: str, data: ContractTermsProposal, request: Request):
    """Propose (or counter-propose) the terms & milestones for a contract.
    Either participant can propose; the other must accept before it takes effect."""
    user = await require_auth(request)
    contract, is_client, is_freelancer = await _get_contract_for_user(contract_id, user)

    if data.payment_type not in ("fixed", "hourly", "milestone"):
        raise HTTPException(status_code=400, detail="Invalid payment type")

    milestones = []
    for i, m in enumerate(data.milestones):
        if not m.title or not m.title.strip():
            raise HTTPException(status_code=400, detail="Each milestone needs a title")
        milestones.append({
            "id": str(uuid.uuid4()),
            "title": m.title.strip(),
            "description": (m.description or "").strip(),
            "amount": float(m.amount or 0),
            "due_date": m.due_date,
            "order": i,
        })

    total = data.total_amount
    if total is None and milestones:
        total = sum(m["amount"] for m in milestones)

    now_iso = datetime.now(timezone.utc).isoformat()
    proposed_terms = {
        "proposed_by": user["id"],
        "proposed_by_role": "client" if is_client else "freelancer",
        "payment_type": data.payment_type,
        "total_amount": total,
        "timeline": (data.timeline or "").strip() or None,
        "note": (data.note or "").strip() or None,
        "milestones": milestones,
        "created_at": now_iso,
    }

    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {
            "proposed_terms": proposed_terms,
            "agreement_status": "negotiating",
            "client_agreed": is_client,
            "freelancer_agreed": is_freelancer,
            "updated_at": now_iso,
        }}
    )

    other_id = contract.get("freelancer_user_id") if is_client else contract["client_id"]
    await _notify(other_id, "contract_terms",
                  "New terms proposed",
                  f"{user['name']} proposed terms for '{contract['title']}'. Review and respond.",
                  f"/dashboard/contracts/{contract_id}")
    return {"message": "Terms proposed", "proposed_terms": proposed_terms}


@api_router.post("/contracts/{contract_id}/terms/accept")
async def accept_contract_terms(contract_id: str, request: Request):
    """Accept the currently proposed terms. Must be the party that did NOT propose."""
    user = await require_auth(request)
    contract, is_client, is_freelancer = await _get_contract_for_user(contract_id, user)

    terms = contract.get("proposed_terms")
    if not terms:
        raise HTTPException(status_code=400, detail="No terms have been proposed")
    if terms.get("proposed_by") == user["id"]:
        raise HTTPException(status_code=400, detail="You proposed these terms; the other party must accept")

    now_iso = datetime.now(timezone.utc).isoformat()
    milestones = []
    for m in terms.get("milestones", []):
        milestones.append({
            **m,
            "status": "pending",
            "funded_at": None,
            "started_at": None,
            "submitted_at": None,
            "approved_at": None,
            "released_at": None,
        })

    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {
            "payment_type": terms.get("payment_type"),
            "total_amount": terms.get("total_amount"),
            "timeline": terms.get("timeline"),
            "milestones": milestones,
            "agreement_status": "agreed",
            "client_agreed": True,
            "freelancer_agreed": True,
            "proposed_terms": None,
            "status": "active",
            "updated_at": now_iso,
        }}
    )

    other_id = contract.get("freelancer_user_id") if is_client else contract["client_id"]
    await _notify(other_id, "contract_terms",
                  "Terms accepted",
                  f"{user['name']} accepted the terms for '{contract['title']}'. Work can begin.",
                  f"/dashboard/contracts/{contract_id}")
    return {"message": "Terms accepted"}


@api_router.post("/contracts/{contract_id}/terms/decline")
async def decline_contract_terms(contract_id: str, request: Request):
    """Decline the currently proposed terms (clears the proposal)."""
    user = await require_auth(request)
    contract, is_client, is_freelancer = await _get_contract_for_user(contract_id, user)

    terms = contract.get("proposed_terms")
    if not terms:
        raise HTTPException(status_code=400, detail="No terms have been proposed")
    if terms.get("proposed_by") == user["id"]:
        raise HTTPException(status_code=400, detail="You cannot decline your own proposal")

    now_iso = datetime.now(timezone.utc).isoformat()
    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {"proposed_terms": None, "agreement_status": "negotiating",
                  "client_agreed": False, "freelancer_agreed": False, "updated_at": now_iso}}
    )
    other_id = contract.get("freelancer_user_id") if is_client else contract["client_id"]
    await _notify(other_id, "contract_terms",
                  "Terms declined",
                  f"{user['name']} declined the proposed terms for '{contract['title']}'. Send a new proposal.",
                  f"/dashboard/contracts/{contract_id}")
    return {"message": "Terms declined"}


# Allowed milestone transitions: action -> (who, allowed_from_statuses, new_status)
_MILESTONE_RULES = {
    "fund":            ("client",     {"pending"},                         "funded"),
    "start":           ("freelancer", {"pending", "funded"},               "in_progress"),
    "submit":          ("freelancer", {"pending", "funded", "in_progress"}, "submitted"),
    "approve":         ("client",     {"submitted"},                       "approved"),
    "release":         ("client",     {"approved"},                        "released"),
    "request_changes": ("client",     {"submitted"},                       "in_progress"),
}


@api_router.post("/contracts/{contract_id}/milestones/{milestone_id}/action")
async def milestone_action(contract_id: str, milestone_id: str, data: MilestoneAction, request: Request):
    """Advance a milestone through its lifecycle (fund/start/submit/approve/release/request_changes)."""
    user = await require_auth(request)
    contract, is_client, is_freelancer = await _get_contract_for_user(contract_id, user)

    if contract.get("agreement_status") != "agreed":
        raise HTTPException(status_code=400, detail="Agree on terms before working on milestones")

    rule = _MILESTONE_RULES.get(data.action)
    if not rule:
        raise HTTPException(status_code=400, detail="Invalid action")
    who, allowed_from, new_status = rule

    if who == "client" and not is_client:
        raise HTTPException(status_code=403, detail="Only the client can do that")
    if who == "freelancer" and not is_freelancer:
        raise HTTPException(status_code=403, detail="Only the freelancer can do that")

    milestones = contract.get("milestones", [])
    ms = next((m for m in milestones if m.get("id") == milestone_id), None)
    if not ms:
        raise HTTPException(status_code=404, detail="Milestone not found")
    if ms.get("status") not in allowed_from:
        raise HTTPException(status_code=400, detail=f"Cannot {data.action} a milestone that is '{ms.get('status')}'")

    now_iso = datetime.now(timezone.utc).isoformat()
    ms["status"] = new_status
    stamp_field = {
        "fund": "funded_at", "start": "started_at", "submit": "submitted_at",
        "approve": "approved_at", "release": "released_at",
    }.get(data.action)
    if stamp_field:
        ms[stamp_field] = now_iso
    if data.action == "request_changes":
        ms["submitted_at"] = None

    # Auto-complete the contract when every milestone is released
    contract_update = {"milestones": milestones, "updated_at": now_iso}
    if milestones and all(m.get("status") == "released" for m in milestones):
        contract_update["status"] = "completed"
        contract_update["ended_at"] = now_iso

    await db.contracts.update_one({"id": contract_id}, {"$set": contract_update})

    labels = {
        "fund": "funded", "start": "started work on", "submit": "submitted",
        "approve": "approved", "release": "released payment for",
        "request_changes": "requested changes on",
    }
    other_id = contract.get("freelancer_user_id") if is_client else contract["client_id"]
    await _notify(other_id, "milestone",
                  "Milestone update",
                  f"{user['name']} {labels[data.action]} milestone '{ms['title']}' on '{contract['title']}'.",
                  f"/dashboard/contracts/{contract_id}")
    return {"message": "Milestone updated", "milestone": ms,
            "contract_status": contract_update.get("status", contract["status"])}

# ==================== PAYMENT ENDPOINTS ====================

@api_router.post("/payments/checkout")
async def create_checkout(data: CheckoutRequest, request: Request):
    """Create Stripe checkout session for subscription"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    
    user = await require_auth(request)
    
    if data.package_type not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid package type")
    
    plan = SUBSCRIPTION_PLANS[data.package_type]
    
    # Build URLs from frontend origin
    success_url = f"{data.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/pricing"
    
    # Initialize Stripe
    webhook_url = f"{str(request.base_url)}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    # Create checkout session
    checkout_request = CheckoutSessionRequest(
        amount=plan["amount"],
        currency=plan["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user["id"],
            "package_type": data.package_type,
            "plan_name": plan["name"]
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    transaction = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "session_id": session.session_id,
        "amount": plan["amount"],
        "currency": plan["currency"],
        "package_type": data.package_type,
        "payment_status": "pending",
        "metadata": {
            "user_id": user["id"],
            "package_type": data.package_type
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payment_transactions.insert_one(transaction)
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, request: Request):
    """Get payment status and update subscription if paid"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    await require_auth(request)  # Ensure user is authenticated
    
    # Check if already processed
    transaction = await db.payment_transactions.find_one({"session_id": session_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction["payment_status"] == "paid":
        return {"status": "complete", "payment_status": "paid", "message": "Already processed"}
    
    # Get status from Stripe
    webhook_url = f"{str(request.base_url)}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {
            "payment_status": status.payment_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # If paid, activate subscription
    if status.payment_status == "paid":
        # Calculate expiration based on package
        package_type = transaction["package_type"]
        if package_type == "monthly":
            expires = datetime.now(timezone.utc) + timedelta(days=30)
        else:
            expires = datetime.now(timezone.utc) + timedelta(days=365)
        
        await db.freelancer_profiles.update_one(
            {"user_id": transaction["user_id"]},
            {"$set": {
                "subscription_status": "active",
                "subscription_expires_at": expires.isoformat()
            }}
        )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    webhook_url = f"{str(request.base_url)}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        event = await stripe_checkout.handle_webhook(body, signature)
        
        if event.payment_status == "paid":
            # Update transaction
            await db.payment_transactions.update_one(
                {"session_id": event.session_id},
                {"$set": {
                    "payment_status": "paid",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Activate subscription
            transaction = await db.payment_transactions.find_one({"session_id": event.session_id})
            if transaction:
                package_type = transaction["package_type"]
                if package_type == "monthly":
                    expires = datetime.now(timezone.utc) + timedelta(days=30)
                else:
                    expires = datetime.now(timezone.utc) + timedelta(days=365)
                
                await db.freelancer_profiles.update_one(
                    {"user_id": transaction["user_id"]},
                    {"$set": {
                        "subscription_status": "active",
                        "subscription_expires_at": expires.isoformat()
                    }}
                )
        
        return {"received": True}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return JSONResponse(status_code=400, content={"error": str(e)})

@api_router.get("/billing/me")
async def get_my_billing(request: Request):
    """Return the current freelancer's membership status, plan, and billing history.

    Freelanceo charges only a monthly membership (registration) fee and never
    takes a service fee, so there are no earnings/withdrawals here — just the
    subscription and the history of membership payments.
    """
    user = await require_auth(request)

    profile = await db.freelancer_profiles.find_one({"user_id": user["id"]}, {"_id": 0})

    transactions = await db.payment_transactions.find(
        {"user_id": user["id"]}, {"_id": 0, "metadata": 0}
    ).to_list(200)
    transactions.sort(key=lambda t: t.get("created_at") or "", reverse=True)

    total_paid = round(
        sum(t.get("amount", 0) for t in transactions if t.get("payment_status") == "paid"),
        2,
    )

    subscription_status = profile.get("subscription_status") if profile else "inactive"
    expires_at = profile.get("subscription_expires_at") if profile else None

    # Infer current plan from the most recent paid transaction.
    current_plan = None
    for t in transactions:
        if t.get("payment_status") == "paid" and t.get("package_type"):
            plan = SUBSCRIPTION_PLANS.get(t["package_type"])
            if plan:
                current_plan = {"package_type": t["package_type"], **plan}
            break

    return {
        "subscription_status": subscription_status or "inactive",
        "subscription_expires_at": expires_at,
        "current_plan": current_plan,
        "total_paid": total_paid,
        "takes_service_fee": False,
        "plans": SUBSCRIPTION_PLANS,
        "transactions": transactions,
    }

# ==================== FOLLOW SYSTEM ENDPOINTS ====================

@api_router.post("/freelancers/{freelancer_id}/follow")
async def follow_freelancer(freelancer_id: str, request: Request):
    """Follow a freelancer"""
    user = await require_auth(request)
    
    # Check if freelancer exists
    freelancer = await db.freelancer_profiles.find_one({"id": freelancer_id})
    if not freelancer:
        raise HTTPException(status_code=404, detail="Freelancer not found")
    
    # Check if already following
    existing = await db.follows.find_one({
        "follower_id": user["id"],
        "freelancer_id": freelancer_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Already following")
    
    follow = {
        "id": str(uuid.uuid4()),
        "follower_id": user["id"],
        "freelancer_id": freelancer_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.follows.insert_one(follow)
    await _notify(freelancer.get("user_id"), "follow", "New follower",
                  f"{user['name']} started following you.", "/feed")
    return {"message": "Following successfully"}

@api_router.delete("/freelancers/{freelancer_id}/follow")
async def unfollow_freelancer(freelancer_id: str, request: Request):
    """Unfollow a freelancer"""
    user = await require_auth(request)
    
    result = await db.follows.delete_one({
        "follower_id": user["id"],
        "freelancer_id": freelancer_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not following")
    
    return {"message": "Unfollowed successfully"}

@api_router.get("/freelancers/{freelancer_id}/is-following")
async def check_following(freelancer_id: str, request: Request):
    """Check if current user is following a freelancer"""
    user = await get_current_user(request)
    if not user:
        return {"is_following": False}
    
    existing = await db.follows.find_one({
        "follower_id": user["id"],
        "freelancer_id": freelancer_id
    })
    
    return {"is_following": existing is not None}

@api_router.get("/following")
async def get_following(request: Request):
    """Get list of freelancers the user is following"""
    user = await require_auth(request)
    
    follows = await db.follows.find({"follower_id": user["id"]}, {"_id": 0}).to_list(100)
    freelancer_ids = [f["freelancer_id"] for f in follows]
    
    freelancers = await db.freelancer_profiles.find(
        {"id": {"$in": freelancer_ids}},
        {"_id": 0}
    ).to_list(100)
    
    for f in freelancers:
        f_user = await db.users.find_one({"id": f["user_id"]}, {"_id": 0, "password_hash": 0})
        if f_user:
            f["user"] = f_user
    
    return freelancers

# ==================== POSTS/FEED ENDPOINTS ====================

class PostCreate(BaseModel):
    content: str
    image_url: Optional[str] = None

@api_router.post("/posts")
async def create_post(data: PostCreate, request: Request):
    """Create a new post (freelancers only)"""
    user = await require_auth(request)
    
    if user["role"] != "freelancer":
        raise HTTPException(status_code=403, detail="Only freelancers can create posts")
    
    # Get freelancer profile
    profile = await db.freelancer_profiles.find_one({"user_id": user["id"]})
    if not profile:
        raise HTTPException(status_code=400, detail="Create a profile first")
    
    post = {
        "id": str(uuid.uuid4()),
        "freelancer_id": profile["id"],
        "user_id": user["id"],
        "content": data.content,
        "image_url": data.image_url,
        "likes_count": 0,
        "comments_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.posts.insert_one(post)
    
    # Create notifications for followers
    followers = await db.follows.find({"freelancer_id": profile["id"]}).to_list(1000)
    for follower in followers:
        notification = {
            "id": str(uuid.uuid4()),
            "user_id": follower["follower_id"],
            "type": "new_post",
            "title": "New Post",
            "message": f"{user['name']} shared a new post",
            "link": f"/posts/{post['id']}",
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
    
    return {**post, "user": user}

@api_router.get("/posts")
async def get_posts(page: int = 1, limit: int = 20):
    """Get all posts (public feed)"""
    skip = (page - 1) * limit
    
    all_posts = await db.posts.find({}, {"_id": 0}).to_list(2000)
    all_posts.sort(key=lambda d: d.get("created_at") or "", reverse=True)
    posts = all_posts[skip:skip + limit]
    
    for post in posts:
        post_user = await db.users.find_one({"id": post["user_id"]}, {"_id": 0, "password_hash": 0})
        if post_user:
            post["user"] = post_user
        profile = await db.freelancer_profiles.find_one({"id": post["freelancer_id"]}, {"_id": 0})
        if profile:
            post["profile"] = profile
    
    total = await db.posts.count_documents({})
    
    return {
        "posts": posts,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@api_router.get("/feed")
async def get_feed(request: Request, page: int = 1, limit: int = 20):
    """Get personalized feed from followed freelancers"""
    user = await require_auth(request)
    
    # Get followed freelancer IDs
    follows = await db.follows.find({"follower_id": user["id"]}).to_list(100)
    freelancer_ids = [f["freelancer_id"] for f in follows]
    
    if not freelancer_ids:
        return {"posts": [], "total": 0, "page": page, "pages": 0}
    
    skip = (page - 1) * limit
    
    all_posts = await db.posts.find(
        {"freelancer_id": {"$in": freelancer_ids}},
        {"_id": 0}
    ).to_list(2000)
    all_posts.sort(key=lambda d: d.get("created_at") or "", reverse=True)
    posts = all_posts[skip:skip + limit]
    
    for post in posts:
        post_user = await db.users.find_one({"id": post["user_id"]}, {"_id": 0, "password_hash": 0})
        if post_user:
            post["user"] = post_user
        profile = await db.freelancer_profiles.find_one({"id": post["freelancer_id"]}, {"_id": 0})
        if profile:
            post["profile"] = profile
    
    total = await db.posts.count_documents({"freelancer_id": {"$in": freelancer_ids}})
    
    return {
        "posts": posts,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@api_router.get("/posts/{post_id}")
async def get_post(post_id: str):
    """Get a single post"""
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    post_user = await db.users.find_one({"id": post["user_id"]}, {"_id": 0, "password_hash": 0})
    if post_user:
        post["user"] = post_user
    
    return post

@api_router.delete("/posts/{post_id}")
async def delete_post(post_id: str, request: Request):
    """Delete a post"""
    user = await require_auth(request)
    
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.posts.delete_one({"id": post_id})
    return {"message": "Post deleted"}

@api_router.post("/posts/{post_id}/like")
async def like_post(post_id: str, request: Request):
    """Like a post"""
    user = await require_auth(request)
    
    # Check if already liked
    existing = await db.post_likes.find_one({
        "post_id": post_id,
        "user_id": user["id"]
    })
    
    if existing:
        # Unlike
        await db.post_likes.delete_one({"_id": existing["_id"]})
        await db.posts.update_one({"id": post_id}, {"$inc": {"likes_count": -1}})
        return {"liked": False}
    else:
        # Like
        like = {
            "id": str(uuid.uuid4()),
            "post_id": post_id,
            "user_id": user["id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.post_likes.insert_one(like)
        await db.posts.update_one({"id": post_id}, {"$inc": {"likes_count": 1}})
        post = await db.posts.find_one({"id": post_id})
        if post and post.get("user_id") and post["user_id"] != user["id"]:
            await _notify(post["user_id"], "like", "New like",
                          f"{user['name']} liked your post.", "/feed")
        return {"liked": True}

@api_router.get("/posts/{post_id}/is-liked")
async def check_post_liked(post_id: str, request: Request):
    """Check if current user liked a post"""
    user = await get_current_user(request)
    if not user:
        return {"liked": False}
    
    existing = await db.post_likes.find_one({
        "post_id": post_id,
        "user_id": user["id"]
    })
    
    return {"liked": existing is not None}

# ==================== NOTIFICATIONS ENDPOINTS ====================

@api_router.get("/notifications")
async def get_notifications(request: Request, page: int = 1, limit: int = 20):
    """Get user notifications"""
    user = await require_auth(request)
    
    skip = (page - 1) * limit
    
    all_notifications = await db.notifications.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).to_list(2000)
    all_notifications.sort(key=lambda d: d.get("created_at") or "", reverse=True)
    notifications = all_notifications[skip:skip + limit]
    
    total = await db.notifications.count_documents({"user_id": user["id"]})
    unread = await db.notifications.count_documents({"user_id": user["id"], "is_read": False})
    
    return {
        "notifications": notifications,
        "total": total,
        "unread_count": unread,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@api_router.get("/notifications/unread-count")
async def get_unread_count(request: Request):
    """Get unread notifications count"""
    user = await require_auth(request)
    count = await db.notifications.count_documents({"user_id": user["id"], "is_read": False})
    return {"count": count}

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, request: Request):
    """Mark a notification as read"""
    user = await require_auth(request)
    
    await db.notifications.update_one(
        {"id": notification_id, "user_id": user["id"]},
        {"$set": {"is_read": True}}
    )
    
    return {"message": "Marked as read"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(request: Request):
    """Mark all notifications as read"""
    user = await require_auth(request)
    
    await db.notifications.update_many(
        {"user_id": user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    return {"message": "All marked as read"}

# ==================== JOB POSTINGS ENDPOINTS ====================

async def _next_job_number() -> int:
    """Atomically get the next sequential, human-friendly job number."""
    doc = await db.counters.find_one_and_update(
        {"_id": "job_number"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return int(doc["seq"])


@api_router.post("/jobs")
async def create_job(data: JobPostCreate, request: Request):
    """Create a new job posting (clients only)"""
    user = await require_auth(request)

    if user["role"] != "client":
        raise HTTPException(status_code=403, detail="Only clients can post jobs")

    job = {
        "id": str(uuid.uuid4()),
        "job_number": await _next_job_number(),
        "client_id": user["id"],
        "title": data.title,
        "description": data.description,
        "category": data.category,
        "skills_required": data.skills_required,
        "budget_min": data.budget_min,
        "budget_max": data.budget_max,
        "budget_type": data.budget_type,
        "duration": data.duration,
        "location": data.location,
        "remote": data.remote,
        "project_size": data.project_size,
        "experience_level": data.experience_level,
        "contract_to_hire": data.contract_to_hire,
        "status": "open",
        "applications_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.jobs.insert_one(job)
    
    # Add client info to response
    job["client"] = {
        "id": user["id"],
        "name": user["name"],
        "picture": user.get("picture")
    }
    
    return {k: v for k, v in job.items() if k != "_id"}

@api_router.get("/jobs")
async def list_jobs(
    request: Request,
    category: Optional[str] = None,
    skills: Optional[str] = None,
    budget_min: Optional[float] = None,
    budget_max: Optional[float] = None,
    remote: Optional[bool] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 12
):
    """List all open job postings with filters - clients cannot access this"""
    # Check if user is authenticated and their role
    user_role = None
    has_subscription = False
    
    try:
        user = await require_auth(request)
        user_role = user["role"]
        
        # Clients should not see job listings at all
        if user_role == "client":
            raise HTTPException(status_code=403, detail="Clients cannot browse jobs. Please visit the talent marketplace instead.")
        
        # Check freelancer subscription status
        if user_role == "freelancer":
            profile = await db.freelancer_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
            has_subscription = profile and profile.get("subscription_status") == "active"
    except HTTPException as e:
        if e.status_code == 403:
            raise e
        # Not authenticated - allow browsing with limited preview
        pass
    
    query = {"status": "open"}
    
    if category:
        query["category"] = category
    
    if skills:
        skill_list = [s.strip() for s in skills.split(",")]
        query["skills_required"] = {"$in": skill_list}
    
    if budget_min is not None:
        query["budget_max"] = {"$gte": budget_min}
    
    if budget_max is not None:
        query["budget_min"] = {"$lte": budget_max}
    
    if remote is not None:
        query["remote"] = remote
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"skills_required": {"$elemMatch": {"$regex": search, "$options": "i"}}}
        ]
    
    skip = (page - 1) * limit
    
    # Cosmos (Mongo API) rejects server-side .sort() on non-indexed fields here,
    # so fetch matching jobs and sort/paginate in Python.
    all_jobs = await db.jobs.find(query, {"_id": 0}).to_list(1000)
    all_jobs.sort(key=lambda j: j.get("created_at") or "", reverse=True)
    total = len(all_jobs)
    jobs = all_jobs[skip:skip + limit]
    
    # Return limited or full info based on subscription
    if not has_subscription:
        # Limited preview for non-subscribed users
        limited_jobs = []
        for job in jobs:
            limited_jobs.append({
                "id": job["id"],
                "title": job["title"],
                "category": job.get("category"),
                "budget_type": job.get("budget_type"),
                "created_at": job.get("created_at"),
                "remote": job.get("remote"),
                "skills_required": job.get("skills_required", []),
                "preview_only": True
            })
        return {
            "jobs": limited_jobs,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit,
            "requires_subscription": True
        }
    
    # Full access for subscribed freelancers
    for job in jobs:
        client = await db.users.find_one({"id": job["client_id"]}, {"_id": 0, "password_hash": 0})
        if client:
            job["client"] = client
    
    return {
        "jobs": jobs,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@api_router.get("/jobs/featured")
async def get_featured_jobs():
    """Get recent job postings for homepage"""
    jobs = await db.jobs.find(
        {"status": "open"},
        {"_id": 0}
    ).to_list(200)
    jobs.sort(key=lambda j: j.get("created_at") or "", reverse=True)
    jobs = jobs[:6]
    
    for job in jobs:
        client = await db.users.find_one({"id": job["client_id"]}, {"_id": 0, "password_hash": 0})
        if client:
            job["client"] = client
    
    return jobs

@api_router.get("/jobs/my-jobs")
async def get_my_jobs(request: Request):
    """Get jobs posted by the current client"""
    user = await require_auth(request)
    
    if user["role"] != "client":
        raise HTTPException(status_code=403, detail="Only clients can view their jobs")
    
    jobs = await db.jobs.find({"client_id": user["id"]}, {"_id": 0}).to_list(200)
    jobs.sort(key=lambda j: j.get("created_at") or "", reverse=True)

    for job in jobs:
        apps = await db.job_applications.find({"job_id": job["id"]}, {"_id": 0}).to_list(500)
        job["applicant_count"] = len(apps)
        job["hired_count"] = sum(1 for a in apps if a.get("status") == "hired")
        job["shortlisted_count"] = sum(1 for a in apps if a.get("status") == "shortlisted")

    return jobs

@api_router.get("/jobs/categories")
async def get_job_categories():
    """Get all job categories with counts"""
    pipeline = [
        {"$match": {"status": "open"}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    results = await db.jobs.aggregate(pipeline).to_list(100)
    return [{"name": r["_id"], "count": r["count"]} for r in results if r["_id"]]

@api_router.get("/jobs/mention-search")
async def mention_search_jobs(request: Request, q: Optional[str] = None, partner: Optional[str] = None):
    """Autocomplete for @job mentions in chat. Matches by job number or title.
    Scope: a client can only tag their OWN jobs; a freelancer can only tag jobs owned by
    the client they're currently chatting with (`partner` = the other user's id)."""
    user = await require_auth(request)

    if user["role"] == "client":
        query: Dict[str, Any] = {"client_id": user["id"]}
    else:
        # Freelancer must be in a conversation with a client to tag that client's jobs
        if not partner:
            return []
        query = {"client_id": partner}

    jobs = await db.jobs.find(query, {"_id": 0, "id": 1, "job_number": 1, "title": 1, "status": 1}).to_list(500)

    if q:
        ql = q.strip().lower().lstrip("@")
        # allow "job12" or "12" or a title fragment
        num = None
        m = re.search(r"(\d+)", ql)
        if m:
            num = int(m.group(1))
        jobs = [
            j for j in jobs
            if (num is not None and j.get("job_number") == num)
            or (ql and ql in (j.get("title") or "").lower())
        ]

    jobs.sort(key=lambda j: j.get("job_number") or 0, reverse=True)
    return jobs[:8]


@api_router.get("/jobs/ref/{job_number}")
async def get_job_by_number(job_number: int, request: Request):
    """Lightweight job card for a @job mention chip (any authenticated user)."""
    await require_auth(request)
    job = await db.jobs.find_one({"job_number": job_number}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    client = await db.users.find_one({"id": job["client_id"]}, {"_id": 0, "name": 1})
    return {
        "id": job["id"],
        "job_number": job.get("job_number"),
        "title": job.get("title"),
        "status": job.get("status"),
        "category": job.get("category"),
        "budget_min": job.get("budget_min"),
        "budget_max": job.get("budget_max"),
        "budget_type": job.get("budget_type"),
        "remote": job.get("remote"),
        "client_name": client.get("name") if client else None,
    }


@api_router.get("/jobs/{job_id}")
async def get_job(job_id: str, request: Request):
    """Get a single job posting. Owner client sees full details + applicants; other
    clients/guests/unsubscribed freelancers get a limited preview."""
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    def _preview():
        return {
            "id": job["id"],
            "title": job["title"],
            "category": job.get("category"),
            "budget_type": job.get("budget_type"),
            "created_at": job.get("created_at"),
            "remote": job.get("remote"),
            "requires_subscription": True,
            "preview_only": True,
        }

    user = await get_current_user(request)

    # Guests get a limited preview
    if not user:
        return _preview()

    # Clients: only the owner can view their own job (with applicants)
    if user["role"] == "client":
        if job["client_id"] != user["id"]:
            return _preview()
        # owner -> full access below
    # Freelancers need an active subscription for full details
    elif user["role"] == "freelancer":
        profile = await db.freelancer_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
        has_subscription = profile and profile.get("subscription_status") == "active"
        if not has_subscription:
            return _preview()

    client = await db.users.find_one({"id": job["client_id"]}, {"_id": 0, "password_hash": 0})
    if client:
        job["client"] = client
    return job

@api_router.put("/jobs/{job_id}")
async def update_job(job_id: str, data: JobPostUpdate, request: Request):
    """Update a job posting"""
    user = await require_auth(request)
    
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job["client_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.jobs.update_one({"id": job_id}, {"$set": update_data})
    
    updated_job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    return updated_job

@api_router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, request: Request):
    """Delete a job posting"""
    user = await require_auth(request)
    
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job["client_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.jobs.delete_one({"id": job_id})
    return {"message": "Job deleted"}

@api_router.post("/jobs/{job_id}/apply")
async def apply_to_job(job_id: str, request: Request, data: JobApplicationCreate = Body(default=None)):
    """Apply to a job (freelancers only) with an optional proposal (cover letter, rate, duration)."""
    user = await require_auth(request)
    
    if user["role"] != "freelancer":
        raise HTTPException(status_code=403, detail="Only freelancers can apply to jobs")
    
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job["status"] != "open":
        raise HTTPException(status_code=400, detail="This job is no longer open")
    
    # Check if already applied
    existing = await db.job_applications.find_one({
        "job_id": job_id,
        "freelancer_id": user["id"]
    })
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied to this job")
    
    data = data or JobApplicationCreate()
    rate_type = data.proposed_rate_type if data.proposed_rate_type in ("fixed", "hourly") else "fixed"

    # Create application record
    application = {
        "id": str(uuid.uuid4()),
        "job_id": job_id,
        "freelancer_id": user["id"],
        "cover_letter": (data.cover_letter or "").strip() or None,
        "proposed_rate": data.proposed_rate,
        "proposed_rate_type": rate_type,
        "estimated_duration": (data.estimated_duration or "").strip() or None,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.job_applications.insert_one(application)
    
    # Update application count
    await db.jobs.update_one({"id": job_id}, {"$inc": {"applications_count": 1}})
    
    # Create notification for client
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": job["client_id"],
        "type": "job_application",
        "title": "New Job Application",
        "message": f"{user['name']} applied to your job: {job['title']}",
        "link": f"/jobs/{job_id}",
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    return {"message": "Application submitted successfully"}

@api_router.get("/jobs/{job_id}/applications")
async def get_job_applications(job_id: str, request: Request):
    """Get applications for a job (client only)"""
    user = await require_auth(request)
    
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job["client_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    applications = await db.job_applications.find({"job_id": job_id}, {"_id": 0}).to_list(100)
    
    # Get freelancer info for each application
    for app in applications:
        freelancer_user = await db.users.find_one({"id": app["freelancer_id"]}, {"_id": 0, "password_hash": 0})
        if freelancer_user:
            app["freelancer"] = freelancer_user
        
        freelancer_profile = await db.freelancer_profiles.find_one({"user_id": app["freelancer_id"]}, {"_id": 0})
        if freelancer_profile:
            app["freelancer_profile"] = freelancer_profile
    
    return applications

@api_router.get("/jobs/applications/my")
async def get_my_applications(request: Request):
    """Get current freelancer's job applications"""
    user = await require_auth(request)
    
    if user["role"] != "freelancer":
        raise HTTPException(status_code=403, detail="Only freelancers can view applications")
    
    applications = await db.job_applications.find({"freelancer_id": user["id"]}, {"_id": 0}).to_list(1000)
    applications.sort(key=lambda d: d.get("created_at") or "", reverse=True)
    
    # Get job info for each application
    for app in applications:
        job = await db.jobs.find_one({"id": app["job_id"]}, {"_id": 0})
        if job:
            client = await db.users.find_one({"id": job["client_id"]}, {"_id": 0, "password_hash": 0})
            if client:
                job["client"] = client
            app["job"] = job
    
    return applications

@api_router.put("/applications/{app_id}")
async def update_application_status(app_id: str, data: ApplicationStatusUpdate, request: Request):
    """Client can shortlist/decline an applicant; a freelancer can withdraw their own application."""
    user = await require_auth(request)

    application = await db.job_applications.find_one({"id": app_id})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    job = await db.jobs.find_one({"id": application["job_id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    status = data.status
    now_iso = datetime.now(timezone.utc).isoformat()

    if status in ("shortlisted", "declined"):
        if job["client_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        await db.job_applications.update_one({"id": app_id}, {"$set": {"status": status, "updated_at": now_iso}})
        verb = "shortlisted your application for" if status == "shortlisted" else "declined your application for"
        await _notify(application["freelancer_id"], "job_application",
                      "Application update", f"{user['name']} {verb} '{job['title']}'.",
                      "/dashboard/applications")
    elif status == "withdrawn":
        if application["freelancer_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        await db.job_applications.update_one({"id": app_id}, {"$set": {"status": status, "updated_at": now_iso}})
    else:
        raise HTTPException(status_code=400, detail="Invalid status")

    return {"message": "Application updated", "status": status}


@api_router.post("/jobs/{job_id}/applications/{app_id}/hire")
async def hire_applicant(job_id: str, app_id: str, request: Request):
    """Client hires an applicant: creates an active contract and notifies the freelancer."""
    user = await require_auth(request)

    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["client_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    application = await db.job_applications.find_one({"id": app_id, "job_id": job_id})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Reuse an existing contract if this applicant was already hired for this job
    existing = await db.contracts.find_one({"job_id": job_id, "freelancer_user_id": application["freelancer_id"]})
    if existing:
        return {"message": "Already hired", "contract_id": existing["id"]}

    freelancer_profile = await db.freelancer_profiles.find_one({"user_id": application["freelancer_id"]})
    now_iso = datetime.now(timezone.utc).isoformat()

    budget = application.get("proposed_rate")
    if budget is None:
        budget = job.get("budget_max") or job.get("budget_min")

    contract = {
        "id": str(uuid.uuid4()),
        "hiring_request_id": None,
        "job_id": job_id,
        "client_id": user["id"],
        "freelancer_id": freelancer_profile["id"] if freelancer_profile else None,
        "freelancer_user_id": application["freelancer_id"],
        "title": job["title"],
        "description": job["description"],
        "budget": budget,
        "status": "active",
        "payment_type": None,
        "total_amount": None,
        "timeline": application.get("estimated_duration"),
        "agreement_status": "negotiating",
        "client_agreed": False,
        "freelancer_agreed": False,
        "proposed_terms": None,
        "milestones": [],
        "diary": [],
        "started_at": now_iso,
        "ended_at": None,
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    await db.contracts.insert_one(contract)

    await db.job_applications.update_one(
        {"id": app_id},
        {"$set": {"status": "hired", "contract_id": contract["id"], "updated_at": now_iso}}
    )

    await _notify(application["freelancer_id"], "contract",
                  "You've been hired!",
                  f"{user['name']} hired you for '{job['title']}'. Agree on terms & milestones to begin.",
                  f"/dashboard/contracts/{contract['id']}")
    return {"message": "Applicant hired", "contract_id": contract["id"]}

# ==================== ADMIN MODELS ====================

class AdminRoleUpdate(BaseModel):
    role: str  # freelancer, client, admin

class AdminActiveUpdate(BaseModel):
    is_active: bool

class AdminSuspendUpdate(BaseModel):
    is_suspended: bool

class AdminFeatureUpdate(BaseModel):
    is_featured: bool

class AdminSubscriptionUpdate(BaseModel):
    active: bool

class AdminJobStatusUpdate(BaseModel):
    status: str  # open, closed, filled

class AdminBootstrapRequest(BaseModel):
    email: EmailStr
    secret: str

# ==================== ADMIN ENDPOINTS ====================

@api_router.post("/admin/bootstrap")
async def admin_bootstrap(data: AdminBootstrapRequest):
    """Promote an existing user to admin using a server-side secret.
    Disabled (404) unless the ADMIN_BOOTSTRAP_SECRET env var is configured."""
    configured_secret = os.environ.get("ADMIN_BOOTSTRAP_SECRET", "")
    if not configured_secret:
        raise HTTPException(status_code=404, detail="Not found")
    if data.secret != configured_secret:
        raise HTTPException(status_code=403, detail="Invalid secret")
    user = await db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"role": "admin", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": f"{data.email} is now an admin"}


class SeedRequest(BaseModel):
    secret: str


@api_router.post("/admin/seed-demo")
async def admin_seed_demo(data: SeedRequest):
    """Populate the database with demo freelancers, clients and jobs.
    Disabled (404) unless the SEED_SECRET env var is configured. Idempotent."""
    configured = os.environ.get("SEED_SECRET", "")
    if not configured:
        raise HTTPException(status_code=404, detail="Not found")
    if data.secret != configured:
        raise HTTPException(status_code=403, detail="Invalid secret")
    return await _seed_demo_data()


async def _seed_demo_data() -> dict:
    """Idempotently populate demo freelancers, clients, jobs and reviews."""
    now = datetime.now(timezone.utc).isoformat()
    pw = hash_password("Demo1234!")

    freelancers = [
        {"name": "Sarah Johnson", "email": "sarah.johnson@freelanceo-demo.com", "category": "Web Development",
         "title": "Senior Full-Stack Developer", "rate": 65, "years": 8, "city": "New York", "country": "United States",
         "bio": "Full-stack developer with 8 years building scalable web apps for startups and enterprises. I specialize in React, Node.js and cloud architecture, and I love turning complex problems into clean, reliable products.",
         "skills": ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS", "Docker"],
         "specialties": ["SaaS Platforms", "API Development", "Cloud Architecture"],
         "languages": [{"language": "English", "proficiency": "Native"}, {"language": "Spanish", "proficiency": "Conversational"}],
         "rating": 4.9, "reviews": 47, "featured": True},
        {"name": "Ahmed Khalil", "email": "ahmed.khalil@freelanceo-demo.com", "category": "Mobile Development",
         "title": "iOS & Android Developer", "rate": 55, "years": 6, "city": "Dubai", "country": "United Arab Emirates",
         "bio": "Mobile engineer with 6 years shipping polished iOS and Android apps. Comfortable across Swift, Kotlin and Flutter, with a strong eye for smooth UX and performance on real devices.",
         "skills": ["Swift", "Kotlin", "Flutter", "Firebase", "REST APIs"],
         "specialties": ["Cross-platform Apps", "Mobile UX"],
         "languages": [{"language": "Arabic", "proficiency": "Native"}, {"language": "English", "proficiency": "Fluent"}],
         "rating": 4.8, "reviews": 33, "featured": True},
        {"name": "Maria Garcia", "email": "maria.garcia@freelanceo-demo.com", "category": "Design",
         "title": "UI/UX Designer & Brand Strategist", "rate": 50, "years": 7, "city": "Barcelona", "country": "Spain",
         "bio": "Product designer helping brands look and feel their best. Seven years crafting intuitive interfaces and cohesive brand systems in Figma, from first wireframe to polished design system.",
         "skills": ["Figma", "Adobe XD", "Illustrator", "Prototyping", "Design Systems"],
         "specialties": ["Brand Identity", "Mobile UI", "Design Systems"],
         "languages": [{"language": "Spanish", "proficiency": "Native"}, {"language": "English", "proficiency": "Fluent"}, {"language": "French", "proficiency": "Conversational"}],
         "rating": 5.0, "reviews": 58, "featured": True},
        {"name": "David Chen", "email": "david.chen@freelanceo-demo.com", "category": "Data Science",
         "title": "Machine Learning Engineer", "rate": 80, "years": 9, "city": "San Francisco", "country": "United States",
         "bio": "ML engineer with 9 years turning messy data into production models. I build recommendation systems, forecasting pipelines and NLP tools using Python, TensorFlow and modern MLOps.",
         "skills": ["Python", "TensorFlow", "PyTorch", "SQL", "Pandas", "MLOps"],
         "specialties": ["NLP", "Forecasting", "Recommendation Systems"],
         "languages": [{"language": "English", "proficiency": "Fluent"}, {"language": "Mandarin Chinese", "proficiency": "Native"}],
         "rating": 4.9, "reviews": 41, "featured": False},
        {"name": "Emily Roberts", "email": "emily.roberts@freelanceo-demo.com", "category": "Writing",
         "title": "Content Writer & Copywriter", "rate": 40, "years": 5, "city": "London", "country": "United Kingdom",
         "bio": "Content writer and copywriter who makes brands sound human. Five years writing SEO articles, landing pages and email campaigns that inform, engage and convert.",
         "skills": ["SEO Writing", "Copywriting", "Editing", "Content Strategy"],
         "specialties": ["Landing Pages", "Long-form Articles"],
         "languages": [{"language": "English", "proficiency": "Native"}],
         "rating": 4.7, "reviews": 29, "featured": False},
        {"name": "Omar Haddad", "email": "omar.haddad@freelanceo-demo.com", "category": "Video Editing",
         "title": "Video Editor & Motion Designer", "rate": 45, "years": 6, "city": "Beirut", "country": "Lebanon",
         "bio": "Video editor and motion designer with 6 years creating promos, explainers and social content. I turn raw footage into stories that hold attention using Premiere Pro and After Effects.",
         "skills": ["Premiere Pro", "After Effects", "DaVinci Resolve", "Motion Graphics"],
         "specialties": ["Promotional Videos", "Motion Graphics"],
         "languages": [{"language": "Arabic", "proficiency": "Native"}, {"language": "English", "proficiency": "Fluent"}, {"language": "French", "proficiency": "Conversational"}],
         "rating": 4.8, "reviews": 36, "featured": False},
        {"name": "Priya Sharma", "email": "priya.sharma@freelanceo-demo.com", "category": "Marketing",
         "title": "Digital Marketing Specialist", "rate": 48, "years": 7, "city": "Bangalore", "country": "India",
         "bio": "Digital marketer with 7 years growing brands through SEO, paid ads and social. I plan data-driven campaigns that lower acquisition cost and scale what works.",
         "skills": ["SEO", "Google Ads", "Social Media", "Analytics", "Email Marketing"],
         "specialties": ["Paid Acquisition", "SEO Strategy"],
         "languages": [{"language": "English", "proficiency": "Fluent"}, {"language": "Hindi", "proficiency": "Native"}],
         "rating": 4.6, "reviews": 24, "featured": False},
        {"name": "Lucas Muller", "email": "lucas.muller@freelanceo-demo.com", "category": "Web Development",
         "title": "Frontend Engineer", "rate": 58, "years": 5, "city": "Berlin", "country": "Germany",
         "bio": "Frontend engineer focused on fast, accessible interfaces. Five years with Vue and React, building component libraries and pixel-perfect UIs that feel effortless to use.",
         "skills": ["Vue.js", "React", "JavaScript", "CSS", "Tailwind"],
         "specialties": ["Component Libraries", "Accessibility"],
         "languages": [{"language": "German", "proficiency": "Native"}, {"language": "English", "proficiency": "Fluent"}],
         "rating": 4.8, "reviews": 31, "featured": False},
        {"name": "Sofia Rossi", "email": "sofia.rossi@freelanceo-demo.com", "category": "Music & Audio",
         "title": "Music Producer & Sound Designer", "rate": 52, "years": 8, "city": "Milan", "country": "Italy",
         "bio": "Music producer and sound designer with 8 years scoring ads, games and films. I compose, mix and master original audio that gives projects their own signature sound.",
         "skills": ["Ableton Live", "Logic Pro", "Mixing", "Mastering", "Sound Design"],
         "specialties": ["Original Scores", "Mixing & Mastering"],
         "languages": [{"language": "Italian", "proficiency": "Native"}, {"language": "English", "proficiency": "Fluent"}],
         "rating": 4.9, "reviews": 27, "featured": False},
        {"name": "James Wilson", "email": "james.wilson@freelanceo-demo.com", "category": "Business",
         "title": "Business Consultant & Analyst", "rate": 70, "years": 10, "city": "Toronto", "country": "Canada",
         "bio": "Business consultant with 10 years advising startups and SMEs on strategy, finance and operations. I build clear financial models and actionable plans that help founders make confident decisions.",
         "skills": ["Strategy", "Financial Modeling", "Excel", "Market Research"],
         "specialties": ["Financial Modeling", "Go-to-Market Strategy"],
         "languages": [{"language": "English", "proficiency": "Native"}, {"language": "French", "proficiency": "Conversational"}],
         "rating": 4.7, "reviews": 22, "featured": False},
    ]

    clients = [
        {"name": "TechStart Inc", "email": "hiring@techstart-demo.com"},
        {"name": "Creative Agency Co", "email": "projects@creativeagency-demo.com"},
        {"name": "Global Ventures", "email": "talent@globalventures-demo.com"},
    ]

    async def _ensure_user(name, email, role):
        existing = await db.users.find_one({"email": email})
        if existing:
            return existing["id"]
        uid = str(uuid.uuid4())
        await db.users.insert_one({
            "id": uid, "email": email, "name": name, "picture": None, "role": role,
            "password_hash": pw, "auth_provider": "email", "is_active": True,
            "created_at": now, "updated_at": now,
        })
        return uid

    # Create clients first (they are the review authors below).
    client_ids = []
    for c in clients:
        cid = await _ensure_user(c["name"], c["email"], "client")
        client_ids.append((cid, c["name"]))

    review_comments = [
        "Delivered exactly what we needed, ahead of schedule. Communication was excellent throughout.",
        "Fantastic to work with — understood our requirements quickly and the quality was outstanding.",
        "Reliable, skilled and responsive. The final result was polished and on-brief. Would hire again.",
    ]
    rating_sets = [[5, 5, 5], [5, 5, 4], [5, 4, 4]]

    freelancer_count = 0
    for i, f in enumerate(freelancers):
        uid = await _ensure_user(f["name"], f["email"], "freelancer")
        ratings = rating_sets[i % len(rating_sets)]
        avg_rating = round(sum(ratings) / len(ratings), 1)
        await db.freelancer_profiles.update_one(
            {"user_id": uid},
            {"$set": {
                "user_id": uid, "title": f["title"], "bio": f["bio"], "skills": f["skills"],
                "category": f["category"], "hourly_rate": f["rate"], "experience_years": f["years"],
                "location": f"{f['city']}, {f['country']}", "specialties": f["specialties"],
                "languages": f["languages"], "city": f["city"], "country": f["country"],
                "experience_level": "expert", "goal": "main_income", "work_preference": "sell_packages",
                "subscription_status": "active", "is_available": True, "is_featured": f["featured"],
                "is_suspended": False, "average_rating": avg_rating, "total_reviews": len(ratings),
                "portfolio_items": [], "updated_at": now,
             },
             "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": now}},
            upsert=True,
        )
        prof = await db.freelancer_profiles.find_one({"user_id": uid}, {"_id": 0, "id": 1})
        fid = prof.get("id") if prof else None
        if fid:
            for j, (cid, cname) in enumerate(client_ids):
                if await db.reviews.find_one({"freelancer_id": fid, "client_id": cid}):
                    continue
                await db.reviews.insert_one({
                    "id": str(uuid.uuid4()), "freelancer_id": fid, "client_id": cid,
                    "rating": ratings[j % len(ratings)],
                    "comment": review_comments[j % len(review_comments)],
                    "created_at": now,
                })
        freelancer_count += 1

    jobs = [
        {"c": 0, "title": "Build a React E-commerce Website", "category": "Web Development",
         "description": "We need an experienced full-stack developer to build a modern e-commerce site with React and Node.js, including product catalog, cart, Stripe checkout and an admin dashboard.",
         "skills": ["React", "Node.js", "Stripe", "MongoDB"], "bmin": 3000, "bmax": 5000, "btype": "fixed", "dur": "1-3 months"},
        {"c": 0, "title": "iOS App for Fitness Tracking", "category": "Mobile Development",
         "description": "Looking for an iOS developer to build a fitness tracking app with HealthKit integration, workout logging, charts and social sharing.",
         "skills": ["Swift", "HealthKit", "iOS"], "bmin": 4000, "bmax": 7000, "btype": "fixed", "dur": "2-4 months"},
        {"c": 1, "title": "Brand Identity & Logo Design", "category": "Design",
         "description": "Early-stage startup needs a complete brand identity: logo, color palette, typography and a simple brand guidelines document.",
         "skills": ["Figma", "Illustrator", "Branding"], "bmin": 800, "bmax": 1500, "btype": "fixed", "dur": "2-4 weeks"},
        {"c": 1, "title": "Promotional Video Editing (60s)", "category": "Video Editing",
         "description": "Edit a 60-second promotional video from provided footage, including motion graphics, captions, music and color grading for social media.",
         "skills": ["Premiere Pro", "After Effects", "Motion Graphics"], "bmin": 600, "bmax": 1200, "btype": "fixed", "dur": "1-2 weeks"},
        {"c": 2, "title": "Data Pipeline & ML Forecasting Model", "category": "Data Science",
         "description": "Build a data pipeline and a demand-forecasting model in Python. Includes data cleaning, feature engineering, model training and a simple reporting dashboard.",
         "skills": ["Python", "TensorFlow", "SQL", "Pandas"], "bmin": 60, "bmax": 100, "btype": "hourly", "dur": "3-6 months"},
        {"c": 2, "title": "SEO Blog Content (10 Articles)", "category": "Writing",
         "description": "Write 10 SEO-optimized blog articles (1200-1500 words each) on SaaS and productivity topics, with keyword research and internal linking.",
         "skills": ["SEO Writing", "Copywriting", "Content Strategy"], "bmin": 500, "bmax": 1000, "btype": "fixed", "dur": "2-4 weeks"},
        {"c": 0, "title": "SEO & Google Ads Campaign", "category": "Marketing",
         "description": "Plan and run a 3-month SEO and Google Ads campaign to grow qualified leads. Includes keyword strategy, ad setup, landing-page recommendations and monthly reporting.",
         "skills": ["SEO", "Google Ads", "Analytics"], "bmin": 1500, "bmax": 3000, "btype": "fixed", "dur": "1-3 months"},
        {"c": 1, "title": "Business Plan & Financial Model", "category": "Business",
         "description": "Prepare a business plan and 3-year financial model for a fundraising round, including market sizing, unit economics and a pitch-ready summary.",
         "skills": ["Strategy", "Financial Modeling", "Excel"], "bmin": 1000, "bmax": 2500, "btype": "fixed", "dur": "2-4 weeks"},
    ]

    job_count = 0
    for j in jobs:
        cid, cname = client_ids[j["c"]]
        exists = await db.jobs.find_one({"client_id": cid, "title": j["title"]})
        if exists:
            continue
        await db.jobs.insert_one({
            "id": str(uuid.uuid4()), "client_id": cid, "title": j["title"],
            "description": j["description"], "category": j["category"], "skills_required": j["skills"],
            "budget_min": j["bmin"], "budget_max": j["bmax"], "budget_type": j["btype"],
            "duration": j["dur"], "location": None, "remote": True, "status": "open",
            "applications_count": 0, "created_at": now, "updated_at": now,
        })
        job_count += 1

    return {
        "message": "Demo data seeded",
        "freelancers": freelancer_count,
        "clients": len(client_ids),
        "jobs_added": job_count,
        "reviews_total": await db.reviews.count_documents({}),
        "login_password": "Demo1234!",
    }


class DevSetupRequest(BaseModel):
    secret: str
    email: EmailStr
    password: Optional[str] = None
    role: Optional[str] = None  # defaults to "admin"


@api_router.post("/admin/dev-setup")
async def admin_dev_setup(data: DevSetupRequest):
    """Create/promote a user and optionally reset their password.
    Gated by the SEED_SECRET env var (404 when unset). For test environments only."""
    configured = os.environ.get("SEED_SECRET", "")
    if not configured:
        raise HTTPException(status_code=404, detail="Not found")
    if data.secret != configured:
        raise HTTPException(status_code=403, detail="Invalid secret")

    role = data.role or "admin"
    if role not in ("freelancer", "client", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role")

    now = datetime.now(timezone.utc).isoformat()
    user = await db.users.find_one({"email": data.email})
    if user:
        updates = {"role": role, "is_active": True, "updated_at": now}
        if data.password:
            updates["password_hash"] = hash_password(data.password)
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
        action = "updated"
    else:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": data.email, "name": data.email.split("@")[0],
            "picture": None, "role": role, "password_hash": hash_password(data.password or "changeme123"),
            "auth_provider": "email", "is_active": True, "created_at": now, "updated_at": now,
        })
        action = "created"
    return {"message": f"User {action}", "email": data.email, "role": role, "password_reset": bool(data.password)}


@api_router.get("/admin/stats")
async def admin_stats(request: Request):
    """Overview counts for the admin dashboard."""
    await require_admin(request)

    total_users = await db.users.count_documents({})
    total_freelancers = await db.users.count_documents({"role": "freelancer"})
    total_clients = await db.users.count_documents({"role": "client"})
    total_admins = await db.users.count_documents({"role": "admin"})
    banned_users = await db.users.count_documents({"is_active": False})

    total_profiles = await db.freelancer_profiles.count_documents({})
    active_subscriptions = await db.freelancer_profiles.count_documents({"subscription_status": "active"})
    suspended_profiles = await db.freelancer_profiles.count_documents({"is_suspended": True})

    total_jobs = await db.jobs.count_documents({})
    open_jobs = await db.jobs.count_documents({"status": "open"})
    total_applications = await db.job_applications.count_documents({})

    paid_transactions = await db.payment_transactions.find(
        {"payment_status": "paid"}, {"_id": 0}
    ).to_list(10000)
    total_revenue = round(sum(t.get("amount", 0) for t in paid_transactions), 2)

    return {
        "users": {
            "total": total_users,
            "freelancers": total_freelancers,
            "clients": total_clients,
            "admins": total_admins,
            "banned": banned_users,
        },
        "freelancer_profiles": {
            "total": total_profiles,
            "active_subscriptions": active_subscriptions,
            "suspended": suspended_profiles,
        },
        "jobs": {
            "total": total_jobs,
            "open": open_jobs,
            "applications": total_applications,
        },
        "revenue": {
            "total": total_revenue,
            "paid_transactions": len(paid_transactions),
            "currency": "usd",
        },
    }


@api_router.get("/admin/users")
async def admin_list_users(
    request: Request,
    search: Optional[str] = None,
    role: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
):
    """List/search all users (admin)."""
    await require_admin(request)

    query: Dict[str, Any] = {}
    if role:
        query["role"] = role
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]

    skip = (page - 1) * limit
    all_users = await db.users.find(
        query, {"_id": 0, "password_hash": 0}
    ).to_list(5000)
    all_users.sort(key=lambda d: d.get("created_at") or "", reverse=True)
    total = len(all_users)
    users = all_users[skip:skip + limit]

    return {
        "users": users,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


@api_router.patch("/admin/users/{user_id}/status")
async def admin_set_user_status(user_id: str, data: AdminActiveUpdate, request: Request):
    """Ban (is_active=false) or reactivate (is_active=true) a user."""
    admin = await require_admin(request)
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="You cannot change your own status")

    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": data.is_active, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if not data.is_active:
        await db.sessions.delete_many({"user_id": user_id})

    return {"message": "User status updated", "is_active": data.is_active}


@api_router.patch("/admin/users/{user_id}/role")
async def admin_set_user_role(user_id: str, data: AdminRoleUpdate, request: Request):
    """Change a user's role."""
    admin = await require_admin(request)
    if data.role not in ("freelancer", "client", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role")
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="You cannot change your own role")

    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": data.role, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "User role updated", "role": data.role}


@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, request: Request):
    """Delete a user and their associated profile and sessions."""
    admin = await require_admin(request)
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.users.delete_one({"id": user_id})
    await db.sessions.delete_many({"user_id": user_id})
    await db.freelancer_profiles.delete_many({"user_id": user_id})
    return {"message": "User deleted"}


@api_router.get("/admin/freelancers")
async def admin_list_freelancers(
    request: Request,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
):
    """List all freelancer profiles regardless of subscription/suspension (admin)."""
    await require_admin(request)

    query: Dict[str, Any] = {}
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"category": {"$regex": search, "$options": "i"}},
        ]

    skip = (page - 1) * limit
    all_profiles = await db.freelancer_profiles.find(
        query, {"_id": 0}
    ).to_list(5000)
    all_profiles.sort(key=lambda d: d.get("created_at") or "", reverse=True)
    total = len(all_profiles)
    profiles = all_profiles[skip:skip + limit]

    for p in profiles:
        u = await db.users.find_one({"id": p["user_id"]}, {"_id": 0, "password_hash": 0})
        if u:
            p["user"] = u

    return {
        "freelancers": profiles,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


@api_router.patch("/admin/freelancers/{profile_id}/suspend")
async def admin_suspend_freelancer(profile_id: str, data: AdminSuspendUpdate, request: Request):
    """Suspend (hide) or unsuspend a freelancer profile."""
    await require_admin(request)
    profile = await db.freelancer_profiles.find_one({"id": profile_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    await db.freelancer_profiles.update_one(
        {"id": profile_id},
        {"$set": {"is_suspended": data.is_suspended, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Profile suspension updated", "is_suspended": data.is_suspended}


@api_router.patch("/admin/freelancers/{profile_id}/feature")
async def admin_feature_freelancer(profile_id: str, data: AdminFeatureUpdate, request: Request):
    """Feature or unfeature a freelancer profile on the homepage."""
    await require_admin(request)
    profile = await db.freelancer_profiles.find_one({"id": profile_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    await db.freelancer_profiles.update_one(
        {"id": profile_id},
        {"$set": {"is_featured": data.is_featured, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Profile feature updated", "is_featured": data.is_featured}


@api_router.patch("/admin/freelancers/{profile_id}/subscription")
async def admin_set_subscription(profile_id: str, data: AdminSubscriptionUpdate, request: Request):
    """Grant or revoke a freelancer's subscription (makes them visible in the marketplace)."""
    await require_admin(request)
    profile = await db.freelancer_profiles.find_one({"id": profile_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    now = datetime.now(timezone.utc)
    if data.active:
        updates = {
            "subscription_status": "active",
            "subscription_expires_at": (now + timedelta(days=365)).isoformat(),
        }
    else:
        updates = {"subscription_status": "inactive", "subscription_expires_at": None}
    updates["updated_at"] = now.isoformat()
    await db.freelancer_profiles.update_one({"id": profile_id}, {"$set": updates})
    return {"message": "Subscription updated", "subscription_status": updates["subscription_status"]}


@api_router.delete("/admin/freelancers/{profile_id}")
async def admin_delete_freelancer(profile_id: str, request: Request):
    """Delete a freelancer profile."""
    await require_admin(request)
    profile = await db.freelancer_profiles.find_one({"id": profile_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    await db.freelancer_profiles.delete_one({"id": profile_id})
    return {"message": "Profile deleted"}


@api_router.get("/admin/jobs")
async def admin_list_jobs(
    request: Request,
    search: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
):
    """List all job postings (admin)."""
    await require_admin(request)

    query: Dict[str, Any] = {}
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"category": {"$regex": search, "$options": "i"}},
        ]

    skip = (page - 1) * limit
    all_jobs_admin = await db.jobs.find(
        query, {"_id": 0}
    ).to_list(5000)
    all_jobs_admin.sort(key=lambda d: d.get("created_at") or "", reverse=True)
    total = len(all_jobs_admin)
    jobs = all_jobs_admin[skip:skip + limit]

    for j in jobs:
        c = await db.users.find_one({"id": j["client_id"]}, {"_id": 0, "password_hash": 0})
        if c:
            j["client"] = c

    return {
        "jobs": jobs,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


@api_router.patch("/admin/jobs/{job_id}/status")
async def admin_set_job_status(job_id: str, data: AdminJobStatusUpdate, request: Request):
    """Change a job's status (open/closed/filled)."""
    await require_admin(request)
    if data.status not in ("open", "closed", "filled"):
        raise HTTPException(status_code=400, detail="Invalid status")
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    await db.jobs.update_one(
        {"id": job_id},
        {"$set": {"status": data.status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Job status updated", "status": data.status}


@api_router.delete("/admin/jobs/{job_id}")
async def admin_delete_job(job_id: str, request: Request):
    """Delete a job posting and its applications."""
    await require_admin(request)
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    await db.jobs.delete_one({"id": job_id})
    await db.job_applications.delete_many({"job_id": job_id})
    return {"message": "Job deleted"}


@api_router.get("/admin/payments")
async def admin_list_payments(
    request: Request,
    page: int = 1,
    limit: int = 20,
):
    """List payment transactions (admin)."""
    await require_admin(request)

    skip = (page - 1) * limit
    all_tx = await db.payment_transactions.find(
        {}, {"_id": 0, "metadata": 0}
    ).to_list(5000)
    all_tx.sort(key=lambda d: d.get("created_at") or "", reverse=True)
    total = len(all_tx)
    transactions = all_tx[skip:skip + limit]

    for t in transactions:
        u = await db.users.find_one({"id": t.get("user_id")}, {"_id": 0, "password_hash": 0})
        if u:
            t["user"] = {"id": u.get("id"), "name": u.get("name"), "email": u.get("email")}

    return {
        "transactions": transactions,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }

# ==================== CATEGORY MODELS ====================

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    order: Optional[int] = 0

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None

DEFAULT_CATEGORIES = [
    {"name": "Web Development", "icon": "Code"},
    {"name": "Design", "icon": "Palette"},
    {"name": "Writing", "icon": "PenTool"},
    {"name": "Video Editing", "icon": "Video"},
    {"name": "Marketing", "icon": "TrendingUp"},
    {"name": "Data Science", "icon": "Database"},
    {"name": "Mobile Development", "icon": "Smartphone"},
    {"name": "Music & Audio", "icon": "Music"},
    {"name": "Business", "icon": "Building"},
]

# ==================== CATEGORY ENDPOINTS ====================

@api_router.get("/categories")
async def list_categories():
    """Public list of active categories (used by filters and forms)."""
    cats = await db.categories.find(
        {"is_active": {"$ne": False}}, {"_id": 0}
    ).to_list(200)
    cats.sort(key=lambda c: (c.get("order") or 0, (c.get("name") or "").lower()))
    return cats


@api_router.get("/admin/categories")
async def admin_list_categories(request: Request):
    """List all categories including inactive, with usage counts (admin)."""
    await require_admin(request)
    cats = await db.categories.find({}, {"_id": 0}).to_list(500)
    cats.sort(key=lambda c: (c.get("order") or 0, (c.get("name") or "").lower()))
    for c in cats:
        c["freelancer_count"] = await db.freelancer_profiles.count_documents({"category": c["name"]})
        c["job_count"] = await db.jobs.count_documents({"category": c["name"]})
    return cats


@api_router.post("/admin/categories")
async def admin_create_category(data: CategoryCreate, request: Request):
    await require_admin(request)
    name = (data.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    existing = await db.categories.find_one(
        {"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    now = datetime.now(timezone.utc).isoformat()
    cat = {
        "id": str(uuid.uuid4()),
        "name": name,
        "description": data.description,
        "icon": data.icon,
        "order": data.order or 0,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    await db.categories.insert_one(cat)
    return {k: v for k, v in cat.items() if k != "_id"}


@api_router.patch("/admin/categories/{category_id}")
async def admin_update_category(category_id: str, data: CategoryUpdate, request: Request):
    await require_admin(request)
    cat = await db.categories.find_one({"id": category_id})
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    updates: Dict[str, Any] = {}
    if data.name is not None:
        new_name = data.name.strip()
        if not new_name:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        conflict = await db.categories.find_one({
            "name": {"$regex": f"^{re.escape(new_name)}$", "$options": "i"},
            "id": {"$ne": category_id},
        })
        if conflict:
            raise HTTPException(status_code=400, detail="Another category with this name exists")
        updates["name"] = new_name
    if data.description is not None:
        updates["description"] = data.description
    if data.icon is not None:
        updates["icon"] = data.icon
    if data.order is not None:
        updates["order"] = data.order
    if data.is_active is not None:
        updates["is_active"] = data.is_active

    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        # Keep existing profiles/jobs in sync when a category is renamed
        if "name" in updates and updates["name"] != cat["name"]:
            await db.freelancer_profiles.update_many(
                {"category": cat["name"]}, {"$set": {"category": updates["name"]}}
            )
            await db.jobs.update_many(
                {"category": cat["name"]}, {"$set": {"category": updates["name"]}}
            )
        await db.categories.update_one({"id": category_id}, {"$set": updates})

    updated = await db.categories.find_one({"id": category_id}, {"_id": 0})
    return updated


@api_router.delete("/admin/categories/{category_id}")
async def admin_delete_category(category_id: str, request: Request):
    await require_admin(request)
    cat = await db.categories.find_one({"id": category_id})
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    await db.categories.delete_one({"id": category_id})
    return {"message": "Category deleted"}


@api_router.post("/admin/categories/seed")
async def admin_seed_categories(request: Request):
    """Seed default categories plus any already used by profiles/jobs (admin)."""
    await require_admin(request)
    now = datetime.now(timezone.utc).isoformat()
    existing_docs = await db.categories.find({}, {"_id": 0, "name": 1}).to_list(1000)
    existing_names = {d["name"].strip().lower() for d in existing_docs if d.get("name")}
    order = len(existing_names)
    to_insert = []

    def build(name, icon=None):
        nonlocal order
        key = (name or "").strip().lower()
        if not key or key in existing_names:
            return None
        existing_names.add(key)
        order += 1
        return {
            "id": str(uuid.uuid4()),
            "name": name.strip(),
            "description": None,
            "icon": icon,
            "order": order,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }

    for d in DEFAULT_CATEGORIES:
        doc = build(d["name"], d.get("icon"))
        if doc:
            to_insert.append(doc)

    prof_cats = await db.freelancer_profiles.distinct("category")
    job_cats = await db.jobs.distinct("category")
    for name in list(prof_cats) + list(job_cats):
        doc = build(name)
        if doc:
            to_insert.append(doc)

    if to_insert:
        await db.categories.insert_many(to_insert)
    return {"message": f"Seeded {len(to_insert)} categories", "created": len(to_insert)}

# ==================== UTILITY ENDPOINTS ====================

@api_router.get("/")
async def root():
    return {"message": "Freelancer Platform API", "version": "1.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def _local_auto_seed():
    """When running locally against the in-memory mock DB (or AUTO_SEED=1), populate
    demo data and a local admin so the app isn't empty. Never runs against real Cosmos."""
    auto = os.environ.get("AUTO_SEED", "").lower() in ("1", "true", "yes")
    if not (_use_mock_db or auto):
        return
    try:
        if await db.users.count_documents({}) > 0:
            return
        await _seed_demo_data()
        nowt = datetime.now(timezone.utc).isoformat()
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": "freelanceo@freelanceo.com",
            "name": "Local Admin", "picture": None, "role": "admin",
            "password_hash": hash_password("rorotest"), "auth_provider": "email",
            "is_active": True, "created_at": nowt, "updated_at": nowt,
        })
        logger.info("Local auto-seed complete: demo data + admin freelanceo@freelanceo.com / rorotest")
    except Exception:
        logger.exception("Local auto-seed failed")


@app.on_event("startup")
async def _ensure_job_numbers():
    """Backfill sequential job_number on any jobs missing it and sync the counter.
    Idempotent — safe to run on every startup (prod + local)."""
    try:
        existing = await db.jobs.find(
            {"job_number": {"$exists": True}}, {"_id": 0, "job_number": 1}
        ).to_list(100000)
        max_num = max([e.get("job_number") or 0 for e in existing], default=0)

        missing = await db.jobs.find(
            {"job_number": {"$exists": False}}, {"_id": 0, "id": 1, "created_at": 1}
        ).to_list(100000)
        missing.sort(key=lambda j: j.get("created_at") or "")
        n = max_num
        for j in missing:
            n += 1
            await db.jobs.update_one({"id": j["id"]}, {"$set": {"job_number": n}})

        counter = await db.counters.find_one({"_id": "job_number"})
        cur_seq = (counter or {}).get("seq", 0)
        if n > cur_seq:
            await db.counters.update_one(
                {"_id": "job_number"}, {"$set": {"seq": n}}, upsert=True
            )
        if missing:
            logger.info("Backfilled job_number for %d job(s)", len(missing))
    except Exception:
        logger.exception("job_number backfill failed")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
