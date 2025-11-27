from app.services.repo_service import RepositoryService
from app.services.vm_service import VMService
from app.models.agent_model import ValidationResult
from typing import List, Dict, Optional, Any
import logging
import re
import json

logger = logging.getLogger(__name__)


# ============================================
# Project Scaffolding Templates
# ============================================

SCAFFOLDING_TEMPLATES = {
    "react": {
        "name": "React Application",
        "files": {
            "package.json": lambda name, desc: json.dumps({
                "name": name,
                "version": "0.1.0",
                "private": True,
                "dependencies": {
                    "react": "^18.2.0",
                    "react-dom": "^18.2.0",
                    "react-scripts": "5.0.1"
                },
                "scripts": {
                    "start": "react-scripts start",
                    "build": "react-scripts build",
                    "test": "react-scripts test",
                    "eject": "react-scripts eject"
                },
                "browserslist": {
                    "production": [">0.2%", "not dead", "not op_mini all"],
                    "development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
                }
            }, indent=2),
            "public/index.html": lambda name, desc: f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="{desc or 'React application'}" />
    <title>{name}</title>
</head>
<body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
</body>
</html>''',
            "src/index.js": lambda name, desc: '''import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);''',
            "src/App.js": lambda name, desc: f'''import React from 'react';
import './App.css';

function App() {{
  return (
    <div className="App">
      <header className="App-header">
        <h1>{name}</h1>
        <p>{desc or 'Welcome to your new React app!'}</p>
      </header>
    </div>
  );
}}

export default App;''',
            "src/App.css": lambda name, desc: '''.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
  color: white;
}''',
            "src/index.css": lambda name, desc: '''body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}''',
        }
    },
    "node": {
        "name": "Node.js Application",
        "files": {
            "package.json": lambda name, desc: json.dumps({
                "name": name,
                "version": "1.0.0",
                "description": desc or "A Node.js application",
                "main": "src/index.js",
                "scripts": {
                    "start": "node src/index.js",
                    "dev": "nodemon src/index.js",
                    "test": "jest"
                },
                "keywords": [],
                "author": "",
                "license": "MIT",
                "dependencies": {
                    "express": "^4.18.2"
                },
                "devDependencies": {
                    "nodemon": "^3.0.1"
                }
            }, indent=2),
            "src/index.js": lambda name, desc: f'''const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {{
  res.json({{
    name: '{name}',
    message: '{desc or "Welcome to the API"}',
    status: 'running'
  }});
}});

app.get('/health', (req, res) => {{
  res.json({{ status: 'healthy' }});
}});

app.listen(PORT, () => {{
  console.log(`🚀 Server running on port ${{PORT}}`);
}});''',
        }
    },
    "python": {
        "name": "Python Application",
        "files": {
            "requirements.txt": lambda name, desc: '''# Core dependencies
python-dotenv>=1.0.0
''',
            "src/__init__.py": lambda name, desc: '',
            "src/main.py": lambda name, desc: f'''"""
{name}
{desc or 'A Python application'}
"""

def main():
    print("Hello from {name}!")
    print("{desc or 'Welcome to your new Python project!'}")

if __name__ == "__main__":
    main()
''',
            "setup.py": lambda name, desc: f'''from setuptools import setup, find_packages

setup(
    name="{name}",
    version="0.1.0",
    description="{desc or 'A Python application'}",
    packages=find_packages(),
    python_requires=">=3.8",
)
''',
        }
    },
    "fastapi": {
        "name": "FastAPI Application",
        "files": {
            "requirements.txt": lambda name, desc: '''fastapi>=0.104.0
uvicorn[standard]>=0.24.0
pydantic>=2.5.0
python-dotenv>=1.0.0
''',
            "app/__init__.py": lambda name, desc: '',
            "app/main.py": lambda name, desc: f'''"""
{name} - FastAPI Application
{desc or 'A modern FastAPI backend'}
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="{name}",
    description="{desc or 'A FastAPI application'}",
    version="0.1.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {{
        "name": "{name}",
        "message": "{desc or 'Welcome to the API'}",
        "status": "running"
    }}

@app.get("/health")
async def health_check():
    return {{"status": "healthy"}}
''',
            "app/models.py": lambda name, desc: '''"""
