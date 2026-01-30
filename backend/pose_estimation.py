import cv2
import numpy as np
import mediapipe as mp


class PoseEstimation:
    """
    Class for detecting human body pose using MediaPipe BlazePose.
    Extracts 33 body landmarks with x, y, z coordinates and visibility.
    """

    def __init__(self):
        """
        Initialize MediaPipe Pose with model_complexity=1.
        """
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            enable_segmentation=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles

    def extract_pose(self, frame):
        """
        Extract pose landmarks from a BGR frame.
        
        Args:
            frame (np.ndarray): BGR frame from OpenCV
            
        Returns:
            np.ndarray: 132-dimensional array of pose keypoints (33 landmarks × 4 values)
                        Returns None if no pose detected.
        """
        # Convert BGR to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process the frame
        results = self.pose.process(rgb_frame)
        
        # If pose detected, extract landmarks
        if results.pose_landmarks:
            landmarks = []
            for landmark in results.pose_landmarks.landmark:
                landmarks.extend([landmark.x, landmark.y, landmark.z, landmark.visibility])
            return np.array(landmarks, dtype=np.float32)
        else:
            return None

    def draw_pose(self, frame, landmarks=None):
        """
        Draw pose skeleton on frame for visualization.
        
        Args:
            frame (np.ndarray): BGR frame from OpenCV
            landmarks: Pose landmarks from MediaPipe or extracted keypoints (optional)
            
        Returns:
            np.ndarray: Frame with drawn pose skeleton
        """
        # If landmarks not provided, process the frame to get them
        if landmarks is None:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.pose.process(rgb_frame)
            if results.pose_landmarks:
                self.mp_drawing.draw_landmarks(
                    frame,
                    results.pose_landmarks,
                    self.mp_pose.POSE_CONNECTIONS,
                    landmark_drawing_spec=self.mp_drawing_styles.get_default_pose_landmarks_style()
                )
        else:
            # If we have extracted keypoints (132-dim array), process the frame to get actual landmarks for drawing
            # Note: We can't perfectly reconstruct MediaPipe landmarks from our extracted features
            # So we'll process the frame again to get fresh landmarks for visualization
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.pose.process(rgb_frame)
            if results.pose_landmarks:
                self.mp_drawing.draw_landmarks(
                    frame,
                    results.pose_landmarks,
                    self.mp_pose.POSE_CONNECTIONS,
                    landmark_drawing_spec=self.mp_drawing_styles.get_default_pose_landmarks_style()
                )
        
        return frame

    def release(self):
        """
        Clean up resources.
        """
        self.pose.close()