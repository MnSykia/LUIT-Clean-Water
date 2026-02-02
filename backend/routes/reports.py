from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from services.firebase_service import get_db, get_current_user
from services.cloudinary_service import cloudinary_service
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
import re
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["reports"])

def normalize_district_id(district: str) -> str:
    """Convert district name to normalized ID"""
    return re.sub(r"[^a-z0-9]+", "_", district.strip().lower()).strip("_")

@router.post("/submit")
async def submit_report(
    problem: str = Form(...),
    location: str = Form(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    severity: str = Form(...),
    source_type: str = Form(...),
    district: str = Form(...),
    image: Optional[UploadFile] = File(None),
    db = Depends(get_db)
):
    """Submit water contamination report (public)"""
    try:
        # Upload image if provided
        image_url = None
        if image:
            image_content = await image.read()
            image_url = await cloudinary_service.upload_image(image_content, folder="luit/reports")
        
        # Create report
        report_id = str(uuid.uuid4())
        district_id = normalize_district_id(district)
        
        report_data = {
            "report_id": report_id,
            "problem": problem,
            "location": location,
            "latitude": latitude,
            "longitude": longitude,
            "severity": severity,
            "source_type": source_type,
            "district": district,
            "district_id": district_id,
            "image_url": image_url,
            "status": "reported",  # reported -> active -> resolved
            "submitted_at": datetime.utcnow().isoformat(),
            "reported_by": "public"
        }
        
        db.collection('reports').document(report_id).set(report_data)
        
        return {
            "success": True,
            "message": "Report submitted successfully",
            "report_id": report_id
        }
        
    except Exception as e:
        logger.error(f"Report submission error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_reports(
    status: Optional[str] = None,
    district: Optional[str] = None,
    db = Depends(get_db)
):
    """Get all reports (for landing page)"""
    try:
        query = db.collection('reports')
        
        # Fetch all reports and filter in Python
        all_docs = query.stream()
        reports = []
        
        for doc in all_docs:
            data = doc.to_dict()
            
            # Apply filters
            if status and data.get('status') != status:
                continue
            if district and data.get('district') != district:
                continue
            
            reports.append(data)
        
        # Sort by submitted_at descending
        reports.sort(key=lambda x: x.get('submitted_at', ''), reverse=True)
        
        return {"reports": reports}
        
    except Exception as e:
        logger.error(f"List reports error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/district")
async def get_district_reports(
    db = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get reports for PHC's district"""
    try:
        user_district = current_user.get('district')
        user_district_id = current_user.get('district_id')
        
        if not user_district:
            raise HTTPException(status_code=400, detail="User has no district assigned")
        
        # Fetch all reports and filter
        all_docs = db.collection('reports').stream()
        reports = []
        
        for doc in all_docs:
            data = doc.to_dict()
            if data.get('district_id') == user_district_id or data.get('district') == user_district:
                reports.append(data)
        
        # Sort by status priority: active > reported > resolved
        status_priority = {'active': 0, 'reported': 1, 'resolved': 2}
        reports.sort(key=lambda x: (status_priority.get(x.get('status', 'reported'), 3), x.get('submitted_at', '')), reverse=True)
        
        return {"reports": reports}
        
    except Exception as e:
        logger.error(f"District reports error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{report_id}/send-to-lab")
async def send_report_to_lab(
    report_id: str,
    description: str = Form(...),
    pdf_file: Optional[UploadFile] = File(None),
    db = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """PHC sends report to lab with description/PDF"""
    try:
        # Verify user is PHC
        if current_user.get('organization_type') != 'phc':
            raise HTTPException(status_code=403, detail="Only PHC users can send reports to lab")
        
        # Get report
        report_ref = db.collection('reports').document(report_id)
        report_doc = report_ref.get()
        
        if not report_doc.exists:
            raise HTTPException(status_code=404, detail="Report not found")
        
        # Upload PDF if provided
        pdf_url = None
        if pdf_file:
            pdf_content = await pdf_file.read()
            pdf_url = await cloudinary_service.upload_image(pdf_content, folder="luit/phc_reports")
        
        # Update report status to active (contaminated)
        report_ref.update({
            "status": "active",
            "phc_description": description,
            "phc_pdf_url": pdf_url,
            "sent_to_lab_at": datetime.utcnow().isoformat(),
            "sent_by_phc": current_user.get('organization_name'),
            "phc_district": current_user.get('district')
        })
        
        return {
            "success": True,
            "message": "Report sent to lab. Area marked as contaminated.",
            "status": "active"
        }
        
    except Exception as e:
        logger.error(f"Send to lab error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{report_id}/mark-clean")
async def mark_area_clean(
    report_id: str,
    db = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """PHC marks area as clean (pending lab confirmation)"""
    try:
        # Verify user is PHC
        if current_user.get('organization_type') != 'phc':
            raise HTTPException(status_code=403, detail="Only PHC users can mark areas as clean")
        
        # Get report
        report_ref = db.collection('reports').document(report_id)
        report_doc = report_ref.get()
        
        if not report_doc.exists:
            raise HTTPException(status_code=404, detail="Report not found")
        
        # Update report
        report_ref.update({
            "phc_marked_clean": True,
            "phc_marked_clean_at": datetime.utcnow().isoformat(),
            "pending_lab_approval": True
        })
        
        return {
            "success": True,
            "message": "Marked as clean. Waiting for lab confirmation."
        }
        
    except Exception as e:
        logger.error(f"Mark clean error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/check-area-status")
async def check_area_status(
    latitude: float,
    longitude: float,
    db = Depends(get_db)
):
    """Check if area is contaminated (for landing page popup)"""
    try:
        from geopy.distance import geodesic
        
        # Get all active reports
        all_docs = db.collection('reports').stream()
        
        user_location = (latitude, longitude)
        contaminated = False
        nearest_report = None
        min_distance = float('inf')
        
        for doc in all_docs:
            data = doc.to_dict()
            
            if data.get('status') != 'active':
                continue
            
            report_lat = data.get('latitude')
            report_lon = data.get('longitude')
            
            if report_lat and report_lon:
                report_location = (report_lat, report_lon)
                distance = geodesic(user_location, report_location).kilometers
                
                # If within 1km radius
                if distance <= 1:
                    contaminated = True
                    if distance < min_distance:
                        min_distance = distance
                        nearest_report = {
                            "report_id": data.get('report_id'),
                            "problem": data.get('problem'),
                            "distance_km": round(distance, 2),
                            "severity": data.get('severity')
                        }
        
        return {
            "contaminated": contaminated,
            "nearest_report": nearest_report,
            "status": "contaminated" if contaminated else "clean"
        }
        
    except Exception as e:
        logger.error(f"Check area status error: {str(e)}")
        return {"contaminated": False, "status": "unknown", "error": str(e)}
