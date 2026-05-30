import os
import re
from datetime import datetime

from backend.logger import get_logger

logger = get_logger(__name__)

CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Housing', 'Utilities', 'Other']


class Finance:
    def __init__(self, finance_path: str):
        self.finance_path = finance_path

    def get_entries(self, month: str) -> list:
        filepath = self._filepath(month)
        if not os.path.exists(filepath):
            return []
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        return self._parse_entries(content)

    def add_entry(self, month: str, title: str, category: str, amount: float) -> None:
        if not self.finance_path:
            raise ValueError("OBSIDIAN_FINANCE_PATH is not configured")
        os.makedirs(self.finance_path, exist_ok=True)
        today = datetime.now().strftime("%Y-%m-%d")
        safe_title = title.replace('|', '\\|')
        row = f"| {today} | {safe_title} | {category} | {amount:.2f} |"
        filepath = self._filepath(month)
        if os.path.exists(filepath):
            self._append_row(filepath, row)
        else:
            content = "\n".join([
                "| Date | Title | Category | Amount |",
                "|------|-------|----------|--------|",
                row,
                "",
            ])
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
        logger.info(f"Finance entry added: {title} {amount:.2f} ({category})")

    def delete_entry(self, month: str, index: int) -> None:
        filepath = self._filepath(month)
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        data_rows = [(i, l) for i, l in enumerate(lines) if self._is_data_row(l)]
        if index < 0 or index >= len(data_rows):
            raise IndexError("Entry index out of range")
        lines.pop(data_rows[index][0])
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        logger.info(f"Finance entry {index} deleted from {month}")

    def _filepath(self, month: str) -> str:
        return os.path.join(self.finance_path, f"{month}.md")

    @staticmethod
    def _is_data_row(line: str) -> bool:
        s = line.strip()
        if not s.startswith('|'):
            return False
        if re.match(r'^\|\s*Date\s*\|', s):
            return False
        if re.match(r'^\|[-| ]+\|', s):
            return False
        return True

    @staticmethod
    def _parse_entries(content: str) -> list:
        entries = []
        for line in content.splitlines():
            if not Finance._is_data_row(line):
                continue
            parts = [p.strip() for p in line.split('|')[1:-1]]
            if len(parts) < 4:
                continue
            try:
                entries.append({
                    'date': parts[0],
                    'title': parts[1],
                    'category': parts[2],
                    'amount': float(parts[3]),
                })
            except (ValueError, IndexError):
                continue
        return entries

    @staticmethod
    def _append_row(filepath: str, row: str) -> None:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.read().rstrip('\n').split('\n')
        last_table_idx = max(
            (i for i, l in enumerate(lines) if l.strip().startswith('|')),
            default=len(lines) - 1,
        )
        lines.insert(last_table_idx + 1, row)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines) + '\n')
