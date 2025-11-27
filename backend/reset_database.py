"""
Quick script to reset the database.
Run this if you get schema errors after updating the code.
WARNING: This deletes all data!
"""
import os
import sys

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

from app import app, db

if __name__ == '__main__':
    with app.app_context():
        print("Dropping all tables...")
        db.drop_all()
        print("Creating new tables...")
        db.create_all()
        print("Database reset complete!")
        print("You can now restart the Flask server.")

