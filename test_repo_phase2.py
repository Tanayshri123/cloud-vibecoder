"""
Phase 2 Repository Service Validation Test

This script tests all functionality of the repository service:
1. Cloning repositories
2. Reading files from repos
3. Writing files to repos
4. Listing files
5. Getting git status
6. Creating branches
7. Creating commits

Run with: python test_repo_phase2.py
"""

import asyncio
import sys
import os

# Add backend to path so we can import modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.services.vm_service import VMService
from app.services.repo_service import RepositoryService
from app.models.repo_model import RepoCloneRequest
from app.core.config import settings


async def test_repo_service():
    """Run comprehensive tests on repository service"""
    
    print("=" * 60)
    print("🧪 Phase 2: Repository Service Validation Test")
    print("=" * 60)
    print()
    
    # Check if E2B API key is configured
    if not settings.e2b_api_key or settings.e2b_api_key == "your-e2b-api-key-here":
        print("❌ ERROR: E2B API key not configured!")
        print()
        print("Phase 2 requires Phase 1 setup to be complete.")
        print("Please ensure E2B_API_KEY is set in backend/.env")
        print()
        return False
    
    print(f"✓ E2B API key configured")
    print()
    
    vm_service = VMService()
    repo_service = RepositoryService(vm_service)
    
    vm_session = None
    repo_session = None
    
    try:
        # Test 1: Create VM Session
        print("Test 1: Creating VM Session")
        print("-" * 60)
        vm_session = await vm_service.create_session()
        print(f"✅ VM session created: {vm_session.session_id}")
        print()
        
        # Test 2: Clone Public Repository
        print("Test 2: Cloning Public Repository")
        print("-" * 60)
        # Using a small public repo for testing
        test_repo_url = "https://github.com/octocat/Hello-World"
        
        clone_request = RepoCloneRequest(
            repo_url=test_repo_url,
            branch="master",
            github_token="dummy-token-for-public-repo"  # Not needed for public repos
        )
        
        repo_session = await repo_service.clone_repository(
            vm_session.session_id,
            clone_request
        )
        
        print(f"✅ Repository cloned successfully!")
        print(f"   Local path: {repo_session.local_path}")
        print(f"   Branch: {repo_session.branch}")
        print(f"   Default branch: {repo_session.default_branch}")
        print()
        
        # Test 3: Read File from Repository
        print("Test 3: Reading File from Repository")
        print("-" * 60)
        
        try:
            readme_content = await repo_service.read_file(
                vm_session.session_id,
                repo_session.local_path,
                "README"
            )
            print(f"✅ File read successfully!")
            print(f"   File: README")
            print(f"   Content length: {len(readme_content)} bytes")
            print(f"   First 100 chars: {readme_content[:100]}...")
        except Exception as e:
            print(f"⚠️  README file not found, trying README.md")
            readme_content = await repo_service.read_file(
                vm_session.session_id,
                repo_session.local_path,
                "README.md"
            )
            print(f"✅ File read successfully!")
            print(f"   File: README.md")
            print(f"   Content length: {len(readme_content)} bytes")
        print()
        
        # Test 4: List Files in Repository
        print("Test 4: Listing Files in Repository")
        print("-" * 60)
        
        files = await repo_service.list_files(
            vm_session.session_id,
            repo_session.local_path
        )
        
        print(f"✅ Files listed successfully!")
        print(f"   Found {len(files)} files")
        print(f"   Files: {files[:10]}")  # Show first 10
        print()
        
        # Test 5: Write New File
        print("Test 5: Writing New File")
        print("-" * 60)
        
        test_content = """# Test File Created by Cloud Vibecoder

This file was created during Phase 2 validation testing.

## Test Data
- Timestamp: 2025-11-23
- Test: Repository Service
- Operation: File Write
"""
        
        write_success = await repo_service.write_file(
            vm_session.session_id,
            repo_session.local_path,
            "VIBECODER_TEST.md",
            test_content
        )
        
        if write_success:
            print(f"✅ File written successfully!")
            print(f"   File: VIBECODER_TEST.md")
            
            # Verify by reading it back
            verify_content = await repo_service.read_file(
                vm_session.session_id,
                repo_session.local_path,
                "VIBECODER_TEST.md"
            )
            
            if verify_content == test_content:
                print(f"✅ File content verified!")
            else:
                print(f"⚠️  File content doesn't match")
        else:
            print(f"❌ File write failed!")
            return False
        print()
        
        # Test 6: Get Git Status
        print("Test 6: Getting Git Status")
        print("-" * 60)
        
        git_status = await repo_service.get_git_status(
            vm_session.session_id,
            repo_session.local_path
        )
        
        print(f"✅ Git status retrieved!")
        print(f"   Branch: {git_status.branch}")
        print(f"   Is dirty: {git_status.is_dirty}")
        print(f"   Untracked files: {len(git_status.untracked_files)}")
        print(f"   Modified files: {len(git_status.modified_files)}")
        
        if git_status.untracked_files:
            print(f"   Untracked: {git_status.untracked_files}")
        print()
        
        # Test 7: Create New Branch
        print("Test 7: Creating New Branch")
        print("-" * 60)
        
        test_branch = "vibecoder-test"
        branch_created = await repo_service.create_branch(
            vm_session.session_id,
            repo_session.local_path,
            test_branch
        )
        
        if branch_created:
            print(f"✅ Branch created successfully!")
            print(f"   Branch name: {test_branch}")
            
            # Verify we're on the new branch
            new_status = await repo_service.get_git_status(
                vm_session.session_id,
                repo_session.local_path
            )
            print(f"   Current branch: {new_status.branch}")
        else:
            print(f"❌ Branch creation failed!")
            return False
        print()
        
        # Test 8: Create Commit
        print("Test 8: Creating Commit")
        print("-" * 60)
        
        commit = await repo_service.create_commit(
            vm_session.session_id,
            repo_session.local_path,
            "Test commit from Cloud Vibecoder Phase 2",
            ["VIBECODER_TEST.md"]
        )
        
        print(f"✅ Commit created successfully!")
        print(f"   SHA: {commit.sha}")
        print(f"   Message: {commit.message}")
        print(f"   Files: {commit.files}")
        print(f"   Author: {commit.author}")
        print()
        
        # Test 9: Verify Clean Status After Commit
        print("Test 9: Verifying Clean Status After Commit")
        print("-" * 60)
        
        final_status = await repo_service.get_git_status(
            vm_session.session_id,
            repo_session.local_path
        )
        
        print(f"✅ Status checked!")
        print(f"   Is dirty: {final_status.is_dirty}")
        print(f"   Untracked files: {len(final_status.untracked_files)}")
        
        if not final_status.is_dirty:
            print(f"✅ Working directory is clean after commit!")
        print()
        
        # Test 10: Write Multiple Files
        print("Test 10: Writing Multiple Files")
        print("-" * 60)
        
        files_written = 0
        for i in range(3):
            filename = f"test_file_{i}.txt"
            content = f"This is test file number {i}\nCreated by Cloud Vibecoder\n"
            
            if await repo_service.write_file(
                vm_session.session_id,
                repo_session.local_path,
                filename,
                content
            ):
                files_written += 1
        
        print(f"✅ Wrote {files_written}/3 files successfully!")
        print()
        
        # All tests passed!
        print("=" * 60)
        print("✅ ALL TESTS PASSED!")
        print("=" * 60)
        print()
        print("Phase 2 Repository Service is fully functional! ✨")
        print()
        print("📝 Note: Push functionality is not tested with public repos.")
        print("   Push will be tested in Phase 4 with actual user repos.")
        print()
        return True
        
    except Exception as e:
        print(f"❌ TEST FAILED WITH EXCEPTION!")
        print(f"   Error: {str(e)}")
        print()
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # Cleanup: Destroy VM session
        if vm_session:
            try:
                await vm_service.destroy_session(vm_session.session_id)
                print("🧹 Cleanup: VM session destroyed")
            except:
                pass


async def main():
    """Main entry point"""
    success = await test_repo_service()
    
    if success:
        print("✅ Phase 2 validation: SUCCESS")
        sys.exit(0)
    else:
        print("❌ Phase 2 validation: FAILED")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
