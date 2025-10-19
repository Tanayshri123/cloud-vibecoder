#!/usr/bin/env python3
"""
Test script for LLM CRS generation
Run this to test the CRS functionality before integrating with the API
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.models.crs_model import CRSRequest
from app.services.llm_service import LLMService

async def test_crs_generation():
    """Test CRS generation with a sample prompt"""
    
    # Check if API key is set
    if not os.getenv('OPENAI_API_KEY'):
        print("❌ OPENAI_API_KEY environment variable not set")
        print("Please set your OpenAI API key:")
        print("export OPENAI_API_KEY='your-api-key-here'")
        return
    
    print("🧪 Testing CRS Generation...")
    
    # Create test request
    test_request = CRSRequest(
        user_prompt="Add a dark mode toggle to the settings page",
        repository_url="https://github.com/facebook/react",
        additional_context="This is a React application with existing light theme"
    )
    
    try:
        # Initialize LLM service
        llm_service = LLMService()
        
        # Generate CRS
        print("📝 Generating CRS...")
        response = await llm_service.generate_crs(test_request)
        
        # Display results
        print("\n✅ CRS Generated Successfully!")
        print(f"⏱️  Processing time: {response.processing_time_ms}ms")
        print(f"🤖 Model used: {response.model_used}")
        print(f"🎯 Tokens used: {response.tokens_used}")
        
        crs = response.crs
        print(f"\n📋 Goal: {crs.goal}")
        print(f"📝 Summary: {crs.summary}")
        print(f"🎯 Priority: {crs.priority}")
        print(f"📏 Scope: {crs.scope}")
        print(f"⚡ Complexity: {crs.estimated_complexity}")
        print(f"💥 Blast Radius: {crs.blast_radius}")
        print(f"🎯 Confidence: {crs.confidence_score}")
        
        if crs.constraints:
            print(f"\n🚫 Constraints:")
            for constraint in crs.constraints:
                print(f"  - {constraint.constraint_type}: {constraint.description}")
        
        if crs.acceptance_criteria:
            print(f"\n✅ Acceptance Criteria:")
            for criteria in crs.acceptance_criteria:
                print(f"  - {criteria.criterion}")
        
        if crs.component_hints:
            print(f"\n🔍 Component Hints:")
            for hint in crs.component_hints:
                print(f"  - {hint.component} (confidence: {hint.confidence})")
        
        if crs.clarifying_questions:
            print(f"\n❓ Clarifying Questions:")
            for question in crs.clarifying_questions:
                print(f"  - {question.question}")
        
        print(f"\n🤔 Requires Clarification: {crs.requires_clarification}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_crs_generation())
