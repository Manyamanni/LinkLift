# LinkLift Backend

Flask REST API backend for the LinkLift ride-sharing application.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create `.env` file (copy from `.env.example`):
```bash
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

   **For Neon PostgreSQL:**
   - Sign up at https://neon.tech
   - Create a new project and copy the connection string
   - Format: `postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`
   
   **For Local Development:**
   - Leave `DATABASE_URL` empty to use SQLite (default)

3. Run the server:
```bash
python app.py
```

The API will be available at `http://localhost:5000`

## Database

**PostgreSQL (Production - Neon):**
- The database is automatically created on first run
- Tables are created via SQLAlchemy migrations
- To reset: Run `python reset_database.py` (WARNING: Deletes all data!)

**SQLite (Local Development):**
- Automatically creates `linklift.db` file if `DATABASE_URL` is not set
- To reset: Delete `linklift.db` file and restart the server

## API Documentation

See main README.md for API endpoint documentation.

