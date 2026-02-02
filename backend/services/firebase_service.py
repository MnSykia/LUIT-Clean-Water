import firebase_admin
from firebase_admin import credentials, db, storage, auth
import os
import json

class FirebaseService:
    """Firebase service for database operations"""
    
    def __init__(self):
        """Initialize Firebase app"""
        if not firebase_admin._apps:
            # Try to load from environment variable or file
            cred_path = os.getenv('FIREBASE_KEY_PATH', 'serviceAccountKey.json')
            
            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
            else:
                # Try to load from environment variable
                cred_dict = os.getenv('FIREBASE_CREDENTIALS')
                if cred_dict:
                    cred = credentials.Certificate(json.loads(cred_dict))
                else:
                    raise ValueError("Firebase credentials not found")
            
            firebase_admin.initialize_app(cred, {
                'databaseURL': os.getenv('FIREBASE_DATABASE_URL'),
                'storageBucket': os.getenv('FIREBASE_STORAGE_BUCKET')
            })
    
    def add_water_quality_report(self, report_data):
        """Add a water quality report"""
        ref = db.reference('water_quality_reports')
        new_report = ref.push()
        new_report.set(report_data)
        return new_report.key
    
    def get_water_quality_reports(self, district=None):
        """Get water quality reports"""
        ref = db.reference('water_quality_reports')
        reports = ref.get()
        
        if district and reports:
            return {k: v for k, v in reports.items() if v.get('district') == district}
        return reports or {}
    
    def get_active_reports(self):
        """Get active contamination reports"""
        ref = db.reference('water_quality_reports')
        reports = ref.get()
        
        if reports:
            return {k: v for k, v in reports.items() if v.get('status') == 'contaminated' and v.get('active') is True}
        return {}
    
    def update_report_status(self, report_id, status):
        """Update report status"""
        ref = db.reference(f'water_quality_reports/{report_id}')
        ref.update({'status': status})
        return True
    
    def add_phc_user(self, user_data):
        """Add PHC user"""
        ref = db.reference('users/phc')
        new_user = ref.push()
        new_user.set(user_data)
        return new_user.key
    
    def add_lab_user(self, user_data):
        """Add Lab user"""
        ref = db.reference('users/lab')
        new_user = ref.push()
        new_user.set(user_data)
        return new_user.key
    
    def get_phc_by_email(self, email):
        """Get PHC by email"""
        ref = db.reference('users/phc')
        users = ref.order_by_child('email').equal_to(email).get()
        return users
    
    def get_lab_by_email(self, email):
        """Get Lab by email"""
        ref = db.reference('users/lab')
        users = ref.order_by_child('email').equal_to(email).get()
        return users
    
    def upload_file(self, file_path, destination_path):
        """Upload file to Firebase Storage"""
        bucket = storage.bucket()
        blob = bucket.blob(destination_path)
        blob.upload_from_filename(file_path)
        return blob.public_url
    
    def add_lab_solution(self, solution_data):
        """Add lab solution"""
        ref = db.reference('lab_solutions')
        new_solution = ref.push()
        new_solution.set(solution_data)
        return new_solution.key
    
    def get_lab_solutions(self, district=None):
        """Get lab solutions"""
        ref = db.reference('lab_solutions')
        solutions = ref.get()
        
        if district and solutions:
            return {k: v for k, v in solutions.items() if v.get('district') == district}
        return solutions or {}

firebase_service = FirebaseService()
