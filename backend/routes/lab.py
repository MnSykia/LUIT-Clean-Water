from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from services.firebase_service import get_db, get_current_user
from services.cloudinary_service import cloudinary_service
from typing import Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/lab", tags=["lab"])

@router.get("/reports")
async def get_lab_reports(
    db = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all reports sent to lab"""
    try:
        # Verify user is lab
        if current_user.get('organization_type') != 'lab':
            raise HTTPException(status_code=403, detail="Only lab users can access this")
        
        user_district = current_user.get('district')
        user_district_id = current_user.get('district_id')
        
        # Get all active reports for this district
        all_docs = db.collection('reports').stream()
        reports = []
        
        for doc in all_docs:
            data = doc.to_dict()
            
            # Show reports that are active or pending lab approval
            if (data.get('district_id') == user_district_id or data.get('district') == user_district):
                if data.get('status') == 'active' or data.get('pending_lab_approval'):
                    reports.append(data)
        
        # Sort by sent_to_lab_at descending
        reports.sort(key=lambda x: x.get('sent_to_lab_at', ''), reverse=True)
        
        return {"reports": reports}
        
    except Exception as e:
        logger.error(f"Get lab reports error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{report_id}/upload-results")
async def upload_test_results(
    report_id: str,
    test_results_pdf: UploadFile = File(...),
    solution_pdf: UploadFile = File(...),
    notes: Optional[str] = Form(None),
    db = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Lab uploads test results and solution PDFs"""
    try:
        # Verify user is lab
        if current_user.get('organization_type') != 'lab':
            raise HTTPException(status_code=403, detail="Only lab users can upload results")
        
        # Get report
        report_ref = db.collection('reports').document(report_id)
        report_doc = report_ref.get()
        
        if not report_doc.exists:
            raise HTTPException(status_code=404, detail="Report not found")
        
        # Upload test results PDF
        test_pdf_content = await test_results_pdf.read()
        test_pdf_url = await cloudinary_service.upload_image(test_pdf_content, folder="luit/lab_results")
        
        # Upload solution PDF
        solution_pdf_content = await solution_pdf.read()
        solution_pdf_url = await cloudinary_service.upload_image(solution_pdf_content, folder="luit/lab_solutions")
        
        # Update report
        report_ref.update({
            "lab_test_results_url": test_pdf_url,
            "lab_solution_url": solution_pdf_url,
            "lab_notes": notes,
            "lab_uploaded_at": datetime.utcnow().isoformat(),
            "lab_name": current_user.get('organization_name'),
            "has_lab_results": True
        })
        
        return {
            "success": True,
            "message": "Test results and solution uploaded successfully",
            "test_results_url": test_pdf_url,
            "solution_url": solution_pdf_url
        }
        
    except Exception as e:
        logger.error(f"Upload results error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{report_id}/approve-clean")
async def approve_area_clean(
    report_id: str,
    db = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Lab confirms area is clean (after PHC marks it)"""
    try:
        # Verify user is lab
        if current_user.get('organization_type') != 'lab':
            raise HTTPException(status_code=403, detail="Only lab users can approve clean status")
        
        # Get report
        report_ref = db.collection('reports').document(report_id)
        report_doc = report_ref.get()
        
        if not report_doc.exists:
            raise HTTPException(status_code=404, detail="Report not found")
        
        report_data = report_doc.to_dict()
        
        if not report_data.get('phc_marked_clean'):
            raise HTTPException(status_code=400, detail="PHC has not marked this area as clean yet")
        
        # Update report to resolved
        report_ref.update({
            "status": "resolved",
            "lab_approved_clean": True,
            "lab_approved_at": datetime.utcnow().isoformat(),
            "pending_lab_approval": False,
            "resolved_at": datetime.utcnow().isoformat()
        })
        
        return {
            "success": True,
            "message": "Area approved as clean. Status changed to resolved.",
            "status": "resolved"
        }
        
    except Exception as e:
        logger.error(f"Approve clean error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/solutions")
async def get_previous_solutions(
    district: Optional[str] = None,
    db = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all previous solutions (for PHC and Lab)"""
    try:
        # Get all reports with lab solutions
        all_docs = db.collection('reports').stream()
        solutions = []
        
        for doc in all_docs:
            data = doc.to_dict()
            
            # Filter reports with lab solutions
            if not data.get('lab_solution_url'):
                continue
            
            # If district filter is provided
            if district and data.get('district') != district:
                continue
            
            solutions.append({
                "report_id": data.get('report_id'),
                "problem": data.get('problem'),
                "district": data.get('district'),
                "location": data.get('location'),
                "lab_solution_url": data.get('lab_solution_url'),
                "lab_test_results_url": data.get('lab_test_results_url'),
                "lab_notes": data.get('lab_notes'),
                "lab_uploaded_at": data.get('lab_uploaded_at'),
                "status": data.get('status')
            })
        
        # Sort by upload date descending
        solutions.sort(key=lambda x: x.get('lab_uploaded_at', ''), reverse=True)
        
        return {"solutions": solutions}
        
    except Exception as e:
        logger.error(f"Get solutions error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
