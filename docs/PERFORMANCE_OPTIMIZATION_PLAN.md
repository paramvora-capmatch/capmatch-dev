# Platform Performance Optimization Plan

## Executive Summary

After analyzing the codebase, I've identified multiple performance bottlenecks across the frontend and backend. This document outlines prioritized optimizations expected to improve overall platform responsiveness by 60-80%.

## Critical Issues (High Impact, Quick Wins)

### 1. Database Query Optimization (Backend & Frontend)

**Problem:**
- Sequential database queries that could be batched
- N+1 query patterns in several places
- Missing database indexes on frequently queried columns
- No query result caching

**Evidence Found:**
- `ProjectWorkspace.tsx`: Fetches project, then resources separately (lines 522-536)
- Multiple `.select()` calls that could be combined with joins
- No visible caching strategy for frequently accessed project data

**Recommendations:**

#### 1.1 Batch Database Queries
```typescript
// Current (slow - sequential)
const fetchedProject = await getProjectWithResume(projectId);
const { data: resourcesData } = await supabase
  .from("resources")
  .select("id, resource_type")
  .eq("project_id", projectId);

// Optimized (fast - single query with join)
const { data } = await supabase
  .from("projects")
  .select(`
    *,
    project_resume:project_resumes!inner(content, version),
    resources(id, resource_type)
  `)
  .eq("id", projectId)
  .single();
```

#### 1.2 Implement Query Result Caching
- Add Redis or in-memory cache for frequently accessed data
- Cache project data for 30-60 seconds
- Cache user permissions for 5 minutes
- Invalidate cache on updates

#### 1.3 Add Database Indexes
```sql
-- Ensure these indexes exist:
CREATE INDEX IF NOT EXISTS idx_projects_owner_org_id ON projects(owner_org_id);
CREATE INDEX IF NOT EXISTS idx_resources_project_id ON resources(project_id);
CREATE INDEX IF NOT EXISTS idx_project_resumes_project_id ON project_resumes(project_id);
CREATE INDEX IF NOT EXISTS idx_borrower_resumes_project_id ON borrower_resumes(project_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_permissions_user_id ON permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_project_access_grants_user_id ON project_access_grants(user_id);
```

### 2. API Request Batching (Frontend)

**Problem:**
- Multiple sequential API calls on page load
- No request batching
- Redundant data fetching

**Evidence Found:**
- `AdvisorDashboardPage`: Fetches projects, then borrower data separately (lines 211-237)
- `DashboardPage`: Multiple sequential fetches
- No visible use of GraphQL or batch endpoints

**Recommendations:**

#### 2.1 Create Batch API Endpoints
```typescript
// Create: /api/v1/projects/batch
// Accepts: { projectIds: string[] }
// Returns: { projects: Project[], borrowers: Borrower[], unreadCounts: Record<string, number> }
```

#### 2.2 Use React Query with Batching
```typescript
// Use React Query's query batching
import { useQueries } from '@tanstack/react-query';

const queries = useQueries({
  queries: projectIds.map(id => ({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id),
  })),
});
```

### 3. Authentication Overhead (Backend)

**Problem:**
- JWT validation on every API request
- No token caching
- Supabase auth call on every request

**Evidence Found:**
- `fastapi-backend/middleware/auth.py`: Calls `supabase.auth.get_user(token)` on every request (line 126)

**Recommendations:**

#### 3.1 Cache JWT Validation
```python
from functools import lru_cache
from datetime import datetime, timedelta

# Cache validated tokens for 1 minute
@lru_cache(maxsize=1000)
def validate_token_cached(token_hash: str, timestamp: int) -> Dict:
    # Only validate if cache is fresh (within 1 minute)
    cache_time = datetime.fromtimestamp(timestamp)
    if datetime.now() - cache_time > timedelta(minutes=1):
        # Token expired from cache, validate again
        raise CacheExpired
    return cached_user

# Or use Redis for distributed caching
```

#### 3.2 Implement Token Refresh Strategy
- Validate JWT signature locally (if using symmetric keys)
- Only call Supabase auth API when token is close to expiration
- Use token payload for user info instead of API call

### 4. Frontend Bundle Size & Code Splitting

**Problem:**
- No visible code splitting configuration
- Large bundle sizes likely causing slow initial loads
- All routes loaded upfront

**Recommendations:**

#### 4.1 Implement Route-Based Code Splitting
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  // Add this:
  experimental: {
    optimizePackageImports: ['@radix-ui/react-slot', 'lucide-react'],
  },
};

// Use dynamic imports for heavy components
const ProjectWorkspace = dynamic(() => import('@/components/project/ProjectWorkspace'), {
  loading: () => <ProjectWorkspaceSkeleton />,
  ssr: false,
});
```

#### 4.2 Analyze and Optimize Bundle
```bash
# Add to package.json
"analyze": "ANALYZE=true next build"

# Install @next/bundle-analyzer
npm install --save-dev @next/bundle-analyzer
```

#### 4.3 Lazy Load Heavy Dependencies
```typescript
// Instead of:
import * as XLSX from 'xlsx';

