import re
from typing import Tuple
import httpx


def _parse_owner_repo(repo_url: str) -> Tuple[str, str]:
    """Extract owner and repo name from common GitHub URL formats.

    Supports:
    - https://github.com/owner/repo
    - https://github.com/owner/repo/
    - https://github.com/owner/repo.git
    - git@github.com:owner/repo.git
    """
    repo_url = repo_url.strip()
    https_match = re.match(r"https?://github.com/([^/]+)/([^/#?]+)", repo_url)
    if https_match:
        owner, repo = https_match.group(1), https_match.group(2)
        repo = repo[:-4] if repo.endswith('.git') else repo
        return owner, repo

    ssh_match = re.match(r"git@github.com:([^/]+)/([^/#?]+)", repo_url)
    if ssh_match:
        owner, repo = ssh_match.group(1), ssh_match.group(2)
        repo = repo[:-4] if repo.endswith('.git') else repo
        return owner, repo

    raise ValueError("Unsupported GitHub repo URL format")


async def get_repo_structure(repo_url: str, max_files: int = 500, max_depth: int = 3) -> str:
    """Fetch repository structure (names only, no code) as a readable outline string.

    - Uses GitHub REST API without authentication (works for public repos; private will fail).
    - Limits to `max_files` items and `max_depth` levels to keep prompt small.
    - Returns a newline-separated tree-like listing suitable for LLM context.
    """
    owner, repo = _parse_owner_repo(repo_url)

    async with httpx.AsyncClient(timeout=20.0) as client:
        # Get default branch
        repo_resp = await client.get(f"https://api.github.com/repos/{owner}/{repo}")
        if repo_resp.status_code != 200:
            return f"[Repo metadata unavailable: HTTP {repo_resp.status_code}]"
        repo_json = repo_resp.json()
        default_branch = repo_json.get('default_branch', 'main')

        # Get full tree (paths only)
        tree_resp = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/git/trees/{default_branch}",
            params={"recursive": "1"}
        )
        if tree_resp.status_code != 200:
            # Fallback to top-level contents
            contents_resp = await client.get(f"https://api.github.com/repos/{owner}/{repo}/contents")
            if contents_resp.status_code != 200:
                return f"[Repo structure unavailable: HTTP {tree_resp.status_code}]"
            items = contents_resp.json()
            names = sorted([("dir" if i.get('type') == 'dir' else 'file', i.get('name', '')) for i in items])
            lines = ["/ (top-level)"]
            for t, name in names[:max_files]:
                prefix = "📁" if t == 'dir' else "📄"
                lines.append(f"{prefix} {name}")
            if len(names) > max_files:
                lines.append(f"… (+{len(names) - max_files} more)")
            return "\n".join(lines)

        tree_json = tree_resp.json()
        entries = tree_json.get('tree', [])

        # Filter and limit by depth
        def depth(p: str) -> int:
            return p.count('/')

        # Exclude .git and large binary folders commonly
        exclude_dirs = {'.git', 'node_modules', 'dist', 'build', '.next', '.expo'}
        filtered = []
        for e in entries:
            p = e.get('path', '')
            if any(part in exclude_dirs for part in p.split('/')):
                continue
            if depth(p) > max_depth:
                continue
            filtered.append(e)

        # Sort directories first then files, alphabetical
        filtered.sort(key=lambda e: (0 if e.get('type') == 'tree' else 1, e.get('path', '')))

        lines = [f"/ ({owner}/{repo}@{default_branch})"]
        count = 0
        for e in filtered:
            if count >= max_files:
                lines.append(f"… (+more files)")
                break
            p = e.get('path', '')
            t = e.get('type')  # 'tree' dir, 'blob' file
            indent = '  ' * depth(p)
            prefix = '📁' if t == 'tree' else '📄'
            lines.append(f"{indent}{prefix} {p.split('/')[-1]}")
            count += 1

        return "\n".join(lines)
