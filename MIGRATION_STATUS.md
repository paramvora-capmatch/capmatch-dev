# Supabase Edge Functions → FastAPI Migration Status

## Overview

This document tracks the migration of Supabase Edge Functions to a FastAPI server on GCP.

**Migration Date Started:** December 21, 2025
**Target Deployment:** GCP VM with Docker + systemd

---

## ✅ Completed Migrations (Phase 1)

### HTTP Endpoints (3/12)

| Function | Status | Migrated To | Testing Status |
|----------|--------|-------------|----------------|
| `validate-invite` | ✅ Complete | `POST /auth/validate-invite` | ✅ Working |
| `invite-user` | ✅ Complete | `POST /users/invite` | ✅ Working |
| `remove-user` | ✅ Complete | `POST /users/remove` | ✅ Working |

### Scheduled Jobs (4/4)

| Function | Status | Migrated To | Cron Schedule |
|----------|--------|-------------|---------------|
| `meeting-reminders` | ✅ Complete | `gcp-services/scheduled/meeting-reminders/` | Every 5 minutes |
| `renew-calendar-watches` | ✅ Complete | `gcp-services/scheduled/renew-calendar-watches/` | Daily at 2 AM UTC |
| `unread-thread-nudges` | ✅ Complete | `gcp-services/scheduled/unread-thread-nudges/` | Every 15 minutes |
| `resume-incomplete-nudges` | ✅ Complete | `gcp-services/scheduled/resume-incomplete-nudges/` | Every 6 hours |

### Additional Services (2/2)

| Function | Status | Migrated To | Type |
|----------|--------|-------------|------|
| `notify-fan-out` | ✅ Complete | `gcp-services/scheduled/notify-fan-out/` | Cron (polls domain events) |
| `email-notifications` | ✅ Complete | `gcp-services/scheduled/email-notifications/` | Cron (sends email digests) |

---

## ✅ Completed Migrations (Phase 2)

### Project Operations (3/3)

| Function | Status | Migrated To | Testing Status |
|----------|--------|-------------|----------------|
| `create-project` | ✅ Complete | `POST /projects/create` | ⏳ Testing |
| `update-project` | ✅ Complete | `POST /projects/update` | ⏳ Testing |
| `copy-borrower-profile` | ✅ Complete | `POST /projects/copy-borrower-profile` | ⏳ Testing |

**Shared Dependencies (Migrated):**
- `project-utils.ts` → Migrated to `utils/project_utils.py`
- `resume_merger.py` → New Python module for source metadata normalization
- Domain events service (used in background operations)

---

## ✅ Completed Migrations (Phase 3)

### Chat & Calendar (2/2)

| Function | Status | Migrated To | Testing Status |
|----------|--------|-------------|----------------|
| `manage-chat-thread` | ✅ Complete | `POST /api/v1/chat/threads` | ✅ Working |
| `update-calendar-response` | ✅ Complete | `POST /api/v1/calendar/update-response` | ✅ Working |

**Shared Dependencies (Migrated):**
- `calendar-utils.ts` → Migrated to `Backend/utils/calendar_utils.py`
- Google Calendar API integration working

---

## ✅ Completed Migrations (Phase 4)

### Complex Auth & Webhooks (4/4)

| Function | Status | Migrated To | Testing Status |
|----------|--------|-------------|----------------|
| `onboard-borrower` | ✅ Complete | `POST /api/v1/users/onboard-borrower` | ✅ Working |
| `accept-invite` | ✅ Complete | `POST /api/v1/auth/accept-invite` | ✅ Working |
| `update-member-permissions` | ✅ Complete | `POST /api/v1/users/update-member-permissions` | ✅ Working |
| `daily-webhook` | ✅ Complete | `POST /api/v1/webhooks/daily` | ✅ Working |

**Shared Dependencies (Migrated):**
- `gemini-summarize.ts` → Migrated to `Backend/utils/gemini_utils.py`
- `daily-types.ts` → Python type definitions in models
- Parallel async operations using `asyncio.gather`
- Transaction rollback logic implemented

---

## 🗂️ Directory Structure

### Active Functions (Not Yet Migrated)
```
supabase/functions/
├── accept-invite/
├── daily-webhook/
├── manage-chat-thread/
├── onboard-borrower/
├── update-calendar-response/
└── update-member-permissions/
```

### Migrated Functions (Archived)
```
supabase-legacy/functions/
├── copy-borrower-profile/          ✅ → FastAPI /projects/copy-borrower-profile
├── create-project/                 ✅ → FastAPI /projects/create
├── invite-user/                    ✅ → FastAPI /users/invite
├── meeting-reminders/              ✅ → Scheduled job (5 min)
├── notify-fan-out/                 ✅ → Scheduled job (polls events)
├── remove-user/                    ✅ → FastAPI /users/remove
├── renew-calendar-watches/         ✅ → Scheduled job (daily)
├── resume-incomplete-nudges/       ✅ → Scheduled job (6 hours)
├── unread-thread-nudges/           ✅ → Scheduled job (15 min)
├── update-project/                 ✅ → FastAPI /projects/update
├── validate-invite/                ✅ → FastAPI /auth/validate-invite
└── _shared/
    └── project-utils.ts            ✅ → utils/project_utils.py
```

