# Phase 1 Setup Guide

## ✅ Dependencies Installed

The following packages have been installed in your backend venv:
- `e2b-code-interpreter` (VM infrastructure)
- `GitPython` (Git operations)
- `PyGithub` (GitHub API)

## 🔑 Get Your E2B API Key

**E2B provides isolated cloud sandboxes for code execution.**

### Step 1: Sign Up for E2B
1. Go to: https://e2b.dev
2. Click "Sign Up" or "Get Started"
3. Create an account (you can use GitHub OAuth)

### Step 2: Get API Key
1. Once logged in, go to: https://e2b.dev/dashboard
2. Navigate to "API Keys" section
3. Create a new API key
4. Copy the key (it starts with `e2b_`)

### Step 3: Configure Your Environment
1. Create a `.env` file in the `backend/` directory:
   ```bash
   cd backend
   cp ../.env.example .env
   ```

2. Edit `.env` and add your E2B API key:
   ```
   E2B_API_KEY=e2b_xxxxxxxxxxxxxxxxxxxxx
   ```

3. Verify your `.env` file contains:
   ```
   APP_ENV=dev
   CORS_ORIGINS=http://localhost:8081
   OPENAI_API_KEY=key-goes-here
   
   # Phase 1: VM Infrastructure
   E2B_API_KEY=e2b_xxxxxxxxxxxxxxxxxxxxx
   VM_TIMEOUT_SECONDS=600
   ```

## 🧪 Run the Validation Test

Once your E2B API key is configured, run the test:

```bash
cd /Users/namangoyal/Documents/GitHub/cloud-vibecoder
python test_vm_phase1.py
```

The test will:
1. ✓ Create a VM session
2. ✓ Execute shell commands
3. ✓ Execute Python commands
4. ✓ Write files to the VM
5. ✓ Read files from the VM
6. ✓ Execute Python scripts
7. ✓ List directories
8. ✓ Write multiple files
9. ✓ Check session status
10. ✓ Destroy the VM session

## 💰 E2B Pricing

- **Free Tier**: 100 hours of sandbox usage per month
- **Cost**: ~$0.10 per hour after free tier
- **Timeout**: Set to 10 minutes (600 seconds) to prevent runaway costs

For the MVP, the free tier should be more than sufficient for testing and development.

## ❓ Troubleshooting

### "E2B API key not configured"
- Make sure you created the `.env` file in the `backend/` directory (not the root)
- Verify the key is correctly copied (starts with `e2b_`)
- Make sure there are no extra spaces or quotes around the key

### "Failed to create VM session"
- Check your E2B dashboard to verify the API key is active
- Ensure you have internet connectivity
- Check if you've exceeded the free tier limits

### Import errors
- Make sure you're using the virtual environment:
  ```bash
  source backend/venv/bin/activate  # On macOS/Linux
  ```

## 📊 What's Next

After Phase 1 validation passes:
- ✅ Phase 1: VM Infrastructure (COMPLETE)
- 📦 Phase 2: Repository Service (git clone, file ops)
- 🤖 Phase 3: Coding Agent (LLM-powered editing)
- 🎭 Phase 4: Orchestration Service
- 🔀 Phase 5: PR Creation & Mobile Integration
