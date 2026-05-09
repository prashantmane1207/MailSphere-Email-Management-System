import re

file_path = r'c:\Users\eesha\OneDrive\Desktop\GMAIL CLONE\frontend\src\components\Dashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    '#ffffff': 'var(--panel-bg)',
    '#f6f8fc': 'var(--header-bg)',
    '#444746': 'var(--icon-color)',
    '#202124': 'var(--text-main)',
    '#1f1f1f': 'var(--text-main)',
    '#5f6368': 'var(--text-muted)',
    '#f1f3f4': 'var(--border-light)',
    '#dadce0': 'var(--border-dark)',
    '#eaf1fb': 'var(--search-bg)',
    '#d3e3fd': 'var(--active-bg)',
    '#041e49': 'var(--active-text)',
    '#0b57d0': 'var(--primary-color)',
    '#001d35': 'var(--active-text)',
    '#c2e7ff': 'var(--primary-hover)',
    '#e1e5ea': 'var(--hover-bg)'
}

for old, new in replacements.items():
    content = content.replace(f"'{old}'", f"'{new}'")
    content = content.replace(f'"{old}"', f'"{new}"')
    content = content.replace(old, new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
