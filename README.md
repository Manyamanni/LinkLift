# LinkLift - Smart Campus Ride Sharing

A full-stack student ride-sharing web application with React frontend and Flask backend, featuring smart matching algorithms, real-time chat, and emergency SOS functionality.

## 🚀 Technology Stack

### Frontend
- **React 18** - Modern UI library
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls

### Backend
- **Flask** - Python web framework
- **Flask-SQLAlchemy** - ORM for database operations
- **Flask-JWT-Extended** - JWT authentication
- **Flask-CORS** - Cross-origin resource sharing
- **SQLite** - Database (can be upgraded to PostgreSQL)

## 📁 Project Structure

```
Project/
├── backend/
│   ├── app.py                 # Flask application and API routes
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example           # Environment variables template
│   └── .gitignore
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable React components
│   │   ├── contexts/          # React context providers
│   │   ├── pages/             # Page components
│   │   ├── services/          # API service layer
│   │   ├── styles/            # CSS files
│   │   ├── App.jsx            # Main app component
│   │   └── main.jsx           # Entry point
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
└── README.md
```

## 🛠️ Setup Instructions

### Prerequisites
- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **pip** (Python package manager)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv

# On Windows
venv\Scripts\activate

# On macOS/Linux
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file (copy from `.env.example`):
```bash
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
DATABASE_URL=sqlite:///linklift.db
```

5. Run the Flask server:
```bash
python app.py
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## 🎯 Features

### Authentication
- User registration with institutional email
- Secure login with JWT tokens
- Session management

### Ride Management
- **Publish Rides**: Create new rides with pickup/drop locations, date, time, and vehicle details
- **Search Rides**: Advanced search with filters (location, date, passengers, women-only)
- **Smart Matching**: AI-powered matching algorithm based on:
  - Time proximity (70% weight)
  - Seat availability (20% weight)
  - College domain matching (30 point bonus)
- **Request Management**: Approve/reject seat requests
- **Ride Cancellation**: Cancel published rides or requests

### Additional Features
- **Cost Splitting**: Automated fare calculation and splitting
- **In-App Chat**: Real-time messaging between ride publisher and passengers
- **SOS Button**: Emergency alert system for active rides
- **Responsive Design**: Mobile-first, works on all devices

## 📡 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Rides
- `POST /api/rides` - Create new ride
- `POST /api/rides/search` - Search rides
- `GET /api/rides/my-published` - Get user's published rides
- `GET /api/rides/:id` - Get ride details
- `DELETE /api/rides/:id` - Cancel ride

### Requests
- `POST /api/requests` - Create seat request
- `GET /api/requests/my-requests` - Get user's requests
- `PUT /api/requests/:id/approve` - Approve request
- `PUT /api/requests/:id/reject` - Reject request
- `DELETE /api/requests/:id` - Cancel request

### Chat
- `GET /api/rides/:id/messages` - Get chat messages
- `POST /api/rides/:id/messages` - Send message

### Emergency
- `POST /api/rides/:id/sos` - Trigger SOS alert

## 🔐 Security Features

- Password hashing with Werkzeug
- JWT token-based authentication
- CORS protection
- Input validation
- SQL injection prevention (via SQLAlchemy)

## 🎨 Design

- Modern, minimalistic UI
- Vibrant teal/cyan color scheme
- Responsive mobile-first design
- Smooth animations and transitions
- Accessible and user-friendly

## 🚀 Deployment

### Backend
- Can be deployed to Heroku, Railway, or any Python hosting service
- Update `DATABASE_URL` for production database (PostgreSQL recommended)
- Set secure `SECRET_KEY` and `JWT_SECRET_KEY`

### Frontend
- Build for production: `npm run build`
- Deploy `dist` folder to Vercel, Netlify, or any static hosting
- Update API base URL in `vite.config.js` for production

## 📝 Database Schema

- **User**: id, name, year, email, phone, college, password_hash
- **Ride**: id, publisher_id, pickup, drop, date, time, seats, cost, vehicle details
- **Request**: id, ride_id, requestor_id, num_passengers, status
- **ChatMessage**: id, ride_id, author_id, message, timestamp

## 🤝 Contributing

This is a prototype project. Feel free to extend it with:
- Real-time notifications
- GPS location integration
- Payment gateway
- Rating and review system
- Push notifications for emergency alerts

## 📄 License

This is a prototype project for educational purposes.

---

**Built with ❤️ for smart campus transportation**
