import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Task.css';

const API_URL = 'http://localhost:5000/tasks';

function Task({ user }) {
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch user-wise tasks whenever the logged-in user changes
  useEffect(() => {
    if (user) {
      fetchTasks();
    } else {
      setTasks([]);
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTasks = async () => {
    if (!user) return;
    try {
      const res = await fetch(API_URL, {
        headers: {
          'x-user-id': user.id
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!user) {
      setErrorMsg('Please log in to add tasks.');
      return;
    }
    if (!newTaskTitle.trim()) return;
    setErrorMsg('');

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ title: newTaskTitle })
      });
      if (res.ok) {
        const addedTask = await res.json();
        setTasks([addedTask, ...tasks]);
        setNewTaskTitle('');
      } else {
        const errorData = await res.json();
        setErrorMsg(errorData.error || 'Failed to add task');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to connect to server');
    }
  };

  const handleUpdateTask = async (id, currentTitle) => {
    if (!user) return;
    const updatedTitle = prompt('Update Task Title:', currentTitle);
    if (updatedTitle === null || updatedTitle.trim() === '') return;
    setErrorMsg('');

    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ title: updatedTitle })
      });
      
      if (res.ok) {
        const updatedTask = await res.json();
        setTasks(tasks.map(t => t.id === id ? updatedTask : t));
      } else {
        const errorData = await res.json();
        setErrorMsg(errorData.error || 'Failed to update task');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to connect to server');
    }
  };

  const handleDeleteTask = async (id) => {
    if (!user) return;
    setErrorMsg('');
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.id
        }
      });
      if (res.ok) {
        setTasks(tasks.filter(t => t.id !== id));
      } else {
        const errorData = await res.json();
        setErrorMsg(errorData.error || 'Failed to delete task');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to connect to server');
    }
  };

  return (
    <div className="container">
      <div className="task-manager-card">
        <h2 className="section-title">
          {user ? `${user.username}'s Tasks` : 'Task Manager'}
        </h2>
        <p className="subtitle">
          {user
            ? 'Manage your user-specific tasks saved in MongoDB database (task_portfolio_db).'
            : 'Please log in to view and manage your personal tasks.'}
        </p>

        {!user ? (
          <div style={{ textAlign: 'center', margin: '2rem 0' }}>
            <p style={{ marginBottom: '1rem', color: '#718096' }}>You are currently logged out.</p>
            <Link to="/login" className="add-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
              Go to Login / Register
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleAddTask} className="task-form">
              <input
                type="text"
                placeholder="Write a task..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="task-input"
              />
              <button type="submit" className="add-btn">+ Add Task</button>
            </form>

            <div className="task-list">
              {tasks.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#a0aec0', marginTop: '1.5rem' }}>
                  No tasks found. Add a new task above!
                </p>
              ) : (
                tasks.map(task => (
                  <div key={task.id} className="task-item">
                    <span className="task-title">{task.title}</span>
                    <div className="task-actions">
                      <button onClick={() => handleUpdateTask(task.id, task.title)} className="update-btn">Update</button>
                      <button onClick={() => handleDeleteTask(task.id)} className="delete-btn">Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
        
        {errorMsg && (
          <div className="error-message">
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}

export default Task;
