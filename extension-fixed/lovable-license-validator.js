/**
 * Unlimited Lovable - License Validator v1.0
 * Validates licenses with the Unlimited Lovable License Validator API
 * Replace API_ENDPOINT with your deployed validator URL
 */

const LICENSE_CONFIG = {
  API_ENDPOINT: 'https://v0-unlimited-lovable.vercel.app', // Website that issues + validates licenses
  STORAGE_KEY: 'lovable_license_data',
  FINGERPRINT_KEY: 'lovable_hw_fingerprint',
  VALIDATION_INTERVAL: 3600000, // 1 hour in ms
  CACHE_DURATION: 86400000, // 24 hours
};

class LicenseValidator {
  constructor() {
    this.cachedLicense = null;
    this.lastValidation = null;
    this.isValidating = false;
  }

  async getHardwareFingerprint() {
    try {
      const stored = await this.getStorageData(LICENSE_CONFIG.FINGERPRINT_KEY);
      if (stored) return stored;

      const fingerprint = this.generateFingerprint();
      await this.setStorageData(LICENSE_CONFIG.FINGERPRINT_KEY, fingerprint);
      return fingerprint;
    } catch (error) {
      console.error('[LicenseValidator] Error getting hardware fingerprint:', error);
      return this.generateFingerprint();
    }
  }

  generateFingerprint() {
    const data = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: navigator.deviceMemory || 'unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: screen.width + 'x' + screen.height + 'x' + screen.colorDepth,
    };

    const str = JSON.stringify(data);
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    return 'HWID-' + Math.abs(hash).toString(16).toUpperCase();
  }

  async validateLicense(licenseKey) {
    if (!licenseKey) {
      throw new Error('License key is required');
    }

    if (!LICENSE_CONFIG.API_ENDPOINT || LICENSE_CONFIG.API_ENDPOINT.includes('your-app')) {
      throw new Error('API endpoint not configured. Please update LICENSE_CONFIG.API_ENDPOINT');
    }

    this.isValidating = true;

    try {
      const hardwareFingerprint = await this.getHardwareFingerprint();

      const response = await fetch(LICENSE_CONFIG.API_ENDPOINT + '/api/licenses/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licenseKey: licenseKey.trim(),
          hardwareFingerprint: hardwareFingerprint,
        }),
      });

      if (!response.ok) {
        throw new Error('API error: ' + response.status);
      }

      const data = await response.json();

      if (data.valid) {
        this.cachedLicense = data.license;
        this.lastValidation = new Date();
        
        await this.setStorageData(LICENSE_CONFIG.STORAGE_KEY, {
          license: data.license,
          validatedAt: this.lastValidation.toISOString(),
          licenseKey: licenseKey,
        });

        return {
          valid: true,
          license: data.license,
          message: 'License is valid',
        };
      } else {
        throw new Error(data.message || 'License validation failed');
      }
    } catch (error) {
      console.error('[LicenseValidator] Validation error:', error);
      throw error;
    } finally {
      this.isValidating = false;
    }
  }

  async trackUsage(licenseKey) {
    try {
      if (!LICENSE_CONFIG.API_ENDPOINT || LICENSE_CONFIG.API_ENDPOINT.includes('your-app')) {
        console.warn('[LicenseValidator] API endpoint not configured, skipping usage tracking');
        return;
      }

      const hardwareFingerprint = await this.getHardwareFingerprint();

      await fetch(LICENSE_CONFIG.API_ENDPOINT + '/api/licenses/track-usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licenseKey: licenseKey,
          hardwareFingerprint: hardwareFingerprint,
        }),
      });
    } catch (error) {
      console.warn('[LicenseValidator] Usage tracking failed:', error);
    }
  }

  isCachedLicenseValid() {
    if (!this.cachedLicense || !this.lastValidation) {
      return false;
    }

    const now = new Date();
    const timeSinceValidation = now - this.lastValidation;

    if (timeSinceValidation > LICENSE_CONFIG.CACHE_DURATION) {
      return false;
    }

    if (this.cachedLicense.expiresAt) {
      const expiryDate = new Date(this.cachedLicense.expiresAt);
      if (now > expiryDate) {
        return false;
      }
    }

    return true;
  }

  async getLicenseStatus(licenseKey) {
    try {
      if (this.isCachedLicenseValid()) {
        return {
          valid: true,
          license: this.cachedLicense,
          source: 'cache',
        };
      }

      const result = await this.validateLicense(licenseKey);
      return {
        valid: result.valid,
        license: result.license,
        message: result.message,
        source: 'api',
      };
    } catch (error) {
      console.error('[LicenseValidator] Error getting license status:', error);
      throw error;
    }
  }

  getLicenseInfo() {
    if (!this.cachedLicense) {
      return null;
    }

    const license = this.cachedLicense;
    const expiryDate = license.expiresAt ? new Date(license.expiresAt) : null;
    const now = new Date();
    const isExpired = expiryDate && now > expiryDate;
    const daysUntilExpiry = expiryDate ? Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)) : null;

    return {
      key: license.licenseKey,
      tier: license.tier ? license.tier.displayName : license.tierId,
      seatsUsed: license.seatsUsed,
      maxSeats: license.tier ? license.tier.maxSeats : null,
      usageToday: license.usageCount,
      maxUsagePerDay: license.tier ? license.tier.maxUsageLimit : null,
      expiresAt: license.expiresAt,
      daysUntilExpiry: daysUntilExpiry,
      isExpired: isExpired,
      isExpiringSoon: daysUntilExpiry && daysUntilExpiry <= 7,
    };
  }

  async getStorageData(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key] || null);
      });
    });
  }

  async setStorageData(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  }

  async removeStorageData(key) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, resolve);
    });
  }

  async clearLicenseData() {
    this.cachedLicense = null;
    this.lastValidation = null;
    await this.removeStorageData(LICENSE_CONFIG.STORAGE_KEY);
  }

  async initialize() {
    try {
      const stored = await this.getStorageData(LICENSE_CONFIG.STORAGE_KEY);
      if (stored) {
        this.cachedLicense = stored.license;
        this.lastValidation = new Date(stored.validatedAt);
      }
    } catch (error) {
      console.error('[LicenseValidator] Initialization error:', error);
    }
  }
}

window.licenseValidator = new LicenseValidator();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.licenseValidator.initialize();
  });
} else {
  window.licenseValidator.initialize();
}