Pydantic models for request/response validation
"""

from pydantic import BaseModel
from typing import Optional

class HealthResponse(BaseModel):
    status: str

class MessageResponse(BaseModel):
    name: str
    message: str
    status: str
''',
            "run.py": lambda name, desc: '''"""
Development server runner
"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
''',
        }
    },
    "nextjs": {
        "name": "Next.js Application",
        "files": {
            "package.json": lambda name, desc: json.dumps({
                "name": name,
                "version": "0.1.0",
                "private": True,
                "scripts": {
                    "dev": "next dev",
                    "build": "next build",
                    "start": "next start",
                    "lint": "next lint"
                },
                "dependencies": {
                    "next": "14.0.0",
                    "react": "^18",
                    "react-dom": "^18"
                },
                "devDependencies": {
                    "eslint": "^8",
                    "eslint-config-next": "14.0.0"
                }
            }, indent=2),
            "app/page.js": lambda name, desc: f'''export default function Home() {{
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">{name}</h1>
      <p className="mt-4 text-xl text-gray-600">
        {desc or 'Welcome to your Next.js application!'}
      </p>
    </main>
  );
}}''',
            "app/layout.js": lambda name, desc: f'''export const metadata = {{
  title: '{name}',
  description: '{desc or 'A Next.js application'}',
}};

export default function RootLayout({{ children }}) {{
  return (
    <html lang="en">
      <body>{{children}}</body>
    </html>
  );
}}''',
            "next.config.js": lambda name, desc: '''/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = nextConfig;''',
        }
    },
    "express-api": {
        "name": "Express REST API",
        "files": {
            "package.json": lambda name, desc: json.dumps({
                "name": name,
                "version": "1.0.0",
                "description": desc or "Express REST API",
                "main": "src/index.js",
                "scripts": {
                    "start": "node src/index.js",
                    "dev": "nodemon src/index.js",
                    "test": "jest"
                },
                "dependencies": {
                    "express": "^4.18.2",
                    "cors": "^2.8.5",
                    "helmet": "^7.1.0",
                    "morgan": "^1.10.0",
                    "dotenv": "^16.3.1"
                },
                "devDependencies": {
                    "nodemon": "^3.0.1"
                }
            }, indent=2),
            "src/index.js": lambda name, desc: f'''require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {{
  res.json({{ status: 'healthy', name: '{name}' }});
}});

// Error handler
app.use((err, req, res, next) => {{
  console.error(err.stack);
  res.status(500).json({{ error: 'Something went wrong!' }});
}});

app.listen(PORT, () => {{
  console.log(`🚀 {name} running on port ${{PORT}}`);
}});''',
            "src/routes/index.js": lambda name, desc: '''const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'API is working!' });
});

module.exports = router;''',
            ".env.example": lambda name, desc: '''PORT=3000
