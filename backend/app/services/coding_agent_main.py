from app.models.plan_model import ImplementationPlan, PlanStep, FileChange
from app.models.agent_model import (
    AgentExecutionResult, AgentStepResult, FileEdit, 
    AgentStepStatus, EditType, ValidationResult,
    LLMCodeGenerationRequest, LLMCodeGenerationResponse
)
from app.services.agent_tools import AgentTools
from app.services.repo_service import RepositoryService
from app.services.llm_service import LLMService
from datetime import datetime
from typing import List, Dict, Optional
import logging
import time
import json

logger = logging.getLogger(__name__)


class CodingAgent:
    """
    AI coding agent that implements code changes based on implementation plans.
    Uses LLM to generate code modifications and applies them to repositories.
    """
    
    def __init__(
        self,
        plan: ImplementationPlan,
        tools: AgentTools,
        llm_service: LLMService,
        repo_service: RepositoryService,
        vm_session_id: str,
        repo_path: str
    ):
        self.plan = plan
        self.tools = tools
        self.llm = llm_service
        self.repo_service = repo_service
        self.vm_session_id = vm_session_id
        self.repo_path = repo_path
        self.start_time = datetime.utcnow()
    
    async def execute_plan(self) -> AgentExecutionResult:
        """
        Execute all steps in the implementation plan.
        
        Returns:
            AgentExecutionResult with execution details
        """
        logger.info(f"🤖 Starting agent execution: {self.plan.title}")
        logger.info(f"📋 Plan has {len(self.plan.steps)} steps")
        
        results = []
        commits = []
        total_tokens = 0
        
        try:
            for step in self.plan.steps:
                logger.info(f"\n{'='*60}")
                logger.info(f"🔄 Executing Step {step.step_number}: {step.title}")
                logger.info(f"{'='*60}")
                
                step_start = time.time()
                
                try:
                    step_result = await self.execute_step(step)
                    step_result.execution_time_seconds = time.time() - step_start
                    results.append(step_result)
                    total_tokens += step_result.llm_tokens_used
                    
                    # Create commit after each successful step
                    if step_result.status == AgentStepStatus.COMPLETED and step_result.edits:
                        logger.info(f"📝 Creating commit for step {step.step_number}")
                        commit = await self._create_commit_for_step(step, step_result)
                        if commit:
                            commits.append(commit.sha)
                            step_result.commit_sha = commit.sha
                            logger.info(f"✅ Commit created: {commit.sha[:8]}")
                    
                except Exception as e:
                    logger.error(f"❌ Step {step.step_number} failed: {str(e)}")
                    results.append(AgentStepResult(
                        step_number=step.step_number,
                        step_title=step.title,
                        status=AgentStepStatus.FAILED,
                        edits=[],
                        error_message=str(e),
                        execution_time_seconds=time.time() - step_start
                    ))
                    # Stop on first failure for MVP
                    break
            
            # Calculate results
            success = all(r.status == AgentStepStatus.COMPLETED for r in results)
            total_edits = sum(len(r.edits) for r in results)
            unique_files = len(set(edit.file_path for r in results for edit in r.edits))
            total_time = (datetime.utcnow() - self.start_time).total_seconds()
            
            result = AgentExecutionResult(
                success=success,
                steps_completed=results,
                total_edits=total_edits,
                total_files_changed=unique_files,
                commits_created=commits,
                total_tokens_used=total_tokens,
                total_execution_time_seconds=total_time,
                started_at=self.start_time,
                completed_at=datetime.utcnow()
            )
            
            logger.info(f"\n{'='*60}")
            if success:
                logger.info(f"✅ Execution completed successfully!")
            else:
                logger.info(f"⚠️  Execution completed with failures")
            logger.info(f"📊 Stats: {total_edits} edits, {unique_files} files, {len(commits)} commits")
            logger.info(f"⏱️  Time: {total_time:.1f}s, Tokens: {total_tokens}")
            logger.info(f"{'='*60}\n")
            
            return result
            
        except Exception as e:
            logger.error(f"💥 Fatal error during execution: {str(e)}")
            return AgentExecutionResult(
                success=False,
                steps_completed=results,
                total_edits=0,
                total_files_changed=0,
                commits_created=commits,
                error_message=str(e),
                total_tokens_used=total_tokens,
                total_execution_time_seconds=(datetime.utcnow() - self.start_time).total_seconds(),
                started_at=self.start_time,
                completed_at=datetime.utcnow()
            )
    
    async def execute_step(self, step: PlanStep) -> AgentStepResult:
        """
        Execute a single implementation step.
        
        Args:
            step: The plan step to execute
            
        Returns:
            AgentStepResult with step execution details
        """
        edits = []
        validations = []
        tokens_used = 0
        
        try:
            # Find files to modify for this step
            files_for_step = self._get_files_for_step(step)
            
            if not files_for_step:
                logger.warning(f"⚠️  No files identified for step {step.step_number}")
                return AgentStepResult(
                    step_number=step.step_number,
                    step_title=step.title,
                    status=AgentStepStatus.SKIPPED,
                    edits=[],
                    error_message="No files to modify"
                )
            
            logger.info(f"📁 Files to modify: {[f.path for f in files_for_step]}")
            
            # Process each file
            for file_change in files_for_step:
                logger.info(f"\n  📄 Processing: {file_change.path}")
                
                try:
                    # Check if file exists
                    file_exists = await self.tools.file_exists(file_change.path)
                    
                    if file_change.intent == "create" and file_exists:
                        logger.warning(f"  ⚠️  File already exists, will modify instead")
                        file_change.intent = "modify"
                    
                    # Read current content (if exists)
                    current_content = ""
                    if file_exists:
                        current_content = await self.tools.read_file(file_change.path)
                        logger.info(f"  📖 Read {len(current_content)} bytes")
                    
                    # Generate new content using LLM
                    logger.info(f"  🤖 Generating code with LLM...")
                    generation_result = await self._generate_code_change(
                        file_change,
                        current_content,
                        step
                    )
                    tokens_used += generation_result.tokens_used
                    
                    # Validate new content
                    logger.info(f"  ✓ Validating syntax...")
                    validation = await self.tools.validate_syntax(
                        file_change.path,
                        generation_result.new_content
                    )
                    validations.append(validation)
                    
                    if not validation.success:
                        logger.error(f"  ❌ Validation failed: {validation.error_message}")
                        continue
                    
                    # Write new content
                    logger.info(f"  💾 Writing file...")
                    write_success = await self.tools.write_file(
                        file_change.path,
                        generation_result.new_content
                    )
                    
                    if write_success:
                        # Calculate diff stats
                        old_lines = len(current_content.split('\n')) if current_content else 0
                        new_lines = len(generation_result.new_content.split('\n'))
                        
                        edit = FileEdit(
                            file_path=file_change.path,
                            original_content=current_content if file_exists else None,
                            new_content=generation_result.new_content,
                            edit_type=EditType.CREATE if not file_exists else EditType.MODIFY,
                            lines_added=max(0, new_lines - old_lines),
                            lines_removed=max(0, old_lines - new_lines)
                        )
                        edits.append(edit)
                        logger.info(f"  ✅ File modified: +{edit.lines_added} -{edit.lines_removed} lines")
                    else:
                        logger.error(f"  ❌ Failed to write file")
                    
                except Exception as e:
                    logger.error(f"  ❌ Error processing {file_change.path}: {str(e)}")
                    continue
            
            # Determine step status
            if edits:
                status = AgentStepStatus.COMPLETED
            elif files_for_step:
                status = AgentStepStatus.FAILED
                error_msg = "Failed to process any files"
            else:
                status = AgentStepStatus.SKIPPED
                error_msg = "No files to process"
            
            return AgentStepResult(
                step_number=step.step_number,
                step_title=step.title,
                status=status,
                edits=edits,
                validations=validations,
                llm_tokens_used=tokens_used,
                error_message=error_msg if status != AgentStepStatus.COMPLETED else None
            )
            
        except Exception as e:
            logger.error(f"❌ Step execution failed: {str(e)}")
            return AgentStepResult(
                step_number=step.step_number,
                step_title=step.title,
                status=AgentStepStatus.FAILED,
                edits=edits,
                validations=validations,
                error_message=str(e),
                llm_tokens_used=tokens_used
            )
    
    def _get_files_for_step(self, step: PlanStep) -> List[FileChange]:
        """
        Get files that should be modified for this step.
        
        For MVP, we'll process files based on priority and step type.
        More sophisticated logic can be added later.
        """
        # Get high-priority files from plan
        relevant_files = [
            f for f in self.plan.files_to_change 
            if f.priority <= step.step_number
        ]
        
        # Fix any directory paths - convert to actual file paths
        for f in relevant_files:
            path = f.path
            # If path ends with / or has no extension, it's a directory
            if path.endswith('/') or (path and '.' not in path.split('/')[-1]):
                base_path = path.rstrip('/')
                # Convert to a proper file path
                f.path = f"{base_path}/main.py" if base_path else "main.py"
                logger.warning(f"Fixed directory path '{path}' to '{f.path}'")
        
        # Sort by priority
        relevant_files.sort(key=lambda f: f.priority)
        
        # For MVP, limit to 3 files per step to avoid token limits
        return relevant_files[:3]
    
    async def _generate_code_change(
        self,
        file_change: FileChange,
        current_content: str,
        step: PlanStep
    ) -> LLMCodeGenerationResponse:
        """
        Use LLM to generate code changes.
        
        Args:
            file_change: File to modify
            current_content: Current file content
            step: Current implementation step
            
        Returns:
            LLMCodeGenerationResponse with new content
        """
        # Build prompt for LLM
        prompt = self._build_code_generation_prompt(
            file_change,
            current_content,
            step
        )
        
        try:
            # Call LLM with code-generation-specific system prompt
            code_system_prompt = (
                "You are an expert software engineer who writes clean, production-ready code. "
                "When asked to generate code, respond with ONLY the raw code content - no JSON wrapping, "
                "no markdown formatting, no explanations. Just the code that should go in the file."
            )
            
            response = await self.llm._call_openai(
                prompt, 
                system_prompt=code_system_prompt,
                max_tokens=4000  # Allow more tokens for code generation
            )
            
            # Extract content
            content = response['choices'][0]['message']['content']
            tokens = response.get('usage', {}).get('total_tokens', 0)
            
            # Clean up response (remove markdown code blocks if present)
            content = content.strip()
            if content.startswith('```'):
                lines = content.split('\n')
                # Remove first and last lines (``` markers)
                content = '\n'.join(lines[1:-1])
            
            # Additional cleanup: remove any JSON wrapping if LLM still returns it
            if content.startswith('{') and '"file"' in content[:50] and '"content"' in content[:100]:
                try:
                    parsed = json.loads(content)
                    if isinstance(parsed, dict) and 'content' in parsed:
                        content = parsed['content']
                        logger.warning("LLM returned JSON-wrapped code, extracted content field")
                except json.JSONDecodeError:
                    pass  # Not valid JSON, use as-is
            
            return LLMCodeGenerationResponse(
                new_content=content,
                explanation="Code generated by LLM",
                tokens_used=tokens,
                confidence=0.8  # TODO: Calculate confidence
            )
            
        except Exception as e:
            logger.error(f"LLM code generation failed: {str(e)}")
            raise
    
    def _build_code_generation_prompt(
        self,
        file_change: FileChange,
        current_content: str,
        step: PlanStep
    ) -> str:
        """
        Build prompt for LLM to generate code changes.
        """
        if file_change.intent == "create":
            prompt = f"""You are an expert software engineer. Create a new file with the following requirements:

File: {file_change.path}
Purpose: {file_change.rationale}

Step Context:
Title: {step.title}
Description: {step.description}

Requirements:
- Write complete, production-ready code
- Follow best practices and conventions
- Include necessary imports and dependencies
- Add appropriate comments

Generate the complete file content. Respond with ONLY the code, no explanations or markdown formatting.
"""
        else:  # modify
            prompt = f"""You are an expert software engineer. Modify the following file to implement the requested changes:

File: {file_change.path}
Change Intent: {file_change.intent}
Rationale: {file_change.rationale}

Step Context:
Title: {step.title}
Description: {step.description}

Current File Content:
```
{current_content}
```

Requirements:
- Make minimal, focused changes
- Preserve existing functionality unless explicitly changed
- Follow the existing code style
- Maintain all necessary imports
- Ensure syntax correctness

Generate the COMPLETE modified file content. Respond with ONLY the code, no explanations.
"""
        
        return prompt
    
    async def _create_commit_for_step(
        self,
        step: PlanStep,
        step_result: AgentStepResult
    ):
        """
        Create a git commit for completed step.
        
        Args:
            step: The plan step
            step_result: Results from step execution
            
        Returns:
            GitCommit or None
        """
        try:
            files = [edit.file_path for edit in step_result.edits]
            message = f"[Vibecoder] Step {step.step_number}: {step.title}"
            
            commit = await self.repo_service.create_commit(
                self.vm_session_id,
                self.repo_path,
                message,
                files
            )
            
            return commit
            
        except Exception as e:
            logger.error(f"Failed to create commit: {str(e)}")
            return None
