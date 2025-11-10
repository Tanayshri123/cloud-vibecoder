FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \
    aider-chat>=0.24.0 \
    openai>=1.0.0 \
    gitpython>=3.1.40

# Create workspace directory
WORKDIR /workspace

# Create entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV AIDER_MODEL=gpt-4o-mini

ENTRYPOINT ["/entrypoint.sh"]