NODE_ENV=development''',
        }
    },
}


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
    
    # ============================================
    # Project Scaffolding Methods
    # ============================================
    
    def get_available_templates(self) -> List[Dict[str, str]]:
        """
        Get list of available project scaffolding templates.
        
        Returns:
            List of template info with key and name
        """
        return [
            {"key": key, "name": template["name"]}
            for key, template in SCAFFOLDING_TEMPLATES.items()
        ]
    
    async def scaffold_project(
        self,
        project_type: str,
        project_name: str,
        description: Optional[str] = None,
        additional_features: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Create a project scaffold with the specified template.
        
        Args:
            project_type: Type of project (react, node, python, fastapi, nextjs, express-api)
            project_name: Name of the project
            description: Optional project description
            additional_features: Optional list of additional features to include
            
        Returns:
            Dict with success status and list of created files
        """
        try:
            logger.info(f"🏗️  Scaffolding {project_type} project: {project_name}")
            
            if project_type not in SCAFFOLDING_TEMPLATES:
                available = list(SCAFFOLDING_TEMPLATES.keys())
                return {
                    "success": False,
                    "error": f"Unknown project type '{project_type}'. Available: {available}",
                    "files_created": []
                }
            
            template = SCAFFOLDING_TEMPLATES[project_type]
            created_files = []
            errors = []
            
            # Create each file from the template
            for file_path, content_generator in template["files"].items():
                try:
                    content = content_generator(project_name, description)
                    
                    # Ensure directory exists by creating parent directories
                    if '/' in file_path:
                        dir_path = '/'.join(file_path.split('/')[:-1])
                        await self._ensure_directory(dir_path)
                    
                    success = await self.write_file(file_path, content)
                    
                    if success:
                        created_files.append(file_path)
                        logger.info(f"  ✅ Created: {file_path}")
                    else:
                        errors.append(f"Failed to write {file_path}")
                        
                except Exception as e:
                    errors.append(f"Error creating {file_path}: {str(e)}")
                    logger.error(f"  ❌ Error creating {file_path}: {str(e)}")
            
            # Add common files
            common_files = await self._create_common_files(project_name, description, project_type)
            created_files.extend(common_files)
            
            logger.info(f"🏗️  Scaffolding complete: {len(created_files)} files created")
            
            return {
                "success": len(errors) == 0,
                "project_type": project_type,
                "project_name": project_name,
                "files_created": created_files,
                "errors": errors if errors else None
            }
            
        except Exception as e:
            logger.error(f"Scaffolding failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "files_created": []
            }
    
    async def _ensure_directory(self, dir_path: str) -> bool:
        """Ensure a directory exists by creating it if necessary."""
        try:
            # Create directory using mkdir -p
            result = await self.run_command(f"mkdir -p {self.repo_path}/{dir_path}")
            return result.get("success", False)
        except Exception as e:
            logger.error(f"Failed to create directory {dir_path}: {str(e)}")
            return False
    
    async def _create_common_files(
        self,
        project_name: str,
        description: Optional[str],
        project_type: str
    ) -> List[str]:
        """Create common files that all projects should have."""
        created = []
        
        # Create/update README.md
        readme_content = f"""# {project_name}

{description or 'A new project created with Cloud Vibecoder.'}

## Getting Started

"""
        
        if project_type in ["react", "node", "nextjs", "express-api"]:
            readme_content += """### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```
"""
        elif project_type in ["python", "fastapi"]:
            readme_content += """### Prerequisites

- Python 3.8+ installed
- pip

### Installation

```bash
pip install -r requirements.txt
```

### Running

```bash
"""
            if project_type == "fastapi":
                readme_content += "python run.py\n```\n\nOr with uvicorn:\n\n```bash\nuvicorn app.main:app --reload\n```\n"
            else:
                readme_content += "python src/main.py\n```\n"
        
        readme_content += """
## Project Structure

```
.
├── README.md
"""
        
        # Add project-specific structure
        if project_type == "react":
            readme_content += """├── public/
│   └── index.html
├── src/
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
└── package.json
```
"""
        elif project_type == "fastapi":
            readme_content += """├── app/
│   ├── __init__.py
│   ├── main.py
│   └── models.py
├── requirements.txt
└── run.py
```
"""
        elif project_type in ["node", "express-api"]:
            readme_content += """├── src/
│   └── index.js
├── package.json
└── .env.example
```
"""
        
        readme_content += """
## License

MIT

---

*Generated with [Cloud Vibecoder](https://github.com/cloud-vibecoder)*
"""
        
        try:
            # Check if README already exists
            exists = await self.file_exists("README.md")
            if not exists:
                success = await self.write_file("README.md", readme_content)
                if success:
                    created.append("README.md")
        except Exception as e:
            logger.warning(f"Could not create README.md: {str(e)}")
        
        return created
    
    async def detect_project_type(self) -> Dict[str, Any]:
        """
        Detect the type of project based on existing files.
        
        Returns:
            Dict with detected project type and confidence
        """
        try:
            files = await self.list_directory(".")
            
            indicators = {
                "react": ["package.json", "src/App.js", "src/App.jsx", "src/App.tsx"],
                "nextjs": ["next.config.js", "next.config.mjs", "app/page.js", "app/page.tsx"],
                "node": ["package.json", "index.js", "src/index.js"],
                "python": ["requirements.txt", "setup.py", "pyproject.toml"],
                "fastapi": ["requirements.txt", "app/main.py", "main.py"],
                "express-api": ["package.json", "src/routes", "routes/"],
            }
            
            scores = {}
            for project_type, indicator_files in indicators.items():
                score = sum(1 for f in indicator_files if f in files or any(f in file for file in files))
                if score > 0:
                    scores[project_type] = score
            
            if not scores:
                return {
                    "detected": False,
                    "project_type": None,
                    "confidence": 0,
                    "message": "Could not detect project type - appears to be empty or unknown"
                }
            
            best_match = max(scores, key=scores.get)
            confidence = min(scores[best_match] / 3 * 100, 100)  # Normalize to percentage
            
            return {
                "detected": True,
                "project_type": best_match,
                "confidence": confidence,
                "all_matches": scores
            }
            
        except Exception as e:
            logger.error(f"Failed to detect project type: {str(e)}")
            return {
                "detected": False,
                "error": str(e)
            }
    
    async def add_dependency(
        self,
        package_name: str,
        version: Optional[str] = None,
        dev: bool = False
    ) -> Dict[str, Any]:
        """
        Add a dependency to the project.
        
        Args:
            package_name: Name of the package to add
            version: Optional version specifier
            dev: Whether this is a dev dependency
            
        Returns:
            Dict with success status
        """
        try:
            # Detect project type
            detection = await self.detect_project_type()
            project_type = detection.get("project_type")
            
            if project_type in ["react", "node", "nextjs", "express-api"]:
                # Node.js project - modify package.json
                return await self._add_npm_dependency(package_name, version, dev)
            elif project_type in ["python", "fastapi"]:
                # Python project - modify requirements.txt
                return await self._add_python_dependency(package_name, version)
            else:
                return {
                    "success": False,
                    "error": f"Cannot add dependency - unknown project type: {project_type}"
                }
                
        except Exception as e:
            logger.error(f"Failed to add dependency: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _add_npm_dependency(
        self,
        package_name: str,
        version: Optional[str],
        dev: bool
    ) -> Dict[str, Any]:
        """Add an npm dependency to package.json."""
        try:
            content = await self.read_file("package.json")
            package_json = json.loads(content)
            
            dep_key = "devDependencies" if dev else "dependencies"
            if dep_key not in package_json:
                package_json[dep_key] = {}
            
            package_json[dep_key][package_name] = version or "latest"
            
            success = await self.write_file(
                "package.json",
                json.dumps(package_json, indent=2)
            )
            
            return {
                "success": success,
                "package": package_name,
                "version": version or "latest",
                "dev": dev
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _add_python_dependency(
        self,
        package_name: str,
        version: Optional[str]
    ) -> Dict[str, Any]:
        """Add a Python dependency to requirements.txt."""
        try:
            try:
                content = await self.read_file("requirements.txt")
            except:
                content = ""
            
            # Check if already exists
            if package_name.lower() in content.lower():
                return {
                    "success": True,
                    "message": f"{package_name} already in requirements.txt"
                }
            
            # Add the dependency
            dep_line = f"{package_name}"
            if version:
                dep_line += f">={version}"
            
            new_content = content.strip() + f"\n{dep_line}\n"
            
            success = await self.write_file("requirements.txt", new_content)
            
            return {
                "success": success,
                "package": package_name,
                "version": version
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
