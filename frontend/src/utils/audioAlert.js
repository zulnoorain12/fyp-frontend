/**
 * Audio Alert System
 * Plays professional, polished sounds based on alert severity
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

  // Helper: play a single tone with smooth envelope
  _playTone(frequency, type, volume, startTime, duration) {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);

    // Smooth fade in and fade out to avoid clicks
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.setValueAtTime(volume, startTime + duration - 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // Play alert sound based on severity
  async playAlert(severity = 'info') {
    if (!this.isEnabled || !this.isInitialized) return;

    try {
      // Resume audio context if suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const now = this.audioContext.currentTime;

      switch (severity.toLowerCase()) {
        case 'critical':
          // 🚨 Urgent 3-tone descending alarm — like a security siren
          this._playTone(880, 'sine', 0.25, now, 0.15);
          this._playTone(660, 'sine', 0.25, now + 0.18, 0.15);
          this._playTone(440, 'sine', 0.25, now + 0.36, 0.2);
          // Repeat pattern for urgency
          this._playTone(880, 'sine', 0.2, now + 0.6, 0.15);
          this._playTone(660, 'sine', 0.2, now + 0.78, 0.15);
          this._playTone(440, 'sine', 0.2, now + 0.96, 0.25);
          break;

        case 'warning':
          // ⚠️ Two-tone attention chime — clean and clear
          this._playTone(523.25, 'sine', 0.2, now, 0.2);        // C5
          this._playTone(659.25, 'sine', 0.2, now + 0.22, 0.2); // E5
          this._playTone(523.25, 'sine', 0.15, now + 0.46, 0.2); // C5 again
          this._playTone(659.25, 'sine', 0.15, now + 0.68, 0.25); // E5 again
          break;

        case 'info':
        default:
          // ℹ️ Gentle ascending notification — soft and pleasant
          this._playTone(392, 'sine', 0.12, now, 0.15);        // G4
          this._playTone(523.25, 'sine', 0.12, now + 0.17, 0.2); // C5
          break;
      }
    } catch (err) {
      console.error('Error playing audio alert:', err);
    }
  }

  // Play system alert (for successful actions like camera start)
  async playSystemAlert() {
    if (!this.isEnabled || !this.isInitialized) return;

    try {
      // Resume audio context if suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const now = this.audioContext.currentTime;

      // Pleasant ascending two-note chime
      this._playTone(440, 'sine', 0.1, now, 0.12);       // A4
      this._playTone(554.37, 'sine', 0.1, now + 0.13, 0.15); // C#5
    } catch (err) {
      console.error('Error playing system alert:', err);
    }
  }

  // Enable/disable audio alerts
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  // Check if audio is enabled
  getEnabled() {
    return this.isEnabled;
  }
}

// Create singleton instance
const audioAlert = new AudioAlert();

export default audioAlert;