from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail, Message
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from itsdangerous import URLSafeTimedSerializer
import os
import json
from dotenv import load_dotenv
from cities import get_cities

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
# Database configuration - use Neon PostgreSQL in production, SQLite for local dev
database_url = os.getenv('DATABASE_URL')
if not database_url:
    # Fallback to SQLite for local development if DATABASE_URL not set
    database_url = 'sqlite:///linklift.db'
elif database_url.startswith('postgres://'):
    # Convert postgres:// to postgresql:// for SQLAlchemy compatibility
    database_url = database_url.replace('postgres://', 'postgresql://', 1)
app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# CORS configuration - allow localhost for dev and Vercel domain for production
allowed_origins_str = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173')
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(',') if origin.strip()]

# Configure CORS with proper headers and methods for preflight requests
CORS(
    app,
    origins=allowed_origins,
    methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allow_headers=['Content-Type', 'Authorization'],
    supports_credentials=True,
    expose_headers=['Content-Type']
)
jwt = JWTManager(app)
db = SQLAlchemy(app)

# Flask-Mail configuration
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@linklift.com')

mail = Mail(app)
serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    year = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    college = db.Column(db.String(200), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    email_verified = db.Column(db.Boolean, default=False, nullable=False)
    verification_token = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    published_rides = db.relationship('Ride', backref='publisher', lazy=True, foreign_keys='Ride.publisher_id')
    requests = db.relationship('Request', backref='requestor', lazy=True, foreign_keys='Request.requestor_id')

class Ride(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    publisher_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    pickup_city = db.Column(db.String(100), nullable=False)
    drop_city = db.Column(db.String(100), nullable=False)
    pickup_address = db.Column(db.String(200), nullable=False)
    drop_address = db.Column(db.String(200), nullable=False)
    on_route_cities = db.Column(db.Text, nullable=True)  # JSON string of cities array
    date = db.Column(db.Date, nullable=False)
    time = db.Column(db.Time, nullable=False)
    available_seats = db.Column(db.Integer, nullable=False)
    capacity = db.Column(db.Integer, nullable=False)
    cost_per_person = db.Column(db.Float, nullable=False)
    car_model = db.Column(db.String(100), nullable=False)
    license_plate = db.Column(db.String(50), nullable=False)
    women_only = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    requests = db.relationship('Request', backref='ride', lazy=True, cascade='all, delete-orphan')
    messages = db.relationship('ChatMessage', backref='ride', lazy=True, cascade='all, delete-orphan')

class Request(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ride_id = db.Column(db.Integer, db.ForeignKey('ride.id'), nullable=False)
    requestor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    num_passengers = db.Column(db.Integer, nullable=False)
    pickup_city = db.Column(db.String(100), nullable=True)
    drop_city = db.Column(db.String(100), nullable=True)
    pickup_address = db.Column(db.String(200), nullable=True)
    drop_address = db.Column(db.String(200), nullable=True)
    price_request = db.Column(db.Float, nullable=True)  # Optional price requested by requestor
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ChatMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ride_id = db.Column(db.Integer, db.ForeignKey('ride.id'), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    author = db.relationship('User', backref='messages')

# Initialize database
with app.app_context():
    db.create_all()

# Helper function to extract email domain
def extract_email_domain(email):
    if not email or '@' not in email:
        return ''
    return email.split('@')[1].lower()

# Helper function to send verification email
def send_verification_email(user):
    """Send verification email to user"""
    try:
        token = serializer.dumps(user.email, salt='email-verification')
        user.verification_token = token
        db.session.commit()
        
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
        verification_url = f"{frontend_url}/verify-email?token={token}"
        
        msg = Message(
            subject='Verify Your LinkLift Account',
            recipients=[user.email],
            html=f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Welcome to LinkLift!</h2>
                <p>Hi {user.name},</p>
                <p>Thank you for signing up for LinkLift - Smart Campus Ride Sharing.</p>
                <p>Please verify your email address by clicking the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{verification_url}" 
                       style="background-color: #2563eb; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                        Verify Email Address
                    </a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">{verification_url}</p>
                <p style="color: #999; font-size: 12px;">This link will expire in 24 hours.</p>
                <p style="color: #999; font-size: 12px;">If you didn't create this account, please ignore this email.</p>
            </div>
            """
        )
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Failed to send verification email: {e}")
        db.session.rollback()
        return False

# Authentication Routes
@app.route('/api/auth/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['name', 'year', 'email', 'college', 'password']
        missing_fields = [field for field in required_fields if field not in data or not str(data[field]).strip()]
        
        if missing_fields:
            return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400
        
        # Trim string fields
        data = {k: v.strip() if isinstance(v, str) else v for k, v in data.items()}
        
        # Check if user already exists
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already registered'}), 400
        
        # Create new user
        user = User(
            name=data['name'],
            year=data['year'],
            email=data['email'],
            phone=None,  # Phone is optional
            college=data['college'],
            password_hash=generate_password_hash(data['password']),
            email_verified=False
        )
        
        db.session.add(user)
        db.session.commit()
        
        # Send verification email
        email_sent = send_verification_email(user)
        
        if not email_sent:
            # If email fails, still create account but warn user
            return jsonify({
                'message': 'Account created, but verification email could not be sent. Please contact support.',
                'user': {
                    'id': user.id,
                    'name': user.name,
                    'email': user.email,
                    'college': user.college,
                    'email_verified': False
                }
            }), 201
        
        # Don't create access token yet - require email verification
        return jsonify({
            'message': 'Account created successfully. Please check your email to verify your account.',
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'college': user.college,
                'email_verified': False
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    # Find user by email
    user = User.query.filter_by(email=email).first()
    
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Check if email is verified
    if not user.email_verified:
        return jsonify({
            'error': 'Email not verified',
            'message': 'Please verify your email address before logging in. Check your inbox for the verification link.',
            'email_verified': False,
            'user_id': user.id
        }), 403
    
    # Create access token (identity must be a string)
    access_token = create_access_token(identity=str(user.id))
    
    return jsonify({
        'access_token': access_token,
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'college': user.college,
            'email_verified': user.email_verified
        },
        'email_verified': user.email_verified
    }), 200

@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        identity = get_jwt_identity()
        if not identity:
            return jsonify({'error': 'Invalid token'}), 401
        
        user_id = int(identity)
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'phone': user.phone,
            'year': user.year,
            'college': user.college,
            'email_verified': user.email_verified
        }), 200
    except (ValueError, TypeError) as e:
        return jsonify({'error': 'Invalid token format'}), 401
    except Exception as e:
        return jsonify({'error': f'Token validation failed: {str(e)}'}), 401

@app.route('/api/auth/verify-email', methods=['POST'])
def verify_email():
    """Verify user email with token"""
    try:
        data = request.get_json()
        token = data.get('token', '').strip()
        
        if not token:
            return jsonify({'error': 'Verification token is required'}), 400
        
        try:
            # Verify token (expires in 24 hours)
            email = serializer.loads(token, salt='email-verification', max_age=86400)
            user = User.query.filter_by(email=email).first()
            
            if not user:
                return jsonify({'error': 'Invalid verification token'}), 400
            
            if user.email_verified:
                # User already verified, create token and return
                access_token = create_access_token(identity=str(user.id))
                return jsonify({
                    'message': 'Email already verified',
                    'access_token': access_token,
                    'user': {
                        'id': user.id,
                        'name': user.name,
                        'email': user.email,
                        'college': user.college,
                        'email_verified': True
                    }
                }), 200
            
            # Verify the email
            user.email_verified = True
            user.verification_token = None
            db.session.commit()
            
            # Create access token after verification
            access_token = create_access_token(identity=str(user.id))
            
            return jsonify({
                'message': 'Email verified successfully',
                'access_token': access_token,
                'user': {
                    'id': user.id,
                    'name': user.name,
                    'email': user.email,
                    'college': user.college,
                    'email_verified': True
                }
            }), 200
        except Exception as e:
            return jsonify({'error': 'Invalid or expired verification token'}), 400
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/auth/resend-verification', methods=['POST'])
@jwt_required()
def resend_verification():
    """Resend verification email"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user.email_verified:
            return jsonify({'message': 'Email already verified'}), 200
        
        email_sent = send_verification_email(user)
        
        if email_sent:
            return jsonify({'message': 'Verification email sent successfully'}), 200
        else:
            return jsonify({'error': 'Failed to send verification email. Please try again later.'}), 500
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/auth/resend-verification-by-email', methods=['POST'])
def resend_verification_by_email():
    """Resend verification email by email address (no auth required)"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip()
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        user = User.query.filter_by(email=email).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user.email_verified:
            return jsonify({'message': 'Email already verified'}), 200
        
        email_sent = send_verification_email(user)
        
        if email_sent:
            return jsonify({'message': 'Verification email sent successfully'}), 200
        else:
            return jsonify({'error': 'Failed to send verification email. Please try again later.'}), 500
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

# Health check endpoint (useful for debugging CORS)
@app.route('/api/health', methods=['GET', 'OPTIONS'])
def health_check():
    """Health check endpoint to verify server and CORS are working"""
    if request.method == 'OPTIONS':
        return '', 200
    try:
        # Try a simple database query
        db.session.execute(db.text('SELECT 1'))
        return jsonify({
            'status': 'healthy',
            'database': 'connected',
            'cors': 'configured'
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'database': 'disconnected',
            'error': str(e)
        }), 500

# Cities endpoint
@app.route('/api/cities', methods=['GET'])
def get_cities_list():
    return jsonify({'cities': get_cities()}), 200

# Ride Routes
@app.route('/api/rides', methods=['POST'])
@jwt_required()
def create_ride():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    # Validate required fields (cities and addresses are all required)
    required_fields = ['pickupCity', 'dropCity', 'pickupAddress', 'dropAddress', 'date', 'time', 'availableSeats', 'costPerPerson', 'carModel', 'licensePlate']
    missing_fields = [field for field in required_fields if field not in data or not str(data[field]).strip()]
    
    if missing_fields:
        return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400
    
    # Validate cities are in the list
    cities = get_cities()
    if data['pickupCity'] not in cities:
        return jsonify({'error': 'Invalid pickup city'}), 400
    if data['dropCity'] not in cities:
        return jsonify({'error': 'Invalid drop city'}), 400
    
    # Addresses are required
    pickup_address = data['pickupAddress'].strip()
    drop_address = data['dropAddress'].strip()
    
    if not pickup_address:
        return jsonify({'error': 'Pickup address is required'}), 400
    if not drop_address:
        return jsonify({'error': 'Drop address is required'}), 400
    
    # Validate date is not in the past
    ride_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
    ride_time = datetime.strptime(data['time'], '%H:%M').time()
    ride_datetime = datetime.combine(ride_date, ride_time)
    
    if ride_datetime < datetime.now():
        return jsonify({'error': 'Cannot publish a ride in the past'}), 400
    
    # Handle on-route cities (optional)
    on_route_cities = data.get('onRouteCities', [])
    on_route_cities_json = None
    if on_route_cities and isinstance(on_route_cities, list):
        # Validate all cities are in the cities list
        cities_list = get_cities()
        valid_cities = [city for city in on_route_cities if city in cities_list]
        if valid_cities:
            on_route_cities_json = json.dumps(valid_cities)
    
    # Create ride
    ride = Ride(
        publisher_id=user_id,
        pickup_city=data['pickupCity'],
        drop_city=data['dropCity'],
        pickup_address=pickup_address,
        drop_address=drop_address,
        on_route_cities=on_route_cities_json,
        date=ride_date,
        time=ride_time,
        available_seats=int(data['availableSeats']),
        capacity=int(data['availableSeats']),
        cost_per_person=float(data['costPerPerson']),
        car_model=data['carModel'],
        license_plate=data['licensePlate'],
        women_only=data.get('womenOnly', False)
    )
    
    db.session.add(ride)
    db.session.commit()
    
    return jsonify({
        'message': 'Ride published successfully',
        'ride': {
            'id': ride.id,
            'pickupCity': ride.pickup_city,
            'dropCity': ride.drop_city,
            'pickupAddress': ride.pickup_address,
            'dropAddress': ride.drop_address,
            'onRouteCities': json.loads(ride.on_route_cities) if ride.on_route_cities else [],
            'date': ride.date.isoformat(),
            'time': ride.time.strftime('%H:%M'),
            'availableSeats': ride.available_seats,
            'costPerPerson': ride.cost_per_person
        }
    }), 201

@app.route('/api/rides/search', methods=['POST'])
@jwt_required()
def search_rides():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    pickup_city = data.get('pickupCity', '').strip()
    drop_city = data.get('dropCity', '').strip()
    date = data.get('date')
    passengers = int(data.get('passengers', 1))
    women_only = data.get('womenOnly', False)
    
    # Validate cities
    if not pickup_city or not drop_city:
        return jsonify({'error': 'Pickup city and drop city are required'}), 400
    
    # Base query - exclude user's own rides and past rides
    query = Ride.query.filter(
        Ride.publisher_id != user_id,
        Ride.date >= datetime.now().date() if not date else Ride.date == datetime.strptime(date, '%Y-%m-%d').date(),
        Ride.available_seats >= passengers
    )
    
    # Note: Both pickup and drop city matching (including on-route cities) will be done in Python
    # after querying, since on_route_cities is stored as JSON
    if date:
        query = query.filter(Ride.date == datetime.strptime(date, '%Y-%m-%d').date())
    if women_only:
        query = query.filter(Ride.women_only == True)
    
    # Filter out past rides and match cities
    current_datetime = datetime.now()
    rides = query.all()
    filtered_rides = []
    
    for ride in rides:
        ride_datetime = datetime.combine(ride.date, ride.time)
        if ride_datetime < current_datetime:
            continue
        
        # Parse on-route cities (maintains order)
        on_route_list = []
        if ride.on_route_cities:
            try:
                on_route_list = json.loads(ride.on_route_cities)
                if not isinstance(on_route_list, list):
                    on_route_list = []
            except:
                on_route_list = []
        
        # Build full route: [start_city, ...on_route_cities, destination_city]
        full_route = [ride.pickup_city] + on_route_list + [ride.drop_city]
        
        # Find indices of pickup and drop cities in the route
        pickup_index = -1
        drop_index = -1
        
        # Check if pickup city matches start city or any on-route city
        if pickup_city in full_route:
            pickup_index = full_route.index(pickup_city)
        
        # Check if drop city matches destination or any on-route city
        if drop_city in full_route:
            drop_index = full_route.index(drop_city)
        
        # Both cities must be in the route, and pickup must come before drop
        if pickup_index >= 0 and drop_index >= 0 and pickup_index < drop_index:
            filtered_rides.append(ride)
    
    # Simple matching - just return all matching rides (no smart scoring)
    results = []
    
    for ride in filtered_rides:
        publisher = User.query.get(ride.publisher_id)
        
        # Skip rides if publisher doesn't exist (data inconsistency)
        if not publisher:
            continue
        
        results.append({
            'id': ride.id,
            'publisher': {
                'id': publisher.id,
                'name': publisher.name,
                'email': publisher.email
            },
            'pickupCity': ride.pickup_city,
            'dropCity': ride.drop_city,
            'pickupAddress': ride.pickup_address,
            'dropAddress': ride.drop_address,
            'onRouteCities': json.loads(ride.on_route_cities) if ride.on_route_cities else [],
            'date': ride.date.isoformat(),
            'time': ride.time.strftime('%H:%M'),
            'availableSeats': ride.available_seats,
            'capacity': ride.capacity,
            'costPerPerson': ride.cost_per_person,
            'carModel': ride.car_model,
            'licensePlate': ride.license_plate,
            'womenOnly': ride.women_only
        })
    
    # Sort by date and time (earliest first)
    results.sort(key=lambda x: (x['date'], x['time']))
    
    return jsonify({'rides': results}), 200

@app.route('/api/rides/my-published', methods=['GET'])
@jwt_required()
def get_my_published_rides():
    user_id = int(get_jwt_identity())
    rides = Ride.query.filter_by(publisher_id=user_id).order_by(Ride.date.desc(), Ride.time.desc()).all()
    
    result = []
    for ride in rides:
        # Get pending requests count for this ride
        pending_count = Request.query.filter_by(ride_id=ride.id, status='pending').count()
        
        result.append({
            'id': ride.id,
            'pickupCity': ride.pickup_city,
            'dropCity': ride.drop_city,
            'pickupAddress': ride.pickup_address,
            'dropAddress': ride.drop_address,
            'onRouteCities': json.loads(ride.on_route_cities) if ride.on_route_cities else [],
            'date': ride.date.isoformat(),
            'time': ride.time.strftime('%H:%M'),
            'availableSeats': ride.available_seats,
            'capacity': ride.capacity,
            'costPerPerson': ride.cost_per_person,
            'carModel': ride.car_model,
            'licensePlate': ride.license_plate,
            'womenOnly': ride.women_only,
            'pendingRequestsCount': pending_count,
            'createdAt': ride.created_at.isoformat()
        })
    
    return jsonify({'rides': result}), 200

@app.route('/api/rides/<int:ride_id>', methods=['GET'])
@jwt_required()
def get_ride_details(ride_id):
    ride = Ride.query.get_or_404(ride_id)
    publisher = User.query.get(ride.publisher_id)
    
    if not publisher:
        return jsonify({'error': 'Publisher not found'}), 404
    
    # Get requests for this ride
    requests = Request.query.filter_by(ride_id=ride_id).all()
    pending_requests = [r for r in requests if r.status == 'pending']
    approved_requests = [r for r in requests if r.status == 'approved']
    
    # Build list of all passengers (publisher + approved requestors)
    all_passengers = [{
        'id': publisher.id,
        'name': publisher.name,
        'email': publisher.email,
        'isPublisher': True,
        'numPassengers': 1,
        'price': ride.cost_per_person  # Publisher pays original price
    }]
    
    for req in approved_requests:
        requestor = User.query.get(req.requestor_id)
        if requestor:
            # Use requested price if available, otherwise original price
            passenger_price = req.price_request if req.price_request is not None else ride.cost_per_person
            all_passengers.append({
                'id': requestor.id,
                'name': requestor.name,
                'email': requestor.email,
                'isPublisher': False,
                'requestId': req.id,
                'numPassengers': req.num_passengers,
                'price': passenger_price,
                'pickupCity': req.pickup_city,
                'dropCity': req.drop_city,
                'pickupAddress': req.pickup_address,
                'dropAddress': req.drop_address
            })
    
    return jsonify({
        'ride': {
            'id': ride.id,
            'publisher': {
                'id': publisher.id,
                'name': publisher.name,
                'email': publisher.email
            },
            'pickupCity': ride.pickup_city,
            'dropCity': ride.drop_city,
            'pickupAddress': ride.pickup_address,
            'dropAddress': ride.drop_address,
            'onRouteCities': json.loads(ride.on_route_cities) if ride.on_route_cities else [],
            'date': ride.date.isoformat(),
            'time': ride.time.strftime('%H:%M'),
            'availableSeats': ride.available_seats,
            'capacity': ride.capacity,
            'costPerPerson': ride.cost_per_person,
            'carModel': ride.car_model,
            'licensePlate': ride.license_plate,
            'womenOnly': ride.women_only
        },
        'pendingRequests': [{
            'id': r.id,
            'requestor': {
                'id': r.requestor.id,
                'name': r.requestor.name,
                'email': r.requestor.email
            },
            'numPassengers': r.num_passengers,
            'pickupCity': r.pickup_city,
            'dropCity': r.drop_city,
            'pickupAddress': r.pickup_address,
            'dropAddress': r.drop_address,
            'priceRequest': r.price_request,
            'originalPrice': ride.cost_per_person
        } for r in pending_requests],
        'allPassengers': all_passengers
    }), 200

@app.route('/api/rides/<int:ride_id>', methods=['DELETE'])
@jwt_required()
def cancel_ride(ride_id):
    user_id = int(get_jwt_identity())
    ride = Ride.query.get_or_404(ride_id)
    
    if ride.publisher_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    db.session.delete(ride)
    db.session.commit()
    
    return jsonify({'message': 'Ride cancelled successfully'}), 200

# Request Routes
@app.route('/api/requests', methods=['POST'])
@jwt_required()
def create_request():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    ride_id = data.get('rideId')
    num_passengers = int(data.get('numPassengers', 1))
    pickup_city = data.get('pickupCity', '').strip()
    drop_city = data.get('dropCity', '').strip()
    pickup_address = data.get('pickupAddress', '').strip()
    drop_address = data.get('dropAddress', '').strip()
    price_request = data.get('priceRequest')
    
    ride = Ride.query.get_or_404(ride_id)
    
    if ride.publisher_id == user_id:
        return jsonify({'error': 'Cannot request your own ride'}), 400
    
    if ride.available_seats < num_passengers:
        return jsonify({'error': 'Not enough seats available'}), 400
    
    # Validate price request if provided
    price_request_float = None
    if price_request is not None and price_request != '':
        try:
            price_request_float = float(price_request)
            if price_request_float < 0:
                return jsonify({'error': 'Price request must be positive'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid price request'}), 400
    
    # Check if request already exists
    existing = Request.query.filter_by(
        ride_id=ride_id,
        requestor_id=user_id,
        status='pending'
    ).first()
    
    if existing:
        return jsonify({'error': 'You already have a pending request for this ride'}), 400
    
    request_obj = Request(
        ride_id=ride_id,
        requestor_id=user_id,
        num_passengers=num_passengers,
        pickup_city=pickup_city if pickup_city else None,
        drop_city=drop_city if drop_city else None,
        pickup_address=pickup_address if pickup_address else None,
        drop_address=drop_address if drop_address else None,
        price_request=price_request_float
    )
    
    db.session.add(request_obj)
    db.session.commit()
    
    return jsonify({
        'message': 'Request sent successfully',
        'request': {
            'id': request_obj.id,
            'rideId': request_obj.ride_id,
            'numPassengers': request_obj.num_passengers,
            'status': request_obj.status
        }
    }), 201

@app.route('/api/requests/my-requests', methods=['GET'])
@jwt_required()
def get_my_requests():
    user_id = int(get_jwt_identity())
    requests = Request.query.filter_by(requestor_id=user_id).order_by(Request.created_at.desc()).all()
    
    result = []
    for req in requests:
        ride = Ride.query.get(req.ride_id)
        
        # Skip if ride doesn't exist (data inconsistency)
        if not ride:
            continue
            
        publisher = User.query.get(ride.publisher_id)
        
        # Skip if publisher doesn't exist
        if not publisher:
            continue
        
        result.append({
                'id': req.id,
                'ride': {
                    'id': ride.id,
                    'pickupCity': ride.pickup_city,
                    'dropCity': ride.drop_city,
                    'pickupAddress': ride.pickup_address,
                    'dropAddress': ride.drop_address,
                    'onRouteCities': json.loads(ride.on_route_cities) if ride.on_route_cities else [],
                    'date': ride.date.isoformat(),
                    'time': ride.time.strftime('%H:%M'),
                    'costPerPerson': ride.cost_per_person,
                    'womenOnly': ride.women_only
                },
                'publisher': {
                    'id': publisher.id,
                    'name': publisher.name
                } if publisher else None,
                'numPassengers': req.num_passengers,
                'pickupCity': req.pickup_city,
                'dropCity': req.drop_city,
                'pickupAddress': req.pickup_address,
                'dropAddress': req.drop_address,
                'priceRequest': req.price_request,
                'originalPrice': ride.cost_per_person,
                'status': req.status,
                'createdAt': req.created_at.isoformat()
            })
    
    return jsonify({'requests': result}), 200

@app.route('/api/requests/<int:request_id>/approve', methods=['PUT'])
@jwt_required()
def approve_request(request_id):
    user_id = int(get_jwt_identity())
    request_obj = Request.query.get_or_404(request_id)
    ride = Ride.query.get(request_obj.ride_id)
    
    if ride.publisher_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    if ride.available_seats < request_obj.num_passengers:
        return jsonify({'error': 'Not enough seats available'}), 400
    
    request_obj.status = 'approved'
    ride.available_seats -= request_obj.num_passengers
    
    db.session.commit()
    
    return jsonify({'message': 'Request approved successfully'}), 200

@app.route('/api/requests/<int:request_id>/reject', methods=['PUT'])
@jwt_required()
def reject_request(request_id):
    user_id = int(get_jwt_identity())
    request_obj = Request.query.get_or_404(request_id)
    ride = Ride.query.get(request_obj.ride_id)
    
    if ride.publisher_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    request_obj.status = 'rejected'
    db.session.commit()
    
    return jsonify({'message': 'Request rejected'}), 200

@app.route('/api/requests/<int:request_id>/remove', methods=['PUT'])
@jwt_required()
def remove_passenger(request_id):
    user_id = int(get_jwt_identity())
    request_obj = Request.query.get_or_404(request_id)
    ride = Ride.query.get(request_obj.ride_id)
    
    if ride.publisher_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Check if ride is within 30 minutes
    ride_datetime = datetime.combine(ride.date, ride.time)
    time_until_ride = (ride_datetime - datetime.now()).total_seconds() / 60  # minutes
    
    if time_until_ride < 30:
        return jsonify({'error': 'Cannot remove passenger within 30 minutes of ride'}), 400
    
    # Reject the request and free up seats
    request_obj.status = 'rejected'
    ride.available_seats += request_obj.num_passengers
    db.session.commit()
    
    return jsonify({'message': 'Passenger removed successfully'}), 200

@app.route('/api/requests/<int:request_id>', methods=['DELETE'])
@jwt_required()
def cancel_request(request_id):
    user_id = int(get_jwt_identity())
    request_obj = Request.query.get_or_404(request_id)
    
    if request_obj.requestor_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    # If request is approved, check 30-minute rule
    if request_obj.status == 'approved':
        ride = Ride.query.get(request_obj.ride_id)
        if ride:
            ride_datetime = datetime.combine(ride.date, ride.time)
            time_until_ride = (ride_datetime - datetime.now()).total_seconds() / 60  # minutes
            
            if time_until_ride < 30:
                return jsonify({'error': 'Cannot cancel within 30 minutes of ride'}), 400
            
            # Free up seats
            ride.available_seats += request_obj.num_passengers
    
    # Reject the request instead of deleting (to maintain history)
    request_obj.status = 'rejected'
    db.session.commit()
    
    return jsonify({'message': 'Request cancelled successfully'}), 200

# Chat Routes
@app.route('/api/rides/<int:ride_id>/messages', methods=['GET'])
@jwt_required()
def get_messages(ride_id):
    messages = ChatMessage.query.filter_by(ride_id=ride_id).order_by(ChatMessage.timestamp.asc()).all()
    
    result = []
    for msg in messages:
        result.append({
            'id': msg.id,
            'author': {
                'id': msg.author.id,
                'name': msg.author.name
            },
            'message': msg.message,
            'timestamp': msg.timestamp.isoformat()
        })
    
    return jsonify({'messages': result}), 200

@app.route('/api/rides/<int:ride_id>/messages', methods=['POST'])
@jwt_required()
def send_message(ride_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    message_text = data.get('message', '').strip()
    if not message_text:
        return jsonify({'error': 'Message cannot be empty'}), 400
    
    # Verify user is part of this ride (publisher or approved requestor)
    ride = Ride.query.get_or_404(ride_id)
    is_publisher = ride.publisher_id == user_id
    is_requestor = Request.query.filter_by(
        ride_id=ride_id,
        requestor_id=user_id,
        status='approved'
    ).first() is not None
    
    if not is_publisher and not is_requestor:
        return jsonify({'error': 'Unauthorized'}), 403
    
    message = ChatMessage(
        ride_id=ride_id,
        author_id=user_id,
        message=message_text
    )
    
    db.session.add(message)
    db.session.commit()
    
    return jsonify({
        'message': {
            'id': message.id,
            'author': {
                'id': message.author.id,
                'name': message.author.name
            },
            'message': message.message,
            'timestamp': message.timestamp.isoformat()
        }
    }), 201

# SOS Route (simulation)
@app.route('/api/rides/<int:ride_id>/sos', methods=['POST'])
@jwt_required()
def trigger_sos(ride_id):
    user_id = int(get_jwt_identity())
    ride = Ride.query.get_or_404(ride_id)
    
    # Verify user is part of this ride
    is_publisher = ride.publisher_id == user_id
    is_requestor = Request.query.filter_by(
        ride_id=ride_id,
        requestor_id=user_id,
        status='approved'
    ).first() is not None
    
    if not is_publisher and not is_requestor:
        return jsonify({'error': 'Unauthorized'}), 403
    
    # In a real application, this would send notifications to admin and emergency contacts
    return jsonify({
        'message': 'EMERGENCY ALERT TRIGGERED! Current location and ride details have been shared with Admin and Emergency Contacts. Stay Safe.',
        'rideId': ride_id
    }), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)

