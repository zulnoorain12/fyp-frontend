import psycopg2
import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import json

class DatabaseManager:
    """Handles PostgreSQL database operations for detections and alerts."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.connection = None
        self.cursor = None
        self.db_connected = False
        
    def connect(self) -> bool:
        """
        Establish connection to PostgreSQL database.
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # Database connection parameters
            db_host = os.getenv("DB_HOST", "localhost")
            db_port = os.getenv("DB_PORT", "5432")
            db_name = os.getenv("DB_NAME", "cyberisai")
            db_user = os.getenv("DB_USER", "postgres")
            db_password = os.getenv("DB_PASSWORD", "your_postgres_password")
            
            # Establish connection
            self.connection = psycopg2.connect(
                host=db_host,
                port=db_port,
                database=db_name,
                user=db_user,
                password=db_password
            )
            
            self.cursor = self.connection.cursor()
            self.db_connected = True
            self.logger.info("Connected to PostgreSQL database successfully")
            
            # Create tables if they don't exist
            self._create_tables()
            
            # Insert default camera if not exists
            self._insert_default_camera()
            
            return True
        except Exception as e:
            self.db_connected = False
            self.logger.error(f"Error connecting to database: {e}")
            return False
    
    def disconnect(self):
        """Close database connection."""
        try:
            if self.cursor:
                self.cursor.close()
            if self.connection:
                self.connection.close()
            self.db_connected = False
            self.logger.info("Disconnected from PostgreSQL database")
        except Exception as e:
            self.logger.error(f"Error disconnecting from database: {e}")
    
    def _create_tables(self):
        """Create required tables if they don't exist."""
        if not self.db_connected or not self.cursor or not self.connection:
            self.logger.warning("Database not connected. Skipping table creation.")
            return
            
        try:
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
                image_url VARCHAR(500),
                is_read BOOLEAN DEFAULT FALSE
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
            
            # Create users table
            create_users_table = """
            CREATE TABLE IF NOT EXISTS users (
                user_id SERIAL PRIMARY KEY,
                full_name VARCHAR(100) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'user',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """

            # Execute table creation queries
            self.cursor.execute(create_cameras_table)
            self.cursor.execute(create_detections_table)
            self.cursor.execute(create_alerts_table)
            self.cursor.execute(create_users_table)
            
            # Add is_read column if it doesn't exist (for existing databases)
            self.cursor.execute("""
                ALTER TABLE detections ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
            """)
            
            # Commit changes
            self.connection.commit()
            self.logger.info("Database tables created/verified successfully")
            
        except Exception as e:
            self.logger.error(f"Error creating tables: {e}")
            if self.connection:
                self.connection.rollback()
    
    def _insert_default_camera(self):
        """Insert default camera if it doesn't exist."""
        if not self.db_connected or not self.cursor or not self.connection:
            self.logger.warning("Database not connected. Skipping default camera insertion.")
            return
            
        try:
            # Check if default camera exists
            self.cursor.execute("SELECT COUNT(*) FROM cameras WHERE camera_id = 1")
            result = self.cursor.fetchone()
            if result:
                count = result[0]
                
                if count == 0:
                    # Insert default camera
                    insert_camera = """
                    INSERT INTO cameras (camera_id, location, ip_address, status)
                    VALUES (1, 'Default Webcam', NULL, TRUE);
                    """
                    self.cursor.execute(insert_camera)
                    self.connection.commit()
                    self.logger.info("Default camera inserted successfully")
                
        except Exception as e:
            self.logger.error(f"Error inserting default camera: {e}")
            if self.connection:
                self.connection.rollback()
    
    def save_detection(self, detection_type: str, confidence: float, 
                      timestamp: Optional[datetime] = None, image_url: Optional[str] = None) -> Optional[int]:
        """
        Save detection record to database.
        
        Args:
            detection_type: Type of detection (e.g., "weapon", "fire", "smoke")
            confidence: Confidence score of detection
            timestamp: Timestamp of detection (defaults to current time)
            image_url: Path to detection snapshot
            
        Returns:
            Detection ID if successful, None otherwise
        """
        # If database is not connected, just return None without error
        if not self.db_connected or not self.cursor or not self.connection:
            self.logger.warning("Database not connected. Skipping detection save.")
            return None
            
        try:
            if not timestamp:
                timestamp = datetime.now()
            
            # Insert detection record
            insert_detection = """
            INSERT INTO detections (camera_id, type, confidence, timestamp, image_url)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING detection_id;
            """
            
            self.cursor.execute(insert_detection, (1, detection_type, confidence, timestamp, image_url))
            result = self.cursor.fetchone()
            if result:
                detection_id = result[0]
            else:
                return None
            self.connection.commit()
            
            self.logger.info(f"Detection saved with ID: {detection_id}")
            return detection_id
            
        except Exception as e:
            self.logger.error(f"Error saving detection: {e}")
            if self.connection:
                self.connection.rollback()
            return None
    
    def save_alert(self, detection_id: int, severity: str, status: str = "pending") -> bool:
        """
        Save alert record to database.
        
        Args:
            detection_id: ID of the detection that triggered the alert
            severity: Severity level ("low", "medium", "high")
            status: Alert status ("pending", "resolved")
            
        Returns:
            True if successful, False otherwise
        """
        # If database is not connected, just return False without error
        if not self.db_connected or not self.cursor or not self.connection:
            self.logger.warning("Database not connected. Skipping alert save.")
            return False
            
        try:
            # Insert alert record
            insert_alert = """
            INSERT INTO alerts (detection_id, severity, status)
            VALUES (%s, %s, %s);
            """
            
            self.cursor.execute(insert_alert, (detection_id, severity, status))
            self.connection.commit()
            
            self.logger.info(f"Alert saved for detection ID: {detection_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error saving alert: {e}")
            if self.connection:
                self.connection.rollback()
            return False
    
    def get_recent_detections(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get recent detection records.
        
        Args:
            limit: Maximum number of records to return
            
        Returns:
            List of detection records
        """
        # If database is not connected, return empty list
        if not self.db_connected or not self.cursor:
            self.logger.warning("Database not connected. Returning empty detections list.")
            return []
            
        try:
            query = """
            SELECT d.detection_id, d.type, d.confidence, d.timestamp, d.image_url,
                   c.location, c.camera_id, d.is_read
            FROM detections d
            JOIN cameras c ON d.camera_id = c.camera_id
            ORDER BY d.timestamp DESC
            LIMIT %s;
            """
            
            self.cursor.execute(query, (limit,))
            rows = self.cursor.fetchall()
            
            detections = []
            for row in rows:
                detections.append({
                    "detection_id": row[0],
                    "type": row[1],
                    "confidence": row[2],
                    "timestamp": row[3].isoformat() if row[3] else None,
                    "image_url": row[4],
                    "camera_location": row[5],
                    "camera_id": row[6],
                    "is_read": row[7] if row[7] is not None else False
                })
            
            return detections
            
        except Exception as e:
            self.logger.error(f"Error retrieving detections: {e}")
            return []
    
    def get_detection_by_id(self, detection_id: int) -> Optional[Dict[str, Any]]:
        """
        Get detection by ID.
        
        Args:
            detection_id: ID of detection to retrieve
            
        Returns:
            Detection record or None if not found
        """
        # If database is not connected, return None
        if not self.db_connected or not self.cursor:
            self.logger.warning("Database not connected. Returning None for detection lookup.")
            return None
            
        try:
            query = """
            SELECT d.detection_id, d.type, d.confidence, d.timestamp, d.image_url,
                   c.location, c.camera_id, d.is_read
            FROM detections d
            JOIN cameras c ON d.camera_id = c.camera_id
            WHERE d.detection_id = %s;
            """
            
            self.cursor.execute(query, (detection_id,))
            row = self.cursor.fetchone()
            
            if row:
                return {
                    "detection_id": row[0],
                    "type": row[1],
                    "confidence": row[2],
                    "timestamp": row[3].isoformat() if row[3] else None,
                    "image_url": row[4],
                    "camera_location": row[5],
                    "camera_id": row[6],
                    "is_read": row[7] if row[7] is not None else False
                }
            
            return None
            
        except Exception as e:
            self.logger.error(f"Error retrieving detection: {e}")
            return None
    
    def get_alerts_for_detection(self, detection_id: int) -> List[Dict[str, Any]]:
        """
        Get all alerts for a detection.
        
        Args:
            detection_id: ID of detection
            
        Returns:
            List of alert records
        """
        # If database is not connected, return empty list
        if not self.db_connected or not self.cursor:
            self.logger.warning("Database not connected. Returning empty alerts list.")
            return []
            
        try:
            query = """
            SELECT alert_id, severity, status, created_at
            FROM alerts
            WHERE detection_id = %s
            ORDER BY created_at DESC;
            """
            
            self.cursor.execute(query, (detection_id,))
            rows = self.cursor.fetchall()
            
            alerts = []
            for row in rows:
                alerts.append({
                    "alert_id": row[0],
                    "severity": row[1],
                    "status": row[2],
                    "created_at": row[3].isoformat() if row[3] else None
                })
            
            return alerts
            
        except Exception as e:
            self.logger.error(f"Error retrieving alerts: {e}")
            return []

    def mark_detection_read(self, detection_id: int) -> bool:
        """
        Mark a single detection as read.
        
        Args:
            detection_id: ID of the detection to mark as read
            
        Returns:
            True if successful, False otherwise
        """
        if not self.db_connected or not self.cursor or not self.connection:
            self.logger.warning("Database not connected. Cannot mark detection as read.")
            return False
            
        try:
            self.cursor.execute(
                "UPDATE detections SET is_read = TRUE WHERE detection_id = %s",
                (detection_id,)
            )
            self.connection.commit()
            self.logger.info(f"Detection {detection_id} marked as read")
            return True
        except Exception as e:
            self.logger.error(f"Error marking detection as read: {e}")
            if self.connection:
                self.connection.rollback()
            return False

    def mark_all_detections_read(self) -> bool:
        """
        Mark all unread detections as read.
        
        Returns:
            True if successful, False otherwise
        """
        if not self.db_connected or not self.cursor or not self.connection:
            self.logger.warning("Database not connected. Cannot mark detections as read.")
            return False
            
        try:
            self.cursor.execute("UPDATE detections SET is_read = TRUE WHERE is_read = FALSE")
            affected = self.cursor.rowcount
            self.connection.commit()
            self.logger.info(f"Marked {affected} detections as read")
            return True
        except Exception as e:
            self.logger.error(f"Error marking all detections as read: {e}")
            if self.connection:
                self.connection.rollback()
            return False

    # ── User management methods ──────────────────────────────────

    def create_user(self, full_name: str, email: str, password_hash: str, role: str = "user") -> Optional[Dict[str, Any]]:
        """
        Create a new user in the database.

        Args:
            full_name: User's full name
            email: User's email (must be unique)
            password_hash: Bcrypt hashed password
            role: User role (default 'user')

        Returns:
            User dict if successful, None otherwise
        """
        if not self.db_connected or not self.cursor or not self.connection:
            self.logger.warning("Database not connected. Cannot create user.")
            return None

        try:
            insert_user = """
            INSERT INTO users (full_name, email, password_hash, role)
            VALUES (%s, %s, %s, %s)
            RETURNING user_id, full_name, email, role, is_active, created_at;
            """
            self.cursor.execute(insert_user, (full_name, email, password_hash, role))
            row = self.cursor.fetchone()
            self.connection.commit()

            if row:
                user = {
                    "user_id": row[0],
                    "full_name": row[1],
                    "email": row[2],
                    "role": row[3],
                    "is_active": row[4],
                    "created_at": row[5].isoformat() if row[5] else None,
                }
                self.logger.info(f"User created: {email} (ID: {user['user_id']})")
                return user
            return None

        except psycopg2.errors.UniqueViolation:
            self.logger.warning(f"User with email {email} already exists")
            if self.connection:
                self.connection.rollback()
            return None
        except Exception as e:
            self.logger.error(f"Error creating user: {e}")
            if self.connection:
                self.connection.rollback()
            return None

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Get a user by their email address.

        Args:
            email: User's email address

        Returns:
            User dict (including password_hash) or None
        """
        if not self.db_connected or not self.cursor:
            self.logger.warning("Database not connected. Cannot look up user.")
            return None

        try:
            query = """
            SELECT user_id, full_name, email, password_hash, role, is_active, created_at
            FROM users
            WHERE email = %s;
            """
            self.cursor.execute(query, (email,))
            row = self.cursor.fetchone()

            if row:
                return {
                    "user_id": row[0],
                    "full_name": row[1],
                    "email": row[2],
                    "password_hash": row[3],
                    "role": row[4],
                    "is_active": row[5],
                    "created_at": row[6].isoformat() if row[6] else None,
                }
            return None

        except Exception as e:
            self.logger.error(f"Error looking up user by email: {e}")
            return None

    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Get a user by their ID.

        Args:
            user_id: User's ID

        Returns:
            User dict (without password_hash) or None
        """
        if not self.db_connected or not self.cursor:
            self.logger.warning("Database not connected. Cannot look up user.")
            return None

        try:
            query = """
            SELECT user_id, full_name, email, role, is_active, created_at
            FROM users
            WHERE user_id = %s;
            """
            self.cursor.execute(query, (user_id,))
            row = self.cursor.fetchone()

            if row:
                return {
                    "user_id": row[0],
                    "full_name": row[1],
                    "email": row[2],
                    "role": row[3],
                    "is_active": row[4],
                    "created_at": row[5].isoformat() if row[5] else None,
                }
            return None

        except Exception as e:
            self.logger.error(f"Error looking up user by ID: {e}")
            return None

    def update_user_password(self, email: str, new_password_hash: str) -> bool:
        """
        Update a user's password hash.

        Args:
            email: User's email address
            new_password_hash: The new bcrypt-hashed password

        Returns:
            True if successful, False otherwise
        """
        if not self.db_connected or not self.cursor or not self.connection:
            self.logger.warning("Database not connected. Cannot update password.")
            return False

        try:
            query = """
            UPDATE users
            SET password_hash = %s, updated_at = CURRENT_TIMESTAMP
            WHERE email = %s AND is_active = TRUE;
            """
            self.cursor.execute(query, (new_password_hash, email))
            affected = self.cursor.rowcount
            self.connection.commit()

            if affected > 0:
                self.logger.info(f"Password updated for user: {email}")
                return True
            else:
                self.logger.warning(f"No active user found with email: {email}")
                return False

        except Exception as e:
            self.logger.error(f"Error updating user password: {e}")
            if self.connection:
                self.connection.rollback()
            return False
