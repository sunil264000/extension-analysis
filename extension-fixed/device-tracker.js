/**
 * Device Tracker - Collects HWID, IP, timezone, and time for license validation
 * Ensures extension duration is properly synced with license expiry
 */

const DeviceTracker = (function() {
  'use strict';

  /**
   * Get user's timezone (e.g., "America/New_York")
   */
  function getTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch (e) {
      return 'UTC';
    }
  }

  /**
   * Get current UTC timestamp
   */
  function getCurrentTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Generate hardware fingerprint (HWID) based on:
   * - Browser user agent
   * - Platform
   * - Language
   * - Screen dimensions
   * - Timezone
   * - WebGL info
   */
  function generateHWID() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Device Fingerprint ' + new Date().getTime(), 2, 15);
      const canvasData = canvas.toDataURL();

      const fingerprint = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution: `${screen.width}x${screen.height}`,
        screenDepth: screen.colorDepth,
        timezone: getTimezone(),
        timezoneOffset: new Date().getTimezoneOffset(),
        canvasHash: hashString(canvasData),
        timestamp: Date.now(),
      };

      return hashString(JSON.stringify(fingerprint));
    } catch (e) {
      // Fallback if canvas fails
      return hashString(
        navigator.userAgent +
          navigator.platform +
          screen.width +
          screen.height +
          Date.now()
      );
    }
  }

  /**
   * Simple hash function for generating fingerprint
   */
  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get device info for API call
   */
  function getDeviceInfo() {
    return {
      hardwareFingerprint: generateHWID(),
      timezone: getTimezone(),
      userAgent: navigator.userAgent,
      timestamp: getCurrentTimestamp(),
    };
  }

  /**
   * Calculate remaining time based on expiry date
   * Returns { minutes, hours, days, label, percentage }
   */
  function calculateTimeRemaining(expiresAt) {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const msRemaining = Math.max(0, expiry.getTime() - now.getTime());
    
    const minutesRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60)));
    const hoursRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60)));
    const daysRemaining = Math.max(0, Math.floor(msRemaining / (1000 * 60 * 60 * 24)));
    
    // Calculate percentage (0-100)
    // Assuming most licenses are 1-365 days, use that as reference
    const avgLicenseDays = 30;
    const totalMs = avgLicenseDays * 24 * 60 * 60 * 1000;
    const percentage = Math.max(0, Math.min(100, (msRemaining / totalMs) * 100));

    let label = '';
    if (minutesRemaining < 60) {
      label = `${minutesRemaining} min`;
    } else if (hoursRemaining < 24) {
      label = `${hoursRemaining} hr`;
    } else {
      label = `${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`;
    }

    return {
      milliseconds: msRemaining,
      seconds: Math.max(0, Math.ceil(msRemaining / 1000)),
      minutes: minutesRemaining,
      hours: hoursRemaining,
      days: daysRemaining,
      label,
      percentage,
      expired: msRemaining <= 0,
    };
  }

  /**
   * Start countdown timer that updates every second
   * Calls callback with time remaining
   */
  function startCountdown(expiresAt, callback, interval = 1000) {
    if (typeof callback !== 'function') return null;

    const timer = setInterval(function() {
      const timeRemaining = calculateTimeRemaining(expiresAt);
      callback(timeRemaining);

      // Clear interval when expired
      if (timeRemaining.expired) {
        clearInterval(timer);
        callback(timeRemaining); // Final call
      }
    }, interval);

    // Initial call
    callback(calculateTimeRemaining(expiresAt));

    return timer;
  }

  // Public API
  return {
    getTimezone,
    getCurrentTimestamp,
    generateHWID,
    getDeviceInfo,
    calculateTimeRemaining,
    startCountdown,
  };
})();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeviceTracker;
}
