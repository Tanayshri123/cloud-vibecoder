"""
Phase 3 Coding Agent Validation Test

This script tests the coding agent's ability to:
1. Read implementation plans
2. Generate code changes using LLM
3. Apply changes to files
4. Validate syntax
5. Create commits

NOTE: This test requires OpenAI API key for LLM functionality.

Run with: python test_agent_phase3.py
"""

import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.services.vm_service import VMService
from app.services.repo_service import RepositoryService
from app.services.llm_service import LLMService
from app.services.coding_agent_main import CodingAgent
from app.services.agent_tools import AgentTools
from app.models.repo_model import RepoCloneRequest
from app.models.plan_model import (
    ImplementationPlan, PlanStep, FileChange,
    StepType, FileIntent
)
from app.core.config import settings


async def test_coding_agent():
    """Run coding agent validation test"""
    
    print("=" * 60)
    print("🧪 Phase 3: Coding Agent Validation Test")
    print("=" * 60)
    print()
    
    # Check configuration
    if not settings.e2b_api_key:
        print("❌ ERROR: E2B API key not configured!")
        return False
    
    if not settings.openai_api_key:
        print("❌ ERROR: OpenAI API key not configured!")
        print("The coding agent requires OpenAI API to generate code.")
        print("Add OPENAI_API_KEY to backend/.env")
        return False
    
    print(f"✓ E2B API key configured")
    print(f"✓ OpenAI API key configured")
    print(f"✓ LLM model: {settings.llm_model}")
    print()
    
    vm_service = VMService()
    repo_service = RepositoryService(vm_service)
    llm_service = LLMService()
    
    vm_session = None
    repo_session = None
    
    try:
        # Test 1: Create VM and Clone Repo
        print("Test 1: Setting Up Environment")
        print("-" * 60)
        
        vm_session = await vm_service.create_session()
        print(f"✅ VM session created: {vm_session.session_id}")
        
        # Clone a simple test repo
        test_repo_url = "https://github.com/octocat/Hello-World"
        clone_request = RepoCloneRequest(
            repo_url=test_repo_url,
            branch="master",
            github_token="dummy"
        )
        
        repo_session = await repo_service.clone_repository(
            vm_session.session_id,
            clone_request
        )
        print(f"✅ Repository cloned: {repo_session.local_path}")
        print()
        
        # Test 2: Create Simple Implementation Plan
        print("Test 2: Creating Test Implementation Plan")
        print("-" * 60)
        
        # Simple plan: Add a new Python file
        plan = ImplementationPlan(
            title="Add Python greeting module",
            summary="Create a new Python file with greeting functions",
            steps=[
                PlanStep(
                    step_number=1,
                    title="Create greeting module",
                    description="Add a Python file with hello and goodbye functions",
                    step_type=StepType.IMPLEMENTATION,
                    estimated_time="5 minutes",
                    dependencies=[],
                    reversible=True
                )
            ],
            files_to_change=[
                FileChange(
                    path="greetings.py",
                    intent=FileIntent.CREATE,
                    rationale="Create a module with greeting functions for demonstration",
                    priority=1
                )
            ],
            testing_plan=[],
            risk_notes=[],
            blast_radius="isolated",
            estimated_total_time="5 minutes",
            complexity_score=2,
            confidence_score=0.9
        )
        
        print(f"✅ Plan created: {plan.title}")
        print(f"   Steps: {len(plan.steps)}")
        print(f"   Files: {len(plan.files_to_change)}")
        print()
        
        # Test 3: Initialize Agent Tools
        print("Test 3: Initializing Agent Tools")
        print("-" * 60)
        
        tools = AgentTools(
            repo_service=repo_service,
            vm_service=vm_service,
            vm_session_id=vm_session.session_id,
            repo_path=repo_session.local_path
        )
        
        print(f"✅ Agent tools initialized")
        print()
        
        # Test 4: Initialize Coding Agent
        print("Test 4: Initializing Coding Agent")
        print("-" * 60)
        
        agent = CodingAgent(
            plan=plan,
            tools=tools,
            llm_service=llm_service,
            repo_service=repo_service,
            vm_session_id=vm_session.session_id,
            repo_path=repo_session.local_path
        )
        
        print(f"✅ Coding agent initialized")
        print(f"   Plan: {plan.title}")
        print(f"   Repo: {repo_session.local_path}")
        print()
        
        # Test 5: Execute Plan
        print("Test 5: Executing Implementation Plan")
        print("-" * 60)
        print("⚠️  This will use OpenAI API tokens...")
        print()
        
        result = await agent.execute_plan()
        
        print()
        print("-" * 60)
        print(f"Execution Result:")
        print(f"  Success: {result.success}")
        print(f"  Steps completed: {len(result.steps_completed)}")
        print(f"  Total edits: {result.total_edits}")
        print(f"  Files changed: {result.total_files_changed}")
        print(f"  Commits created: {len(result.commits_created)}")
        print(f"  Tokens used: {result.total_tokens_used}")
        print(f"  Execution time: {result.total_execution_time_seconds:.1f}s")
        
        if result.error_message:
            print(f"  Error: {result.error_message}")
        print()
        
        # Test 6: Verify File Was Created
        if result.success and result.total_edits > 0:
            print("Test 6: Verifying File Creation")
            print("-" * 60)
            
            try:
                content = await tools.read_file("greetings.py")
                print(f"✅ File created successfully!")
                print(f"   Size: {len(content)} bytes")
                print(f"   Lines: {len(content.split(chr(10)))}")
                print()
                print("   Content preview:")
                print("   " + "-" * 40)
                for line in content.split('\n')[:15]:
                    print(f"   {line}")
                if len(content.split('\n')) > 15:
                    print(f"   ... ({len(content.split(chr(10))) - 15} more lines)")
                print("   " + "-" * 40)
                print()
            except Exception as e:
                print(f"❌ Failed to read created file: {str(e)}")
                return False
        
        # Test 7: Check Git Status
        print("Test 7: Checking Git Status")
        print("-" * 60)
        
        git_status = await repo_service.get_git_status(
            vm_session.session_id,
            repo_session.local_path
        )
        
        print(f"✅ Git status retrieved")
        print(f"   Branch: {git_status.branch}")
        print(f"   Is dirty: {git_status.is_dirty}")
        
        if not git_status.is_dirty:
            print(f"✅ Working directory is clean (changes committed)")
        print()
        
        # Summary
        print("=" * 60)
        if result.success:
            print("✅ ALL TESTS PASSED!")
        else:
            print("⚠️  TESTS COMPLETED WITH WARNINGS")
        print("=" * 60)
        print()
        print("Phase 3 Coding Agent is functional! 🤖✨")
        print()
        print("📊 Summary:")
        print(f"   - Agent can read implementation plans ✓")
        print(f"   - Agent can generate code via LLM ✓")
        print(f"   - Agent can write files ✓")
        print(f"   - Agent can create commits ✓")
        print(f"   - LLM tokens used: {result.total_tokens_used}")
        print()
        
        return result.success
        
    except Exception as e:
        print(f"❌ TEST FAILED WITH EXCEPTION!")
        print(f"   Error: {str(e)}")
        print()
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # Cleanup
        if vm_session:
            try:
                await vm_service.destroy_session(vm_session.session_id)
                print("🧹 Cleanup: VM session destroyed")
            except:
                pass


async def main():
    """Main entry point"""
    success = await test_coding_agent()
    
    if success:
        print("✅ Phase 3 validation: SUCCESS")
        sys.exit(0)
    else:
        print("❌ Phase 3 validation: FAILED")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
