#!/bin/bash

set -e

# Function to log messages
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [coding-agent] $1"
}

# Check required environment variables
if [ -z "$OPENAI_API_KEY" ]; then
    log "ERROR: OPENAI_API_KEY environment variable is required"
    exit 1
fi

if [ -z "$REPO_URL" ]; then
    log "ERROR: REPO_URL environment variable is required"
    exit 1
fi

if [ -z "$PROMPT_FILE" ]; then
    log "ERROR: PROMPT_FILE environment variable is required"
    exit 1
fi

# Create output directory
mkdir -p /workspace/output

# Clone the repository
log "Cloning repository: $REPO_URL"
git clone "$REPO_URL" /workspace/repo
cd /workspace/repo

# Configure git
git config user.name "Cloud Vibecoder"
git config user.email "bot@cloudvibecoder.com"

# Create a new branch for the changes
BRANCH_NAME="cloud-vibecoder-$(date +%s)"
git checkout -b "$BRANCH_NAME"
log "Created branch: $BRANCH_NAME"

# Read the prompt
PROMPT=$(cat "$PROMPT_FILE")
log "Executing coding agent with prompt length: ${#PROMPT}"

# Execute aider with the prompt
log "Starting Aider execution..."
aider --model "$AIDER_MODEL" --message "$PROMPT" --yes --no-auto-commits

# Check if any files were modified
if git diff --quiet; then
    log "No changes made by the coding agent"
    echo '{"status": "no_changes", "branch": "'"$BRANCH_NAME"'", "files_modified": []}' > /workspace/output/result.json
else
    # Get list of modified files
    MODIFIED_FILES=$(git diff --name-only)
    log "Files modified: $MODIFIED_FILES"
    
    # Commit the changes
    git add .
    git commit -m "Automated changes by Cloud Vibecoder

- Generated from: $PROMPT
- Branch: $BRANCH_NAME
- Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    
    # Create result JSON
    cat > /workspace/output/result.json << EOF
{
    "status": "success",
    "branch": "$BRANCH_NAME",
    "files_modified": [$(echo "$MODIFIED_FILES" | sed 's/.*/"&"/' | paste -sd, -)],
    "commit_hash": "$(git rev-parse HEAD)",
    "diff": "$(git diff HEAD~1 HEAD | base64 -w 0)"
}
EOF
    
    log "Changes committed successfully"
fi

# Copy result to output location
cp /workspace/output/result.json /shared/result.json

log "Coding agent execution completed"
