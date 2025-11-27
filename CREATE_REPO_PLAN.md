# Create New Repository Feature - Implementation Plan

## Overview

Add the ability to create new GitHub repositories directly from Cloud Vibecoder. Users will be able to:
1. **Create a brand new repository** on their GitHub account
2. **Scaffold a new project** with AI-generated code
3. **Push the initial codebase** to the new repository

---

## Current Architecture Summary

| Component | File | Purpose |
|-----------|------|---------|
| GitHub Service | `backend/app/services/github_service.py` | GitHub API interactions |
| Repo Service | `backend/app/services/repo_service.py` | Clone, read, write, commit, push |
| Orchestration | `backend/app/services/orchestration_service.py` | Job orchestration |
| Main Screen | `mobile/app/(tabs)/index.tsx` | Repo selection & workflow |
| GitHub Client | `mobile/services/githubService.ts` | Frontend GitHub API |

**OAuth Scopes:** `['read:user', 'user:email', 'repo']` — ✅ Already includes repo creation permission

---

## Phase 1: Backend - Models & API Endpoint

### 1.1 Add New Models
**File:** `backend/app/models/repo_model.py`

- `RepoCreateRequest` - name, description, private, auto_init, gitignore_template, license_template, github_token
- `RepoCreateResponse` - success, repo_url, full_name, html_url, clone_url, ssh_url, default_branch, error_message

**Effort:** 30 min

### 1.2 Add GitHub Service Method
**File:** `backend/app/services/github_service.py`

- `create_repository()` - Create repo via PyGithub `user.create_repo()`
- `get_gitignore_templates()` - Fetch available gitignore templates
- `get_license_templates()` - Fetch available license templates

**Effort:** 1 hour

### 1.3 Add API Endpoints
**File:** `backend/app/api/github.py`

- `POST /github/create-repo` - Create new repository
- `GET /github/templates/gitignore` - List gitignore templates
- `GET /github/templates/licenses` - List license templates

**Effort:** 45 min

---

## Phase 2: Backend - Orchestration Updates

### 2.1 Update Orchestration Models
**File:** `backend/app/models/orchestration_model.py`

Add to `OrchestrationRequest`:
```python
create_new_repo: bool = False
new_repo_config: Optional[NewRepoConfig] = None
```

Where `NewRepoConfig` contains: name, description, private, gitignore_template, license_template

**Effort:** 30 min

### 2.2 Update Orchestration Service
**File:** `backend/app/services/orchestration_service.py`

Modify `execute_job()`:
1. If `create_new_repo=True`:
   - Call `github_service.create_repository()`
   - Use returned URL for cloning
2. Clone repository (existing or newly created)
3. Execute coding agent
4. Push changes

Add new job status: `JobStatus.CREATING_REPO`

**Effort:** 1.5 hours

---

## Phase 3: Frontend - UI Components

### 3.1 Repository Mode Selector
**File:** `mobile/components/RepoModeSelector.tsx` (new)

Toggle between "Edit Existing" and "Create New" modes with visual tabs.

**Effort:** 45 min

### 3.2 New Repository Form
**File:** `mobile/components/NewRepoForm.tsx` (new)

Form fields:
- Repository name (required, validated)
- Description (optional)
- Private toggle
- Gitignore template dropdown
- License template dropdown

**Effort:** 1.5 hours

### 3.3 Update Main Screen
**File:** `mobile/app/(tabs)/index.tsx`

Changes:
1. Add state: `repoMode`, `newRepoConfig`
2. Render mode selector when authenticated
3. Conditionally show existing repo dropdown OR new repo form
4. Update `handleAcceptPlan()` to pass `create_new_repo` flag and config

**Effort:** 2 hours

---

## Phase 4: Frontend - GitHub Service

### 4.1 Add Methods to GitHub Service
**File:** `mobile/services/githubService.ts`

```typescript
createRepository(name, description?, isPrivate?, autoInit?, gitignoreTemplate?, licenseTemplate?)
getGitignoreTemplates(): Promise<string[]>
getLicenseTemplates(): Promise<{key: string; name: string}[]>
checkRepoNameAvailable(name: string): Promise<boolean>
```

**Effort:** 1 hour

---

## Phase 5: Agent Scaffolding Enhancements

### 5.1 Add Scaffolding Tools
**File:** `backend/app/services/agent_tools.py`

