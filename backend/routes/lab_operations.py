from flask import Blueprint, request, jsonify
from services.firebase_service import firebase_service
from datetime import datetime
from werkzeug.utils import secure_filename
import os

lab_bp = Blueprint('lab', __name__)

ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@lab_bp.route('/assignments', methods=['GET'])
def get_assignments():
    """Get assignments for lab"""
    try:
        district = request.args.get('district')
        
        ref = firebase_service.db.reference('lab_assignments')
        assignments = ref.get()
        
        if district and assignments:
            assignments = {k: v for k, v in assignments.items() if v.get('district') == district}
        
        return jsonify({
            'success': True,
            'data': assignments or {}
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@lab_bp.route('/assignment/<assignment_id>', methods=['GET'])
def get_assignment_details(assignment_id):
    """Get assignment details"""
    try:
        ref = firebase_service.db.reference(f'lab_assignments/{assignment_id}')
        assignment = ref.get()
        
        if not assignment:
            return jsonify({'error': 'Assignment not found'}), 404
        
        return jsonify({
            'success': True,
            'data': assignment
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@lab_bp.route('/upload-test-result/<assignment_id>', methods=['POST'])
def upload_test_result(assignment_id):
    """Upload test result PDF"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        test_notes = request.form.get('testNotes')
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        filename = secure_filename(f"test_result_{assignment_id}_{datetime.now().timestamp()}.pdf")
        
        # Save locally (in production, use cloud storage)
        upload_folder = 'uploads/test_results'
        os.makedirs(upload_folder, exist_ok=True)
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)
        
        # Update assignment
        ref = firebase_service.db.reference(f'lab_assignments/{assignment_id}')
        ref.update({
            'testResultFile': filename,
            'testNotes': test_notes,
            'testResultUploadedAt': datetime.now().isoformat(),
            'status': 'test_result_uploaded'
        })
        
        return jsonify({
            'success': True,
            'message': 'Test result uploaded',
            'filename': filename
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@lab_bp.route('/upload-solution/<assignment_id>', methods=['POST'])
def upload_solution(assignment_id):
    """Upload solution PDF"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        solution_description = request.form.get('solutionDescription')
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        filename = secure_filename(f"solution_{assignment_id}_{datetime.now().timestamp()}.pdf")
        
        # Save locally (in production, use cloud storage)
        upload_folder = 'uploads/solutions'
        os.makedirs(upload_folder, exist_ok=True)
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)
        
        # Update assignment
        ref = firebase_service.db.reference(f'lab_assignments/{assignment_id}')
        ref.update({
            'solutionFile': filename,
            'solutionDescription': solution_description,
            'solutionUploadedAt': datetime.now().isoformat(),
            'status': 'solution_provided'
        })
        
        return jsonify({
            'success': True,
            'message': 'Solution uploaded',
            'filename': filename
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@lab_bp.route('/confirm-clean/<assignment_id>', methods=['POST'])
def confirm_clean(assignment_id):
    """Confirm area is clean after re-testing"""
    try:
        data = request.get_json()
        final_notes = data.get('finalNotes')
        
        # Update assignment
        ref = firebase_service.db.reference(f'lab_assignments/{assignment_id}')
        ref.update({
            'status': 'confirmed_clean',
            'finalNotes': final_notes,
            'labConfirmedCleanAt': datetime.now().isoformat()
        })
        
        # Mark report as clean
        assignment = ref.get()
        if assignment and 'reportId' in assignment:
            firebase_service.update_report_status(assignment['reportId'], 'clean')
        
        return jsonify({
            'success': True,
            'message': 'Area confirmed clean'
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@lab_bp.route('/previous-solutions', methods=['GET'])
def get_previous_solutions():
    """Get previous solutions for lab's district or all"""
    try:
        district = request.args.get('district')
        all_assam = request.args.get('allAssam', False, type=bool)
        
        if all_assam:
            solutions = firebase_service.get_lab_solutions()
        else:
            solutions = firebase_service.get_lab_solutions(district)
        
        return jsonify({
            'success': True,
            'data': solutions
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400
