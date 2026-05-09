import React, { useState, useEffect } from 'react';
import { Inbox, Send, FileEdit, Plus, LogOut, Loader, Search, Trash2, AlertOctagon, Menu, X, Pencil, Mail, Tag, Users, Info, ArrowLeft, UserCircle, Paperclip, Maximize2, Minimize2, Minus, Star, Bookmark, Wand2, Moon, Sun, Folder, Archive, Bell, Shield } from 'lucide-react';
import { Client } from '@stomp/stompjs';

export default function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox', 'sent', 'drafts', 'compose'
  const [mails, setMails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stompClient, setStompClient] = useState(null);

  // Layout State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Compose State
  const [isComposing, setIsComposing] = useState(false);
  const [isComposeMaximized, setIsComposeMaximized] = useState(false);
  const [selectedMail, setSelectedMail] = useState(null);

  // Filter States
  const [filterHasAttachment, setFilterHasAttachment] = useState(false);
  const [filterTimeRange, setFilterTimeRange] = useState('Any time');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  // Schedule States
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Draft Auto-Save States
  const [draftStatus, setDraftStatus] = useState('');
  const [composeDraftId, setComposeDraftId] = useState(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // 2FA Setup State
  const [show2faModal, setShow2faModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [setup2faOtp, setSetup2faOtp] = useState('');
  const [setup2faError, setSetup2faError] = useState('');

  const handleSetup2FA = async () => {
    try {
      const res = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { userId: String(user.id) }
      });
      if (res.ok) {
        const data = await res.json();
        setQrCodeUrl(data.qrCodeUrl);
        setShow2faModal(true);
      } else {
        showNotification("Failed to fetch 2FA setup");
      }
    } catch (e) {
      showNotification("Failed to setup 2FA");
    }
  };

  const handleVerify2FASetup = async () => {
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', userId: String(user.id) },
        body: JSON.stringify({ code: parseInt(setup2faOtp) })
      });
      if (res.ok) {
        showNotification("2FA Enabled successfully!");
        setShow2faModal(false);
        setSetup2faOtp('');
        setSetup2faError('');
      } else {
        setSetup2faError("Invalid OTP. Try again.");
      }
    } catch (e) {
      setSetup2faError("Error verifying OTP");
    }
  };

  // Fetch Notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications', { headers: { userId: String(user.id) } });
        if (res.ok) setNotifications(await res.json());
      } catch (e) {
        console.error("Failed to load notifications", e);
      }
    };
    fetchNotifications();
  }, [user.id]);

  // Unread Categories Count
  const [categoryCounts, setCategoryCounts] = useState({ Primary: 0, Promotions: 0, Social: 0, Updates: 0 });

  const fetchUnreadCounts = async () => {
    try {
      const res = await fetch('/api/mail/counts', { headers: { userId: String(user.id) } });
      if (res.ok) setCategoryCounts(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchUnreadCounts();
  }, [mails, activeTab]);

  const markNotificationRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PUT', headers: { userId: String(user.id) } });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true, read: true } : n));
    } catch (e) { }
  };

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

  // Profile Avatar State
  const [avatar, setAvatar] = useState(() => localStorage.getItem(`avatar_${user?.id}`) || null);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2000000) { // Limit to ~2MB
        showNotification("File is too large! Please upload a smaller photo.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result);
        localStorage.setItem(`avatar_${user.id}`, reader.result);
        showNotification("Profile picture updated!");
      };
      reader.readAsDataURL(file);
    }
  };
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeDesc, setComposeDesc] = useState('');
  const [composeSending, setComposeSending] = useState(false);
  const [notification, setNotification] = useState('');
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', actionType: '', emailId: null, timeoutId: null });

  const triggerSnackbar = (message, actionType, emailId) => {
    if (snackbar.timeoutId) clearTimeout(snackbar.timeoutId);
    const timeoutId = setTimeout(() => {
      setSnackbar({ visible: false, message: '', actionType: '', emailId: null, timeoutId: null });
    }, 8000);
    setSnackbar({ visible: true, message, actionType, emailId, timeoutId });
  };

  const handleUndo = async () => {
    if (!snackbar.actionType || !snackbar.emailId) return;
    if (snackbar.timeoutId) clearTimeout(snackbar.timeoutId);
    setSnackbar({ visible: false, message: '', actionType: '', emailId: null, timeoutId: null });
    try {
      const res = await fetch('/api/mail/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', userId: String(user.id) },
        body: JSON.stringify({ actionType: snackbar.actionType, emailId: snackbar.emailId })
      });
      if (res.ok) {
        showNotification("Action undone successfully!");
        setPage(0);
        fetchMails(activeTab, 0, debouncedQuery);
      } else {
        showNotification("Failed to undo action.");
      }
    } catch(err) {
      showNotification("Error undoing action.");
    }
  };

  const [selectedEmailIds, setSelectedEmailIds] = useState([]);
  
  const handleBulkAction = async (action) => {
    if (selectedEmailIds.length === 0) return;
    try {
      const res = await fetch('/api/mail/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', userId: String(user.id) },
        body: JSON.stringify({ emailIds: selectedEmailIds, action })
      });
      if (res.ok) {
        showNotification(`Applied action successfully!`);
        setSelectedEmailIds([]);
        setPage(0);
        fetchMails(activeTab, 0, debouncedQuery);
      } else {
        showNotification("Failed to apply bulk action.");
      }
    } catch(err) {
      showNotification("Error applying bulk action.");
    }
  };

  const [attachments, setAttachments] = useState([]);
  const [translatedText, setTranslatedText] = useState(null);
  const [translateTargetLang, setTranslateTargetLang] = useState('hi');
  const [isTranslating, setIsTranslating] = useState(false);
  const [composeLanguage, setComposeLanguage] = useState('en');

  const handleTranslate = async () => {
    if (!selectedMail || !selectedMail.description) return;
    setIsTranslating(true);
    try {
      const res = await fetch('/api/mail/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', userId: String(user.id) },
        body: JSON.stringify({ text: selectedMail.description, targetLanguage: translateTargetLang })
      });
      if (res.ok) {
        const data = await res.json();
        setTranslatedText(data.translatedText);
      } else {
        showNotification("Translation failed.");
      }
    } catch(err) {
      showNotification("Translation error.");
    } finally {
      setIsTranslating(false);
    }
  };

  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(Array.from(e.dataTransfer.files));
    }
  };

  const handleAttachments = (e) => {
    handleFilesUpload(Array.from(e.target.files));
  };

  const handleFilesUpload = async (files) => {
    let totalSize = attachments.reduce((acc, a) => acc + a.size, 0);
    files.forEach(file => totalSize += file.size);

    if (totalSize > 30 * 1024 * 1024) { // 30 MB
      showNotification("Total attachments size exceeds 30 MB limit!");
      return;
    }

    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    try {
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const urls = await res.json();
        const newAttachments = files.map((file, i) => ({
          filename: file.name,
          fileType: file.type,
          size: file.size,
          data: urls[i]
        }));
        setAttachments(prev => [...prev, ...newAttachments]);
        showNotification("Files uploaded successfully!");
      } else {
        showNotification("Failed to upload files.");
      }
    } catch (e) {
      console.error(e);
      showNotification("Could not reach file server.");
    }
  };

  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false);

  const handleFixGrammar = async () => {
    if (!composeDesc.trim()) return;
    setIsCheckingGrammar(true);
    try {
      const res = await fetch('https://api.languagetoolplus.com/v2/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ text: composeDesc, language: 'en-US' })
      });
      const data = await res.json();
      let correctedText = composeDesc;
      
      const matches = data.matches.reverse(); 
      matches.forEach(match => {
        if (match.replacements.length > 0) {
          const replacement = match.replacements[0].value;
          correctedText = correctedText.substring(0, match.offset) + 
                          replacement + 
                          correctedText.substring(match.offset + match.length);
        }
      });
      
      setComposeDesc(correctedText);
      showNotification(matches.length > 0 ? `Fixed ${matches.length} grammar issue(s)!` : "Perfect! No grammar issues found.");
    } catch (err) {
      console.error(err);
      showNotification("Could not check grammar.");
    } finally {
      setIsCheckingGrammar(false);
    }
  };

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500); // 500ms delay
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Handle active tab or search change
  useEffect(() => {
    if (debouncedQuery.trim() !== '') {
      if (activeTab !== 'search') setActiveTab('search');
      else { setPage(0); fetchMails('search', 0, debouncedQuery); }
    } else {
      if (activeTab === 'search') setActiveTab('inbox');
    }
  }, [debouncedQuery]);

  useEffect(() => {
    if (activeTab !== 'search' || debouncedQuery.trim() !== '') {
      setSelectedMail(null);
      setSelectedEmailIds([]);
      setFilterHasAttachment(false);
      setFilterTimeRange('Any time');
      setFilterFrom('');
      setFilterTo('');
      setPage(0);
      fetchMails(activeTab, 0, debouncedQuery);
    }
  }, [activeTab]);

  useEffect(() => {
    if (page > 0) {
      fetchMails(activeTab, page, debouncedQuery);
    }
  }, [page]);

  // Fetch Mails based on tab
  const fetchMails = async (tab, pageNum = 0, query = debouncedQuery) => {
    if (tab === 'compose') return;
    if (pageNum === 0) setLoading(true);
    try {
      let url = '';
      if (tab === 'search') {
        url = `/api/mail/search?q=${encodeURIComponent(query)}&page=${pageNum}&size=10`;
      } else {
        const isCustomFolder = !['inbox', 'starred', 'important', 'sent', 'drafts', 'scheduled', 'bin', 'spam', 'compose', 'archived'].includes(tab);
        url = isCustomFolder ? `/api/mail/folder/${tab}?page=${pageNum}&size=10` : `/api/mail/${tab}?page=${pageNum}&size=10`;
      }
      const res = await fetch(url, {
        headers: { userId: String(user.id) }
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.content || (Array.isArray(data) ? data : []);
        if (pageNum === 0) {
          setMails(content);
        } else {
          setMails(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMails = content.filter(m => !existingIds.has(m.id));
            return [...prev, ...newMails];
          });
        }
        setHasMore(!data.last && content.length > 0);
      }
    } catch (e) {
      console.error('Fetch error:', e);
      showNotification('Cannot load mails. Backend not reachable.');
    } finally {
      if (pageNum === 0) setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
  };

  // WebSocket Connection
  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const client = new Client({
      brokerURL: `${wsProtocol}://${window.location.host}/ws`,
      reconnectDelay: 5000,
      onConnect: () => {
        console.log('Connected to WS');
        client.subscribe(`/topic/inbox/${user.id}`, (message) => {
          const newMail = JSON.parse(message.body);
          if (activeTab === 'inbox') {
            setMails((prev) => {
              if (prev.some(m => m.id === newMail.id)) return prev;
              return [newMail, ...prev];
            });
          } else {
            fetchUnreadCounts();
          }
          
          const senderName = newMail.sender ? (newMail.sender.username || newMail.sender.email.split('@')[0]) : 'Unknown';
          showNotification(`New email from ${senderName}`);
        });
        
        client.subscribe(`/topic/notifications/${user.id}`, (message) => {
          const notif = JSON.parse(message.body);
          setNotifications(prev => [notif, ...prev]);
          if (notificationsEnabled) {
            showNotification(`🔔 ${notif.message}`);
          }
        });
      },
      onWebSocketError: (event) => {
        console.error('WebSocket error:', event);
      }
    });
    client.activate();
    setStompClient(client);

    return () => {
      client.deactivate();
    };
  }, [user.id, activeTab]);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  useEffect(() => {
    if (!isComposing) return;
    if (!composeTo.trim() && !composeSubject.trim() && !composeDesc.trim() && attachments.length === 0) {
       setDraftStatus('');
       return;
    }
    
    setDraftStatus('Saving...');
    const handler = setTimeout(async () => {
      try {
        const isNew = !composeDraftId;
        const url = isNew ? '/api/mail/draft' : `/api/mail/draft/${composeDraftId}`;
        const method = isNew ? 'POST' : 'PUT';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', userId: String(user.id) },
          body: JSON.stringify({
            receiverEmail: composeTo,
            subject: composeSubject,
            description: composeDesc,
            draft: true,
            attachments: attachments,
            language: composeLanguage
          })
        });

        if (res.ok) {
          const mail = await res.json();
          setComposeDraftId(mail.id);
          setDraftStatus(`Draft Saved at ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`);
        } else {
          setDraftStatus('Failed to save');
        }
      } catch (e) {
        setDraftStatus('Failed to save');
      }
    }, 2500);

    return () => clearTimeout(handler);
  }, [composeTo, composeSubject, composeDesc, attachments, isComposing, composeDraftId, user.id]);

  const handleSend = async (isDraft) => {
    setComposeSending(true);
    try {
      const res = await fetch(isDraft && composeDraftId ? `/api/mail/draft/${composeDraftId}` : (isDraft ? '/api/mail/draft' : '/api/mail/send'), {
        method: isDraft && composeDraftId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          userId: String(user.id)
        },
        body: JSON.stringify({
          receiverEmail: composeTo,
          subject: composeSubject,
          description: composeDesc,
          draft: isDraft,
          attachments: attachments,
          language: composeLanguage
        })
      });
      if (!res.ok) {
        throw new Error(await res.text() || 'Failed to send mail.');
      }
      const mailData = await res.json();
      if (isDraft) {
        showNotification('Draft saved successfully');
      } else {
        triggerSnackbar('Email sent', 'SEND', mailData.id);
      }
      setComposeTo(''); setComposeSubject(''); setComposeDesc(''); setAttachments([]); setComposeDraftId(null); setDraftStatus('');
      setIsComposing(false);
      if (!isDraft) setActiveTab('sent');
      else setActiveTab('drafts');
    } catch (err) {
      const message = err instanceof TypeError
        ? 'Cannot reach backend. Make sure Spring Boot is running on port 8080.'
        : err.message;
      showNotification(message);
    } finally {
      setComposeSending(false);
    }
  };

  const handleScheduleSend = async () => {
    if (!scheduleDate || !scheduleTime) {
      showNotification("Please select a date and time.");
      return;
    }
    const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}:00`);
    if (scheduledDateTime <= new Date()) {
      showNotification("Cannot schedule in the past!");
      return;
    }
    
    setComposeSending(true);
    try {
      const res = await fetch('/api/mail/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', userId: String(user.id) },
        body: JSON.stringify({
          receiverEmail: composeTo,
          subject: composeSubject,
          description: composeDesc,
          draft: false,
          attachments: attachments,
          scheduledTime: scheduledDateTime.toISOString(),
          language: composeLanguage
        })
      });
      if (!res.ok) throw new Error(await res.text() || 'Failed to schedule.');
      showNotification(`Email scheduled for ${scheduledDateTime.toLocaleString()}`);
      setComposeTo(''); setComposeSubject(''); setComposeDesc(''); setAttachments([]);
      setIsComposing(false);
      setShowScheduleModal(false);
      setActiveTab('scheduled');
    } catch (e) {
      showNotification("Failed to schedule: " + e.message);
    } finally {
      setComposeSending(false);
    }
  };

  const handleCancelSchedule = async (mailId) => {
    try {
      const res = await fetch(`/api/mail/cancelSchedule/${mailId}`, {
        method: 'PUT',
        headers: { userId: String(user.id) }
      });
      if (res.ok) {
        showNotification("Schedule cancelled. Moved to drafts.");
        setMails(prev => prev.filter(m => m.id !== mailId));
        setSelectedMail(null);
      } else {
        throw new Error('Action failed');
      }
    } catch(err) {
        showNotification("Failed to cancel schedule.");
    }
  };

  const handleMoveFolder = async (mailId, folder) => {
    try {
      const res = await fetch(`/api/mail/${mailId}/folder?folder=${folder.toUpperCase()}`, {
        method: 'PATCH',
        headers: { userId: String(user.id) }
      });
      if (res.ok) {
        setMails(prev => prev.filter(m => m.id !== mailId));
        setSelectedMail(null);
        if (folder.toUpperCase() === 'BIN') {
          triggerSnackbar('Email deleted', 'DELETE', mailId);
        } else if (folder.toUpperCase() === 'INBOX') {
          showNotification(`Moved to Inbox`);
        } else {
          triggerSnackbar(`Moved to ${folder}`, 'ARCHIVE', mailId);
        }
      }
    } catch (err) {
      showNotification('Failed to move mail');
    }
  };

  const handlePermanentDelete = async (mailId) => {
    if (!window.confirm("Are you sure you want to delete this permanently?")) return;
    try {
      const res = await fetch(`/api/mail/permanent/${mailId}`, {
        method: 'DELETE',
        headers: { userId: String(user.id) }
      });
      if (res.ok) {
        showNotification(`Deleted permanently`);
        setMails(prev => prev.filter(m => m.id !== mailId));
        setSelectedMail(null);
      }
    } catch (err) {
      showNotification('Failed to delete permanently');
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm("Empty trash? All messages will be permanently deleted.")) return;
    try {
      const res = await fetch(`/api/mail/bin`, {
        method: 'DELETE',
        headers: { userId: String(user.id) }
      });
      if (res.ok) {
        showNotification(`Trash emptied`);
        setMails([]);
      }
    } catch (err) {
      showNotification('Failed to empty trash');
    }
  };

  const handleToggleStar = async (mailId) => {
    try {
      const res = await fetch(`/api/mail/${mailId}/star`, {
        method: 'PUT',
        headers: { userId: String(user.id) }
      });
      if (res.ok) {
        const updatedMail = await res.json();
        setMails(prev => prev.map(m => m.id === mailId ? updatedMail : m));
        if (selectedMail && selectedMail.id === mailId) setSelectedMail(updatedMail);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleImportant = async (mailId) => {
    try {
      const res = await fetch(`/api/mail/${mailId}/important`, {
        method: 'PUT',
        headers: { userId: String(user.id) }
      });
      if (res.ok) {
        const updatedMail = await res.json();
        setMails(prev => prev.map(m => m.id === mailId ? updatedMail : m));
        if (selectedMail && selectedMail.id === mailId) setSelectedMail(updatedMail);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleArchive = async (mailId) => {
    try {
      const res = await fetch(`/api/mail/archive/${mailId}`, {
        method: 'PUT',
        headers: { userId: String(user.id) }
      });
      if (res.ok) {
        showNotification(`Archived successfully`);
        setMails(prev => prev.filter(m => m.id !== mailId));
        setSelectedMail(null);
      }
    } catch (err) {
      showNotification('Failed to archive');
    }
  };

  const handleUnarchive = async (mailId) => {
    try {
      const res = await fetch(`/api/mail/unarchive/${mailId}`, {
        method: 'PUT',
        headers: { userId: String(user.id) }
      });
      if (res.ok) {
        showNotification(`Unarchived successfully`);
        setMails(prev => prev.filter(m => m.id !== mailId));
        setSelectedMail(null);
      }
    } catch (err) {
      showNotification('Failed to unarchive');
    }
  };

  const isItemActive = (itemId) => {
    if (itemId === 'inbox') return ['inbox', 'promotions', 'social', 'updates'].includes(activeTab);
    return activeTab === itemId;
  };

  const menuItems = [
    { id: 'inbox', label: 'Inbox', icon: <Inbox size={20} />, count: isItemActive('inbox') ? mails.length : undefined },
    { id: 'starred', label: 'Starred', icon: <Star size={20} />, count: activeTab === 'starred' ? mails.length : undefined },
    { id: 'important', label: 'Important', icon: <Bookmark size={20} />, count: activeTab === 'important' ? mails.length : undefined },
    { id: 'sent', label: 'Sent', icon: <Send size={20} />, count: activeTab === 'sent' ? mails.length : undefined },
    { id: 'drafts', label: 'Drafts', icon: <FileEdit size={20} />, count: activeTab === 'drafts' ? mails.length : undefined },
    { id: 'scheduled', label: 'Scheduled', icon: <Star size={20} />, count: activeTab === 'scheduled' ? mails.length : undefined },
    { id: 'archived', label: 'Archive', icon: <Archive size={20} />, count: activeTab === 'archived' ? mails.length : undefined },
    { id: 'bin', label: 'Bin', icon: <Trash2 size={20} />, count: activeTab === 'bin' ? mails.length : undefined },
    { id: 'spam', label: 'Spam', icon: <AlertOctagon size={20} />, count: activeTab === 'spam' ? mails.length : undefined },
    ...customFolders.map(f => ({ id: f.toLowerCase(), label: f, icon: <Folder size={20} />, count: activeTab === f.toLowerCase() ? mails.length : undefined }))
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg-color)' }}>
      {/* Top Header */}
      <div style={{ height: '64px', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--header-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: isSidebarCollapsed ? 'auto' : '240px' }}>
          <div
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title="Main menu"
            style={{ cursor: 'pointer', padding: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Menu size={24} color="#000000" />
          </div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--icon-color)', margin: 0, fontSize: '1.4rem', fontWeight: 500 }}>
            <div style={{ color: '#ea4335' }}>
              <Mail size={28} />
            </div>
            JMail
          </h2>
        </div>

        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', background: 'var(--search-bg)', borderRadius: '24px', padding: '10px 20px', width: '50%', maxWidth: '720px' }}>
          <Search size={22} color="var(--icon-color)" style={{ marginRight: '16px', cursor: 'pointer' }} onClick={handleSearchSubmit} />
          <input type="text" placeholder="Search mail (e.g. from:john subject:meeting has:attachment before:2026-01-01)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none', width: '100%', fontSize: '1rem' }} />
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          
          {/* Notifications Bell */}
          <div style={{ position: 'relative' }}>
             <div onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)} style={{ cursor: 'pointer', background: 'var(--search-bg)', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Notifications">
               <Bell size={20} color="var(--icon-color)" />
               {notifications.filter(n => !(n.read || n.isRead)).length > 0 && (
                 <span style={{ position: 'absolute', top: '0px', right: '0px', background: '#ea4335', color: 'white', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                   {notifications.filter(n => !(n.read || n.isRead)).length}
                 </span>
               )}
             </div>
             {showNotificationsDropdown && (
               <div style={{ position: 'absolute', right: 0, top: '48px', width: '300px', background: 'var(--panel-bg)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, border: '1px solid var(--border-light)', overflow: 'hidden' }}>
                 <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--search-bg)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Notifications</span>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={notificationsEnabled} onChange={(e) => setNotificationsEnabled(e.target.checked)} />
                      Alerts On
                    </label>
                 </div>
                 <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--icon-color)', fontSize: '0.9rem' }}>No notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} onClick={() => markNotificationRead(n.id)} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', background: (n.read || n.isRead) ? 'var(--panel-bg)' : '#e8f0fe', transition: 'background 0.2s' }}>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: (n.read || n.isRead) ? 400 : 600 }}>{n.message}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>{new Date(n.timestamp).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</div>
                        </div>
                      ))
                    )}
                 </div>
               </div>
             )}
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{user.username}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--icon-color)' }}>{user.email}</div>
          </div>

          {/* Avatar Upload trigger and Label */}
          <label style={{ cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', background: avatar ? 'transparent' : 'var(--search-bg)', border: avatar ? 'none' : '1px solid #1a73e8', overflow: 'hidden', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }} title="Click to upload profile photo">
            {avatar ? (
              <img src={avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: '#1a73e8', fontWeight: 600, fontSize: '1.2rem' }}>{user.username.charAt(0).toUpperCase()}</span>
            )}
            <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          </label>

          <div onClick={() => setIsDarkMode(!isDarkMode)} style={{ cursor: 'pointer', background: 'var(--search-bg)', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '10px' }} title="Toggle Dark Mode">
            {isDarkMode ? <Sun size={20} color="var(--icon-color)" /> : <Moon size={20} color="var(--icon-color)" />}
          </div>

          <div onClick={handleSetup2FA} style={{ cursor: 'pointer', background: 'var(--search-bg)', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '10px' }} title="Setup 2FA">
            <Shield size={20} color="var(--icon-color)" />
          </div>

          <div onClick={onLogout} style={{ cursor: 'pointer', background: 'var(--search-bg)', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Log out">
            <LogOut size={20} color="var(--icon-color)" />
          </div>
        </div>
      </div>

      {notification && (
        <div style={{ position: 'fixed', bottom: '24px', left: '24px', background: 'var(--text-main)', color: 'white', padding: '14px 24px', borderRadius: '4px', zIndex: 100, fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {notification}
        </div>
      )}

      {snackbar.visible && (
        <div style={{ position: 'fixed', bottom: '24px', left: '24px', background: 'var(--text-main)', color: 'white', padding: '14px 24px', borderRadius: '4px', zIndex: 101, fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>{snackbar.message}</span>
          <button onClick={handleUndo} style={{ background: 'transparent', border: 'none', color: '#fbbc04', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}>Undo</button>
          <X size={16} onClick={() => { if(snackbar.timeoutId) clearTimeout(snackbar.timeoutId); setSnackbar(prev => ({...prev, visible: false})); }} style={{ cursor: 'pointer', marginLeft: '8px' }} />
        </div>
      )}

      {/* 2FA Modal */}
      {show2faModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--panel-bg)', padding: '30px', borderRadius: '12px', width: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-main)' }}>Enable Two-Factor Authentication</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Scan this QR code with Google Authenticator or a similar app.</p>
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              {qrCodeUrl ? <img src={qrCodeUrl} alt="2FA QR Code" /> : <Loader size={40} color="var(--primary-color)" className="spin" />}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Enter the 6-digit code generated by the app to verify.</p>
            {setup2faError && <div style={{ color: 'var(--danger)', marginBottom: '10px', fontSize: '0.9rem' }}>{setup2faError}</div>}
            <input type="text" placeholder="6-digit code" className="input-field" value={setup2faOtp} onChange={e => setSetup2faOtp(e.target.value)} style={{ width: '100%', marginBottom: '20px' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500 }} onClick={() => { setShow2faModal(false); setSetup2faOtp(''); setSetup2faError(''); }}>Cancel</button>
              <button className="btn" onClick={handleVerify2FASetup}>Verify & Enable</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout Below Header */}
      <div style={{ display: 'flex', flex: 1, padding: '0 16px 16px 0', gap: '16px', overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{ width: isSidebarCollapsed ? '72px' : '256px', display: 'flex', flexDirection: 'column', transition: 'width 0.2s ease-in-out' }}>
          <button
            style={{
              display: 'flex', alignItems: 'center', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
              gap: isSidebarCollapsed ? '0' : '16px',
              padding: isSidebarCollapsed ? '0' : '0 24px',
              height: '56px', width: isSidebarCollapsed ? '56px' : '144px',
              borderRadius: isSidebarCollapsed ? '16px' : '16px',
              background: 'var(--active-bg)', color: 'var(--active-text)', border: 'none', cursor: 'pointer',
              margin: isSidebarCollapsed ? '0 auto 16px auto' : '0 0 16px 8px',
              fontSize: '0.95rem', fontWeight: 500, transition: 'all 0.2s ease-in-out',
              boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)'
            }}
            onClick={() => setIsComposing(true)}
            onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 1px 3px 1px rgba(60,64,67,0.15), 0 2px 6px 2px rgba(60,64,67,0.15)'}
            onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)'}
            title={isSidebarCollapsed ? 'Compose' : undefined}
          >
            <Pencil size={24} color="var(--active-text)" />
            {!isSidebarCollapsed && <span>Compose</span>}
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: isSidebarCollapsed ? '12px' : '2px', flex: 1, paddingRight: isSidebarCollapsed ? '0' : '12px', alignItems: isSidebarCollapsed ? 'center' : 'stretch' }}>
            {menuItems.map(item => (
              <div
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={isSidebarCollapsed ? item.label : undefined}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const mailId = e.dataTransfer.getData('mailId');
                  if (mailId) handleMoveFolder(mailId, item.id);
                }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
                  gap: isSidebarCollapsed ? '0' : '18px',
                  padding: isSidebarCollapsed ? '0' : '0 12px 0 24px',
                  height: isSidebarCollapsed ? '32px' : '32px',
                  width: isSidebarCollapsed ? '32px' : 'auto',
                  borderRadius: isSidebarCollapsed ? '50%' : '0 16px 16px 0',
                  cursor: 'pointer', fontWeight: isItemActive(item.id) ? 700 : 500,
                  background: isItemActive(item.id) ? 'var(--active-bg)' : 'transparent',
                  color: isItemActive(item.id) ? 'var(--active-text)' : 'var(--icon-color)',
                  transition: 'background 0.2s'
                }}
              >
                {React.cloneElement(item.icon, { size: 18, style: { color: isItemActive(item.id) ? 'var(--active-text)' : 'var(--icon-color)' } })}
                {!isSidebarCollapsed && <span style={{ fontSize: '0.875rem' }}>{item.label}</span>}
                {!isSidebarCollapsed && item.count !== undefined && item.count > 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: isItemActive(item.id) ? 700 : 500 }}>
                    {item.count.toLocaleString()}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div style={{ padding: '0 24px', marginTop: '16px', display: 'flex', alignItems: 'center', color: 'var(--icon-color)', cursor: 'pointer' }} onClick={handleAddFolder}>
            {!isSidebarCollapsed && <><Plus size={18} style={{ marginRight: '16px' }} /> <span style={{ fontSize: '0.875rem' }}>Create Label</span></>}
            {isSidebarCollapsed && <Plus size={18} style={{ margin: '0 auto' }} />}
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, background: 'var(--panel-bg)', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Inbox Tabs (Functional) */}
          {['inbox', 'promotions', 'social', 'updates'].includes(activeTab) && !selectedMail && (
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', padding: '0 16px', background: 'var(--panel-bg)' }}>
              <div onClick={() => setActiveTab('inbox')} style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: activeTab === 'inbox' ? '3px solid var(--primary-color)' : '3px solid transparent', color: activeTab === 'inbox' ? 'var(--primary-color)' : 'var(--icon-color)', cursor: 'pointer', fontWeight: activeTab === 'inbox' ? 600 : 500, transition: 'all 0.2s' }}>
                <Inbox size={18} /> Primary
                {categoryCounts.Primary > 0 && <span style={{ background: '#1a73e8', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', marginLeft: '4px', transition: 'all 0.3s' }}>{categoryCounts.Primary} new</span>}
              </div>
              <div onClick={() => setActiveTab('promotions')} style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: activeTab === 'promotions' ? '3px solid var(--primary-color)' : '3px solid transparent', color: activeTab === 'promotions' ? 'var(--primary-color)' : 'var(--icon-color)', cursor: 'pointer', fontWeight: activeTab === 'promotions' ? 600 : 500, transition: 'all 0.2s' }}>
                <Tag size={18} /> Promotions 
                {categoryCounts.Promotions > 0 && <span style={{ background: '#188038', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', marginLeft: '4px', transition: 'all 0.3s' }}>{categoryCounts.Promotions} new</span>}
              </div>
              <div onClick={() => setActiveTab('social')} style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: activeTab === 'social' ? '3px solid var(--primary-color)' : '3px solid transparent', color: activeTab === 'social' ? 'var(--primary-color)' : 'var(--icon-color)', cursor: 'pointer', fontWeight: activeTab === 'social' ? 600 : 500, transition: 'all 0.2s' }}>
                <Users size={18} /> Social 
                {categoryCounts.Social > 0 && <span style={{ background: '#1a73e8', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', marginLeft: '4px', transition: 'all 0.3s' }}>{categoryCounts.Social} new</span>}
              </div>
              <div onClick={() => setActiveTab('updates')} style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: activeTab === 'updates' ? '3px solid var(--primary-color)' : '3px solid transparent', color: activeTab === 'updates' ? 'var(--primary-color)' : 'var(--icon-color)', cursor: 'pointer', fontWeight: activeTab === 'updates' ? 600 : 500, transition: 'all 0.2s' }}>
                <Info size={18} /> Updates 
                {categoryCounts.Updates > 0 && <span style={{ background: '#e37400', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', marginLeft: '4px', transition: 'all 0.3s' }}>{categoryCounts.Updates} new</span>}
              </div>
            </div>
          )}

          {/* Filter Chips Bar */}
          {!selectedMail && (
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: '12px', borderBottom: '1px solid var(--border-light)', background: 'var(--panel-bg)', flexWrap: 'wrap' }}>
              {activeTab !== 'inbox' && (
                <div style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-main)', textTransform: 'capitalize', marginRight: '8px' }}>
                  {activeTab}
                </div>
              )}
              <div
                onClick={() => {
                  if (filterTimeRange === 'Any time') setFilterTimeRange('Last 7 days');
                  else if (filterTimeRange === 'Last 7 days') setFilterTimeRange('Last 30 days');
                  else setFilterTimeRange('Any time');
                }}
                style={{ padding: '6px 12px', border: '1px solid var(--border-dark)', borderRadius: '8px', fontSize: '0.875rem', color: 'var(--icon-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', background: filterTimeRange !== 'Any time' ? 'var(--active-bg)' : 'transparent', transition: 'background 0.2s' }}>
                {filterTimeRange} <span style={{ fontSize: '0.6rem' }}>▼</span>
              </div>
              <div
                onClick={() => setFilterHasAttachment(!filterHasAttachment)}
                style={{ padding: '6px 12px', border: '1px solid var(--border-dark)', borderRadius: '8px', fontSize: '0.875rem', color: 'var(--icon-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', background: filterHasAttachment ? 'var(--active-bg)' : 'transparent', transition: 'background 0.2s' }}>
                Has attachment
              </div>
              {activeTab !== 'sent' && activeTab !== 'drafts' && (
                <div
                  onClick={() => {
                    const ans = window.prompt("Filter From (leave empty to clear):", filterFrom);
                    if (ans !== null) setFilterFrom(ans.trim());
                  }}
                  style={{ padding: '6px 12px', border: '1px solid var(--border-dark)', borderRadius: '8px', fontSize: '0.875rem', color: 'var(--icon-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', background: filterFrom ? 'var(--active-bg)' : 'transparent', transition: 'background 0.2s' }}>
                  {filterFrom ? `From: ${filterFrom}` : 'From'} <span style={{ fontSize: '0.6rem' }}>▼</span>
                </div>
              )}
              <div
                onClick={() => {
                  const ans = window.prompt("Filter To (leave empty to clear):", filterTo);
                  if (ans !== null) setFilterTo(ans.trim());
                }}
                style={{ padding: '6px 12px', border: '1px solid var(--border-dark)', borderRadius: '8px', fontSize: '0.875rem', color: 'var(--icon-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', background: filterTo ? 'var(--active-bg)' : 'transparent', transition: 'background 0.2s' }}>
                {filterTo ? `To: ${filterTo}` : 'To'} <span style={{ fontSize: '0.6rem' }}>▼</span>
              </div>
              <div
                onClick={() => { setFilterHasAttachment(false); setFilterTimeRange('Any time'); setFilterFrom(''); setFilterTo(''); }}
                style={{ marginLeft: '8px', fontSize: '0.875rem', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 500 }}>
                Clear Filters
              </div>
              {activeTab === 'bin' && mails.length > 0 && (
                <div
                  onClick={handleEmptyTrash}
                  style={{ marginLeft: 'auto', padding: '6px 16px', background: 'var(--danger)', color: 'white', borderRadius: '4px', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 500 }}>
                  Empty Trash
                </div>
              )}
            </div>
          )}



          <div 
            style={{ display: 'flex', flex: 1, overflowY: 'auto' }}
            onScroll={(e) => {
              const { scrollTop, scrollHeight, clientHeight } = e.target;
              if (scrollHeight - scrollTop <= clientHeight + 50 && hasMore && !loading && mails.length > 0 && !selectedMail) {
                setPage(prev => prev + 1);
              }
            }}
          >
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <Loader className="animate-spin" size={32} />
                </div>
              ) : (() => {
                let displayedMails = mails;
                if (filterHasAttachment) {
                  displayedMails = displayedMails.filter(m => m.attachments && m.attachments.length > 0);
                }
                if (filterTimeRange !== 'Any time') {
                  const now = new Date();
                  displayedMails = displayedMails.filter(m => {
                    const mailDate = new Date(m.timestamp);
                    const diffDays = Math.ceil(Math.abs(now - mailDate) / (1000 * 60 * 60 * 24));
                    if (filterTimeRange === 'Last 7 days') return diffDays <= 7;
                    if (filterTimeRange === 'Last 30 days') return diffDays <= 30;
                    return true;
                  });
                }
                if (filterFrom) {
                  displayedMails = displayedMails.filter(m => m.sender?.email.toLowerCase().includes(filterFrom.toLowerCase()));
                }
                if (filterTo) {
                  displayedMails = displayedMails.filter(m => m.receiver?.email.toLowerCase().includes(filterTo.toLowerCase()));
                }

                if (displayedMails.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', color: 'var(--icon-color)', padding: '80px 20px' }}>
                      <Inbox size={48} style={{ opacity: 0.2, marginBottom: '16px', margin: '0 auto' }} />
                      <p>No matching emails found.</p>
                    </div>
                  );
                }

                if (selectedMail) {
                  return (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <ArrowLeft size={20} color="var(--icon-color)" style={{ cursor: 'pointer' }} onClick={() => setSelectedMail(null)} title="Back" />
                      <div style={{ display: 'flex', gap: '20px', marginLeft: '16px', borderLeft: '1px solid var(--border-dark)', paddingLeft: '16px' }}>
                        {activeTab === 'scheduled' && (
                          <div style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => handleCancelSchedule(selectedMail.id)} title="Cancel Schedule">
                            <X size={14} /> Cancel Schedule
                          </div>
                        )}
                        {activeTab === 'bin' ? (
                          <>
                            <div style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => handleMoveFolder(selectedMail.id, 'INBOX')} title="Restore to Inbox">
                              Restore
                            </div>
                            <Trash2 size={20} color="var(--danger)" style={{ cursor: 'pointer' }} onClick={() => handlePermanentDelete(selectedMail.id)} title="Delete Forever" />
                          </>
                        ) : activeTab === 'archived' ? (
                          <>
                            <div style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => handleUnarchive(selectedMail.id)} title="Unarchive (Move to Inbox)">
                              Unarchive
                            </div>
                            <Trash2 size={20} color="var(--icon-color)" style={{ cursor: 'pointer' }} onClick={() => handleMoveFolder(selectedMail.id, 'BIN')} title="Delete" />
                          </>
                        ) : (
                          <>
                            <Archive size={20} color="var(--icon-color)" style={{ cursor: 'pointer' }} onClick={() => handleArchive(selectedMail.id)} title="Archive" />
                            <Trash2 size={20} color="var(--icon-color)" style={{ cursor: 'pointer' }} onClick={() => handleMoveFolder(selectedMail.id, 'BIN')} title="Delete" />
                            <AlertOctagon size={20} color="var(--icon-color)" style={{ cursor: 'pointer' }} onClick={() => handleMoveFolder(selectedMail.id, 'SPAM')} title="Report spam" />
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 400, color: 'var(--text-main)', margin: 0 }}>{selectedMail.subject || '(No Subject)'}</h2>
                        
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select value={translateTargetLang} onChange={(e) => setTranslateTargetLang(e.target.value)} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-dark)', background: 'var(--panel-bg)', color: 'var(--text-main)', fontSize: '0.8rem' }}>
                               <option value="en">English</option>
                               <option value="es">Spanish</option>
                               <option value="fr">French</option>
                               <option value="de">German</option>
                               <option value="hi">Hindi</option>
                               <option value="zh-CN">Chinese</option>
                               <option value="ja">Japanese</option>
                            </select>
                            <button onClick={handleTranslate} disabled={isTranslating} style={{ padding: '4px 12px', borderRadius: '4px', background: 'var(--search-bg)', border: '1px solid var(--border-dark)', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.8rem' }}>
                                {isTranslating ? 'Translating...' : 'Translate'}
                            </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                        <UserCircle size={40} color="#bdbdbd" />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                            {selectedMail.sender ? (selectedMail.sender.username || selectedMail.sender.email.split('@')[0]) : 'Unknown'}
                            <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '6px', fontSize: '0.8rem' }}>&lt;{selectedMail.sender?.email}&gt;</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            to {selectedMail.receiver ? (selectedMail.receiver.username || selectedMail.receiver.email.split('@')[0]) : 'me'}
                          </div>
                        </div>
                        <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(selectedMail.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                        {selectedMail.description}
                      </div>

                      {translatedText && (
                          <div style={{ marginTop: '24px', padding: '16px', background: 'var(--search-bg)', borderRadius: '8px', borderLeft: '4px solid var(--primary-color)' }}>
                              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--icon-color)' }}>Translated Content</h4>
                              <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                {translatedText}
                              </div>
                          </div>
                      )}

                      {selectedMail.attachments && selectedMail.attachments.length > 0 && (
                        <div style={{ marginTop: '32px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                          <h4 style={{ fontSize: '0.875rem', color: 'var(--icon-color)', marginBottom: '12px', fontWeight: 500 }}>{selectedMail.attachments.length} Attachments</h4>
                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            {selectedMail.attachments.map((att, i) => (
                              <a key={i} href={att.data} download={att.filename} style={{ textDecoration: 'none' }}>
                                <div style={{ padding: '8px 12px', border: '1px solid var(--border-dark)', borderRadius: '8px', fontSize: '0.8rem', color: '#1a73e8', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '150px', cursor: 'pointer', background: '#f8fafc' }}>
                                  <Paperclip size={16} />
                                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>{att.filename}</div>
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ); }

                const allIds = displayedMails.map(m => m.id);
                const isAllSelected = selectedEmailIds.length > 0 && selectedEmailIds.length === allIds.length;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    {/* Bulk Action Bar */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--panel-bg)' }}>
                       <input 
                         type="checkbox" 
                         checked={isAllSelected} 
                         onChange={(e) => e.target.checked ? setSelectedEmailIds(allIds) : setSelectedEmailIds([])} 
                         style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                         title="Select All"
                       />
                       {selectedEmailIds.length > 0 && (
                         <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                           <span style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginRight: '8px', fontWeight: 500 }}>{selectedEmailIds.length} selected</span>
                           <button onClick={() => handleBulkAction('DELETE')} style={{ padding: '4px 12px', borderRadius: '4px', background: 'var(--search-bg)', border: '1px solid var(--border-dark)', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.8rem' }}>Delete</button>
                           <button onClick={() => handleBulkAction('ARCHIVE')} style={{ padding: '4px 12px', borderRadius: '4px', background: 'var(--search-bg)', border: '1px solid var(--border-dark)', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.8rem' }}>Archive</button>
                           <button onClick={() => handleBulkAction('READ')} style={{ padding: '4px 12px', borderRadius: '4px', background: 'var(--search-bg)', border: '1px solid var(--border-dark)', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.8rem' }}>Mark Read</button>
                           <button onClick={() => handleBulkAction('UNREAD')} style={{ padding: '4px 12px', borderRadius: '4px', background: 'var(--search-bg)', border: '1px solid var(--border-dark)', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.8rem' }}>Mark Unread</button>
                           <select onChange={(e) => { if(e.target.value) { handleBulkAction(`LABEL:${e.target.value}`); e.target.value=''; } }} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-dark)', background: 'var(--panel-bg)', color: 'var(--text-main)', fontSize: '0.8rem' }}>
                              <option value="">Apply Label...</option>
                              {customFolders.map(f => <option key={f} value={f}>{f}</option>)}
                           </select>
                         </div>
                       )}
                    </div>
                  {displayedMails.map(mail => {
                    const isRead = mail.read === true || mail.isRead === true;
                    const fontWeight = isRead ? 400 : 700;
                    const textColor = isRead ? 'var(--text-muted)' : 'var(--text-main)';
                    const bgColor = isRead ? 'var(--border-light)' : 'var(--panel-bg)';

                    return (
                      <div key={mail.id} draggable onDragStart={(e) => { e.dataTransfer.setData('mailId', mail.id); }} onClick={() => {
                        if (activeTab === 'drafts') {
                          setIsComposing(true);
                          setComposeTo(mail.receiver?.email || '');
                          setComposeSubject(mail.subject || '');
                          setComposeDesc(mail.description || '');
                          setAttachments(mail.attachments || []);
                          setComposeDraftId(mail.id);
                          setDraftStatus(`Draft Saved at ${new Date(mail.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`);
                        } else {
                          setSelectedMail(mail);
                          setTranslatedText(null);
                          setTranslateTargetLang(mail.language && mail.language !== 'en' ? 'en' : 'hi');
                          setMails(prev => prev.map(m => m.id === mail.id ? { ...m, read: true, isRead: true } : m));
                        }
                      }} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', background: bgColor }} className="mail-row">
                        <div style={{ width: '250px', display: 'flex', gap: '8px', alignItems: 'center', padding: '12px 16px', fontWeight: fontWeight, fontSize: '0.875rem', color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedEmailIds.includes(mail.id)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedEmailIds(prev => [...prev, mail.id]);
                              else setSelectedEmailIds(prev => prev.filter(id => id !== mail.id));
                            }}
                            style={{ cursor: 'pointer', marginRight: '8px', transform: 'scale(1.2)' }}
                          />
                          <Star size={18} fill={mail.starred ? '#f4b400' : 'none'} color={mail.starred ? '#f4b400' : 'var(--icon-color)'} onClick={(e) => { e.stopPropagation(); handleToggleStar(mail.id); }} style={{ cursor: 'pointer', flexShrink: 0 }} title="Starred" />
                          <Bookmark size={18} fill={mail.important ? '#ea4335' : 'none'} color={mail.important ? '#ea4335' : 'var(--icon-color)'} onClick={(e) => { e.stopPropagation(); handleToggleImportant(mail.id); }} style={{ cursor: 'pointer', flexShrink: 0 }} title="Important" />
                          {activeTab === 'drafts' ? (
                            <span style={{ color: '#d93025', fontWeight: 500 }}>Draft</span>
                          ) : activeTab === 'sent' ? (
                            <span>To: {mail.receiver ? (mail.receiver.username || mail.receiver.email.split('@')[0]) : 'Unknown'}</span>
                          ) : (
                            <span>{mail.sender ? (mail.sender.username || mail.sender.email.split('@')[0]) : 'Unknown'}</span>
                          )}
                        </div>
                        <div style={{ flex: 1, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                          <span style={{ fontWeight: fontWeight, fontSize: '0.875rem', color: textColor }}>{mail.subject || '(No Subject)'}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>-</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mail.description}</span>
                          {activeTab === 'scheduled' && mail.scheduledTime && (
                            <span style={{ background: 'var(--active-bg)', color: 'var(--primary-color)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', marginLeft: '8px' }}>
                              Scheduled: {new Date(mail.scheduledTime).toLocaleString()}
                            </span>
                          )}
                          {activeTab === 'bin' && mail.deletedAt && (
                            <span style={{ background: 'var(--border-light)', color: 'var(--danger)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', marginLeft: '8px' }}>
                              Deleted {Math.max(0, Math.floor((new Date() - new Date(mail.deletedAt)) / (1000 * 60 * 60 * 24)))} days ago
                            </span>
                          )}
                        </div>
                        <div style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: fontWeight, color: textColor, width: '100px', textAlign: 'right' }}>
                          {new Date(mail.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    )
                  })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Compose Modal */}
      {isComposing && (
        <div style={{
          position: 'fixed',
          ...(isComposeMaximized ? {
            top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '80vw', height: '85vh', borderRadius: '8px'
          } : {
            bottom: 0, right: '80px', width: '600px', height: '550px', borderRadius: '8px 8px 0 0'
          }),
          background: 'var(--panel-bg)', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', zIndex: 1000
        }}>
          <div style={{ background: 'var(--header-bg)', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: isComposeMaximized ? '8px 8px 0 0' : '8px 8px 0 0', cursor: 'pointer' }}>
            <h3 style={{ fontSize: '0.875rem', margin: 0, fontWeight: 500, color: 'var(--text-main)' }}>New Message</h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Minus size={16} color="var(--icon-color)" style={{ cursor: 'pointer' }} onClick={() => setIsComposing(false)} title="Minimize to tray (Close for now)" />
              {isComposeMaximized ? (
                <Minimize2 size={16} color="var(--icon-color)" style={{ cursor: 'pointer' }} onClick={() => setIsComposeMaximized(false)} title="Exit full screen" />
              ) : (
                <Maximize2 size={16} color="var(--icon-color)" style={{ cursor: 'pointer' }} onClick={() => setIsComposeMaximized(true)} title="Full screen" />
              )}
              <X size={18} color="var(--icon-color)" onClick={() => setIsComposing(false)} style={{ cursor: 'pointer' }} title="Save & Close" />
            </div>
          </div>
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{ padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative' }}
          >
            {isDragOver && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(11, 87, 208, 0.1)', border: '2px dashed var(--primary-color)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0 0 8px 8px' }}>
                <div style={{ color: 'var(--primary-color)', fontSize: '1.2rem', fontWeight: 600 }}>Drop files here to attach</div>
              </div>
            )}
            <input placeholder="Recipients" value={composeTo} onChange={e => setComposeTo(e.target.value)} style={{ border: 'none', borderBottom: '1px solid var(--border-light)', padding: '12px 0', fontSize: '0.875rem', outline: 'none', background: 'transparent', color: 'var(--text-main)' }} />
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <input placeholder="Subject" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} style={{ border: 'none', borderBottom: '1px solid var(--border-light)', padding: '12px 0', fontSize: '0.875rem', outline: 'none', fontWeight: 500, flex: 1, background: 'transparent', color: 'var(--text-main)' }} />
                <select value={composeLanguage} onChange={e => setComposeLanguage(e.target.value)} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-dark)', background: 'var(--panel-bg)', color: 'var(--text-main)', fontSize: '0.8rem' }} title="Email Language">
                   <option value="en">English</option>
                   <option value="es">Spanish</option>
                   <option value="fr">French</option>
                   <option value="de">German</option>
                   <option value="hi">Hindi</option>
                   <option value="zh-CN">Chinese</option>
                   <option value="ja">Japanese</option>
                </select>
            </div>
            <textarea placeholder="Write your message here..." value={composeDesc} onChange={e => setComposeDesc(e.target.value)} style={{ border: 'none', padding: '12px 0', fontSize: '0.875rem', outline: 'none', resize: 'none', flex: 1, background: 'transparent', color: 'var(--text-main)' }}></textarea>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {attachments.map((att, i) => (
                <div key={i} style={{ background: 'var(--border-light)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.filename}</div>
                  <X size={12} style={{ cursor: 'pointer', color: 'var(--icon-color)' }} onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--primary-color)' }}>
                <button onClick={() => handleSend(false)} disabled={composeSending || !composeTo.trim() || !composeSubject.trim()} style={{ background: 'var(--primary-color)', color: '#fff', padding: '8px 20px', border: 'none', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', transition: 'background 0.2s' }}>
                  {composeSending ? 'Sending...' : 'Send'}
                </button>
                <div style={{ width: '1px', background: '#fff', opacity: 0.5 }}></div>
                <button onClick={() => setShowScheduleModal(true)} disabled={composeSending || !composeTo.trim() || !composeSubject.trim()} style={{ background: 'var(--primary-color)', color: '#fff', padding: '8px 12px', border: 'none', cursor: 'pointer' }} title="Schedule Send">
                  <span style={{ fontSize: '0.6rem' }}>▼</span>
                </button>
              </div>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '50%' }} title="Attach files">
                <Paperclip size={20} color="var(--icon-color)" />
                <input type="file" multiple onChange={handleAttachments} style={{ display: 'none' }} />
              </label>
              <button onClick={handleFixGrammar} disabled={isCheckingGrammar || !composeDesc.trim()} style={{ background: 'transparent', color: 'var(--primary-color)', padding: '8px 12px', borderRadius: '16px', border: '1px solid var(--primary-color)', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }} title="Fix Grammar">
                <Wand2 size={16} /> {isCheckingGrammar ? 'Checking...' : 'Fix Grammar'}
              </button>
              
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                {draftStatus && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{draftStatus}</span>}
                <button onClick={() => handleSend(true)} disabled={composeSending || (!composeTo.trim() && !composeSubject.trim())} style={{ background: 'transparent', color: 'var(--icon-color)', padding: '8px 16px', borderRadius: '16px', border: 'none', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>
                  Save Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--panel-bg)', padding: '24px', borderRadius: '8px', width: '300px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: 500 }}>Schedule Send</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>Date</label>
              <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} style={{ padding: '8px', border: '1px solid var(--border-dark)', borderRadius: '4px', background: 'var(--bg-color)', color: 'var(--text-main)' }} min={new Date().toISOString().split('T')[0]} />
              
              <label style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>Time</label>
              <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} style={{ padding: '8px', border: '1px solid var(--border-dark)', borderRadius: '4px', background: 'var(--bg-color)', color: 'var(--text-main)' }} />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowScheduleModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--icon-color)', cursor: 'pointer', padding: '8px 16px', fontWeight: 500 }}>Cancel</button>
              <button onClick={handleScheduleSend} style={{ background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '4px', padding: '8px 16px', fontWeight: 500, cursor: 'pointer' }}>Schedule Send</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .mail-row:hover { background: #f8fafc !important; box-shadow: inset 1px 0 0 var(--border-dark), inset -1px 0 0 var(--border-dark), 0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15); z-index: 10; position: relative; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}

