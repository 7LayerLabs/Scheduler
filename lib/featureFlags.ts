/**
 * Feature Flags Configuration
 *
 * Control which features are enabled/disabled via environment variables.
 * All features default to true (enabled) unless explicitly disabled.
 *
 * To disable a feature:
 * NEXT_PUBLIC_ENABLE_NOTIFICATIONS=false
 */

export const FEATURES = {
  // Phase 1: In-App Notifications
  NOTIFICATIONS: process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS !== 'false',

  // Phase 2: Shift Swap System
  SWAPS: process.env.NEXT_PUBLIC_ENABLE_SWAPS !== 'false',

  // Phase 3: Shift Preference Tracking
  PREFERENCES: process.env.NEXT_PUBLIC_ENABLE_PREFERENCES !== 'false',

  // Phase 4: Schedule Templates
  TEMPLATES: process.env.NEXT_PUBLIC_ENABLE_TEMPLATES !== 'false',

  // Phase 5: Analytics Dashboard
  ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'false',
} as const;

/**
 * Check if a feature is enabled
 * @param feature The feature to check
 * @returns true if enabled, false otherwise
 */
export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
  return FEATURES[feature];
}

/**
 * Get all enabled features
 * @returns Array of enabled feature names
 */
export function getEnabledFeatures(): (keyof typeof FEATURES)[] {
  return Object.entries(FEATURES)
    .filter(([, enabled]) => enabled)
    .map(([feature]) => feature as keyof typeof FEATURES);
}
