import { useState, useEffect } from 'react';
import './Task.css';

const API_URL = 'http://localhost:5000/tasks';

function Task() {
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch tasks
  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch(API_URL);
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
    if (!newTaskTitle.trim()) return;
    setErrorMsg('');

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTaskTitle })
      });
      if (res.ok) {
        const addedTask = await res.json();
        setTasks([...tasks, addedTask]);
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
    const updatedTitle = prompt('Update Task Title:', currentTitle);
    if (updatedTitle === null || updatedTitle.trim() === '') return;
    setErrorMsg('');

    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
    setErrorMsg('');
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
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
        <h2 className="section-title">Task Manager</h2>
        <p className="subtitle">Add your daily tasks and manage them with the backend API.</p>

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
          {tasks.map(task => (
            <div key={task.id} className="task-item">
              <span className="task-title">{task.title}</span>
              <div className="task-actions">
                <button onClick={() => handleUpdateTask(task.id, task.title)} className="update-btn">Update</button>
                <button onClick={() => handleDeleteTask(task.id)} className="delete-btn">Delete</button>
              </div>
            </div>
          ))}
        </div>
        
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
