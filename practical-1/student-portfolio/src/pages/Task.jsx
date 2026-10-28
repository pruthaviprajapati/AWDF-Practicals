import { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Task.css';

const API_BASE_URL = 'http://localhost:5000/tasks';

function Task({ user }) {
  const [tasks, setTasks] = useState([]);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  // Modal states for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'INCOMPLETE',
    priority: 'medium'
  });

  // Audit Logs (stored in state + localStorage)
  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('task_audit_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Helper to add audit log
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
        console.error('Failed to save audit logs to localStorage', err);
      }
      return updated;
    });
  };

  // Fetch tasks from Node + MongoDB backend
  const fetchTasks = async (showAudit = false) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const headers = {};
      if (user?.id) {
        headers['x-user-id'] = user.id;
      }
      const res = await fetch(API_BASE_URL, { headers });
      if (!res.ok) {
        throw new Error(`Failed to fetch tasks: HTTP ${res.status}`);
      }
      const data = await res.json();
      setTasks(data);
      if (showAudit) {
        addAuditLog('FETCH', `Connected to MongoDB Atlas: Loaded ${data.length} tasks.`);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to connect to backend server. Make sure MongoDB & Express are running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks(true);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Handle open create modal
  const openCreateModal = () => {
    setModalMode('create');
    setCurrentTaskId(null);
    setFormData({
      title: '',
      description: '',
      status: 'INCOMPLETE',
      priority: 'medium'
    });
    setIsModalOpen(true);
  };

  // Handle open edit modal
  const openEditModal = (task) => {
    setModalMode('edit');
    setCurrentTaskId(task.id || task._id);
    setFormData({
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'INCOMPLETE',
      priority: task.priority || 'medium'
    });
    setIsModalOpen(true);
  };

  // Submit create or edit form
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Task title is required.'
      });
      return;
    }

    setActionLoading(true);
    const headers = { 'Content-Type': 'application/json' };
    if (user?.id) headers['x-user-id'] = user.id;

    try {
      if (modalMode === 'create') {
        const res = await fetch(API_BASE_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(formData)
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        const created = await res.json();
        setTasks(prev => [created, ...prev]);
        addAuditLog('CREATE', `Created task "${created.title}" with status "${created.status}".`);
        setIsModalOpen(false);

        Swal.fire({
          icon: 'success',
          title: 'Task Created!',
          text: `"${created.title}" saved successfully to MongoDB.`,
          timer: 1800,
          showConfirmButton: false
        });
      } else {
        // Edit mode
        const res = await fetch(`${API_BASE_URL}/${currentTaskId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(formData)
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        const updated = await res.json();
        setTasks(prev => prev.map(t => (t.id === currentTaskId || t._id === currentTaskId ? updated : t)));
        addAuditLog('UPDATE', `Updated task details for "${updated.title}".`);
        setIsModalOpen(false);

        Swal.fire({
          icon: 'success',
          title: 'Task Updated!',
          text: `Changes saved to MongoDB.`,
          timer: 1800,
          showConfirmButton: false
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Action Failed',
        text: err.message || 'Failed to save task to backend.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Status change from dropdown
  const handleStatusChange = async (task, newStatus) => {
    const taskId = task.id || task._id;
    setUpdatingTaskId(taskId);
    const headers = { 'Content-Type': 'application/json' };
    if (user?.id) headers['x-user-id'] = user.id;

    try {
      const res = await fetch(`${API_BASE_URL}/${taskId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const updated = await res.json();
      setTasks(prev => prev.map(t => (t.id === taskId || t._id === taskId ? updated : t)));
      addAuditLog('UPDATE', `Updated task "${task.title}" status to ${newStatus}.`);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Status Update Failed',
        text: err.message || 'Could not update task status.'
      });
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Delete task with SweetAlert2 animated confirmation dialog (Fig 4)
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
          const headers = {};
          if (user?.id) headers['x-user-id'] = user.id;

          const res = await fetch(`${API_BASE_URL}/${taskId}`, {
            method: 'DELETE',
            headers
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP ${res.status}`);
          }

          setTasks(prev => prev.filter(t => t.id !== taskId && t._id !== taskId));
          addAuditLog('DELETE', `Deleted task ${taskIndexDisplay} "${task.title}".`);

          Swal.fire({
            title: 'Deleted!',
            text: 'Task has been deleted from MongoDB.',
            icon: 'success',
            timer: 1600,
            showConfirmButton: false
          });
        } catch (err) {
          console.error(err);
          Swal.fire({
            icon: 'error',
            title: 'Delete Failed',
            text: err.message || 'Could not delete task from server.'
          });
        } finally {
          setUpdatingTaskId(null);
        }
      }
    });
  };

  // Generate PDF matching Fig. 3 of Practical 6
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const generatedDateStr = new Date().toLocaleString();

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text('Task Management System - Practical 6', 105, 18, { align: 'center' });

    // Subtitle
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('Full Stack Integration: React + Express + MongoDB Atlas', 105, 25, { align: 'center' });

    // Meta line
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Generated on: ${generatedDateStr} | Active Filter: ${activeFilter}`, 105, 31, { align: 'center' });

    // Summary Statistics Box
    doc.setDrawColor(226, 232, 240); // slate-200 border
    doc.setFillColor(248, 250, 252); // slate-50 bg
    doc.roundedRect(14, 36, 182, 11, 2, 2, 'FD');

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85); // slate-700
    const summaryText = `Total Tasks: ${counts.total}  |  Completed: ${counts.completed}  |  Ongoing: ${counts.ongoing}  |  Incomplete: ${counts.incomplete}`;
    doc.text(summaryText, 105, 43.5, { align: 'center' });

    // Table Data preparation
    const tableRows = filteredTasks.map((t, idx) => {
      const createdStr = t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A';
      const updatedStr = t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : createdStr;
      return [
        `#${idx + 1}`,
        t.title,
        (t.status || 'INCOMPLETE').toUpperCase(),
        createdStr,
        updatedStr
      ];
    });

    autoTable(doc, {
      startY: 52,
      head: [['ID', 'Task Title', 'Status', 'Created Date', 'Updated Date']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [37, 99, 235], // #2563eb royal blue
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9.5,
        halign: 'left'
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
      },
      didParseCell: (data) => {
        // Color the Status column text
        if (data.section === 'body' && data.column.index === 2) {
          const val = data.cell.raw;
          if (val === 'COMPLETE') {
            data.cell.styles.textColor = [22, 101, 52]; // green-800
          } else if (val === 'ONGOING') {
            data.cell.styles.textColor = [30, 64, 175]; // blue-800
          } else {
            data.cell.styles.textColor = [194, 65, 12]; // orange-700
          }
        }
      }
    });

    // Total Items footer
    const finalY = doc.lastAutoTable?.finalY || 100;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(`Total Items: ${filteredTasks.length}`, 14, finalY + 7);

    // Save PDF
    const filename = `Tasks_Report_${activeFilter.toLowerCase()}_${Date.now()}.pdf`;
    doc.save(filename);

    addAuditLog('EXPORT', `Generated PDF report "${filename}" (${filteredTasks.length} tasks).`);

    Swal.fire({
      icon: 'success',
      title: 'PDF Exported!',
      text: `Downloaded ${filename}`,
      timer: 1800,
      showConfirmButton: false
    });
  };

  // Helper for status badge class
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
            <h1 className="task-main-heading">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'Task' : 'Tasks'}
            </h1>
          </div>
          <p className="task-subtext">
            Full-stack Task Manager connected to Node.js &amp; MongoDB Atlas. Persisted across browser sessions.
          </p>
        </div>

        <div className="task-header-right">
          <button onClick={handleExportPDF} className="btn-export-pdf" title="Generate and Download PDF Report">
            <span className="btn-icon">📄</span> Export PDF
          </button>
          <button onClick={openCreateModal} className="btn-add-task" title="Create a New Task">
            <span className="btn-icon">＋</span> Add Task
          </button>
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
          <button onClick={() => fetchTasks(true)} className="btn-retry">Retry Connection</button>
        </div>
      )}

      {/* Task List / Loading State */}
      <div className="task-list-section">
        {loading ? (
          <div className="task-loading-state">
            <div className="custom-spinner"></div>
            <p>Loading tasks from MongoDB...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="empty-tasks-card">
            <div className="empty-icon">📂</div>
            <h3>No tasks found in {activeFilter.toLowerCase()} tab</h3>
            <p>Click the <strong>+ Add Task</strong> button above to create a task.</p>
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
                    {/* Status Dropdown Selector */}
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

                    {/* Edit button */}
                    <button
                      onClick={() => openEditModal(task)}
                      className="btn-action btn-edit"
                      title="Edit Task"
                      disabled={isUpdating}
                    >
                      ✏️
                    </button>

                    {/* Delete button (SweetAlert2) */}
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

      {/* Create / Edit Modal Dialog */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !actionLoading && setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalMode === 'create' ? 'Create New Task' : 'Edit Task'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="modal-close-btn"
                disabled={actionLoading}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Task Title *</label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="e.g. Build Task Manager with Tabs & PDF Export"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea
                  className="modal-textarea"
                  placeholder="Provide task details or implementation notes..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="modal-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
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
                  onClick={() => setIsModalOpen(false)}
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
                  {actionLoading ? 'Saving...' : modalMode === 'create' ? 'Create Task' : 'Save Changes'}
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
