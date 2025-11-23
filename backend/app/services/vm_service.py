from e2b_code_interpreter import Sandbox
from app.models.vm_model import VMSession, VMStatus, VMExecutionResult
from app.core.config import settings
from datetime import datetime, timedelta
from typing import Optional, Dict
import logging
import asyncio

logger = logging.getLogger(__name__)


class VMService:
    """Service for managing E2B VM sessions"""
    
    def __init__(self):
        self.api_key = settings.e2b_api_key
        self.timeout = settings.vm_timeout_seconds
        self.active_sessions: Dict[str, Sandbox] = {}
        
        if not self.api_key:
            logger.warning("E2B API key not configured. VM service will not work.")
    
    async def create_session(self) -> VMSession:
        """
        Create a new E2B sandbox session.
        
        Returns:
            VMSession with session details
            
        Raises:
            ValueError: If E2B API key is not configured
            Exception: If session creation fails
        """
        if not self.api_key:
            raise ValueError("E2B API key not configured. Set E2B_API_KEY in environment.")
        
        try:
            logger.info("Creating new E2B sandbox session...")
            
            # Create E2B code interpreter sandbox using the new API
            # Pass api_key through opts parameter
            sandbox = Sandbox.create(
                timeout=self.timeout,
                api_key=self.api_key
            )
            
            session_id = sandbox.sandbox_id
            self.active_sessions[session_id] = sandbox
            
            created_at = datetime.utcnow()
            expires_at = created_at + timedelta(seconds=self.timeout)
            
            session = VMSession(
                session_id=session_id,
                status=VMStatus.READY,
                created_at=created_at,
                expires_at=expires_at
            )
            
            logger.info(f"✅ VM session created: {session_id}")
            return session
            
        except Exception as e:
            logger.error(f"Failed to create VM session: {str(e)}")
            raise Exception(f"Failed to create VM session: {str(e)}")
    
    async def execute_command(self, session_id: str, command: str) -> VMExecutionResult:
        """
        Execute a shell command in the VM.
        
        Args:
            session_id: The VM session ID
            command: Shell command to execute
            
        Returns:
            VMExecutionResult with output and status
            
        Raises:
            ValueError: If session not found
        """
        sandbox = self._get_sandbox(session_id)
        
        try:
            logger.info(f"Executing command in {session_id}: {command}")
            
            # Execute command using run_code for shell commands
            execution = sandbox.run_code(f"!{command}")
            
            # Extract output from execution result
            output_text = ""
            error_text = ""
            
            if hasattr(execution, 'text'):
                output_text = execution.text
            elif hasattr(execution, 'results'):
                for result in execution.results:
                    if hasattr(result, 'text'):
                        output_text += result.text
            
            if hasattr(execution, 'error') and execution.error:
                error_text = str(execution.error.value) if hasattr(execution.error, 'value') else str(execution.error)
            
            success = not error_text
            
            return VMExecutionResult(
                success=success,
                output=output_text if output_text else None,
                error=error_text if error_text else None,
                exit_code=0 if success else 1
            )
            
        except Exception as e:
            logger.error(f"Command execution failed: {str(e)}")
            return VMExecutionResult(
                success=False,
                output=None,
                error=str(e),
                exit_code=1
            )
    
    async def write_file(self, session_id: str, path: str, content: str) -> bool:
        """
        Write content to a file in the VM.
        
        Args:
            session_id: The VM session ID
            path: File path to write to
            content: Content to write
            
        Returns:
            True if successful, False otherwise
            
        Raises:
            ValueError: If session not found
        """
        sandbox = self._get_sandbox(session_id)
        
        try:
            logger.info(f"Writing file in {session_id}: {path}")
            
            # Write file using the files API (v2.x)
            sandbox.files.write(path, content)
            
            logger.info(f"✅ File written successfully: {path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to write file {path}: {str(e)}")
            return False
    
    async def read_file(self, session_id: str, path: str) -> str:
        """
        Read a file from the VM.
        
        Args:
            session_id: The VM session ID
            path: File path to read
            
        Returns:
            File content as string
            
        Raises:
            ValueError: If session not found
            FileNotFoundError: If file doesn't exist
        """
        sandbox = self._get_sandbox(session_id)
        
        try:
            logger.info(f"Reading file from {session_id}: {path}")
            
            # Read file using the files API (v2.x)
            content = sandbox.files.read(path)
            
            logger.info(f"✅ File read successfully: {path}")
            return content
            
        except Exception as e:
            logger.error(f"Failed to read file {path}: {str(e)}")
            raise FileNotFoundError(f"Could not read file {path}: {str(e)}")
    
    async def list_directory(self, session_id: str, path: str = "/") -> list:
        """
        List files in a directory in the VM.
        
        Args:
            session_id: The VM session ID
            path: Directory path to list
            
        Returns:
            List of file/directory names
            
        Raises:
            ValueError: If session not found
        """
        sandbox = self._get_sandbox(session_id)
        
        try:
            logger.info(f"Listing directory in {session_id}: {path}")
            
            # List directory using files API (v2.x)
            entries = sandbox.files.list(path)
            
            logger.info(f"✅ Found {len(entries)} entries in {path}")
            return entries
            
        except Exception as e:
            logger.error(f"Failed to list directory {path}: {str(e)}")
            return []
    
    async def destroy_session(self, session_id: str) -> bool:
        """
        Cleanup and destroy a VM session.
        
        Args:
            session_id: The VM session ID to destroy
            
        Returns:
            True if successful, False otherwise
        """
        if session_id not in self.active_sessions:
            logger.warning(f"Session {session_id} not found in active sessions")
            return False
        
        try:
            logger.info(f"Destroying VM session: {session_id}")
            
            sandbox = self.active_sessions[session_id]
            sandbox.kill()  # Use kill() instead of close() for E2B v2.x
            
            del self.active_sessions[session_id]
            
            logger.info(f"✅ VM session destroyed: {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to destroy session {session_id}: {str(e)}")
            return False
    
    def _get_sandbox(self, session_id: str) -> Sandbox:
        """
        Get sandbox instance by session ID.
        
        Args:
            session_id: The VM session ID
            
        Returns:
            CodeInterpreter instance
            
        Raises:
            ValueError: If session not found
        """
        if session_id not in self.active_sessions:
            raise ValueError(f"VM session {session_id} not found. Session may have expired or been destroyed.")
        
        return self.active_sessions[session_id]
    
    async def get_session_status(self, session_id: str) -> Optional[VMStatus]:
        """
        Get the current status of a VM session.
        
        Args:
            session_id: The VM session ID
            
        Returns:
            VMStatus if session exists, None otherwise
        """
        if session_id in self.active_sessions:
            return VMStatus.READY
        else:
            return None
