FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install dependencies directly with pip
RUN pip install --no-cache-dir python-dotenv supabase

# Copy service code
COPY gcp-services/scheduled/notify-fan-out/*.py ./

# Default command
CMD ["python", "main.py"]
