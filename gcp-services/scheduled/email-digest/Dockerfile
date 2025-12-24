FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install uv
RUN pip install --no-cache-dir uv

# Copy dependencies (build context should be from repo root)
COPY gcp-services/scheduled/email-digest/pyproject.toml ./
RUN uv pip install --system --no-cache -r pyproject.toml

# Copy source code
COPY gcp-services/scheduled/email-digest/*.py ./

# Copy email template from email-digest service directory
COPY gcp-services/scheduled/email-digest/email-templates/dist/ email-templates/dist/

# Run
CMD ["python", "main.py"]

