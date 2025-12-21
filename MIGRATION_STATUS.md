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

## 🚧 Remaining Migrations

---

### Phase 3 - Chat & Calendar (0/2)

| Function | Lines | Complexity | Target Endpoint |
|----------|-------|------------|-----------------|
| `manage-chat-thread` | 340 | HIGH | `POST /chat/manage-thread` |
| `update-calendar-response` | 226 | MEDIUM | `POST /calendar/update-response` |

**Shared Dependencies:**
- `calendar-utils.ts` (3KB) → Python migration
- Google Calendar API integration

---

### Phase 4 - Complex Auth & Webhooks (0/4)

| Function | Lines | Complexity | Target Endpoint |
|----------|-------|------------|-----------------|
| `onboard-borrower` | 338 | HIGH | `POST /auth/onboard-borrower` |
| `accept-invite` | 682 | VERY HIGH | `POST /auth/accept-invite` |
| `update-member-permissions` | 1,216 | VERY HIGH | `POST /users/update-permissions` |
| `daily-webhook` | 443 | VERY HIGH | `POST /webhooks/daily` |

**Shared Dependencies:**
- `gemini-summarize.ts` (5KB) → Python migration
- `daily-types.ts` (1.7KB) → Python type definitions
- Parallel async operations (asyncio.gather)
- Transaction rollback logic

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

### FastAPI Server
```
gcp-services/api/
├── main.py                         ✅ FastAPI app entry point
├── config.py                       ✅ Environment configuration
├── logging_config.py               ✅ Structured JSON logging
├── Dockerfile                      ✅ Production Docker image
├── docker-compose.yml              ✅ Local development
├── setup-vm.sh                     ✅ VM deployment script
├── start.sh                        ✅ Container startup
│
├── middleware/
│   ├── auth.py                     ✅ JWT authentication
│   ├── cors.py                     ✅ CORS configuration
│   └── error_handler.py            ✅ Global error handling
│
├── models/
│   ├── auth.py                     ✅ Pydantic models (Phase 1)
│   └── projects.py                 ✅ Pydantic models (Phase 2)
│
├── routes/
│   ├── auth.py                     ✅ /auth/* endpoints
│   ├── users.py                    ✅ /users/* endpoints
│   └── projects.py                 ✅ /projects/* endpoints (Phase 2)
│
├── services/
│   └── supabase_client.py          ✅ Supabase client singleton
│
└── utils/
    ├── project_utils.py            ✅ Core project utilities (Phase 2)
    └── resume_merger.py            ✅ Source metadata normalization (Phase 2)
```

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

### Endpoints Still Using Supabase

- ⏳ `acceptInvite()` → `supabase.functions.invoke("accept-invite")`
- ⏳ `updateMemberPermissions()` → `supabase.functions.invoke("update-member-permissions")`
- ⏳ `copyBorrowerProfile()` → Available as `POST /projects/copy-borrower-profile` but not yet called from frontend

---

## 📊 Progress Summary

**Overall Migration Progress:** 12/21 functions (57%)

| Category | Progress | Status |
|----------|----------|--------|
| Phase 1 - Foundation | 3/3 | ✅ Complete |
| Scheduled Jobs | 4/4 | ✅ Complete |
| Additional Services | 2/2 | ✅ Complete |
| Phase 2 - Projects | 3/3 | ✅ Complete |
| Phase 3 - Chat/Calendar | 0/2 | ⏳ Planned |
| Phase 4 - Complex | 0/4 | ⏳ Planned |

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

- [FastAPI Server README](gcp-services/api/README.md)
- [Scheduled Jobs README](gcp-services/scheduled/README.md)
- [Migration Plan](~/.claude/plans/velvety-doodling-harbor.md)
- [Project Instructions](CLAUDE.md)

---

**Last Updated:** December 21, 2025
**Next Milestone:** Phase 3 - Chat & Calendar
