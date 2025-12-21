# CapMatch FastAPI Server

FastAPI server for CapMatch, migrated from Supabase Edge Functions to GCP.

## Overview

This server provides REST API endpoints for CapMatch, replacing Supabase Edge Functions with a Python FastAPI application deployed on GCP VM.

### Phase 1 - Complete ✅

**Migrated Endpoints:**
- `POST /auth/validate-invite` - Validate invite tokens
- `POST /users/invite` - Invite users to organizations
- `POST /users/remove` - Remove users from organizations

**Infrastructure:**
- FastAPI with async/await support
- JWT authentication middleware
- Structured JSON logging
- CORS configuration
- Global error handling
- Supabase client integration
- Docker containerization
- Systemd service management

## Project Structure

```
gcp-services/api/
├── main.py                    # FastAPI app entry point
├── config.py                  # Environment configuration
├── logging_config.py          # Structured logging
├── requirements.txt           # Python dependencies
├── Dockerfile                 # Production image
├── docker-compose.yml         # Local development
├── .env.example              # Environment template
├── setup-vm.sh               # VM deployment script
├── start.sh                  # Container startup script
│
├── middleware/
│   ├── auth.py               # JWT authentication
│   ├── cors.py               # CORS configuration
│   └── error_handler.py      # Global error handling
│
├── models/
│   └── auth.py               # Pydantic request/response models
│
├── routes/
│   ├── auth.py               # Authentication endpoints
│   └── users.py              # User management endpoints
│
├── services/
│   └── supabase_client.py    # Supabase client singleton
│
└── utils/
    └── (future utilities)
```

## Local Development

### Prerequisites

- Python 3.13+
- Docker (optional, but recommended)
- Supabase project (local or cloud)

### Setup

1. **Clone the repository and navigate to the API directory:**

```bash
cd gcp-services/api
```

2. **Create `.env` file from template:**

```bash
cp .env.example .env
```

3. **Update `.env` with your credentials:**

```bash
# Required
SUPABASE_URL=http://127.0.0.1:54321  # Local Supabase or production URL
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Optional (for future endpoints)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GEMINI_API_KEY=your-gemini-key
DAILY_WEBHOOK_SECRET=your-daily-secret

# CORS
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Run with Docker (Recommended)

```bash
# Build and run
docker-compose up --build

# Or run in background
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Run without Docker

```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
python main.py

# Or use uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8080
```

### API Documentation

Once running, access the interactive API documentation:

- **Swagger UI**: http://localhost:8080/docs
- **ReDoc**: http://localhost:8080/redoc

### Testing Endpoints

```bash
# Health check
curl http://localhost:8080/health

# Validate invite (no auth required)
curl -X POST http://localhost:8080/auth/validate-invite \
  -H "Content-Type: application/json" \
  -d '{"token": "your-invite-token"}'

# Invite user (requires auth)
curl -X POST http://localhost:8080/users/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "email": "user@example.com",
    "org_id": "org-id",
    "role": "member"
  }'

# Remove user (requires auth)
curl -X POST http://localhost:8080/users/remove \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "user_id": "user-id-to-remove",
    "org_id": "org-id"
  }'
```

## Production Deployment (GCP VM)

### Prerequisites

- GCP VM with Docker installed
- Repository cloned to VM
- `.env` file configured with production credentials

### Deployment Steps

1. **SSH to your GCP VM:**

```bash
ssh your-vm-name
```

2. **Navigate to the API directory:**

```bash
cd /path/to/capmatch/gcp-services/api
```

3. **Create production `.env` file:**

```bash
cat > .env << EOF
ENVIRONMENT=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-production-key
SUPABASE_ANON_KEY=your-anon-key
CORS_ORIGINS=https://yourdomain.com
LOG_LEVEL=INFO
EOF

# Secure the file
chmod 600 .env
```

4. **Run the setup script:**

```bash
chmod +x setup-vm.sh start.sh
./setup-vm.sh
```

This will:
- Build the Docker image
- Create a systemd service
- Start the API server on port 8080
- Enable auto-restart on failure/reboot

### Manage the Service

```bash
# Check status
sudo systemctl status capmatch-api

# Restart
sudo systemctl restart capmatch-api

# Stop
sudo systemctl stop capmatch-api

# View logs
sudo journalctl -u capmatch-api -f

# View recent logs
sudo journalctl -u capmatch-api -n 100 --no-pager
```

### Update Deployment

```bash
# Pull latest code
cd /path/to/capmatch
git pull origin main

# Rebuild and restart
cd gcp-services/api
./setup-vm.sh
```

## API Endpoints

### Authentication

#### `POST /auth/validate-invite`

Validate an invite token.

**Request:**
```json
{
  "token": "invite-token-here"
}
```

**Response:**
```json
{
  "valid": true,
  "orgName": "Company Name",
  "inviterName": "John Doe",
  "email": "invited@example.com"
}
```

**Auth Required:** No

---

### User Management

#### `POST /users/invite`

Invite a user to an organization.

