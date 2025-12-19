FROM python:3.13-slim

# 1. Setup standard python env vars
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# 2. Install uv (using the COPY method is best/fastest)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# 3. Copy dependencies (relative to repo root build context)
COPY gcp-services/email-notifications/pyproject.toml gcp-services/email-notifications/uv.lock ./

# 4. Create venv and install dependencies
# uv automatically creates .venv in the current directory
RUN uv sync --frozen --no-install-project

# 5. "Activate" the venv for all future commands
ENV PATH="/app/.venv/bin:$PATH"

# 6. Copy service code and email template artifacts
COPY gcp-services/email-notifications/ .
# Templates are already in gcp-services/email-notifications/email-templates/dist/
# so they're included in the COPY above

# Default command - override per entrypoint script
CMD ["uv", "run", "python", "main_hourly.py"]