// Use:
const XLSX = await import('xlsx');
```

### 5. Real-time Subscriptions Optimization

**Problem:**
- Multiple realtime subscriptions per page
- No subscription cleanup in some cases
- Subscriptions may be firing too frequently

**Evidence Found:**
- `ProjectWorkspace.tsx`: Multiple subscriptions (project resume, borrower resume)
- `useMeetings.ts`: Global subscription for all meetings
- `useNotifications.ts`: Global subscription

**Recommendations:**

#### 5.1 Consolidate Subscriptions
```typescript
// Instead of multiple channels, use one channel with multiple filters
const channel = supabase
  .channel(`project-${projectId}`)
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'project_resumes',
    filter: `project_id=eq.${projectId}` 
  }, handleProjectResumeChange)
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'borrower_resumes',
    filter: `project_id=eq.${projectId}` 
  }, handleBorrowerResumeChange);
```

#### 5.2 Debounce Subscription Handlers
```typescript
const debouncedUpdate = useMemo(
  () => debounce((data) => {
    updateContentIfChanged(data);
  }, 500),
  []
);
```

### 6. Image and Asset Loading

**Problem:**
- Images loaded without optimization
- No lazy loading strategy
- Large images loaded upfront

**Evidence Found:**
- Images loaded via Supabase storage with signed URLs
- `ImagePreviewModal`: Preloads all images (could be optimized)

**Recommendations:**

#### 6.1 Implement Image Optimization
```typescript
// Use Next.js Image component everywhere
import Image from 'next/image';

// Add to next.config.ts
images: {
  domains: ['*.supabase.co'],
  formats: ['image/avif', 'image/webp'],
  deviceSizes: [640, 750, 828, 1080, 1200],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
}
```

#### 6.2 Lazy Load Images Below Fold
```typescript
// Use intersection observer for lazy loading
import { useInView } from 'react-intersection-observer';

const { ref, inView } = useInView({
  triggerOnce: true,
  threshold: 0.1,
});
```

### 7. Form Validation Performance

**Problem:**
- Real-time validation on every keystroke (even with debounce)
- Multiple sanity checks in parallel
- Validation API calls on every field change

**Evidence Found:**
- `EnhancedProjectForm.tsx`: 1000ms debounce but still validates many fields (line 1927)
- `DebouncedSanityChecker`: Batch validation but still makes API calls

**Recommendations:**

#### 7.1 Optimize Validation Strategy
- Only validate on blur (not on change)
- Validate on submit
- Use client-side validation first, then server-side on submit
- Cache validation results for unchanged fields

#### 7.2 Reduce Validation API Calls
```typescript
// Group validations by section, not individual fields
// Validate only when user moves to next section
```

## Medium Priority Issues

### 8. Polling Optimization

**Problem:**
- `useAutofill.ts`: Polls every 5 seconds (POLL_INTERVAL)
- Could use WebSockets or Server-Sent Events instead

**Recommendation:**
- Replace polling with WebSocket notifications
- Or use Server-Sent Events for progress updates

### 9. State Management Optimization

**Problem:**
- Multiple stores and contexts
- Potential for unnecessary re-renders
- No visible memoization strategy

**Recommendations:**
- Use React.memo for expensive components
- Implement proper memoization with useMemo/useCallback (some already done)
- Consider Zustand selectors to prevent unnecessary re-renders

### 10. API Response Compression

**Problem:**
- No visible compression configuration
- Large JSON responses

**Recommendations:**
- Enable gzip/brotli compression in FastAPI
- Compress API responses in Next.js API routes
- Use streaming for large responses

## Implementation Priority

### Phase 1: Quick Wins (1-2 weeks)
1. ✅ Add database indexes
2. ✅ Implement query result caching (Redis)
3. ✅ Batch database queries in ProjectWorkspace
4. ✅ Add code splitting for routes
5. ✅ Optimize image loading

### Phase 2: Medium Term (2-4 weeks)
6. ✅ Create batch API endpoints
7. ✅ Cache JWT validation
8. ✅ Optimize real-time subscriptions
9. ✅ Reduce form validation calls
10. ✅ Enable API compression

### Phase 3: Long Term (1-2 months)
11. ✅ Replace polling with WebSockets
12. ✅ Implement comprehensive caching strategy
13. ✅ Bundle size optimization
14. ✅ Performance monitoring and alerting

## Expected Performance Improvements

| Optimization | Expected Improvement |
|-------------|---------------------|
| Database indexes | 30-50% faster queries |
| Query batching | 40-60% reduction in load time |
| JWT caching | 20-30% faster API responses |
| Code splitting | 30-40% faster initial load |
| Image optimization | 50-70% faster image loads |
| Subscription optimization | 20-30% reduction in network traffic |
| **Overall** | **60-80% faster platform** |

## Monitoring & Metrics

### Key Metrics to Track
1. Time to First Byte (TTFB)
2. First Contentful Paint (FCP)
3. Largest Contentful Paint (LCP)
4. Time to Interactive (TTI)
5. API response times (p50, p95, p99)
6. Database query times
7. Bundle sizes
8. Cache hit rates

### Tools
- Next.js Analytics
- Web Vitals
- Sentry Performance Monitoring
- Database query logging
- Redis monitoring

## Next Steps

1. **Review this plan** with the team
2. **Prioritize** based on current pain points
3. **Create tickets** for Phase 1 items
4. **Set up monitoring** to measure improvements
5. **Implement incrementally** and measure impact


