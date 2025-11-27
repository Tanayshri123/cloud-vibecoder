#!/usr/bin/env python3
"""
Quick test script for Phase 1-2: Create Repository Feature

Tests:
1. Model validation (RepoCreateRequest, NewRepoConfig, JobRequest)
2. GitHub service repo name validation
3. API endpoint availability (requires server running)

Usage:
    python test_create_repo.py [--with-token YOUR_GITHUB_TOKEN]
"""

import sys
import asyncio
sys.path.insert(0, '.')

from app.models.repo_model import RepoCreateRequest, RepoCreateResponse
from app.models.orchestration_model import JobRequest, NewRepoConfig, JobStatus
from app.services.github_service import GitHubService


def test_repo_create_request_model():
    """Test RepoCreateRequest model validation"""
    print("\n📋 Testing RepoCreateRequest model...")
    
    # Valid request
    try:
        req = RepoCreateRequest(
            name="test-repo",
            description="A test repository",
            private=False,
            auto_init=True,
            gitignore_template="Python",
            license_template="mit",
            github_token="test_token"
        )
        print(f"  ✅ Valid request created: name={req.name}, private={req.private}")
    except Exception as e:
        print(f"  ❌ Failed to create valid request: {e}")
        return False
    
    # Test name length validation
    try:
        req = RepoCreateRequest(
            name="",  # Empty name should fail
            github_token="test_token"
        )
        print(f"  ❌ Empty name should have failed validation")
        return False
    except Exception as e:
        print(f"  ✅ Empty name correctly rejected: {type(e).__name__}")
    
    # Test max length
    try:
        req = RepoCreateRequest(
            name="a" * 101,  # Too long
            github_token="test_token"
        )
        print(f"  ❌ Name > 100 chars should have failed")
        return False
    except Exception as e:
        print(f"  ✅ Long name correctly rejected: {type(e).__name__}")
    
    return True


def test_repo_create_response_model():
    """Test RepoCreateResponse model"""
    print("\n📋 Testing RepoCreateResponse model...")
    
    # Success response
    try:
        resp = RepoCreateResponse(
            success=True,
            repo_url="https://github.com/user/test-repo",
            full_name="user/test-repo",
            html_url="https://github.com/user/test-repo",
            clone_url="https://github.com/user/test-repo.git",
            ssh_url="git@github.com:user/test-repo.git",
            default_branch="main",
            owner="user"
        )
        print(f"  ✅ Success response: {resp.full_name}")
    except Exception as e:
        print(f"  ❌ Failed: {e}")
        return False
    
    # Error response
    try:
        resp = RepoCreateResponse(
            success=False,
            repo_url="",
            full_name="",
            html_url="",
            clone_url="",
            ssh_url="",
            default_branch="",
            owner="",
            error_message="Repository already exists"
        )
        print(f"  ✅ Error response: {resp.error_message}")
    except Exception as e:
        print(f"  ❌ Failed: {e}")
        return False
    
    return True


def test_new_repo_config_model():
    """Test NewRepoConfig model"""
    print("\n📋 Testing NewRepoConfig model...")
    
    try:
        config = NewRepoConfig(
            name="my-new-project",
            description="A cool project",
            private=True,
            gitignore_template="Node",
            license_template="apache-2.0"
        )
        print(f"  ✅ Config created: name={config.name}, private={config.private}")
        return True
    except Exception as e:
        print(f"  ❌ Failed: {e}")
        return False


def test_job_request_validation():
    """Test JobRequest validation for both modes"""
    print("\n📋 Testing JobRequest validation...")
    
    # Test existing repo mode
    try:
        req = JobRequest(
            repo_url="https://github.com/user/repo",
            branch="main",
            github_token="test_token",
            implementation_plan={"title": "Test", "steps": []},
            create_new_repo=False
        )
        print(f"  ✅ Existing repo mode: repo_url={req.repo_url}")
    except Exception as e:
        print(f"  ❌ Existing repo mode failed: {e}")
        return False
    
    # Test new repo mode
    try:
        req = JobRequest(
            create_new_repo=True,
            new_repo_config=NewRepoConfig(name="new-project"),
            github_token="test_token",
            implementation_plan={"title": "Test", "steps": []}
        )
        print(f"  ✅ New repo mode: new_repo_config.name={req.new_repo_config.name}")
    except Exception as e:
        print(f"  ❌ New repo mode failed: {e}")
        return False
    
    # Test validation: new repo mode without config
    try:
        req = JobRequest(
            create_new_repo=True,
            # Missing new_repo_config
            github_token="test_token",
            implementation_plan={"title": "Test", "steps": []}
        )
        print(f"  ❌ Should have failed: new repo mode without config")
        return False
    except ValueError as e:
        print(f"  ✅ Correctly rejected new repo without config: {e}")
    except Exception as e:
        print(f"  ✅ Correctly rejected (different error type): {type(e).__name__}")
    
    # Test validation: existing repo mode without URL
    try:
        req = JobRequest(
            create_new_repo=False,
            # Missing repo_url
            github_token="test_token",
            implementation_plan={"title": "Test", "steps": []}
        )
        print(f"  ❌ Should have failed: existing repo mode without URL")
        return False
    except ValueError as e:
        print(f"  ✅ Correctly rejected existing repo without URL: {e}")
    except Exception as e:
        print(f"  ✅ Correctly rejected (different error type): {type(e).__name__}")
    
    return True


