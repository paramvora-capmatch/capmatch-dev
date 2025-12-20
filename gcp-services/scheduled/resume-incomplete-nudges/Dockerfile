FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install uv
RUN pip install --no-cache-dir uv

# Copy dependencies
COPY pyproject.toml ./
RUN uv pip install --system --no-cache -r pyproject.toml

# Copy source code
COPY *.py ./

# Run
CMD ["python", "main.py"]
