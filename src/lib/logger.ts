// FILE: src/lib/logger.ts
// Simple logging utility for observability

type LogLevel = 'info' | 'warn' | 'error'

interface LogEvent {
    timestamp: string
    level: LogLevel
    event: string
    userId?: string
    data?: Record<string, unknown>
}

// Log an event with structured data
export function logEvent(
    event: string,
    level: LogLevel = 'info',
    data?: Record<string, unknown>,
    userId?: string
): void {
    const logEntry: LogEvent = {
        timestamp: new Date().toISOString(),
        level,
        event,
        ...(userId && { userId }),
        ...(data && { data }),
    }

    // In production, this could be sent to a logging service
    // For now, we use structured console output
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '📊'
    console.log(`${prefix} [${level.toUpperCase()}]`, JSON.stringify(logEntry))
}

// Specific event loggers
export function logAIFailure(error: string, feature: string, userId?: string): void {
    logEvent('ai_failure', 'error', { error, feature }, userId)
}

export function logPDFParseError(error: string, filename?: string, userId?: string): void {
    logEvent('pdf_parse_error', 'error', { error, filename }, userId)
}

export function logFeatureUsed(feature: string, userId?: string): void {
    logEvent('feature_used', 'info', { feature }, userId)
}

export function logCompareSuccess(clauseCount: number, userId?: string): void {
    logEvent('compare_success', 'info', { clauseCount }, userId)
}

export function logRebuildSuccess(templateId: string, userId?: string): void {
    logEvent('rebuild_success', 'info', { templateId }, userId)
}

export function logSignDocument(docId: string, userId?: string): void {
    logEvent('document_signed', 'info', { docId }, userId)
}
