# Lender User Type - QA Checklist

Use this checklist to verify all lender functionality is working correctly.

## Prerequisites

- [ ] Database migration `20260115000000_lender_access.sql` has been applied
- [ ] Lender seed data has been loaded (`supabase/lender_seed.sql`)
- [ ] Backend API endpoints are implemented (if testing full stack)
- [ ] Test credentials ready:
  - Lender: `lender@example.com` / `password`
  - Lender member: `lender.analyst@example.com` / `password`
  - Borrower: `aryan@owner1.com` / `password` (from seed.sql)

## 1. Authentication & Authorization

### Login Flow
- [ ] Can login with `lender@example.com` / `password`
- [ ] Redirects to `/lender/dashboard` after login
- [ ] Cannot access `/dashboard` (borrower dashboard)
- [ ] Cannot access `/advisor/dashboard`
- [ ] Session persists across page refreshes

### Role-Based Routing
- [ ] Can access `/lender/dashboard`
- [ ] Can access `/team`
- [ ] Cannot access `/project/workspace/:id` (borrower workspace)
- [ ] Cannot access `/documents`
- [ ] Can access `/lender/project/:id` for granted projects only

## 2. Lender Dashboard

### Display
- [ ] Page title shows "Investment Opportunities"
- [ ] Shows list of projects lender has access to
- [ ] Each project card displays:
  - Project name
  - Borrower entity name
  - Location (city, state)
  - Asset type
  - Loan amount requested
  - Created date
  - "View Details →" button

### Empty State
- [ ] If no projects granted, shows empty state message
- [ ] Empty state includes Building2 icon
- [ ] Message: "You don't have access to any projects yet..."

### Loading State
- [ ] Shows spinner while loading projects
- [ ] No flashing/layout shift

### Error Handling
- [ ] If RLS error, shows error message
- [ ] Error is user-friendly

### Navigation
- [ ] Clicking project card navigates to `/lender/project/:id`
- [ ] Back button in header returns to dashboard

## 3. Project View

### Access Control
- [ ] Can only view projects with `lender_project_access` grant
- [ ] Attempting to access non-granted project shows "Access Denied"
- [ ] Access denied message includes "Back to Dashboard" button

### Page Structure
- [ ] Breadcrumb shows "Projects > [Project Name]"
- [ ] Blue info banner explains read-only access
- [ ] Three tabs visible: Project Resume, Borrower Resume, Chat
- [ ] Active tab is highlighted with blue underbar
- [ ] "Back" button in top right

### Project Resume Tab
- [ ] Displays project resume data in read-only format
- [ ] All sections render correctly
- [ ] No "Edit" buttons visible
- [ ] Field values display correctly (currency, percentages, etc.)
- [ ] Empty fields show "N/A"
- [ ] No autofill or AI assist features visible

### Borrower Resume Tab
- [ ] Displays borrower resume data in read-only format
- [ ] All sections render correctly (Personal Info, Experience, Financials, etc.)
- [ ] No "Edit" buttons visible
- [ ] Table sections (principals, track record) render correctly
- [ ] No version history controls visible

### Chat Tab
- [ ] Can view existing chat messages
- [ ] Can send new messages
- [ ] Messages appear in realtime
- [ ] Can @mention other participants
- [ ] Can attach documents? (verify intended behavior)
- [ ] Notifications work for new messages
- [ ] Unread indicators work

### Read-Only Enforcement
- [ ] Cannot edit any resume fields
- [ ] Cannot trigger autofill
- [ ] Cannot access AI assistant for resumes
- [ ] Cannot upload/delete documents
- [ ] Can participate fully in chat

## 4. Team Management

### Access
- [ ] Can navigate to `/team` from dashboard header
- [ ] Page loads without errors
- [ ] Breadcrumb shows "Dashboard / Team Management"

### View Team Members
- [ ] Shows lender org members
- [ ] Displays member names and emails
- [ ] Shows member roles (Owner, Member)
- [ ] Shows current user is highlighted/marked

### Invite Member
- [ ] Click "Invite Member" opens modal
- [ ] Can enter email address
- [ ] Can select role (Owner or Member)
- [ ] Project permissions section is HIDDEN (key difference from borrower)
- [ ] Info text says "Project-level invites are not available"
- [ ] Can send invite
- [ ] Invite link is generated and copyable
- [ ] Invited user receives invite

### Member Management
- [ ] Owner can remove members
- [ ] Cannot remove last owner
- [ ] Can edit member names
- [ ] Cannot change member roles (must remove/re-invite)