- `scaffold_project(project_type, project_name, features)` - Create project structure
- Templates for: React, Node, Python, FastAPI projects

**Effort:** 3 hours

### 5.2 Update Plan Synthesis
**File:** `backend/app/services/plan_synthesis_service.py`

When `create_new_repo=True`:
- Detect project type from description
- Generate scaffolding steps (structure, config, source files)
- Add `step_type: "scaffold"` support

**Effort:** 2 hours

---

## Phase 6: Testing

### 6.1 Backend Tests
- Test `create_repository()` success/failure
- Test orchestration with new repo mode
- Test validation (duplicate names, invalid names)

### 6.2 Frontend Tests
- Test mode switching
- Test form validation
- Test API integration

### 6.3 Integration Tests
- Full flow: Create repo → Generate plan → Execute → Push

**Effort:** 3 hours

---

## Phase 7: Documentation & Polish

### 7.1 Update README.md
- Document new feature
- Add API endpoint documentation

### 7.2 Error Handling
- GitHub API rate limits
- Repository name conflicts
- Network failures

### 7.3 UX Improvements
- Loading states during repo creation
- Success/error feedback
- Name availability check (debounced)

**Effort:** 2 hours

---

## Implementation Order

| Priority | Task | Phase | Effort |
|----------|------|-------|--------|
| 1 | Backend models | 1.1 | 30 min |
| 2 | GitHub service methods | 1.2 | 1 hour |
| 3 | API endpoints | 1.3 | 45 min |
| 4 | Frontend GitHub service | 4.1 | 1 hour |
| 5 | Mode selector component | 3.1 | 45 min |
| 6 | New repo form component | 3.2 | 1.5 hours |
| 7 | Update main screen | 3.3 | 2 hours |
| 8 | Orchestration models | 2.1 | 30 min |
| 9 | Orchestration service | 2.2 | 1.5 hours |
| 10 | Agent scaffolding | 5.1-5.2 | 5 hours |
| 11 | Testing | 6.x | 3 hours |
| 12 | Documentation | 7.x | 2 hours |

**Total Estimated Effort:** ~19 hours

---

## API Contract

### Create Repository Endpoint

**POST** `/api/github/create-repo`

Request:
```json
{
  "name": "my-new-project",
  "description": "A cool new project",
  "private": false,
  "auto_init": true,
  "gitignore_template": "Node",
  "license_template": "mit",
  "github_token": "ghp_..."
}
```

Response:
```json
{
  "success": true,
  "repo_url": "https://github.com/user/my-new-project",
  "full_name": "user/my-new-project",
  "html_url": "https://github.com/user/my-new-project",
  "clone_url": "https://github.com/user/my-new-project.git",
  "ssh_url": "git@github.com:user/my-new-project.git",
  "default_branch": "main"
}
```

### Updated Job Creation Endpoint

**POST** `/api/jobs/create`

Request (new repo mode):
```json
{
  "create_new_repo": true,
  "new_repo_config": {
    "name": "my-new-project",
    "description": "A cool new project",
    "private": false,
    "gitignore_template": "Node",
    "license_template": "mit"
  },
  "github_token": "ghp_...",
  "implementation_plan": { ... },
  "push_changes": true
}
```

---

## Key Considerations

1. **Validation Rules**
   - Repo name: alphanumeric, hyphens, underscores only
   - Max length: 100 characters
   - Must be unique for user

2. **Error Scenarios**
   - Duplicate repository name → Clear error message
   - Rate limit exceeded → Retry guidance
   - Token lacks permissions → Re-auth prompt

3. **UX Flow**
   - Mode selection at top of form
   - Real-time name availability check
   - Clear progress indicators during creation

---

## Files to Create/Modify

### New Files
- `mobile/components/RepoModeSelector.tsx`
- `mobile/components/NewRepoForm.tsx`
- `backend/tests/test_create_repo.py`

### Modified Files
- `backend/app/models/repo_model.py`
- `backend/app/models/orchestration_model.py`
- `backend/app/services/github_service.py`
- `backend/app/services/orchestration_service.py`
- `backend/app/services/agent_tools.py`
- `backend/app/services/plan_synthesis_service.py`
- `backend/app/api/github.py`
- `mobile/app/(tabs)/index.tsx`
- `mobile/services/githubService.ts`
- `README.md`
