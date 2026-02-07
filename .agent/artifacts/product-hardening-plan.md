# Product Hardening Implementation Plan

## Status Legend
- ⬜ Not started
- 🟡 In progress
- ✅ Done

---

## 1️⃣ HARDEN THE PRODUCT (Edge Cases, Error Handling, UX)

### Error Handling & Edge Cases
- ✅ **Empty PDFs**: Validation exists in `analyze-upload/route.ts` 
- ✅ **Scanned PDFs**: Clear error message for scanned/image PDFs
- ✅ **Huge documents**: 10MB limit with improved error messages
- ✅ **User-friendly error messages**: Added to generate, rebuild, compare routes

### Clear Error Messages (Human-Friendly)
- ✅ "Couldn't extract text from this document" - for empty/scanned PDFs
- ✅ "AI is busy, please try again" - for rate limits (429)
- ✅ "Document too large" - for size limits
- ✅ "Something went wrong, please try again" - generic fallback

### Prevent Double-Click Bugs
- ✅ handleGenerateWithAI - has `isGenerating` state
- ✅ handleAnalyzeUpload - has `isAnalyzingUpload` state
- ✅ handleCompareDocuments - has `isComparing` state
- ✅ handleRebuildAsCleanDocument - has `isRebuilding` state
- ✅ handleSignDocument - has `isSigning` state
- ✅ handleSaveDocument - has `isSubmitting` state

### Confirmation Modals
- ✅ Document deletion: Upgraded from `window.confirm()` to proper modal
- ✅ Sign document: Uses modal
- ✅ Delete signature: Uses confirmModal

---

## 2️⃣ CLARIFY POSITIONING

### Chosen Angle: 🧾 "AI tool for contracts & official documents"

### Homepage Copy Updates
- ✅ Updated headline: "Create & Manage Official Documents"
- ✅ Updated subheadline to focus on contracts and business documents
- ✅ Updated CTA button: "Get Started Free"
- ✅ Updated Quick Actions descriptions

### Button & Label Renames
- ✅ "AI Document Writer" → "AI Writer"
- ✅ Updated template description: "Create any professional document — AI detects the type automatically"

### Dashboard Sections
- ✅ Added tooltips to "Upload & Analyze" section
- ✅ Added tooltips to "Compare Documents" section
- ✅ Improved section descriptions

---

## 3️⃣ ADD MINIMAL MONETIZATION (without Stripe) ✅ COMPLETE

### Backend Limits
- ✅ `usage-limits.ts` exists with limits defined
- ✅ Created `src/lib/usage-tracker.ts` - track daily usage per user
- ✅ Created `supabase/migrations/003_user_usage.sql` - database table
- ✅ Created `/api/usage` endpoint to fetch usage stats
- ✅ Integrated limits into API routes:
  - ✅ `/api/analyze-upload` - checks uploadsPerDay
  - ✅ `/api/ai/rebuild-document` - checks rebuildsPerDay  
  - ✅ `/api/compare-documents` - checks comparesPerDay

### UI Upgrade Banners
- ✅ Added usage stats banner to dashboard header
- ✅ Shows current usage vs limits (e.g., "3/10 uploads")
- ✅ Highlights in amber when approaching limits
- ✅ Shows "Upgrade to Pro" button when limits are low

---

## 4️⃣ OBSERVABILITY ✅ COMPLETE

### Logging
- ✅ `src/lib/logger.ts` exists with structured logging
- ✅ AI failures logged
- ✅ PDF parse errors logged
- ✅ Feature usage logged
- ✅ Comparison success logged
- ✅ Rebuild success logged

---

## 5️⃣ POLISH, POLISH, POLISH ✅ COMPLETE

### Rename Labels
- ✅ "Custom Freeform" → "AI Writer" (in templates.ts)

### Add Tooltips
- ✅ Added tooltip to "Upload & Analyze Document" section
- ✅ Added tooltip to "Compare Document Versions" section

### Empty States
- ✅ Enhanced "No documents yet" empty state with example suggestions

---

## Summary of All Changes Made

### NEW FILES CREATED
1. `src/lib/usage-tracker.ts` - Usage tracking and limit enforcement
2. `src/app/api/usage/route.ts` - API endpoint for usage stats
3. `supabase/migrations/003_user_usage.sql` - Database migration for usage table

### Dashboard (`src/app/dashboard/page.tsx`)
1. ✅ Replaced `window.confirm()` with proper confirmation modal for document deletion
2. ✅ Added tooltips with explanations to Upload & Analyze and Compare sections
3. ✅ Improved section descriptions
4. ✅ Enhanced empty state with example document suggestions
5. ✅ Added usage stats state and fetch function
6. ✅ Added usage banner showing daily limits

### Homepage (`src/app/page.tsx`)
1. ✅ Updated headline for better positioning
2. ✅ Updated Quick Actions descriptions
3. ✅ Updated CTA copy

### Templates (`src/config/templates.ts`)
1. ✅ Renamed "AI Document Writer" to "AI Writer"
2. ✅ Updated description

### API Routes Updated
1. ✅ `generate-document/route.ts` - Improved error messages
2. ✅ `rebuild-document/route.ts` - Improved error messages + usage limits
3. ✅ `analyze-upload/route.ts` - Usage limits + increment
4. ✅ `compare-documents/route.ts` - Usage limits + increment

---

## Database Migration Required

Run this SQL in your Supabase dashboard or via migration:

```sql
-- See: supabase/migrations/003_user_usage.sql
CREATE TABLE IF NOT EXISTS user_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    uploads INTEGER DEFAULT 0,
    rebuilds INTEGER DEFAULT 0,
    compares INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_user_usage_user_date ON user_usage(user_id, date);
```

---

## What's Still Left (Future Improvements)

1. **Payment Integration** - Add Stripe for actual Pro tier upgrades
2. **Usage Analytics Dashboard** - Admin view of usage stats
3. **Email Notifications** - Notify users when approaching limits
4. **Rate Limit Retry** - Automatic retry with exponential backoff
5. **More Template Types** - Add industry-specific templates