### Lender-Specific Behavior
- [ ] No project-level permissions UI in invite modal
- [ ] Help text explains lenders invite to org only, not projects
- [ ] Team members inherit same project access as org

## 5. Notifications

### Receive Notifications
- [ ] Lender receives chat message notifications
- [ ] Lender receives meeting invite notifications
- [ ] Notification bell shows unread count
- [ ] Clicking notification navigates to correct page

### Notification Settings
- [ ] Can access notification settings via dropdown
- [ ] Can mute specific notification types
- [ ] Settings persist across sessions

## 6. Data Access & RLS

### Can Read
- [ ] borrower_resumes for projects with grant
- [ ] project_resumes for projects with grant
- [ ] projects table (only granted projects visible)
- [ ] chat_threads for granted projects
- [ ] chat_thread_participants for granted projects
- [ ] project_messages for granted projects
- [ ] Own org's org_members
- [ ] Own notifications

### Cannot Read/Write
- [ ] project_resumes for non-granted projects (should be empty/error)
- [ ] borrower_resumes for non-granted projects (should be empty/error)
- [ ] resources table (documents)
- [ ] permissions table
- [ ] Other orgs' org_members
- [ ] Cannot INSERT/UPDATE/DELETE resumes
- [ ] Cannot DELETE projects
- [ ] Cannot modify lender_project_access (no UI, backend only)

## 7. Regression Tests (Ensure Borrower/Advisor Unchanged)

### Borrower Flow
- [ ] Login as borrower still works
- [ ] Borrower dashboard loads correctly
- [ ] Can create/edit projects
- [ ] Can edit borrower resume
- [ ] Can edit project resume
- [ ] Can upload documents
- [ ] Can invite team members with project permissions
- [ ] Lender org members NOT visible in borrower's team page

### Advisor Flow
- [ ] Login as advisor still works
- [ ] Advisor dashboard loads correctly
- [ ] Can view assigned projects
- [ ] Can edit project/borrower resumes
- [ ] Can participate in chat
- [ ] Lender users not visible in advisor team management (if applicable)

### Cross-Role
- [ ] Borrower cannot access lender dashboard
- [ ] Advisor cannot access lender dashboard
- [ ] Lender cannot access borrower workspace
- [ ] Lender cannot access advisor dashboard

## 8. Edge Cases

### Multiple Lenders
- [ ] If project has 2+ lender orgs with access, all can view independently
- [ ] Lenders cannot see each other in chat (unless explicitly added)
- [ ] RLS correctly isolates lender access

### Project Without Grant
- [ ] Lender cannot see project in dashboard
- [ ] Direct URL to `/lender/project/:id` shows access denied
- [ ] No RLS errors, just clean access denied message

### Revoked Access
- [ ] After revoking lender_project_access, lender loses access immediately
- [ ] Project disappears from dashboard
- [ ] Direct URL shows access denied
- [ ] No stale data visible

### Empty Resumes
- [ ] If project has empty project_resume, shows empty state gracefully
- [ ] If org has empty borrower_resume, shows empty state gracefully
- [ ] No crashes or blank screens

## 9. Performance

- [ ] Dashboard loads within 2 seconds
- [ ] Project view loads within 2 seconds
- [ ] Chat messages load quickly
- [ ] No excessive database queries
- [ ] RLS functions are efficient (check query plans if slow)

## 10. UI/UX

### Responsive
- [ ] Works on mobile viewport (320px+)
- [ ] Works on tablet viewport (768px+)
- [ ] Works on desktop viewport (1024px+)
- [ ] Project cards stack correctly on mobile

### Accessibility
- [ ] All buttons have aria-labels
- [ ] Tab navigation works
- [ ] Screen reader friendly (test with screen reader)
- [ ] Color contrast meets WCAG standards
- [ ] Focus indicators visible

### Visual Polish
- [ ] No console errors
- [ ] No React warnings
- [ ] Smooth transitions
- [ ] Loading states don't flash
- [ ] Icons render correctly

## Issues Found

| Issue | Priority | Status | Notes |
|-------|----------|--------|-------|
| Example: Dashboard shows wrong count | High | Open | Investigate RLS query |
| Example: Chat not loading | Critical | Fixed | Was missing RLS policy |

---

## Sign-off

- [ ] All critical issues resolved
- [ ] All high-priority issues resolved or documented
- [ ] Regression tests passed
- [ ] Ready for production deployment

**Tested by:** _______________
**Date:** _______________
**Environment:** _______________
