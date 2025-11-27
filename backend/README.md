# LinkLift Backend

Flask REST API backend for the LinkLift ride-sharing application.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create `.env` file:
```bash
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
DATABASE_URL=sqlite:///linklift.db
```

3. Run the server:
```bash
python app.py
```

The API will be available at `http://localhost:5000`

## Database

The database is automatically created on first run. To reset:
- Delete `linklift.db` file
- Restart the server

## API Documentation

See main README.md for API endpoint documentation.

