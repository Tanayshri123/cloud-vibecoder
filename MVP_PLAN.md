# Cloud Vibecoder - MVP Implementation Plan

## 🎯 Goal
Enable users to make **actual code changes** on their repos by running a coding agent in a VM and creating PRs with real implementations.

---

## 📦 Phase 1: VM Infrastructure Setup

### Install Dependencies
```bash
cd backend
pip install e2b-code-interpreter GitPython PyGithub
```

### Update Files

**`requirements.txt`** - Add:
```
e2b-code-interpreter>=0.0.8
GitPython>=3.1.40
PyGithub>=2.1.1
```

**`backend/app/core/config.py`** - Add to Settings class:
```python
e2b_api_key: Optional[str] = None
vm_timeout_seconds: int = 600
```

**`.env.example`** - Add:
```
E2B_API_KEY=your-key-here
```

### Create New Files

1. **`backend/app/models/vm_model.py`**
   - `VMSession`, `VMStatus`, `VMExecutionResult`

2. **`backend/app/services/vm_service.py`**
   - `create_session()` - Create E2B sandbox
   - `execute_command()` - Run commands in VM
   - `write_file()`, `read_file()` - File operations
   - `destroy_session()` - Cleanup

### ✓ Test: VM can create, execute commands, and cleanup

---

## 📦 Phase 2: Repository Service

### Create New Files

1. **`backend/app/models/repo_model.py`**
   - `RepoCloneRequest`, `RepoSession`, `GitCommit`

2. **`backend/app/services/repo_service.py`**
   - `clone_repository()` - Clone with token auth
   - `read_file()` - Read file from repo
   - `write_file()` - Write file to repo
   - `create_commit()` - Git commit
   - `push_branch()` - Push to GitHub

### ✓ Test: Can clone, read, write, commit, and push

---

## 📦 Phase 3: Coding Agent

### Create New Files

1. **`backend/app/models/agent_model.py`**
   - `FileEdit`, `AgentStepResult`, `AgentExecutionResult`

2. **`backend/app/services/agent_tools.py`**
   - Tool functions: read_file, write_file, list_directory, validate_syntax

3. **`backend/app/services/coding_agent_service.py`** (replace existing)
   - `CodingAgent` class
   - `execute_plan()` - Run all steps
   - `execute_step()` - Run single step
   - `_generate_code_change()` - Use LLM for code generation
   - `_create_commit_for_step()` - Commit after each step

### ✓ Test: Agent reads files, generates code via LLM, writes changes, creates commits

---

## 📦 Phase 4: Orchestration Service

### Create New Files

1. **`backend/app/models/execution_model.py`**
   - `ExecutionRequest`, `ExecutionJob`, `ExecutionStatus`, `ExecutionResult`

2. **`backend/app/services/agent_orchestrator.py`**
   - `start_execution()` - Return job_id
   - `_execute()` - Full workflow:
     1. Create VM
     2. Clone repo
     3. Run agent
     4. Push branch
     5. Cleanup VM

3. **`backend/app/api/agent_execution.py`**
   - `POST /api/agent/execute` - Start execution
   - `GET /api/agent/status/{job_id}` - Get status

4. **Update `backend/app/main.py`**
   - Add: `app.include_router(agent_execution.router, prefix="/api")`

### ✓ Test: Full workflow VM → Clone → Agent → Push works end-to-end

---

## 📦 Phase 5: PR Creation & Mobile Integration

### Backend Files

1. **`backend/app/services/github_service.py`**
   - `create_pull_request()` - Create PR via PyGithub
   - `get_branch_commits()` - List commits

2. **`backend/app/api/github.py`**
   - `POST /api/github/create-pr` - Create PR endpoint
   - `GET /api/github/commits/{owner}/{repo}/{branch}` - Get commits

3. **Update `backend/app/main.py`**
   - Add: `app.include_router(github.router, prefix="/api")`

### Mobile App Changes

**Update `mobile/app/(tabs)/index.tsx` - `handleAcceptPlan` function:**

```typescript
// NEW FLOW:
// 1. POST /api/agent/execute → get job_id
// 2. Poll GET /api/agent/status/{job_id} until completed
// 3. POST /api/github/create-pr with branch_name from job result
// 4. Show PR URL to user
```

### ✓ Test: Mobile creates PR with real code changes

---

## 🗂️ Complete File Structure

```
backend/app/
├── services/
│   ├── vm_service.py              [NEW]
│   ├── repo_service.py            [NEW]
│   ├── agent_tools.py             [NEW]
│   ├── coding_agent_service.py    [REPLACE coding_agent_main.py]
│   ├── agent_orchestrator.py      [NEW]
│   └── github_service.py          [NEW]
├── models/
│   ├── vm_model.py                [NEW]
│   ├── repo_model.py              [NEW]
│   ├── agent_model.py             [NEW]
│   └── execution_model.py         [NEW]
├── api/
│   ├── agent_execution.py         [NEW]
│   └── github.py                  [NEW]
└── core/
    └── config.py                   [UPDATE]

mobile/app/(tabs)/
└── index.tsx                       [UPDATE handleAcceptPlan]
```

---

## 🚀 Implementation Order

1. **Phase 1** - VM Service (1-2 days)
2. **Phase 2** - Repository Service (1-2 days)
3. **Phase 3** - Coding Agent (2-3 days)
4. **Phase 4** - Orchestration (1-2 days)
5. **Phase 5** - PR Creation & Mobile (1 day)

**Total Estimate: 1-2 weeks for MVP**

---

## ⚠️ Critical Notes

- **E2B API Key**: Sign up at e2b.dev and get API key
- **VM Timeout**: Set to 10 minutes (600 seconds) to prevent runaway costs
- **Error Handling**: Always cleanup VM in finally block
- **Token Storage**: Use user's GitHub token from OAuth
- **Job Storage**: Use in-memory dict for MVP (move to Redis/DB later)
- **Background Tasks**: Use FastAPI BackgroundTasks for async execution
- **Security**: Never log tokens, validate all inputs

---

## 🧪 Testing Checklist

- [ ] E2B VM creates and destroys successfully
- [ ] Can clone public and private repos
- [ ] Agent generates code using LLM
- [ ] Commits are created with proper messages
- [ ] Branch pushes to GitHub successfully
- [ ] PR is created with actual code changes
- [ ] Mobile app shows PR URL
- [ ] VM cleanup happens on success AND failure
- [ ] Error messages are clear and helpful

---

## 📊 Success Criteria

**Before MVP:**
- User clicks "Accept Plan"
- Creates PR with only `IMPLEMENTATION_PLAN.md`
- No actual code changes

**After MVP:**
- User clicks "Accept Plan"
- Agent executes in VM
- Real code files are modified
- Commits pushed to branch
- PR created with actual implementation
- **Real code changes visible in PR**
