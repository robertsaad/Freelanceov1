from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
import re
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
    category: Optional[str] = None,
    skills: Optional[str] = None,
    min_rating: Optional[float] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 12
):
    """List freelancers with filters - only show those with active subscriptions"""
    query = {"subscription_status": "active", "is_suspended": {"$ne": True}}
    
    if category:
        query["category"] = category
    
    if skills:
        skill_list = [s.strip() for s in skills.split(",")]
        query["skills"] = {"$in": skill_list}
    
    if min_rating:
        query["average_rating"] = {"$gte": min_rating}
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"bio": {"$regex": search, "$options": "i"}},
            {"skills": {"$elemMatch": {"$regex": search, "$options": "i"}}}
        ]
    
    skip = (page - 1) * limit
    
    freelancers = await db.freelancer_profiles.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.freelancer_profiles.count_documents(query)
    
    # Get user info for each freelancer
    for f in freelancers:
        user = await db.users.find_one({"id": f["user_id"]}, {"_id": 0, "password_hash": 0})
        if user:
            f["user"] = user
    
    return {
        "freelancers": freelancers,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

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
    
    reviews = await db.reviews.find(
        {"freelancer_id": freelancer_id},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Get client info
    for r in reviews:
        client = await db.users.find_one({"id": r["client_id"]}, {"_id": 0, "password_hash": 0})
        if client:
            r["client"] = client
    
    total = await db.reviews.count_documents({"freelancer_id": freelancer_id})
    
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
    
    return {"_id": 0, **review}

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
    ).sort("created_at", 1).to_list(100)
    
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
    
    return {"_id": 0, **message}

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
    
    requests = await db.hiring_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
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
    
    return {"_id": 0, **hiring_request}

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
                "client_id": hiring_req["client_id"],
                "freelancer_id": hiring_req["freelancer_id"],
                "freelancer_user_id": freelancer_profile["user_id"] if freelancer_profile else None,
                "title": hiring_req["project_title"],
                "description": hiring_req["project_description"],
                "budget": hiring_req.get("budget"),
                "status": "active",
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

    contracts = await db.contracts.find(query, {"_id": 0}).sort(sort_field, direction).to_list(200)
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
    
    posts = await db.posts.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
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
    
    posts = await db.posts.find(
        {"freelancer_id": {"$in": freelancer_ids}},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
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
    
    notifications = await db.notifications.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
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

@api_router.post("/jobs")
async def create_job(data: JobPostCreate, request: Request):
    """Create a new job posting (clients only)"""
    user = await require_auth(request)
    
    if user["role"] != "client":
        raise HTTPException(status_code=403, detail="Only clients can post jobs")
    
    job = {
        "id": str(uuid.uuid4()),
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
    
    jobs = await db.jobs.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.jobs.count_documents(query)
    
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
    ).sort("created_at", -1).limit(6).to_list(6)
    
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
    
    jobs = await db.jobs.find({"client_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
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

@api_router.get("/jobs/{job_id}")
async def get_job(job_id: str, request: Request):
    """Get a single job posting - freelancers need subscription for full details"""
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check if user is authenticated
    try:
        user = await require_auth(request)
        user_role = user["role"]
        
        # Clients should not access job details (they post jobs, not view them)
        if user_role == "client":
            raise HTTPException(status_code=403, detail="Clients cannot view job details")
        
        # Check if freelancer has active subscription
        if user_role == "freelancer":
            profile = await db.freelancer_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
            has_subscription = profile and profile.get("subscription_status") == "active"
            
            if not has_subscription:
                # Return limited job info for non-subscribed freelancers
                return {
                    "id": job["id"],
                    "title": job["title"],
                    "category": job.get("category"),
                    "budget_type": job.get("budget_type"),
                    "created_at": job.get("created_at"),
                    "remote": job.get("remote"),
                    "requires_subscription": True,
                    "preview_only": True
                }
    except HTTPException as e:
        # Not authenticated - return limited preview
        return {
            "id": job["id"],
            "title": job["title"],
            "category": job.get("category"),
            "budget_type": job.get("budget_type"),
            "created_at": job.get("created_at"),
            "remote": job.get("remote"),
            "requires_subscription": True,
            "preview_only": True
        }
    
    # Full access for subscribed freelancers
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
async def apply_to_job(job_id: str, request: Request):
    """Apply to a job (freelancers only) - sends a message to the client"""
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
    
    # Create application record
    application = {
        "id": str(uuid.uuid4()),
        "job_id": job_id,
        "freelancer_id": user["id"],
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
    
    applications = await db.job_applications.find({"freelancer_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Get job info for each application
    for app in applications:
        job = await db.jobs.find_one({"id": app["job_id"]}, {"_id": 0})
        if job:
            client = await db.users.find_one({"id": job["client_id"]}, {"_id": 0, "password_hash": 0})
            if client:
                job["client"] = client
            app["job"] = job
    
    return applications

# ==================== ADMIN MODELS ====================

class AdminRoleUpdate(BaseModel):
    role: str  # freelancer, client, admin

class AdminActiveUpdate(BaseModel):
    is_active: bool

class AdminSuspendUpdate(BaseModel):
    is_suspended: bool

class AdminFeatureUpdate(BaseModel):
    is_featured: bool

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
    users = await db.users.find(
        query, {"_id": 0, "password_hash": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)

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
    profiles = await db.freelancer_profiles.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.freelancer_profiles.count_documents(query)

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
    jobs = await db.jobs.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.jobs.count_documents(query)

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
    transactions = await db.payment_transactions.find(
        {}, {"_id": 0, "metadata": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.payment_transactions.count_documents({})

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
