import { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Task.css';

const API_BASE_URL = 'http://localhost:5000/tasks';
const AUTH_URL = 'http://localhost:5000/api';

function Task({ user, token, onAuthSuccess, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  // Auth Modal state (Fig 1: Registration and Login Modal)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(!token);
  const [authTab, setAuthTab] = useState('register'); // 'login' or 'register'
  const [authFormData, setAuthFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Task Modal state (Create / Edit)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState('create');
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    status: 'INCOMPLETE',
    priority: 'medium'
  });

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('task_audit_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const addAuditLog = (action, message) => {
    const newLog = {
      id: Date.now() + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toLocaleDateString(),
      action,
      message
    };
    setAuditLogs(prev => {
      const updated = [newLog, ...prev.slice(0, 49)];
      try {
        localStorage.setItem('task_audit_logs', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save audit logs', err);
      }
      return updated;
    });
  };

  // Fetch tasks with JWT Bearer Token (Fig 3)
  const fetchTasks = async (showAudit = false) => {
    if (!token) {
      setTasks([]);
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(API_BASE_URL, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.status === 401) {
        throw new Error('Authentication expired or invalid. Please log in again.');
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setTasks(data);
      if (showAudit) {
        addAuditLog('FETCH', `JWT Authenticated: Loaded ${data.length} tasks from MongoDB.`);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to connect to backend.');
      if (err.message.includes('expired') || err.message.includes('Authentication')) {
        setIsAuthModalOpen(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      setIsAuthModalOpen(false);
      fetchTasks(true);
    } else {
      setIsAuthModalOpen(true);
      setTasks([]);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle User Registration & Login (Fig 1 & Fig 2)
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (authTab === 'register') {
      if (!authFormData.fullName.trim()) {
        setAuthError('Full name is required.');
        return;
      }
      if (!authFormData.email.trim()) {
        setAuthError('Email address is required.');
        return;
      }
      if (authFormData.password.length < 6) {
        setAuthError('Password must be at least 6 characters.');
        return;
      }
      if (authFormData.password !== authFormData.confirmPassword) {
        setAuthError('Passwords do not match.');
        return;
      }
    } else {
      if (!authFormData.email.trim() || !authFormData.password) {
        setAuthError('Please enter both email and password.');
        return;
      }
    }

    setAuthLoading(true);
    const endpoint = authTab === 'register' ? `${AUTH_URL}/register` : `${AUTH_URL}/login`;
    const payload = authTab === 'register'
      ? {
          name: authFormData.fullName.trim(),
          email: authFormData.email.trim(),
          password: authFormData.password
        }
      : {
          email: authFormData.email.trim(),
          password: authFormData.password
        };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      // Successful auth: Save token and user in parent and localStorage
      onAuthSuccess(data.token, data.user);
      addAuditLog(
        'AUTH',
        authTab === 'register'
          ? `User "${data.user.name}" registered with bcrypt hashing & JWT token generated.`
          : `User "${data.user.name}" logged in successfully with JWT Bearer token.`
      );

      setIsAuthModalOpen(false);
      setAuthFormData({ fullName: '', email: '', password: '', confirmPassword: '' });

      Swal.fire({
        icon: 'success',
        title: authTab === 'register' ? 'Registration Successful!' : 'Welcome Back!',
        text: `JWT token generated and stored in localStorage.`,
        timer: 1800,
        showConfirmButton: false
      });
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Filter tasks based on active tab
  const filteredTasks = useMemo(() => {
    if (activeFilter === 'ALL') return tasks;
    return tasks.filter(task => (task.status || 'INCOMPLETE').toUpperCase() === activeFilter);
  }, [tasks, activeFilter]);

  // Counts for tabs and PDF summary
  const counts = useMemo(() => {
    const total = tasks.length;
    let completed = 0;
    let ongoing = 0;
    let incomplete = 0;

    tasks.forEach(t => {
      const s = (t.status || 'INCOMPLETE').toUpperCase();
      if (s === 'COMPLETE') completed++;
      else if (s === 'ONGOING') ongoing++;
      else incomplete++;
    });

    return { total, completed, ongoing, incomplete };
  }, [tasks]);

  // Create / Edit Task Modal Handlers
  const openCreateModal = () => {
    if (!token) {
      setIsAuthModalOpen(true);
      return;
    }
    setTaskModalMode('create');
    setCurrentTaskId(null);
    setTaskFormData({
      title: '',
      description: '',
      status: 'INCOMPLETE',
      priority: 'medium'
    });
    setIsTaskModalOpen(true);
  };

  const openEditModal = (task) => {
    setTaskModalMode('edit');
    setCurrentTaskId(task.id || task._id);
    setTaskFormData({
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'INCOMPLETE',
      priority: task.priority || 'medium'
    });
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskFormData.title.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Task title is required.'
      });
      return;
    }

    setActionLoading(true);
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    try {
      if (taskModalMode === 'create') {
        const res = await fetch(API_BASE_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(taskFormData)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        setTasks(prev => [data, ...prev]);
        addAuditLog('CREATE', `Created task "${data.title}" (${data.status}).`);
        setIsTaskModalOpen(false);

        Swal.fire({
          icon: 'success',
          title: 'Task Created!',
          text: `"${data.title}" saved to MongoDB.`,
          timer: 1600,
          showConfirmButton: false
        });
      } else {
        const res = await fetch(`${API_BASE_URL}/${currentTaskId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(taskFormData)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        setTasks(prev => prev.map(t => (t.id === currentTaskId || t._id === currentTaskId ? data : t)));
        addAuditLog('UPDATE', `Updated task details for "${data.title}".`);
        setIsTaskModalOpen(false);

        Swal.fire({
          icon: 'success',
          title: 'Task Updated!',
          text: 'Changes persisted to MongoDB.',
          timer: 1600,
          showConfirmButton: false
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Action Failed',
        text: err.message || 'Server-side validation error.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Status change from dropdown
  const handleStatusChange = async (task, newStatus) => {
    const taskId = task.id || task._id;
    setUpdatingTaskId(taskId);

    try {
      const res = await fetch(`${API_BASE_URL}/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setTasks(prev => prev.map(t => (t.id === taskId || t._id === taskId ? data : t)));
      addAuditLog('UPDATE', `Updated task "${task.title}" status to ${newStatus}.`);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: err.message
      });
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Delete task with SweetAlert2 confirmation dialog
  const handleDeleteTask = (task, index) => {
    const taskId = task.id || task._id;
    const taskIndexDisplay = `#${index + 1}`;

    Swal.fire({
      title: 'Delete task?',
      text: `Delete ${taskIndexDisplay} "${task.title}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setUpdatingTaskId(taskId);
        try {
          const res = await fetch(`${API_BASE_URL}/${taskId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || `HTTP ${res.status}`);
          }

          setTasks(prev => prev.filter(t => t.id !== taskId && t._id !== taskId));
          addAuditLog('DELETE', `Deleted task ${taskIndexDisplay} "${task.title}".`);

          Swal.fire({
            title: 'Deleted!',
            text: 'Task has been deleted from MongoDB.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          });
        } catch (err) {
          console.error(err);
          Swal.fire({
            icon: 'error',
            title: 'Delete Failed',
            text: err.message
          });
        } finally {
          setUpdatingTaskId(null);
        }
      }
    });
  };

  // Export PDF Report
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const generatedDateStr = new Date().toLocaleString();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Task Management System - Practical 7', 105, 18, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Protected Full Stack Integration: JWT Auth + Node.js + MongoDB Atlas', 105, 25, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated on: ${generatedDateStr} | Active Filter: ${activeFilter} | User: ${user?.name || 'Authenticated'}`, 105, 31, { align: 'center' });

    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 36, 182, 11, 2, 2, 'FD');

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    const summaryText = `Total Tasks: ${counts.total}  |  Completed: ${counts.completed}  |  Ongoing: ${counts.ongoing}  |  Incomplete: ${counts.incomplete}`;
    doc.text(summaryText, 105, 43.5, { align: 'center' });

    const tableRows = filteredTasks.map((t, idx) => [
      `#${idx + 1}`,
      t.title,
      (t.status || 'INCOMPLETE').toUpperCase(),
      t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A',
      t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : 'N/A'
    ]);

    autoTable(doc, {
      startY: 52,
      head: [['ID', 'Task Title', 'Status', 'Created Date', 'Updated Date']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9.5
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 85 },
        2: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 27, halign: 'center' },
        4: { cellWidth: 27, halign: 'center' }
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 3.5,
        textColor: [51, 65, 85]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });

    const finalY = doc.lastAutoTable?.finalY || 100;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(`Total Items: ${filteredTasks.length}`, 14, finalY + 7);

    const filename = `Tasks_Report_Practical_7_${Date.now()}.pdf`;
    doc.save(filename);

    addAuditLog('EXPORT', `Generated PDF report "${filename}".`);
  };

  const getStatusBadge = (status) => {
    const s = (status || 'INCOMPLETE').toUpperCase();
    if (s === 'COMPLETE') return <span className="status-badge badge-complete">COMPLETE</span>;
    if (s === 'ONGOING') return <span className="status-badge badge-ongoing">ONGOING</span>;
    return <span className="status-badge badge-incomplete">INCOMPLETE</span>;
  };

  return (
    <div className="task-page-container">
      {/* Top Header Card */}
      <div className="task-header-card">
        <div className="task-header-left">
          <div className="task-title-area">
            <span className="task-icon-heading">📋</span>
            <h1 className="task-main-heading">Tasks Manager</h1>
            {token && (
              <span className="jwt-pill" title="Protected route authenticated via JWT token">
                🟢 JWT Authenticated
              </span>
            )}
          </div>
          <p className="task-subtext">
            {user
              ? `Logged in as ${user.name} (${user.email}). All routes secured by JWT authentication middleware.`
              : 'Please log in or register to access protected task management routes.'}
          </p>
        </div>

        <div className="task-header-right">
          {token ? (
            <>
              <button onClick={handleExportPDF} className="btn-export-pdf" title="Generate and Download PDF Report">
                <span className="btn-icon">📄</span> Export PDF
              </button>
              <button onClick={openCreateModal} className="btn-add-task" title="Create a New Task">
                <span className="btn-icon">＋</span> Add Task
              </button>
            </>
          ) : (
            <button onClick={() => setIsAuthModalOpen(true)} className="btn-add-task">
              👤 Login / Register
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="filter-tabs-wrapper">
        <div className="filter-tabs">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`tab-btn ${activeFilter === 'ALL' ? 'active' : ''}`}
          >
            All <span className="tab-count">{counts.total}</span>
          </button>
          <button
            onClick={() => setActiveFilter('ONGOING')}
            className={`tab-btn ${activeFilter === 'ONGOING' ? 'active' : ''}`}
          >
            Ongoing <span className="tab-count">{counts.ongoing}</span>
          </button>
          <button
            onClick={() => setActiveFilter('COMPLETE')}
            className={`tab-btn ${activeFilter === 'COMPLETE' ? 'active' : ''}`}
          >
            Complete <span className="tab-count">{counts.completed}</span>
          </button>
          <button
            onClick={() => setActiveFilter('INCOMPLETE')}
            className={`tab-btn ${activeFilter === 'INCOMPLETE' ? 'active' : ''}`}
          >
            Incomplete <span className="tab-count">{counts.incomplete}</span>
          </button>
        </div>

        <div className="connection-pill">
          <span className="pulse-indicator"></span>
          <span>MongoDB Atlas: Connected</span>
        </div>
      </div>

      {/* Error state */}
      {errorMsg && (
        <div className="error-banner">
          <div className="error-banner-content">
            <span className="error-icon">⚠️</span>
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => fetchTasks(true)} className="btn-retry">Retry</button>
        </div>
      )}

      {/* Task List / Loading State */}
      <div className="task-list-section">
        {loading ? (
          <div className="task-loading-state">
            <div className="custom-spinner"></div>
            <p>Verifying JWT token &amp; loading tasks from MongoDB...</p>
          </div>
        ) : !token ? (
          <div className="empty-tasks-card">
            <div className="empty-icon">🔒</div>
            <h3>Authentication Required</h3>
            <p>Tasks are protected with JWT authentication middleware.</p>
            <button onClick={() => setIsAuthModalOpen(true)} className="btn-add-task" style={{ marginTop: '1rem' }}>
              Create Account or Log In
            </button>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="empty-tasks-card">
            <div className="empty-icon">📂</div>
            <h3>No tasks in {activeFilter.toLowerCase()} tab</h3>
            <p>Click <strong>+ Add Task</strong> above to add your first task.</p>
          </div>
        ) : (
          <div className="tasks-grid">
            {filteredTasks.map((task, index) => {
              const taskId = task.id || task._id;
              const isUpdating = updatingTaskId === taskId;
              const currentStatus = (task.status || 'INCOMPLETE').toUpperCase();

              return (
                <div key={taskId} className={`task-row-card ${isUpdating ? 'is-loading' : ''}`}>
                  <div className="task-row-main">
                    <div className="task-badge-wrapper">
                      {getStatusBadge(task.status)}
                    </div>
                    <div className="task-info">
                      <h3 className="task-item-title">{task.title}</h3>
                      {task.description && (
                        <p className="task-item-desc">{task.description}</p>
                      )}
                      <div className="task-item-meta">
                        <span>Created: {new Date(task.createdAt || Date.now()).toLocaleDateString()}</span>
                        {task.priority && (
                          <span className={`priority-tag priority-${task.priority.toLowerCase()}`}>
                            {task.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="task-row-actions">
                    <div className="status-select-container">
                      <select
                        value={currentStatus}
                        onChange={(e) => handleStatusChange(task, e.target.value)}
                        className="status-dropdown"
                        disabled={isUpdating}
                        title="Change Task Status"
                      >
                        <option value="INCOMPLETE">Incomplete</option>
                        <option value="ONGOING">Ongoing</option>
                        <option value="COMPLETE">Complete</option>
                      </select>
                    </div>

                    <button
                      onClick={() => openEditModal(task)}
                      className="btn-action btn-edit"
                      title="Edit Task"
                      disabled={isUpdating}
                    >
                      ✏️
                    </button>

                    <button
                      onClick={() => handleDeleteTask(task, index)}
                      className="btn-action btn-delete"
                      title="Delete Task"
                      disabled={isUpdating}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Real-time Activity Audit Trail Section */}
      <div className="audit-section-card">
        <div className="audit-header">
          <div className="audit-title-box">
            <span className="audit-icon">📋</span>
            <h2 className="audit-title">Activity Audit Trail</h2>
          </div>
          <span className="audit-counter">{auditLogs.length} Events Logged</span>
        </div>

        <div className="audit-log-container">
          {auditLogs.length === 0 ? (
            <p className="empty-audit-text">No activity logged yet.</p>
          ) : (
            <ul className="audit-log-list">
              {auditLogs.map((log) => (
                <li key={log.id} className="audit-log-item">
                  <div className="audit-time-box">
                    <span className="audit-time">{log.timestamp}</span>
                  </div>
                  <span className={`audit-badge badge-${log.action.toLowerCase()}`}>
                    {log.action}
                  </span>
                  <span className="audit-text">{log.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* =========================================================================
          FIG 1: User Registration and Login Modal (Matching Practical 7 Screenshot)
         ========================================================================= */}
      {isAuthModalOpen && (
        <div className="modal-overlay" onClick={() => token && setIsAuthModalOpen(false)}>
          <div className="modal-card auth-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="auth-modal-header">
              <div className="auth-avatar-circle">
                <span>👤</span>
              </div>
              <h2 className="auth-modal-title">
                {authTab === 'register' ? 'Create Your Account' : 'Welcome Back'}
              </h2>
              <p className="auth-modal-subtitle">
                {authTab === 'register'
                  ? 'Register to manage personal tasks and track MongoDB audit logs'
                  : 'Log in to securely access your JWT protected tasks'}
              </p>
              {token && (
                <button onClick={() => setIsAuthModalOpen(false)} className="modal-close-btn auth-close-x">
                  ✕
                </button>
              )}
            </div>

            {/* Auth Toggle Tabs */}
            <div className="auth-toggle-bar">
              <button
                type="button"
                className={`auth-toggle-tab ${authTab === 'login' ? 'active' : ''}`}
                onClick={() => { setAuthTab('login'); setAuthError(''); }}
              >
                🔑 Log In
              </button>
              <button
                type="button"
                className={`auth-toggle-tab ${authTab === 'register' ? 'active' : ''}`}
                onClick={() => { setAuthTab('register'); setAuthError(''); }}
              >
                👤 Register
              </button>
            </div>

            {/* Error banner inside auth modal */}
            {authError && (
              <div className="auth-error-box">
                <span>⚠️ {authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="auth-form">
              {authTab === 'register' && (
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <div className="input-with-icon">
                    <span className="field-icon">👤</span>
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="e.g. Pruthavi Prajapati"
                      value={authFormData.fullName}
                      onChange={(e) => setAuthFormData({ ...authFormData, fullName: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-with-icon">
                  <span className="field-icon">✉️</span>
                  <input
                    type="email"
                    className="auth-input"
                    placeholder="e.g. pruthavi@gmail.com"
                    value={authFormData.email}
                    onChange={(e) => setAuthFormData({ ...authFormData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-with-icon">
                  <span className="field-icon">🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder="••••••••"
                    value={authFormData.password}
                    onChange={(e) => setAuthFormData({ ...authFormData, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="toggle-password-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {authTab === 'register' && (
                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <div className="input-with-icon">
                    <span className="field-icon">🔒</span>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="auth-input"
                      placeholder="••••••••"
                      value={authFormData.confirmPassword}
                      onChange={(e) => setAuthFormData({ ...authFormData, confirmPassword: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      className="toggle-password-btn"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex="-1"
                    >
                      {showConfirmPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="btn-auth-submit"
                disabled={authLoading}
              >
                {authLoading ? 'Processing...' : authTab === 'register' ? '👤 Create Account' : '🔑 Log In'}
              </button>

              <div className="auth-footer-switch">
                {authTab === 'register' ? (
                  <p>
                    Already have an account?{' '}
                    <button
                      type="button"
                      className="auth-switch-link"
                      onClick={() => { setAuthTab('login'); setAuthError(''); }}
                    >
                      Log in here
                    </button>
                  </p>
                ) : (
                  <p>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      className="auth-switch-link"
                      onClick={() => { setAuthTab('register'); setAuthError(''); }}
                    >
                      Create one here
                    </button>
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Create / Edit Modal */}
      {isTaskModalOpen && (
        <div className="modal-overlay" onClick={() => !actionLoading && setIsTaskModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {taskModalMode === 'create' ? 'Create New Task' : 'Edit Task'}
              </h3>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="modal-close-btn"
                disabled={actionLoading}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTaskSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Task Title *</label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="e.g. Build Task Manager with Tabs & PDF Export"
                  value={taskFormData.title}
                  onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea
                  className="modal-textarea"
                  placeholder="Provide task details or implementation notes..."
                  value={taskFormData.description}
                  onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="modal-select"
                    value={taskFormData.status}
                    onChange={(e) => setTaskFormData({ ...taskFormData, status: e.target.value })}
                  >
                    <option value="INCOMPLETE">Incomplete</option>
                    <option value="ONGOING">Ongoing</option>
                    <option value="COMPLETE">Complete</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="modal-select"
                    value={taskFormData.priority}
                    onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="btn-modal-cancel"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Saving...' : taskModalMode === 'create' ? 'Create Task' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Task;