**Request:**
```json
{
  "email": "user@example.com",
  "org_id": "org-uuid",
  "role": "member",
  "project_grants": [
    {
      "projectId": "project-uuid",
      "permissions": ["read", "edit"]
    }
  ],
  "org_grants": {
    "permissions": ["view_all_projects"]
  }
}
```

**Response:**
```json
{
  "invite": {
    "id": "invite-uuid",
    "token": "invite-token",
    "expires_at": "2025-01-01T00:00:00Z",
    ...
  }
}
```

**Auth Required:** Yes (Bearer token, org owner only)

---

#### `POST /users/remove`

Remove a user from an organization.

**Request:**
```json
{
  "user_id": "user-uuid-to-remove",
  "org_id": "org-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User removed successfully"
}
```

**Auth Required:** Yes (Bearer token, org owner only)

**Constraints:**
- Cannot remove the last owner
- Calling user must be an org owner

---

## Health Checks

### `GET /health`

Basic health check.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

### `GET /health/liveness`

Kubernetes liveness probe.

**Response:**
```json
{
  "status": "alive"
}
```

### `GET /health/readiness`

Kubernetes readiness probe (checks dependencies).

**Response:**
```json
{
  "status": "ready",
  "checks": {
    "supabase": "ok"
  }
}
```

## Logging

The server uses structured JSON logging for all requests and operations.

**Log Format:**
```json
{
  "timestamp": "2025-12-21T10:30:00.123456Z",
  "level": "INFO",
  "logger": "routes.auth",
  "message": "Validate invite request received",
  "module": "auth",
  "function": "validate_invite",
  "line": 45,
  "request_id": "uuid-here",
  "has_token": true
}
```

**Extra Context Fields:**
- `request_id` - Unique request identifier
- `user_id` - Authenticated user ID
- `org_id` - Organization ID
- `project_id` - Project ID
- `duration_ms` - Request duration

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `ENVIRONMENT` | No | Environment name | `development` |
| `VERSION` | No | API version | `1.0.0` |
| `LOG_LEVEL` | No | Logging level | `INFO` |
| `HOST` | No | Server host | `0.0.0.0` |
| `PORT` | No | Server port | `8080` |
| `SUPABASE_URL` | Yes | Supabase project URL | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (secret) | - |
| `SUPABASE_ANON_KEY` | Yes | Anon key | - |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID | - |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret | - |
| `GEMINI_API_KEY` | No | Google Gemini API key | - |
| `DAILY_WEBHOOK_SECRET` | No | Daily.co webhook secret | - |
| `CORS_ORIGINS` | No | Comma-separated CORS origins | `http://localhost:3000` |

## Migration Status

### Phase 1 - Complete ✅

- [x] FastAPI infrastructure setup
- [x] Authentication middleware (JWT)
- [x] Supabase client integration
- [x] CORS and error handling
- [x] Structured JSON logging
- [x] Docker containerization
- [x] `validate-invite` endpoint
- [x] `invite-user` endpoint
- [x] `remove-user` endpoint

### Phase 2 - Planned (Project Operations)

- [ ] `create-project` endpoint
- [ ] `update-project` endpoint
- [ ] `copy-borrower-profile` endpoint
- [ ] Project utilities (Python migration)
- [ ] Domain events service

### Phase 3 - Planned (Chat & Calendar)

- [ ] `manage-chat-thread` endpoint
- [ ] `update-calendar-response` endpoint
- [ ] Calendar utilities (Python migration)

### Phase 4 - Planned (Complex Auth & Webhooks)

- [ ] `onboard-borrower` endpoint
- [ ] `accept-invite` endpoint
- [ ] `update-member-permissions` endpoint
- [ ] `daily-webhook` endpoint
- [ ] Gemini utilities (Python migration)

## Troubleshooting

### "Supabase connection failed"

- Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`
- Ensure Supabase is accessible from your network
- For local dev, ensure Supabase is running (`supabase status`)

### "Authentication failed"

- Ensure Authorization header is present: `Authorization: Bearer YOUR_TOKEN`
- Token must be a valid Supabase JWT
- Check token hasn't expired

### Docker build fails

- Ensure you have enough disk space
- Try clearing Docker cache: `docker system prune -a`
- Check Python version in Dockerfile matches installed version

### Port 8080 already in use

- Change port in `.env`: `PORT=8081`
- Or stop the conflicting process: `sudo lsof -ti:8080 | xargs kill`

## Contributing

When adding new endpoints:

1. Create Pydantic models in `models/`
2. Implement route handler in `routes/`
3. Register router in `main.py`
4. Update this README with endpoint documentation
5. Test locally with `docker-compose up`

## Security

- **Never commit `.env` files** - Already in `.gitignore`
- **Use different credentials for dev/prod** - Keep production keys secure
- **Rotate service role keys periodically** - Update in Supabase dashboard
- **Use `chmod 600 .env`** - Restrict file permissions on production

## Support

For issues or questions:
- Check logs: `sudo journalctl -u capmatch-api -f`
- Verify health: `curl http://localhost:8080/health`
- Check Swagger docs: `http://localhost:8080/docs`
