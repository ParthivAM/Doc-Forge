// FILE: src/lib/usage-tracker.ts
// Track and enforce usage limits for free tier users

import { supabaseAdmin } from './supabaseAdmin'
import { FREE_TIER_LIMITS, UsageLimits, getLimitExceededMessage } from './usage-limits'

export type UsageType = 'upload' | 'rebuild' | 'compare' | 'document' | 'signature'

export interface DailyUsage {
    uploads: number
    rebuilds: number
    compares: number
    documentsTotal: number
    signaturesTotal: number
    date: string
}

export interface UsageCheckResult {
    allowed: boolean
    current: number
    limit: number
    remaining: number
    message?: string
}

// Get today's date in YYYY-MM-DD format
function getTodayDate(): string {
    return new Date().toISOString().split('T')[0]
}

// Get user's current usage stats
export async function getUserUsage(userId: string): Promise<DailyUsage> {
    const today = getTodayDate()

    try {
        // Get usage stats from database
        const { data: usageData, error: usageError } = await supabaseAdmin
            .from('user_usage')
            .select('*')
            .eq('user_id', userId)
            .eq('date', today)
            .single()

        if (usageError && usageError.code !== 'PGRST116') {
            // PGRST116 = no rows found, which is fine
            console.error('Error fetching user usage:', usageError)
        }

        // Get total documents count
        const { count: docsCount } = await supabaseAdmin
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)

        // Get total signatures count
        const { count: sigsCount } = await supabaseAdmin
            .from('signatures')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)

        return {
            uploads: usageData?.uploads || 0,
            rebuilds: usageData?.rebuilds || 0,
            compares: usageData?.compares || 0,
            documentsTotal: docsCount || 0,
            signaturesTotal: sigsCount || 0,
            date: today,
        }
    } catch (error) {
        console.error('Error getting user usage:', error)
        return {
            uploads: 0,
            rebuilds: 0,
            compares: 0,
            documentsTotal: 0,
            signaturesTotal: 0,
            date: today,
        }
    }
}

// Check if a specific action is allowed
export async function checkUsageLimit(
    userId: string,
    usageType: UsageType
): Promise<UsageCheckResult> {
    const usage = await getUserUsage(userId)

    let current: number
    let limitKey: keyof UsageLimits

    switch (usageType) {
        case 'upload':
            current = usage.uploads
            limitKey = 'uploadsPerDay'
            break
        case 'rebuild':
            current = usage.rebuilds
            limitKey = 'rebuildsPerDay'
            break
        case 'compare':
            current = usage.compares
            limitKey = 'comparesPerDay'
            break
        case 'document':
            current = usage.documentsTotal
            limitKey = 'documentsTotal'
            break
        case 'signature':
            current = usage.signaturesTotal
            limitKey = 'signaturesTotal'
            break
        default:
            return { allowed: true, current: 0, limit: 999, remaining: 999 }
    }

    const limit = FREE_TIER_LIMITS[limitKey]
    const allowed = current < limit
    const remaining = Math.max(0, limit - current)

    return {
        allowed,
        current,
        limit,
        remaining,
        message: allowed ? undefined : getLimitExceededMessage(limitKey),
    }
}

// Increment usage counter after an action
export async function incrementUsage(
    userId: string,
    usageType: UsageType
): Promise<void> {
    const today = getTodayDate()

    try {
        // Try to get existing record
        const { data: existing } = await supabaseAdmin
            .from('user_usage')
            .select('*')
            .eq('user_id', userId)
            .eq('date', today)
            .single()

        if (existing) {
            // Update existing record
            const updateData: Record<string, number> = {}
            switch (usageType) {
                case 'upload':
                    updateData.uploads = (existing.uploads || 0) + 1
                    break
                case 'rebuild':
                    updateData.rebuilds = (existing.rebuilds || 0) + 1
                    break
                case 'compare':
                    updateData.compares = (existing.compares || 0) + 1
                    break
            }

            await supabaseAdmin
                .from('user_usage')
                .update(updateData)
                .eq('user_id', userId)
                .eq('date', today)
        } else {
            // Create new record for today
            const insertData: Record<string, unknown> = {
                user_id: userId,
                date: today,
                uploads: usageType === 'upload' ? 1 : 0,
                rebuilds: usageType === 'rebuild' ? 1 : 0,
                compares: usageType === 'compare' ? 1 : 0,
            }

            await supabaseAdmin
                .from('user_usage')
                .insert(insertData)
        }
    } catch (error) {
        console.error('Error incrementing usage:', error)
        // Don't throw - we don't want to block the user action if tracking fails
    }
}

// Get formatted usage summary for UI
export async function getUsageSummary(userId: string): Promise<{
    uploads: { used: number; limit: number; remaining: number }
    rebuilds: { used: number; limit: number; remaining: number }
    compares: { used: number; limit: number; remaining: number }
    documents: { used: number; limit: number; remaining: number }
    signatures: { used: number; limit: number; remaining: number }
}> {
    const usage = await getUserUsage(userId)

    return {
        uploads: {
            used: usage.uploads,
            limit: FREE_TIER_LIMITS.uploadsPerDay,
            remaining: Math.max(0, FREE_TIER_LIMITS.uploadsPerDay - usage.uploads),
        },
        rebuilds: {
            used: usage.rebuilds,
            limit: FREE_TIER_LIMITS.rebuildsPerDay,
            remaining: Math.max(0, FREE_TIER_LIMITS.rebuildsPerDay - usage.rebuilds),
        },
        compares: {
            used: usage.compares,
            limit: FREE_TIER_LIMITS.comparesPerDay,
            remaining: Math.max(0, FREE_TIER_LIMITS.comparesPerDay - usage.compares),
        },
        documents: {
            used: usage.documentsTotal,
            limit: FREE_TIER_LIMITS.documentsTotal,
            remaining: Math.max(0, FREE_TIER_LIMITS.documentsTotal - usage.documentsTotal),
        },
        signatures: {
            used: usage.signaturesTotal,
            limit: FREE_TIER_LIMITS.signaturesTotal,
            remaining: Math.max(0, FREE_TIER_LIMITS.signaturesTotal - usage.signaturesTotal),
        },
    }
}
