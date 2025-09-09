#!/usr/bin/env python3
"""
Seed data for DisasterDash demo
"""
import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid

load_dotenv()

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def seed_database():
    """Add seed data for demo"""
    
    # Clear existing data
    await db.users.delete_many({})
    await db.reports.delete_many({})
    await db.shelters.delete_many({})
    await db.ai_updates.delete_many({})
    await db.sessions.delete_many({})
    
    print("🗑️  Cleared existing data")
    
    # Create admin user
    admin_user = {
        "id": str(uuid.uuid4()),
        "email": "admin@disasterdash.com",
        "name": "Admin User",
        "picture": None,
        "preferred_city": "New York",
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_seen_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin_user)
    print("👤 Created admin user")
    
    # Create sample reports
    reports = [
        {
            "id": str(uuid.uuid4()),
            "reporter_id": admin_user["id"],
            "title": "Flash Flood in Downtown Manhattan",
            "description": "Heavy rainfall has caused significant flooding in lower Manhattan. Water levels rising rapidly near Wall Street area.",
            "location": {"lat": 40.7074, "lng": -74.0113},
            "address": "Wall Street, New York, NY",
            "city": "New York",
            "country": "United States",
            "image_url": None,
            "severity": "critical",
            "ai_severity_score": 0.9,
            "status": "validated",
            "created_at": (datetime.now(timezone.utc)).isoformat(),
            "updated_at": (datetime.now(timezone.utc)).isoformat(),
            "ai_auto_flag": True
        },
        {
            "id": str(uuid.uuid4()),
            "reporter_id": admin_user["id"],
            "title": "Power Outage in Brooklyn",
            "description": "Widespread power outage affecting approximately 50,000 residents in Brooklyn Heights area.",
            "location": {"lat": 40.6962, "lng": -73.9937},
            "address": "Brooklyn Heights, Brooklyn, NY",
            "city": "New York",
            "country": "United States",
            "image_url": None,
            "severity": "moderate",
            "ai_severity_score": 0.6,
            "status": "validated",
            "created_at": (datetime.now(timezone.utc)).isoformat(),
            "updated_at": (datetime.now(timezone.utc)).isoformat(),
            "ai_auto_flag": False
        },
        {
            "id": str(uuid.uuid4()),
            "reporter_id": admin_user["id"],
            "title": "Earthquake in Los Angeles",
            "description": "Magnitude 6.2 earthquake struck LA area. Buildings shaking reported across the city.",
            "location": {"lat": 34.0522, "lng": -118.2437},
            "address": "Downtown Los Angeles, CA",
            "city": "Los Angeles",
            "country": "United States",
            "image_url": None,
            "severity": "critical",
            "ai_severity_score": 0.95,
            "status": "pending",
            "created_at": (datetime.now(timezone.utc)).isoformat(),
            "updated_at": (datetime.now(timezone.utc)).isoformat(),
            "ai_auto_flag": True
        },
        {
            "id": str(uuid.uuid4()),
            "reporter_id": admin_user["id"],
            "title": "Wildfire Near San Francisco",
            "description": "Fast-moving wildfire approaching residential areas north of San Francisco Bay.",
            "location": {"lat": 37.8272, "lng": -122.2913},
            "address": "Marin County, CA",
            "city": "San Francisco",
            "country": "United States",
            "image_url": None,
            "severity": "critical",
            "ai_severity_score": 0.88,
            "status": "validated",
            "created_at": (datetime.now(timezone.utc)).isoformat(),
            "updated_at": (datetime.now(timezone.utc)).isoformat(),
            "ai_auto_flag": True
        },
        {
            "id": str(uuid.uuid4()),
            "reporter_id": admin_user["id"],
            "title": "Hurricane Warning - Miami",
            "description": "Category 3 hurricane approaching Florida coast. Evacuation orders issued for coastal areas.",
            "location": {"lat": 25.7617, "lng": -80.1918},
            "address": "Miami Beach, FL",
            "city": "Miami",
            "country": "United States",
            "image_url": None,
            "severity": "critical",
            "ai_severity_score": 0.92,
            "status": "validated",
            "created_at": (datetime.now(timezone.utc)).isoformat(),
            "updated_at": (datetime.now(timezone.utc)).isoformat(),
            "ai_auto_flag": True
        },
        {
            "id": str(uuid.uuid4()),
            "reporter_id": admin_user["id"],
            "title": "Tornado Spotted in Kansas",
            "description": "Large tornado confirmed on the ground moving northeast through rural Kansas.",
            "location": {"lat": 39.0473, "lng": -95.6890},
            "address": "Topeka, KS",
            "city": "Topeka",
            "country": "United States",
            "image_url": None,
            "severity": "critical",
            "ai_severity_score": 0.85,
            "status": "pending",
            "created_at": (datetime.now(timezone.utc)).isoformat(),
            "updated_at": (datetime.now(timezone.utc)).isoformat(),
            "ai_auto_flag": True
        },
        {
            "id": str(uuid.uuid4()),
            "reporter_id": admin_user["id"],
            "title": "Blizzard Warning - Chicago",
            "description": "Heavy snow and high winds expected. Travel strongly discouraged.",
            "location": {"lat": 41.8781, "lng": -87.6298},
            "address": "Chicago, IL",
            "city": "Chicago",
            "country": "United States",
            "image_url": None,
            "severity": "moderate",
            "ai_severity_score": 0.65,
            "status": "validated",
            "created_at": (datetime.now(timezone.utc)).isoformat(),
            "updated_at": (datetime.now(timezone.utc)).isoformat(),
            "ai_auto_flag": False
        },
        {
            "id": str(uuid.uuid4()),
            "reporter_id": admin_user["id"],
            "title": "Volcanic Activity - Hawaii",
            "description": "Increased volcanic activity reported at Kilauea. Lava flows visible.",
            "location": {"lat": 19.4194, "lng": -155.2885},
            "address": "Hawaii Volcanoes National Park, HI",
            "city": "Hilo",
            "country": "United States",
            "image_url": None,
            "severity": "moderate",
            "ai_severity_score": 0.55,
            "status": "validated",
            "created_at": (datetime.now(timezone.utc)).isoformat(),
            "updated_at": (datetime.now(timezone.utc)).isoformat(),
            "ai_auto_flag": False
        },
        # International incidents
        {
            "id": str(uuid.uuid4()),
            "reporter_id": admin_user["id"],
            "title": "Earthquake in Tokyo",
            "description": "Magnitude 7.1 earthquake hits Tokyo metropolitan area. Tsunami warning issued.",
            "location": {"lat": 35.6762, "lng": 139.6503},
            "address": "Tokyo, Japan",
            "city": "Tokyo",
            "country": "Japan",
            "image_url": None,
            "severity": "critical",
            "ai_severity_score": 0.96,
            "status": "validated",
            "created_at": (datetime.now(timezone.utc)).isoformat(),
            "updated_at": (datetime.now(timezone.utc)).isoformat(),
            "ai_auto_flag": True
        },
        {
            "id": str(uuid.uuid4()),
            "reporter_id": admin_user["id"],
            "title": "Flooding in London",
            "description": "Thames River overflowing due to heavy rainfall. Underground stations closed.",
            "location": {"lat": 51.5074, "lng": -0.1278},
            "address": "London, UK",
            "city": "London",
            "country": "United Kingdom",
            "image_url": None,
            "severity": "moderate",
            "ai_severity_score": 0.7,
            "status": "validated",
            "created_at": (datetime.now(timezone.utc)).isoformat(),
            "updated_at": (datetime.now(timezone.utc)).isoformat(),
            "ai_auto_flag": False
        }
    ]
    
    await db.reports.insert_many(reports)
    print(f"📝 Created {len(reports)} sample reports")
    
    # Create sample shelters
    shelters = [
        {
            "id": str(uuid.uuid4()),
            "name": "Madison Square Garden Emergency Shelter",
            "location": {"lat": 40.7505, "lng": -73.9934},
            "capacity": 5000,
            "contact": "+1-212-465-6741",
            "type": "general",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Brooklyn Community Center",
            "location": {"lat": 40.6782, "lng": -73.9442},
            "capacity": 2000,
            "contact": "+1-718-636-3300",
            "type": "flood",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "LA Convention Center Emergency Hub",
            "location": {"lat": 34.0403, "lng": -118.2696},
            "capacity": 8000,
            "contact": "+1-213-741-1151",
            "type": "earthquake",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "San Francisco Red Cross Shelter",
            "location": {"lat": 37.7749, "lng": -122.4194},
            "capacity": 3000,
            "contact": "+1-415-427-8000",
            "type": "fire",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Miami-Dade Emergency Center",
            "location": {"lat": 25.7907, "lng": -80.1300},
            "capacity": 4500,
            "contact": "+1-305-468-5900",
            "type": "general",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.shelters.insert_many(shelters)
    print(f"🏠 Created {len(shelters)} emergency shelters")
    
    # Create AI analysis updates
    ai_updates = [
        {
            "id": str(uuid.uuid4()),
            "region": "city",
            "region_name": "New York",
            "summary": "Critical flooding situation in Manhattan. Immediate response required for Wall Street area evacuation.",
            "severity_data": [
                {"title": "Flash Flood in Downtown Manhattan", "severity": "critical", "priority": 1},
                {"title": "Power Outage in Brooklyn", "severity": "moderate", "priority": 2}
            ],
            "last_run_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "region": "city",
            "region_name": "Los Angeles",
            "summary": "Seismic activity detected. Emergency services on high alert.",
            "severity_data": [
                {"title": "Earthquake in Los Angeles", "severity": "critical", "priority": 1}
            ],
            "last_run_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "region": "world",
            "region_name": "Global",
            "summary": "Multiple critical incidents detected worldwide. Enhanced monitoring activated.",
            "severity_data": [
                {"title": "Earthquake in Tokyo", "severity": "critical", "priority": 1},
                {"title": "Hurricane Warning - Miami", "severity": "critical", "priority": 2},
                {"title": "Wildfire Near San Francisco", "severity": "critical", "priority": 3}
            ],
            "last_run_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.ai_updates.insert_many(ai_updates)
    print(f"🤖 Created {len(ai_updates)} AI analysis updates")
    
    print("\n✅ Database seeded successfully!")
    print(f"👤 Admin user: {admin_user['email']}")
    print(f"📊 Total reports: {len(reports)}")
    print(f"🏠 Total shelters: {len(shelters)}")
    print(f"🤖 AI updates: {len(ai_updates)}")

if __name__ == "__main__":
    asyncio.run(seed_database())