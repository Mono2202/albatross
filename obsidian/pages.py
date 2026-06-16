import os
import re

from backend.logger import get_logger
from .base import ObsidianBase

logger = get_logger(__name__)


class Pages(ObsidianBase):
    WIKILINK_PATTERN = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]")

    def __init__(self, vault_path, archive_path=None, ignore_dirs=None):
        super().__init__(vault_path, ignore_dirs)
        self.archive_path = archive_path or ""

    def _archive_rel(self):
        return (
            os.path.relpath(self.archive_path, self.vault_path).replace(os.sep, "/")
            if self.archive_path else ""
        )

    def _is_archived(self, rel_path):
        archive_rel = self._archive_rel()
        return bool(archive_rel and (rel_path == archive_rel or rel_path.startswith(archive_rel + "/")))

    def list_pages(self):
        pages = []
        for path in self._walk_md_files():
            rel = os.path.relpath(path, self.vault_path).replace(os.sep, "/")
            if any(part.startswith(".") for part in rel.split("/")):
                continue
            if self._is_archived(rel):
                continue
            name = os.path.splitext(os.path.basename(rel))[0]
            pages.append({"path": rel, "name": name})
        return sorted(pages, key=lambda p: p["name"].lower())

    def _resolve_path(self, rel_path):
        if not rel_path or not rel_path.endswith(".md"):
            return None
        vault_root = os.path.realpath(self.vault_path)
        full = os.path.realpath(os.path.join(vault_root, rel_path))
        if os.path.commonpath([vault_root, full]) != vault_root:
            return None
        if not os.path.isfile(full):
            return None
        return full

    def read_page(self, rel_path):
        full = self._resolve_path(rel_path)
        if not full:
            raise FileNotFoundError(rel_path)
        with open(full, "r", encoding="utf-8") as f:
            content = f.read()
        name = os.path.splitext(os.path.basename(rel_path))[0]
        return {"path": rel_path, "name": name, "content": content}

    def resolve_asset(self, ref):
        ref = (ref or "").strip()
        if not ref:
            return None
        vault_root = os.path.realpath(self.vault_path)
        if "/" in ref or "\\" in ref:
            full = os.path.realpath(os.path.join(vault_root, ref))
            if os.path.commonpath([vault_root, full]) == vault_root and os.path.isfile(full):
                return full
            return None
        for root, dirs, files in os.walk(self.vault_path):
            dirs[:] = [d for d in dirs if d not in self.ignore_dirs]
            if ref in files:
                return os.path.join(root, ref)
        return None

    def get_backlinks(self, rel_path):
        target_name = os.path.splitext(os.path.basename(rel_path))[0].lower()
        target_path_no_ext = os.path.splitext(rel_path)[0].lower()
        backlinks = []
        for path in self._walk_md_files():
            rel = os.path.relpath(path, self.vault_path).replace(os.sep, "/")
            if rel == rel_path or any(part.startswith(".") for part in rel.split("/")) or self._is_archived(rel):
                continue
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
            except Exception:
                continue
            for match in self.WIKILINK_PATTERN.finditer(content):
                link = match.group(1).strip().lower()
                if link == target_name or link == target_path_no_ext:
                    backlinks.append({"path": rel, "name": os.path.splitext(os.path.basename(rel))[0]})
                    break
        return sorted(backlinks, key=lambda p: p["name"].lower())
