/**
 * API Client for Unlimited Lovable Extension
 * 
 * This file should be copied to the extension project and used by
 * extension scripts to communicate with the license validator API.
 */

export interface LicenseValidateRequest {
  licenseKey: string
  hardwareFingerprint: string
}

export interface LicenseValidateResponse {
  valid: boolean
  message: string
  license?: {
    licenseKey: string
    tierId: string
    tier: {
      displayName: string
      maxSeats: number
      maxUsageLimit: number | null
      durationDays: number
      features: string[]
    }
    expiresAt: string
    seatsUsed: number
    usageCount: number
    status: string
  }
  error?: string
}

export interface UsageTrackRequest {
  licenseKey: string
  hardwareFingerprint: string
}

export interface UsageTrackResponse {
  success: boolean
  message: string
  usage?: {
    todayUsage: number
    totalUsage: number
    maxLimit: number
    remaining: number
  }
  error?: string
}

export class ExtensionApiClient {
  private apiBaseUrl: string
  private timeout: number

  constructor(apiBaseUrl: string = 'https://your-api-domain.com', timeout: number = 5000) {
    this.apiBaseUrl = apiBaseUrl
    this.timeout = timeout
  }

  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      return response
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Validate a license key
   */
  async validateLicense(
    request: LicenseValidateRequest
  ): Promise<LicenseValidateResponse> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.apiBaseUrl}/api/licenses/validate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('[API Client] Validation error:', error)
      return {
        valid: false,
        message: error instanceof Error ? error.message : 'Validation failed',
        error: 'API_ERROR',
      }
    }
  }

  /**
   * Track license usage
   */
  async trackUsage(request: UsageTrackRequest): Promise<UsageTrackResponse> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.apiBaseUrl}/api/licenses/track-usage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('[API Client] Usage tracking error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Usage tracking failed',
        error: 'API_ERROR',
      }
    }
  }

  /**
   * Check if license is still valid (optional pre-check)
   */
  async isLicenseValid(
    licenseKey: string,
    hardwareFingerprint: string
  ): Promise<boolean> {
    const result = await this.validateLicense({
      licenseKey,
      hardwareFingerprint,
    })
    return result.valid
  }
}

/**
 * Singleton instance
 */
let clientInstance: ExtensionApiClient | null = null

export function getApiClient(apiBaseUrl?: string): ExtensionApiClient {
  if (!clientInstance) {
    clientInstance = new ExtensionApiClient(apiBaseUrl)
  }
  return clientInstance
}
