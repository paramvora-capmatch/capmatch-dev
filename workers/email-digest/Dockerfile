FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv (standalone)
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"

# Copy project files (pyproject/lock first for caching)
COPY pyproject.toml uv.lock ./

# Create a project-local virtual environment based on the lockfile
RUN uv sync --frozen --no-dev

# Ensure the virtual environment's binaries are preferred
ENV VIRTUAL_ENV=/app/.venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Copy application code
COPY . .

# Run the worker using the synced virtual environment
CMD ["python", "main.py"]

