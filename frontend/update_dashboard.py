import re

file_path = r'c:\Users\eesha\OneDrive\Desktop\GMAIL CLONE\frontend\src\components\Dashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "Star, Bookmark, Wand2 } from 'lucide-react';",
    "Star, Bookmark, Wand2, Moon, Sun, Folder } from 'lucide-react';"
)

# 2. State Hooks
state_hooks = """
  // Dark Mode
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Labels/Folders
  const [customFolders, setCustomFolders] = useState(() => {
    const saved = localStorage.getItem(`folders_${user?.id}`);
    return saved ? JSON.parse(saved) : ['Work', 'Personal'];
  });

  const handleAddFolder = () => {
    const name = window.prompt("Enter new label/folder name:");
    if (name && name.trim()) {
      const newFolders = [...customFolders, name.trim()];
      setCustomFolders(newFolders);
      localStorage.setItem(`folders_${user?.id}`, JSON.stringify(newFolders));
    }
  };

  // Profile Avatar State"""
content = content.replace('  // Profile Avatar State', state_hooks)

# 3. Fetching Logic
old_fetch = "const res = await fetch(`/api/mail/${tab}`, {"
new_fetch = """const isCustomFolder = !['inbox', 'starred', 'important', 'sent', 'drafts', 'bin', 'spam', 'compose'].includes(tab);
      const url = isCustomFolder ? `/api/mail/folder/${tab}` : `/api/mail/${tab}`;
      const res = await fetch(url, {"""
content = content.replace(old_fetch, new_fetch)

# 4. Menu Items Array
old_menu_items = """{ id: 'spam', label: 'Spam', icon: <AlertOctagon size={20} />, count: activeTab === 'spam' ? mails.length : undefined },
  ];"""
new_menu_items = """{ id: 'spam', label: 'Spam', icon: <AlertOctagon size={20} />, count: activeTab === 'spam' ? mails.length : undefined },
    ...customFolders.map(f => ({ id: f.toLowerCase(), label: f, icon: <Folder size={20} />, count: activeTab === f.toLowerCase() ? mails.length : undefined }))
  ];"""
content = content.replace(old_menu_items, new_menu_items)

# 5. Header Dark Mode toggle
old_logout = """<div onClick={onLogout} style={{ cursor: 'pointer', background: 'var(--search-bg)', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Log out">"""
new_logout = """<div onClick={() => setIsDarkMode(!isDarkMode)} style={{ cursor: 'pointer', background: 'var(--search-bg)', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '10px' }} title="Toggle Dark Mode">
            {isDarkMode ? <Sun size={20} color="var(--icon-color)" /> : <Moon size={20} color="var(--icon-color)" />}
          </div>

          <div onClick={onLogout} style={{ cursor: 'pointer', background: 'var(--search-bg)', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Log out">"""
content = content.replace(old_logout, new_logout)

# 6. Make mail rows draggable
old_row = """<div key={mail.id} onClick={() => {"""
new_row = """<div key={mail.id} draggable onDragStart={(e) => { e.dataTransfer.setData('mailId', mail.id); }} onClick={() => {"""
content = content.replace(old_row, new_row)

# 7. Add onDragOver and onDrop to menu items in sidebar
old_menu_item_div = """<div
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={isSidebarCollapsed ? item.label : undefined}"""
new_menu_item_div = """<div
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={isSidebarCollapsed ? item.label : undefined}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const mailId = e.dataTransfer.getData('mailId');
                  if (mailId) handleMoveFolder(mailId, item.id);
                }}"""
content = content.replace(old_menu_item_div, new_menu_item_div)

# 8. Add "Create Label" button
old_sidebar_close = """          </div>
        </div>

        {/* Content Area */}"""
new_sidebar_close = """          </div>
          <div style={{ padding: '0 24px', marginTop: '16px', display: 'flex', alignItems: 'center', color: 'var(--icon-color)', cursor: 'pointer' }} onClick={handleAddFolder}>
            {!isSidebarCollapsed && <><Plus size={18} style={{ marginRight: '16px' }} /> <span style={{ fontSize: '0.875rem' }}>Create Label</span></>}
            {isSidebarCollapsed && <Plus size={18} style={{ margin: '0 auto' }} />}
          </div>
        </div>

        {/* Content Area */}"""
content = content.replace(old_sidebar_close, new_sidebar_close)

# 9. In `handleMoveFolder`, fix folder id to uppercase
old_move_folder = """const handleMoveFolder = async (mailId, folder) => {
    try {
      const res = await fetch(`/api/mail/${mailId}/folder?folder=${folder}`,"""
new_move_folder = """const handleMoveFolder = async (mailId, folder) => {
    try {
      const res = await fetch(`/api/mail/${mailId}/folder?folder=${folder.toUpperCase()}`,"""
content = content.replace(old_move_folder, new_move_folder)


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Dashboard updated successfully.")
