"""
Script to initialize the PostgreSQL database for the CyberisAl project.
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def init_database():
    """Initialize the PostgreSQL database with required tables."""
    
    # Database connection parameters
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")
    db_name = os.getenv("DB_NAME", "cyberisai")
    db_user = os.getenv("DB_USER", "postgres")
    db_password = os.getenv("DB_PASSWORD", "postgres")
    
    connection = None
    cursor = None
    
    try:
        # Connect to PostgreSQL
        connection = psycopg2.connect(
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=db_password
        )
        
        cursor = connection.cursor()
        
        # Create cameras table
        create_cameras_table = """
        CREATE TABLE IF NOT EXISTS cameras (
            camera_id SERIAL PRIMARY KEY,
            location VARCHAR(255),
            ip_address VARCHAR(45),
            status BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        
        # Create detections table
        create_detections_table = """
        CREATE TABLE IF NOT EXISTS detections (
            detection_id SERIAL PRIMARY KEY,
            camera_id INTEGER REFERENCES cameras(camera_id),
            type VARCHAR(50),
            confidence FLOAT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            image_url VARCHAR(500)
        );
        """
        
        # Create alerts table
        create_alerts_table = """
        CREATE TABLE IF NOT EXISTS alerts (
            alert_id SERIAL PRIMARY KEY,
            detection_id INTEGER REFERENCES detections(detection_id),
            severity VARCHAR(20),
            status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        
        # Execute table creation queries
        cursor.execute(create_cameras_table)
        cursor.execute(create_detections_table)
        cursor.execute(create_alerts_table)
        
        # Insert default camera if not exists
        cursor.execute("SELECT COUNT(*) FROM cameras WHERE camera_id = 1")
        result = cursor.fetchone()
        if result:
            count = result[0]
            
            if count == 0:
                insert_camera = """
                INSERT INTO cameras (camera_id, location, ip_address, status)
                VALUES (1, 'Default Webcam', NULL, TRUE);
                """
                cursor.execute(insert_camera)
        
        # Commit changes
        connection.commit()
        
        print("Database initialized successfully!")
        print("- Created tables: cameras, detections, alerts")
        print("- Added default camera record")
        
    except Exception as e:
        print(f"Error initializing database: {e}")
        if connection:
            connection.rollback()
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

if __name__ == "__main__":
    init_database()