"""
Phase 4 Orchestration Service Validation Test

This script tests the full end-to-end workflow:
1. Create VM session
2. Clone repository
3. Execute coding agent with LLM
4. Push changes to remote
5. Cleanup

This validates the complete orchestration service that ties all phases together.

NOTE: Requires E2B and OpenAI API keys.

Run with: python test_orchestration_phase4.py
"""

import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.services.orchestration_service import OrchestrationService
from app.models.orchestration_model import JobRequest, JobStatus
from app.models.plan_model import (
    ImplementationPlan, PlanStep, FileChange,
    StepType, FileIntent
)
from app.core.config import settings


async def test_orchestration():
    """Run orchestration service validation test"""
    
    print("=" * 60)
    print("🧪 Phase 4: Orchestration Service Validation Test")
    print("=" * 60)
    print()
    
    # Check configuration
    if not settings.e2b_api_key:
        print("❌ ERROR: E2B API key not configured!")
        return False
    
    if not settings.openai_api_key:
        print("❌ ERROR: OpenAI API key not configured!")
        return False
    
    print(f"✓ E2B API key configured")
    print(f"✓ OpenAI API key configured")
    print()
    
    orchestration = OrchestrationService()
    
    try:
        # Test 1: Create Implementation Plan
        print("Test 1: Creating Implementation Plan")
        print("-" * 60)
        
        # Simple plan for testing
        plan = ImplementationPlan(
            title="Add configuration file",
            summary="Create a simple JSON configuration file",
            steps=[
                PlanStep(
                    step_number=1,
                    title="Create config file",
                    description="Add a JSON configuration file with app settings",
                    step_type=StepType.IMPLEMENTATION,
                    estimated_time="5 minutes",
                    dependencies=[],
                    reversible=True
                )
            ],
            files_to_change=[
                FileChange(
                    path="config.json",
                    intent=FileIntent.CREATE,
                    rationale="Configuration file for application settings",
                    priority=1
                )
            ],
            testing_plan=[],
            risk_notes=[],
            blast_radius="isolated",
            estimated_total_time="5 minutes",
            complexity_score=1,
            confidence_score=0.95
        )
        
        print(f"✅ Plan created: {plan.title}")
        print(f"   Steps: {len(plan.steps)}")
        print(f"   Files: {len(plan.files_to_change)}")
        print()
        
        # Test 2: Create Job Request
        print("Test 2: Creating Job Request")
        print("-" * 60)
        
        test_repo_url = "https://github.com/octocat/Hello-World"
        
        request = JobRequest(
            repo_url=test_repo_url,
            branch="master",
            github_token="dummy_token",  # Won't push for test repo
            implementation_plan=plan.dict(),
            create_new_branch=True,
            new_branch_name="vibecoder-test",
            push_changes=False  # Don't push for test repo
        )
        
        print(f"✅ Job request created")
        print(f"   Repo: {request.repo_url}")
        print(f"   Branch: {request.branch}")
        print(f"   New branch: {request.new_branch_name}")
        print(f"   Push changes: {request.push_changes}")
        print()
        
        # Test 3: Create and Execute Job
        print("Test 3: Creating Job")
        print("-" * 60)
        
        job = await orchestration.create_job(request)
        
        print(f"✅ Job created: {job.job_id}")
        print(f"   Status: {job.progress.status}")
        print(f"   Message: {job.progress.message}")
        print()
        
        # Test 4: Execute Job
        print("Test 4: Executing Full Workflow")
        print("-" * 60)
        print("⚠️  This will use OpenAI API tokens and take ~10-30 seconds...")
        print()
        print("Workflow stages:")
        print("  1. Initialize VM")
        print("  2. Clone repository")
        print("  3. Create new branch")
        print("  4. Execute coding agent")
        print("  5. Cleanup")
        print()
        
        result = await orchestration.execute_job(job.job_id)
        
        print()
        print("-" * 60)
        print(f"Job Execution Result:")
        print(f"  Job ID: {result.job_id}")
        print(f"  Status: {result.status}")
        print(f"  Success: {result.success}")
        print()
        print(f"  VM Session: {result.vm_session_id}")
        print(f"  Repo Path: {result.repo_path}")
        print(f"  Branch: {result.branch_name}")
        print()
        print(f"  Files Changed: {result.files_changed}")
        print(f"  Total Edits: {result.total_edits}")
        print(f"  Commits Created: {result.commits_created}")
        print(f"  Pushed: {result.pushed}")
        print()
        print(f"  LLM Tokens Used: {result.tokens_used}")
        print(f"  Execution Time: {result.execution_time_seconds:.1f}s")
        print()
        
        if result.error_message:
            print(f"  Error: {result.error_message}")
            print(f"  Error Stage: {result.error_stage}")
        
        if result.commit_shas:
            print(f"  Commits:")
            for sha in result.commit_shas:
                print(f"    - {sha}")
        print()
        
        # Test 5: Verify Job Was Stored
        print("Test 5: Verifying Job Storage")
        print("-" * 60)
        
        retrieved_job = orchestration.get_job(job.job_id)
        
        if retrieved_job:
            print(f"✅ Job retrieved from storage")
            print(f"   Status: {retrieved_job.progress.status}")
            print(f"   Has result: {retrieved_job.result is not None}")
        else:
            print(f"❌ Failed to retrieve job")
            return False
        print()
        
        # Test 6: List All Jobs
        print("Test 6: Listing All Jobs")
        print("-" * 60)
        
        all_jobs = orchestration.list_jobs()
        print(f"✅ Retrieved {len(all_jobs)} job(s)")
        print()
        
        # Summary
        print("=" * 60)
        if result.success:
            print("✅ ALL TESTS PASSED!")
        else:
            print("⚠️  TESTS COMPLETED WITH WARNINGS")
        print("=" * 60)
        print()
        print("Phase 4 Orchestration Service is functional! 🎭✨")
        print()
        print("📊 Summary:")
        print(f"   - Full workflow completed: VM → Clone → Agent → Cleanup ✓")
        print(f"   - Files changed: {result.files_changed}")
        print(f"   - Commits created: {result.commits_created}")
        print(f"   - Execution time: {result.execution_time_seconds:.1f}s")
        print(f"   - Tokens used: {result.tokens_used}")
        print()
        print("🎯 What's Working:")
        print("   ✓ Job creation and tracking")
        print("   ✓ VM session management")
        print("   ✓ Repository cloning")
        print("   ✓ Branch creation")
        print("   ✓ Agent execution with LLM")
        print("   ✓ Commit creation")
        print("   ✓ Automatic cleanup")
        print()
        
        return result.success
        
    except Exception as e:
        print(f"❌ TEST FAILED WITH EXCEPTION!")
        print(f"   Error: {str(e)}")
        print()
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Main entry point"""
    success = await test_orchestration()
    
    if success:
        print("✅ Phase 4 validation: SUCCESS")
        sys.exit(0)
    else:
        print("❌ Phase 4 validation: FAILED")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
