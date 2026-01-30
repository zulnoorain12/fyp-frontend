import numpy as np
from collections import deque
import pickle


class FeatureExtraction:
    """
    Class for managing sequences of pose frames for LSTM input.
    Buffers 30 frames of 132-dimensional pose keypoints.
    """

    def __init__(self, sequence_length=30):
        """
        Initialize frame buffer.
        
        Args:
            sequence_length (int): Number of frames to buffer (default: 30)
        """
        self.sequence_length = sequence_length
        self.frame_buffer = deque(maxlen=sequence_length)

    def add_frame(self, keypoints):
        """
        Add pose keypoints to buffer.
        
        Args:
            keypoints (np.ndarray): 132-dimensional array of pose keypoints
            
        Raises:
            ValueError: If keypoints dimension is not 132
        """
        if keypoints is not None:
            # Convert to numpy array if not already
            keypoints = np.asarray(keypoints)
            if len(keypoints) != 132:
                raise ValueError(f"Expected 132 keypoints, got {len(keypoints)}")
            self.frame_buffer.append(keypoints.astype(np.float32))
        # If keypoints is None, we don't add anything to buffer

    def get_sequence(self):
        """
        Return current sequence as numpy array.
        
        Returns:
            np.ndarray: Shape (30, 132) array of pose sequences
                        Returns None if buffer is empty
        """
        if len(self.frame_buffer) == 0:
            return None
            
        sequence = np.array(self.frame_buffer)
        return sequence

    def is_ready(self):
        """
        Check if buffer has enough frames for prediction.
        
        Returns:
            bool: True if buffer has sequence_length frames, False otherwise
        """
        return len(self.frame_buffer) >= self.sequence_length

    def normalize_sequence(self, sequence, scaler_path):
        """
        Normalize sequence using the loaded scaler.
        
        Args:
            sequence (np.ndarray): Sequence to normalize (shape: N, 132)
            scaler_path (str): Path to the scaler.pkl file
            
        Returns:
            np.ndarray: Normalized sequence
        """
        if sequence is None:
            return None
            
        # Load the scaler
        with open(scaler_path, 'rb') as f:
            scaler = pickle.load(f)
        
        # Ensure correct shape for normalization
        if len(sequence.shape) == 1:
            # Single frame case: shape (132,) -> (1, 132)
            sequence = sequence.reshape(1, -1)
        elif len(sequence.shape) == 2 and sequence.shape[1] == 132:
            # Multiple frames case: shape (N, 132) - already correct
            pass
        else:
            raise ValueError(f"Unexpected sequence shape: {sequence.shape}. Expected (N, 132) or (132,)")
            
        # Apply normalization
        normalized = scaler.transform(sequence)
        return normalized

    def reset(self):
        """
        Clear buffer.
        """
        self.frame_buffer.clear()