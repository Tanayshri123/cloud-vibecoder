#!/usr/bin/env python3
"""
Test script for Plan Synthesis
Run this to test the plan synthesis functionality
"""

import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from backend/.env
backend_dir = Path(__file__).parent / "backend"
env_path = backend_dir / ".env"
load_dotenv(env_path)

# Add the backend directory to Python path
sys.path.insert(0, str(backend_dir))

from app.models.plan_model import PlanRequest
from app.services.plan_synthesis_service import PlanSynthesisService

async def test_plan_synthesis():
    """Test plan synthesis with a sample CRS"""
    
    print("🧪 Testing Plan Synthesis...")
    
    # Create sample CRS (like what we'd get from the CRS endpoint)
    sample_crs = {
        "goal": "Implement a dark mode toggle feature on the settings page",
        "summary": "Add a user interface toggle that allows users to switch between light and dark modes",
        "priority": "high",
        "scope": "frontend only",
        "estimated_complexity": "medium",
        "blast_radius": "isolated",
        "confidence_score": 0.85,
        "constraints": [
            {
                "constraint_type": "compatibility",
                "description": "Must be compatible with existing themes",
                "severity": "medium"
            }
        ],
        "acceptance_criteria": [
            {
                "criterion": "Toggle switch works correctly",
                "testable": True,
                "priority": "high"
            },
            {
                "criterion": "User preferences persist across sessions",
                "testable": True,
                "priority": "high"
            }
        ],
        "component_hints": [
            {
                "component": "SettingsPage",
                "confidence": 0.9,
                "rationale": "Main component that needs the toggle"
            }
        ]
    }
    
    # Create test request
    test_request = PlanRequest(
        crs=sample_crs,
        repository_context={"url": "https://github.com/facebook/react"},
        scope_preferences=["frontend only", "minimal changes"]
    )
    
    try:
        # Initialize synthesis service
        synthesis_service = PlanSynthesisService()
        
        # Generate plan
        print("📝 Generating Implementation Plan...")
        response = await synthesis_service.generate_plan(test_request)
        
        # Display results
        print("\n✅ Plan Generated Successfully!")
        print(f"⏱️  Processing time: {response.processing_time_ms}ms")
        print(f"🤖 Model used: {response.model_used}")
        print(f"🎯 Tokens used: {response.tokens_used}")
        
        plan = response.plan
        print(f"\n📋 Plan Title: {plan.title}")
        print(f"📝 Summary: {plan.summary}")
        print(f"⏱️  Estimated Total Time: {plan.estimated_total_time}")
        print(f"🎯 Complexity Score: {plan.complexity_score}/10")
        print(f"🎯 Confidence Score: {plan.confidence_score}")
        print(f"💥 Blast Radius: {plan.blast_radius}")
        
        print(f"\n📋 Implementation Steps ({len(plan.steps)} steps):")
        for step in plan.steps:
            print(f"  {step.step_number}. {step.title}")
            print(f"     Type: {step.step_type}")
            print(f"     Time: {step.estimated_time}")
            print(f"     Reversible: {step.reversible}")
            if step.dependencies:
                print(f"     Depends on: {step.dependencies}")
            print()
        
        print(f"\n📁 Files to Change ({len(plan.files_to_change)} files):")
        for file_change in plan.files_to_change:
            print(f"  📄 {file_change.path}")
            print(f"     Intent: {file_change.intent}")
            print(f"     Rationale: {file_change.rationale}")
            print(f"     Priority: {file_change.priority}")
            if file_change.diff_stub:
                print(f"     Diff: {file_change.diff_stub}")
            print()
        
        print(f"\n🧪 Testing Plan ({len(plan.testing_plan)} tests):")
        for test in plan.testing_plan:
            print(f"  🧪 {test.test_type.upper()}: {test.description}")
            print(f"     Rationale: {test.rationale}")
            if test.files_to_test:
                print(f"     Files: {', '.join(test.files_to_test)}")
            print()
        
        print(f"\n⚠️  Risk Notes ({len(plan.risk_notes)} risks):")
        for risk in plan.risk_notes:
            print(f"  ⚠️  {risk.risk_level.upper()}: {risk.risk_description}")
            print(f"     Mitigation: {risk.mitigation_strategy}")
            print(f"     Blast Radius: {risk.blast_radius}")
            print()
        
        if plan.fallback_options:
            print(f"\n🔄 Fallback Options ({len(plan.fallback_options)} options):")
            for fallback in plan.fallback_options:
                print(f"  🔄 {fallback.title}")
                print(f"     Description: {fallback.description}")
                print(f"     Scope Reduction: {fallback.scope_reduction}")
                print()
        
        if plan.scope_refinements:
            print(f"\n🎯 Scope Refinements:")
            for refinement in plan.scope_refinements:
                print(f"  • {refinement}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_plan_synthesis())
