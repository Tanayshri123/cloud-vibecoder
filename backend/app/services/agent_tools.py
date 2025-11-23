from app.services.repo_service import RepositoryService
from app.services.vm_service import VMService
from app.models.agent_model import ValidationResult
from typing import List, Dict, Optional
import logging
import re

logger = logging.getLogger(__name__)


class AgentTools:
    """
    Tool functions that the coding agent can use.
    Provides high-level abstractions over VM and Repository services.
    """
    
    def __init__(
        self, 
        repo_service: RepositoryService,
        vm_service: VMService,
        vm_session_id: str, 
        repo_path: str
    ):
        self.repo_service = repo_service
        self.vm_service = vm_service
        self.vm_session_id = vm_session_id
        self.repo_path = repo_path
    
    async def read_file(self, file_path: str) -> str:
        """
        Read a file from the repository.
        
        Args:
            file_path: Relative path to file in repository
            
        Returns:
            File content as string
        """
        try:
            logger.info(f"🔍 Reading file: {file_path}")
            content = await self.repo_service.read_file(
                self.vm_session_id,
                self.repo_path,
                file_path
            )
            return content
        except Exception as e:
            logger.error(f"Failed to read file {file_path}: {str(e)}")
            raise
    
    async def write_file(self, file_path: str, content: str) -> bool:
        """
        Write content to a file in the repository.
        
        Args:
            file_path: Relative path to file in repository
            content: Content to write
            
        Returns:
            True if successful
        """
        try:
            logger.info(f"✏️  Writing file: {file_path}")
            success = await self.repo_service.write_file(
                self.vm_session_id,
                self.repo_path,
                file_path,
                content
            )
            return success
        except Exception as e:
            logger.error(f"Failed to write file {file_path}: {str(e)}")
            return False
    
    async def list_directory(self, dir_path: str = ".") -> List[str]:
        """
        List files in a directory.
        
        Args:
            dir_path: Directory path relative to repository root
            
        Returns:
            List of file paths
        """
        try:
            logger.info(f"📂 Listing directory: {dir_path}")
            files = await self.repo_service.list_files(
                self.vm_session_id,
                self.repo_path,
                dir_path
            )
            return files
        except Exception as e:
            logger.error(f"Failed to list directory {dir_path}: {str(e)}")
            return []
    
    async def file_exists(self, file_path: str) -> bool:
        """
        Check if a file exists.
        
        Args:
            file_path: Relative path to file
            
        Returns:
            True if file exists
        """
        try:
            await self.read_file(file_path)
            return True
        except:
            return False
    
    async def validate_syntax(self, file_path: str, content: str) -> ValidationResult:
        """
        Validate syntax of code file.
        
        Args:
            file_path: Path to file
            content: File content to validate
            
        Returns:
            ValidationResult with validation status
        """
        try:
            logger.info(f"✓ Validating syntax: {file_path}")
            
            # Determine file type from extension
            ext = file_path.split('.')[-1].lower()
            
            if ext == 'py':
                return await self._validate_python(file_path, content)
            elif ext in ['js', 'jsx', 'ts', 'tsx']:
                return await self._validate_javascript(file_path, content)
            elif ext in ['json']:
                return await self._validate_json(file_path, content)
            else:
                # No validation for other file types
                return ValidationResult(
                    success=True,
                    file_path=file_path,
                    validation_type="none",
                    error_message=None
                )
                
        except Exception as e:
            logger.error(f"Validation error for {file_path}: {str(e)}")
            return ValidationResult(
                success=False,
                file_path=file_path,
                validation_type="error",
                error_message=str(e)
            )
    
    async def _validate_python(self, file_path: str, content: str) -> ValidationResult:
        """Validate Python syntax"""
        try:
            # Write file temporarily
            temp_path = f"/tmp/validate_{file_path.replace('/', '_')}"
            await self.vm_service.write_file(self.vm_session_id, temp_path, content)
            
            # Run Python syntax check
            result = await self.vm_service.execute_command(
                self.vm_session_id,
                f"python -m py_compile {temp_path}"
            )
            
            if result.success:
                return ValidationResult(
                    success=True,
                    file_path=file_path,
                    validation_type="python_syntax"
                )
            else:
                return ValidationResult(
                    success=False,
                    file_path=file_path,
                    validation_type="python_syntax",
                    error_message=result.error or "Syntax error"
                )
        except Exception as e:
            return ValidationResult(
                success=False,
                file_path=file_path,
                validation_type="python_syntax",
                error_message=str(e)
            )
    
    async def _validate_javascript(self, file_path: str, content: str) -> ValidationResult:
        """Validate JavaScript/TypeScript syntax"""
        # For MVP, just check for basic syntax patterns
        # In production, could use eslint or tsc
        try:
            # Check for common syntax errors
            if content.count('{') != content.count('}'):
                return ValidationResult(
                    success=False,
                    file_path=file_path,
                    validation_type="javascript_syntax",
                    error_message="Mismatched braces"
                )
            
            if content.count('(') != content.count(')'):
                return ValidationResult(
                    success=False,
                    file_path=file_path,
                    validation_type="javascript_syntax",
                    error_message="Mismatched parentheses"
                )
            
            return ValidationResult(
                success=True,
                file_path=file_path,
                validation_type="javascript_syntax"
            )
        except Exception as e:
            return ValidationResult(
                success=False,
                file_path=file_path,
                validation_type="javascript_syntax",
                error_message=str(e)
            )
    
    async def _validate_json(self, file_path: str, content: str) -> ValidationResult:
        """Validate JSON syntax"""
        try:
            import json
            json.loads(content)
            return ValidationResult(
                success=True,
                file_path=file_path,
                validation_type="json_syntax"
            )
        except json.JSONDecodeError as e:
            return ValidationResult(
                success=False,
                file_path=file_path,
                validation_type="json_syntax",
                error_message=f"JSON parse error: {str(e)}"
            )
    
    async def run_command(self, command: str) -> Dict[str, any]:
        """
        Run a shell command in the VM.
        
        Args:
            command: Shell command to execute
            
        Returns:
            Dict with success, output, error
        """
        try:
            logger.info(f"⚙️  Running command: {command}")
            result = await self.vm_service.execute_command(
                self.vm_session_id,
                command
            )
            
            return {
                "success": result.success,
                "output": result.output,
                "error": result.error,
                "exit_code": result.exit_code
            }
        except Exception as e:
            logger.error(f"Command failed: {str(e)}")
            return {
                "success": False,
                "output": None,
                "error": str(e),
                "exit_code": 1
            }
    
    async def search_in_file(self, file_path: str, pattern: str) -> List[Dict[str, any]]:
        """
        Search for a pattern in a file.
        
        Args:
            file_path: File to search in
            pattern: Regex pattern to search for
            
        Returns:
            List of matches with line numbers
        """
        try:
            content = await self.read_file(file_path)
            lines = content.split('\n')
            matches = []
            
            for line_num, line in enumerate(lines, 1):
                if re.search(pattern, line):
                    matches.append({
                        "line_number": line_num,
                        "line_content": line.strip(),
                        "file_path": file_path
                    })
            
            return matches
        except Exception as e:
            logger.error(f"Search failed in {file_path}: {str(e)}")
            return []
    
    async def get_file_info(self, file_path: str) -> Dict[str, any]:
        """
        Get information about a file.
        
        Args:
            file_path: File path
            
        Returns:
            Dict with file metadata
        """
        try:
            exists = await self.file_exists(file_path)
            if not exists:
                return {"exists": False}
            
            content = await self.read_file(file_path)
            lines = content.split('\n')
            
            return {
                "exists": True,
                "size_bytes": len(content),
                "line_count": len(lines),
                "extension": file_path.split('.')[-1] if '.' in file_path else None
            }
        except Exception as e:
            logger.error(f"Failed to get file info for {file_path}: {str(e)}")
            return {"exists": False, "error": str(e)}
