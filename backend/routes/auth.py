from flask import Blueprint, request, jsonify
from firebase_admin import auth
from services.firebase_service import firebase_service
from datetime import datetime
import logging
import traceback

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register PHC or Lab user"""
    try:
        data = request.get_json()
        
        email = data.get('email')
        password = data.get('password')
        user_type = data.get('userType')  # 'phc' or 'lab'
        organization_name = data.get('organizationName')
        district = data.get('district')
        
        if not all([email, password, user_type, organization_name, district]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Create Firebase Auth user
        user = auth.create_user(
            email=email,
            password=password
        )
        
        user_data = {
            'uid': user.uid,
            'email': email,
            'userType': user_type,
            'organizationName': organization_name,
            'district': district,
            'createdAt': datetime.now().isoformat(),
            'active': True
        }
        
        if user_type == 'phc':
            firebase_service.add_phc_user(user_data)
        elif user_type == 'lab':
            firebase_service.add_lab_user(user_data)
        
        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'uid': user.uid
        }), 201
    
    except Exception as e:
        logger.error(f"Error during registration: {str(e)}", exc_info=True)
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 400

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        
        email = data.get('email')
        password = data.get('password')
        user_type = data.get('userType')  # 'phc' or 'lab'
        
        if not all([email, password, user_type]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Verify user exists in appropriate collection
        if user_type == 'phc':
            user_data = firebase_service.get_phc_by_email(email)
        else:
            user_data = firebase_service.get_lab_by_email(email)
        
        if not user_data:
            return jsonify({'error': 'User not found'}), 404
        
        # Get custom token from Firebase Auth
        try:
            user = auth.get_user_by_email(email)
            custom_token = auth.create_custom_token(user.uid)
            
            return jsonify({
                'success': True,
                'message': 'Login successful',
                'token': custom_token.decode('utf-8'),
                'userType': user_type,
                'email': email
            }), 200
        except:
            return jsonify({'error': 'Invalid credentials'}), 401
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@auth_bp.route('/verify-token', methods=['POST'])
def verify_token():
    """Verify JWT token"""
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not token:
            return jsonify({'error': 'No token provided'}), 401
        
        decoded_token = auth.verify_id_token(token)
        return jsonify({
            'success': True,
            'uid': decoded_token['uid'],
            'email': decoded_token['email']
        }), 200
    
    except Exception as e:
        return jsonify({'error': 'Invalid token'}), 401