def test_job_status_enum():
    """Test JobStatus enum has CREATING_REPO"""
    print("\n📋 Testing JobStatus enum...")
    
    try:
        assert hasattr(JobStatus, 'CREATING_REPO'), "Missing CREATING_REPO status"
        print(f"  ✅ CREATING_REPO status exists: {JobStatus.CREATING_REPO.value}")
        
        # List all statuses
        statuses = [s.value for s in JobStatus]
        print(f"  ✅ All statuses: {statuses}")
        return True
    except Exception as e:
        print(f"  ❌ Failed: {e}")
        return False


def test_github_service_name_validation():
    """Test GitHub service repo name validation"""
    print("\n📋 Testing GitHubService name validation...")
    
    service = GitHubService()
    
    test_cases = [
        ("valid-repo-name", True),
        ("my_project_123", True),
        ("CamelCaseRepo", True),
        ("repo.with.dots", True),
        ("", False),  # Empty
        ("-starts-with-hyphen", False),
        (".starts-with-dot", False),
        ("has spaces", False),
        ("has@special#chars", False),
        (".git", False),  # Reserved
        ("a" * 101, False),  # Too long
    ]
    
    all_passed = True
    for name, should_be_valid in test_cases:
        is_valid, error = service._validate_repo_name(name)
        status = "✅" if is_valid == should_be_valid else "❌"
        
        if is_valid != should_be_valid:
            all_passed = False
            
        display_name = name[:30] + "..." if len(name) > 30 else name
        print(f"  {status} '{display_name}': valid={is_valid} (expected={should_be_valid})")
    
    return all_passed


async def test_github_service_with_token(token: str):
    """Test actual GitHub API calls (requires valid token)"""
    print("\n📋 Testing GitHubService with real token...")
    
    service = GitHubService()
    
    # Test get gitignore templates
    try:
        templates = await service.get_gitignore_templates(token)
        print(f"  ✅ Got {len(templates)} gitignore templates")
        print(f"     Sample: {templates[:5]}...")
    except Exception as e:
        print(f"  ❌ Failed to get gitignore templates: {e}")
        return False
    
    # Test get license templates
    try:
        licenses = await service.get_license_templates(token)
        print(f"  ✅ Got {len(licenses)} license templates")
        print(f"     Sample: {[l['key'] for l in licenses[:5]]}...")
    except Exception as e:
        print(f"  ❌ Failed to get license templates: {e}")
        return False
    
    # Test check repo name availability
    try:
        result = await service.check_repo_name_available(token, "definitely-does-not-exist-12345")
        print(f"  ✅ Name availability check: {result}")
    except Exception as e:
        print(f"  ❌ Failed to check name availability: {e}")
        return False
    
    print("\n  ⚠️  Skipping actual repo creation to avoid creating test repos")
    
    return True


def main():
    print("=" * 60)
    print("🧪 Create Repository Feature - Phase 1-2 Tests")
    print("=" * 60)
    
    results = []
    
    # Run model tests
    results.append(("RepoCreateRequest model", test_repo_create_request_model()))
    results.append(("RepoCreateResponse model", test_repo_create_response_model()))
    results.append(("NewRepoConfig model", test_new_repo_config_model()))
    results.append(("JobRequest validation", test_job_request_validation()))
    results.append(("JobStatus enum", test_job_status_enum()))
    results.append(("GitHubService name validation", test_github_service_name_validation()))
    
    # Check for token argument
    token = None
    if "--with-token" in sys.argv:
        idx = sys.argv.index("--with-token")
        if idx + 1 < len(sys.argv):
            token = sys.argv[idx + 1]
    
    if token:
        result = asyncio.run(test_github_service_with_token(token))
        results.append(("GitHubService API calls", result))
    else:
        print("\n💡 Tip: Run with --with-token YOUR_TOKEN to test actual GitHub API calls")
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status}: {name}")
    
    print(f"\n  Total: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Phase 1-2 implementation is working.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please review the output above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
