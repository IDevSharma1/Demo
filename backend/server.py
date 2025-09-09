from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import requests
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer(auto_error=False)

# Pydantic Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    picture: Optional[str] = None
    preferred_city: Optional[str] = None
    role: str = "user"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_seen_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: str
    name: str
    picture: Optional[str] = None
    preferred_city: Optional[str] = None

class Report(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reporter_id: str
    title: str
    description: str
    location: Dict[str, float]  # {"lat": float, "lng": float}
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    image_url: Optional[str] = None
    severity: str = "moderate"  # critical|moderate|low
    ai_severity_score: Optional[float] = None
    status: str = "pending"  # pending|validated|rejected|resolved
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ai_auto_flag: bool = False

class ReportCreate(BaseModel):
    title: str
    description: str
    location: Dict[str, float]
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    image_url: Optional[str] = None
    severity: str = "moderate"

class ReportUpdate(BaseModel):
    status: str
    ai_severity_score: Optional[float] = None
    ai_auto_flag: Optional[bool] = None

class Shelter(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    location: Dict[str, float]
    capacity: int
    contact: str
    type: str  # flood|fire|earthquake|general
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ShelterCreate(BaseModel):
    name: str
    location: Dict[str, float]
    capacity: int
    contact: str
    type: str

class AIUpdate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    region: str  # city|country|world
    region_name: str
    summary: str
    severity_data: List[Dict[str, Any]]  # list of incidents with severity
    last_run_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SessionData(BaseModel):
    session_id: str

# Auth helper functions
async def verify_session(authorization: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
    
    session_token = authorization.credentials
    
    # Check if session exists in database
    session = await db.sessions.find_one({"session_token": session_token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session token")
    
    # Check if session is expired (7 days)
    created_at = session.get("created_at")
    if created_at and (datetime.now(timezone.utc) - created_at).days > 7:
        raise HTTPException(status_code=401, detail="Session expired")
    
    return session["user_id"]

async def verify_admin(user_id: str = Depends(verify_session)):
    user = await db.users.find_one({"id": user_id})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user_id

# Helper function to prepare data for MongoDB
def prepare_for_mongo(data):
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            if isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, dict):
                result[key] = prepare_for_mongo(value)
            elif isinstance(value, list):
                result[key] = [prepare_for_mongo(item) if isinstance(item, (dict, datetime)) else item for item in value]
            else:
                result[key] = value
        return result
    return data

# Auth routes
@api_router.post("/auth/session")
async def process_session(session_data: SessionData):
    """Process session from Emergent auth"""
    try:
        # Call Emergent auth API to get user data
        headers = {"X-Session-ID": session_data.session_id}
        response = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers=headers
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        user_data = response.json()
        
        # Create or update user in database
        existing_user = await db.users.find_one({"email": user_data["email"]})
        
        if not existing_user:
            # Create new user
            new_user = User(
                email=user_data["email"],
                name=user_data["name"],
                picture=user_data.get("picture")
            )
            user_dict = prepare_for_mongo(new_user.dict())
            await db.users.insert_one(user_dict)
            user_id = new_user.id
        else:
            # Update last seen
            user_id = existing_user["id"]
            await db.users.update_one(
                {"id": user_id},
                {"$set": {"last_seen_at": datetime.now(timezone.utc).isoformat()}}
            )
        
        # Create session token
        session_token = f"session_{uuid.uuid4()}"
        session_doc = {
            "session_token": session_token,
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.sessions.insert_one(session_doc)
        
        return {
            "session_token": session_token,
            "user": await db.users.find_one({"id": user_id}, {"_id": 0})
        }
        
    except Exception as e:
        logger.error(f"Session processing error: {e}")
        raise HTTPException(status_code=500, detail="Session processing failed")

@api_router.delete("/auth/logout")
async def logout(user_id: str = Depends(verify_session)):
    """Logout user by removing session"""
    await db.sessions.delete_many({"user_id": user_id})
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me")
async def get_current_user(user_id: str = Depends(verify_session)):
    """Get current user data"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# User routes
@api_router.get("/users", response_model=List[User])
async def get_users(user_id: str = Depends(verify_admin)):
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    return users

# Report routes
@api_router.post("/reports", response_model=Report)
async def create_report(report: ReportCreate, user_id: str = Depends(verify_session)):
    report_data = report.dict()
    report_data["reporter_id"] = user_id
    new_report = Report(**report_data)
    report_dict = prepare_for_mongo(new_report.dict())
    await db.reports.insert_one(report_dict)
    return new_report

@api_router.get("/reports", response_model=List[Report])
async def get_reports(city: Optional[str] = None, status: Optional[str] = None):
    query = {}
    if city:
        query["city"] = city
    if status:
        query["status"] = status
    
    reports = await db.reports.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return reports

@api_router.get("/reports/{report_id}", response_model=Report)
async def get_report(report_id: str):
    report = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@api_router.put("/reports/{report_id}")
async def update_report(report_id: str, update: ReportUpdate, user_id: str = Depends(verify_admin)):
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.reports.update_one({"id": report_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return {"message": "Report updated successfully"}

# Shelter routes
@api_router.post("/shelters", response_model=Shelter)
async def create_shelter(shelter: ShelterCreate, user_id: str = Depends(verify_admin)):
    new_shelter = Shelter(**shelter.dict())
    shelter_dict = prepare_for_mongo(new_shelter.dict())
    await db.shelters.insert_one(shelter_dict)
    return new_shelter

@api_router.get("/shelters", response_model=List[Shelter])
async def get_shelters():
    shelters = await db.shelters.find({}, {"_id": 0}).to_list(1000)
    return shelters

# AI Analysis routes
@api_router.post("/ai/analyze")
async def trigger_ai_analysis(user_id: str = Depends(verify_admin)):
    """Manually trigger AI analysis of reports"""
    try:
        # Get Emergent LLM key
        emergent_key = os.environ.get('EMERGENT_LLM_KEY')
        if not emergent_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        # Get recent reports (last 24 hours)
        recent_reports = await db.reports.find({
            "created_at": {"$gte": (datetime.now(timezone.utc) - datetime.timedelta(days=1)).isoformat()}
        }, {"_id": 0}).to_list(100)
        
        if not recent_reports:
            return {"message": "No recent reports to analyze"}
        
        # Group reports by city
        city_reports = {}
        for report in recent_reports:
            city = report.get("city", "Unknown")
            if city not in city_reports:
                city_reports[city] = []
            city_reports[city].append(report)
        
        # Analyze each city
        ai_updates = []
        
        for city, reports in city_reports.items():
            # Create prompt for AI analysis
            reports_text = "\n".join([
                f"- {report['title']}: {report['description']} (Severity: {report['severity']})"
                for report in reports
            ])
            
            prompt = f"""
Analyze the following disaster reports for {city} and provide:
1. Overall severity assessment (critical/moderate/low)
2. Top 3 most critical incidents
3. Brief summary for emergency dashboard

Reports:
{reports_text}

Respond in JSON format:
{{
    "overall_severity": "critical|moderate|low",
    "severity_score": 0.0-1.0,
    "critical_incidents": [
        {{"title": "...", "severity": "critical", "priority": 1}},
        {{"title": "...", "severity": "moderate", "priority": 2}},
        {{"title": "...", "severity": "low", "priority": 3}}
    ],
    "summary": "Brief summary for dashboard"
}}
"""
            
            # For now, create mock AI response (replace with actual LLM call)
            ai_response = {
                "overall_severity": "moderate",
                "severity_score": 0.6,
                "critical_incidents": [
                    {"title": reports[0]["title"], "severity": "moderate", "priority": 1}
                ],
                "summary": f"Monitoring {len(reports)} incidents in {city}. Situation under control."
            }
            
            # Create AI update record
            ai_update = AIUpdate(
                region="city",
                region_name=city,
                summary=ai_response["summary"],
                severity_data=ai_response["critical_incidents"]
            )
            
            ai_update_dict = prepare_for_mongo(ai_update.dict())
            await db.ai_updates.insert_one(ai_update_dict)
            ai_updates.append(ai_update)
            
            # Update reports with AI scores
            for report in reports:
                await db.reports.update_one(
                    {"id": report["id"]},
                    {"$set": {
                        "ai_severity_score": ai_response["severity_score"],
                        "ai_auto_flag": ai_response["severity_score"] > 0.7,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
        
        return {
            "message": "AI analysis completed",
            "cities_analyzed": len(city_reports),
            "updates_created": len(ai_updates)
        }
        
    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

@api_router.get("/ai/updates", response_model=List[AIUpdate])
async def get_ai_updates(region: Optional[str] = None):
    """Get AI analysis updates"""
    query = {}
    if region:
        query["region"] = region
    
    updates = await db.ai_updates.find(query, {"_id": 0}).sort("last_run_at", -1).to_list(50)
    return updates

# Dashboard data route
@api_router.get("/dashboard/data")
async def get_dashboard_data():
    """Get all dashboard data in one call"""
    # Get recent reports
    reports = await db.reports.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Get shelters
    shelters = await db.shelters.find({}, {"_id": 0}).to_list(100)
    
    # Get latest AI updates
    ai_updates = await db.ai_updates.find({}, {"_id": 0}).sort("last_run_at", -1).to_list(20)
    
    # Categorize reports by severity
    city_critical = []
    city_moderate = []
    city_low = []
    world_critical = []
    world_moderate = []
    world_low = []
    
    for report in reports:
        item = {
            "id": report["id"],
            "title": report["title"],
            "city": report.get("city", "Unknown"),
            "country": report.get("country", "Unknown"),
            "severity": report["severity"],
            "created_at": report["created_at"],
            "location": report["location"]
        }
        
        # Categorize by severity
        if report["severity"] == "critical":
            city_critical.append(item)
            world_critical.append(item)
        elif report["severity"] == "moderate":
            city_moderate.append(item)
            world_moderate.append(item)
        else:
            city_low.append(item)
            world_low.append(item)
    
    return {
        "reports": reports,
        "shelters": shelters,
        "ai_updates": ai_updates,
        "city_data": {
            "critical": city_critical[:5],
            "moderate": city_moderate[:5],
            "low": city_low[:5]
        },
        "world_data": {
            "critical": world_critical[:5],
            "moderate": world_moderate[:5],
            "low": world_low[:5]
        },
        "last_ai_update": ai_updates[0]["last_run_at"] if ai_updates else None
    }

# Basic routes
@api_router.get("/")
async def root():
    return {"message": "DisasterDash API v1.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()