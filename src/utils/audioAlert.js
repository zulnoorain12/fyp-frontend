/**
 * Audio Alert System
 * Plays different sounds based on alert severity
 */

class AudioAlert {
  constructor() {
    this.audioContext = null;
    this.isInitialized = false;
    this.isEnabled = true;
  }

  // Initialize audio context (required for modern browsers)
  async init() {
    if (this.isInitialized) return;
    
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.isInitialized = true;
      
      // Resume audio context on first user interaction (required by browsers)
      const resumeContext = () => {
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
        document.removeEventListener('click', resumeContext);
        document.removeEventListener('touchstart', resumeContext);
      };
      
      document.addEventListener('click', resumeContext);
      document.addEventListener('touchstart', resumeContext);
    } catch (err) {
      console.warn('Audio context not supported:', err);
    }
  }

  // Play alert sound based on severity
  async playAlert(severity = 'info') {
    if (!this.isEnabled || !this.isInitialized) return;
    
    try {
      // Create oscillator for sound generation
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Configure sound based on severity
      switch (severity.toLowerCase()) {
        case 'critical':
          // High frequency, urgent sound
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
          oscillator.stop(this.audioContext.currentTime + 0.5);
          break;
          
        case 'warning':
          // Medium frequency, attention sound
          oscillator.type = 'triangle';
          oscillator.frequency.setValueAtTime(500, this.audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
          oscillator.stop(this.audioContext.currentTime + 0.3);
          break;
          
        case 'info':
        default:
          // Low frequency, notification sound
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
          oscillator.stop(this.audioContext.currentTime + 0.2);
          break;
      }
      
      // Start the sound
      oscillator.start();
    } catch (err) {
      console.error('Error playing audio alert:', err);
    }
  }

  // Play system alert (for successful detection)
  async playSystemAlert() {
    if (!this.isEnabled || !this.isInitialized) return;
    
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Pleasant notification sound
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
      
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 0.1);
    } catch (err) {
      console.error('Error playing system alert:', err);
    }
  }

  // Enable/disable audio alerts
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  // Check if audio is enabled
  isEnabled() {
    return this.isEnabled;
  }
}

// Create singleton instance
const audioAlert = new AudioAlert();

export default audioAlert;