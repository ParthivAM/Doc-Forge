// FILE: src/lib/usage-limits.ts
// Usage limits for DocForge free tier

export const FREE_TIER_LIMITS = {
    uploadsPerDay: 5,
    rebuildsPerDay: 3,
    comparesPerDay: 2,
    documentsTotal: 10,
    signaturesTotal: 3,
} as const

export type UsageLimits = typeof FREE_TIER_LIMITS

// Check if a limit has been exceeded
export function isLimitExceeded(current: number, limitType: keyof UsageLimits): boolean {
    return current >= FREE_TIER_LIMITS[limitType]
}

// Get remaining usage for a limit type
export function getRemainingUsage(current: number, limitType: keyof UsageLimits): number {
    return Math.max(0, FREE_TIER_LIMITS[limitType] - current)
}

// Format usage for display (e.g., "3/5 analyses today")
export function formatUsage(current: number, limitType: keyof UsageLimits): string {
    return `${current}/${FREE_TIER_LIMITS[limitType]}`
}

// Error message for exceeded limits
export function getLimitExceededMessage(limitType: keyof UsageLimits): string {
    const messages: Record<keyof UsageLimits, string> = {
        uploadsPerDay: 'Daily analysis limit reached. Upgrade to Pro for unlimited analyses.',
        rebuildsPerDay: 'Daily document rebuild limit reached. Upgrade to Pro for unlimited rebuilds.',
        comparesPerDay: 'Daily comparison limit reached. Upgrade to Pro for unlimited comparisons.',
        documentsTotal: 'Maximum document limit reached. Upgrade to Pro for unlimited documents.',
        signaturesTotal: 'Maximum signature limit reached. Upgrade to Pro for more signatures.',
    }
    return messages[limitType]
}
