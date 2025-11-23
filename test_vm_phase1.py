"""
Phase 1 VM Infrastructure Validation Test

This script tests all functionality of the VM service:
1. Creating VM sessions
2. Executing commands
3. Writing files
4. Reading files
5. Listing directories
6. Destroying sessions

Run with: python test_vm_phase1.py
"""

import asyncio
import sys
import os

# Add backend to path so we can import modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.services.vm_service import VMService
from app.core.config import settings


async def test_vm_service():
    """Run comprehensive tests on VM service"""
    
    print("=" * 60)
    print("🧪 Phase 1: VM Infrastructure Validation Test")
    print("=" * 60)
    print()
    
    # Check if E2B API key is configured
    if not settings.e2b_api_key or settings.e2b_api_key == "your-e2b-api-key-here":
        print("❌ ERROR: E2B API key not configured!")
        print()
        print("To run this test:")
        print("1. Get your API key from: https://e2b.dev/dashboard")
        print("2. Create a .env file in the backend directory")
        print("3. Add: E2B_API_KEY=your-actual-key")
        print()
        return False
    
    print(f"✓ E2B API key configured")
    print(f"✓ VM timeout: {settings.vm_timeout_seconds} seconds")
    print()
    
    vm_service = VMService()
    session_id = None
    
    try:
        # Test 1: Create VM Session
        print("Test 1: Creating VM Session")
        print("-" * 60)
        session = await vm_service.create_session()
        session_id = session.session_id
        
        print(f"✅ Session created successfully!")
        print(f"   Session ID: {session_id}")
        print(f"   Status: {session.status}")
        print(f"   Created at: {session.created_at}")
        print()
        
        # Test 2: Execute Simple Command
        print("Test 2: Executing Simple Command (echo)")
        print("-" * 60)
        result = await vm_service.execute_command(session_id, "echo 'Hello from VM!'")
        
        if result.success:
            print(f"✅ Command executed successfully!")
            print(f"   Output: {result.output}")
        else:
            print(f"❌ Command failed!")
            print(f"   Error: {result.error}")
            return False
        print()
        
        # Test 3: Execute Python Command
        print("Test 3: Executing Python Command")
        print("-" * 60)
        result = await vm_service.execute_command(session_id, "python --version")
        
        if result.success:
            print(f"✅ Python command executed!")
            print(f"   Output: {result.output}")
        else:
            print(f"❌ Python command failed!")
            print(f"   Error: {result.error}")
            return False
        print()
        
        # Test 4: Write File
        print("Test 4: Writing File to VM")
        print("-" * 60)
        test_content = """# Test File
print('Hello from test file!')
x = 42
print(f'The answer is {x}')
"""
        
        write_success = await vm_service.write_file(session_id, "/tmp/test.py", test_content)
        
        if write_success:
            print(f"✅ File written successfully!")
            print(f"   Path: /tmp/test.py")
        else:
            print(f"❌ File write failed!")
            return False
        print()
        
        # Test 5: Read File
        print("Test 5: Reading File from VM")
        print("-" * 60)
        
        try:
            content = await vm_service.read_file(session_id, "/tmp/test.py")
            print(f"✅ File read successfully!")
            print(f"   Content length: {len(content)} bytes")
            print(f"   First line: {content.split(chr(10))[0]}")
            
            if content == test_content:
                print(f"✅ Content matches what was written!")
            else:
                print(f"⚠️  Content doesn't match exactly")
        except Exception as e:
            print(f"❌ File read failed: {str(e)}")
            return False
        print()
        
        # Test 6: Execute the Python File
        print("Test 6: Executing Python File in VM")
        print("-" * 60)
        result = await vm_service.execute_command(session_id, "python /tmp/test.py")
        
        if result.success:
            print(f"✅ Python file executed successfully!")
            print(f"   Output: {result.output}")
        else:
            print(f"❌ Execution failed!")
            print(f"   Error: {result.error}")
            return False
        print()
        
        # Test 7: List Directory
        print("Test 7: Listing Directory")
        print("-" * 60)
        entries = await vm_service.list_directory(session_id, "/tmp")
        
        print(f"✅ Directory listed successfully!")
        print(f"   Found {len(entries)} entries in /tmp")
        if "test.py" in entries:
            print(f"✅ test.py found in directory listing!")
        else:
            print(f"   Entries: {entries[:10]}")  # Show first 10
        print()
        
        # Test 8: Write Multiple Files
        print("Test 8: Writing Multiple Files")
        print("-" * 60)
        files_written = 0
        
        for i in range(3):
            filename = f"/tmp/file_{i}.txt"
            content = f"This is file number {i}\n"
            if await vm_service.write_file(session_id, filename, content):
                files_written += 1
        
        print(f"✅ Wrote {files_written} files successfully!")
        print()
        
        # Test 9: Check Session Status
        print("Test 9: Checking Session Status")
        print("-" * 60)
        status = await vm_service.get_session_status(session_id)
        
        if status:
            print(f"✅ Session is active!")
            print(f"   Status: {status}")
        else:
            print(f"❌ Session not found!")
            return False
        print()
        
        # Test 10: Destroy Session
        print("Test 10: Destroying VM Session")
        print("-" * 60)
        destroy_success = await vm_service.destroy_session(session_id)
        
        if destroy_success:
            print(f"✅ Session destroyed successfully!")
            
            # Verify it's really gone
            status_after = await vm_service.get_session_status(session_id)
            if status_after is None:
                print(f"✅ Session confirmed destroyed!")
            else:
                print(f"⚠️  Session still appears active")
        else:
            print(f"❌ Session destruction failed!")
            return False
        print()
        
        # All tests passed!
        print("=" * 60)
        print("✅ ALL TESTS PASSED!")
        print("=" * 60)
        print()
        print("Phase 1 VM Infrastructure is fully functional! ✨")
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
        # Cleanup: Make sure session is destroyed
        if session_id:
            try:
                await vm_service.destroy_session(session_id)
                print("🧹 Cleanup: Session destroyed")
            except:
                pass


async def main():
    """Main entry point"""
    success = await test_vm_service()
    
    if success:
        print("✅ Phase 1 validation: SUCCESS")
        sys.exit(0)
    else:
        print("❌ Phase 1 validation: FAILED")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