### Unified Backend FastAPI Server
```
Backend/
├── main.py                         ✅ FastAPI app entry point (unified)
├── core/
│   ├── config.py                   ✅ Environment configuration (extended)
│   └── supabase_client.py          ✅ Supabase client helpers
│
├── middleware/
│   ├── auth.py                     ✅ JWT authentication
│   ├── cors.py                     ✅ CORS configuration
│   └── error_handler.py            ✅ Global error handling
│
├── api/v1/
│   ├── endpoints/
│   │   ├── auth.py                 ✅ /api/v1/auth/* endpoints
│   │   ├── users.py                ✅ /api/v1/users/* endpoints
│   │   ├── projects.py              ✅ /api/v1/projects/* endpoints
│   │   ├── chat.py                 ✅ /api/v1/chat/* endpoints
│   │   ├── calendar.py             ✅ /api/v1/calendar/* endpoints
│   │   └── webhooks.py             ✅ /api/v1/webhooks/* endpoints (merged)
│   └── models/
│       ├── auth.py                 ✅ Pydantic models (auth)
│       ├── users.py                ✅ Pydantic models (users)
│       ├── projects.py              ✅ Pydantic models (projects)
│       ├── chat.py                 ✅ Pydantic models (chat)
│       ├── calendar.py             ✅ Pydantic models (calendar)
│       └── webhooks.py             ✅ Pydantic models (webhooks)
│
└── utils/
    ├── calendar_utils.py            ✅ Calendar OAuth utilities
    ├── gemini_utils.py              ✅ Gemini AI utilities
    ├── project_utils.py             ✅ Core project utilities
    └── resume_merger.py             ✅ Source metadata normalization
```

**Note:** The old `Frontend/gcp-services/api/` directory has been removed. All functionality is now in the unified `Backend/` server.

---

## 🔄 Frontend Integration Status

### Updated Files

| File | Status | Description |
|------|--------|-------------|
| `src/lib/apiClient.ts` | ✅ Updated | Added Phase 2 project endpoints |
| `src/stores/useOrgStore.ts` | ✅ Updated | Uses apiClient for Phase 1 endpoints |
| `src/stores/useProjectStore.ts` | ✅ Updated | Uses apiClient for Phase 2 endpoints |
| `.env.local` | ✅ Updated | `NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8080` |

### Endpoints Using FastAPI

**Phase 1 - Authentication & Users:**
- ✅ `validateInviteToken()` → `POST /auth/validate-invite`
- ✅ `inviteMember()` → `POST /users/invite`
- ✅ `removeMember()` → `POST /users/remove`

**Phase 2 - Projects:**
- ✅ `createProject()` → `POST /projects/create`
- ✅ `updateProject()` → `POST /projects/update`

### All Endpoints Now Using FastAPI ✅

**Phase 3 - Chat & Calendar:**
- ✅ `manageChatThread()` → `POST /api/v1/chat/threads`
- ✅ `updateCalendarResponse()` → `POST /api/v1/calendar/update-response`

**Phase 4 - Complex Auth & Webhooks:**
- ✅ `acceptInvite()` → `POST /api/v1/auth/accept-invite`
- ✅ `onboardBorrower()` → `POST /api/v1/users/onboard-borrower`
- ✅ `updateMemberPermissions()` → `POST /api/v1/users/update-member-permissions`
- ✅ `copyBorrowerProfile()` → `POST /api/v1/projects/copy-borrower-profile` (now called from frontend)

---

## 📊 Progress Summary

**Overall Migration Progress:** 12/12 HTTP endpoints (100%) + 6/6 scheduled jobs (100%) = **18/18 total (100%)**

| Category | Progress | Status |
|----------|----------|--------|
| Phase 1 - Foundation | 3/3 | ✅ Complete |
| Scheduled Jobs | 4/4 | ✅ Complete |
| Additional Services | 2/2 | ✅ Complete |
| Phase 2 - Projects | 3/3 | ✅ Complete |
| Phase 3 - Chat/Calendar | 2/2 | ✅ Complete |
| Phase 4 - Complex Auth & Webhooks | 4/4 | ✅ Complete |

---

## 🚀 Deployment Status

### FastAPI Server

- **Local Development:** ✅ Running on port 8080
- **Production VM:** ⏳ Ready to deploy
- **Systemd Service:** ✅ Configuration created
- **Health Checks:** ✅ Implemented
- **API Documentation:** ✅ Available at `/docs`

### Scheduled Jobs

- **Local Development:** ✅ Can run via Docker
- **Production VM:** ⏳ Ready to deploy with cron
- **Monitoring:** ✅ Logs to `/var/log/*.log`
- **Auto-restart:** ✅ Systemd services configured

---

## 📝 Notes

### Deleted Functions (Obsolete)

- ❌ `resume-nudges` (845 lines) - Too complex, replaced by simpler `resume-incomplete-nudges`
- ❌ `project-completion-reminders` - Obsolete functionality

### Key Decisions

1. **Deployment Target:** GCP VM (consistent with scheduled jobs)
2. **Port Allocation:** FastAPI on 8080, Supabase local on 54321
3. **Shared Utilities:** Migrate incrementally as needed per phase
4. **Backward Compatibility:** Feature flag support for gradual rollout

### Testing Strategy

- ✅ Local development with docker-compose
- ✅ Swagger UI for manual testing (`/docs`)
- ⏳ Unit tests (pytest) - Pending
- ⏳ Integration tests - Pending
- ⏳ Load testing - Pending

---

## 🔗 Related Documentation

- [Migration Complete Summary](MIGRATION_COMPLETE.md) - Full migration completion details
- [Scheduled Jobs README](gcp-services/scheduled/README.md)
- [Migration Plan](.cursor/plans/migrate_gcp-services_api_to_backend_7dbcd3e9.plan.md)
- [Daily Webhook Setup](docs/DAILY_WEBHOOK_SETUP.md) - Updated for Backend

---

**Last Updated:** December 22, 2025  
**Status:** ✅ **MIGRATION COMPLETE** - All functionality migrated to unified Backend
