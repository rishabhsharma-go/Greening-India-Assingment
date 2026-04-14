import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projectAPI, taskAPI } from '../services/api';
import { Project, Task } from '../types';
import { ArrowLeft, Plus, Trash2, AlertCircle, Loader, CheckCircle, Circle } from 'lucide-react';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    if (!id) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await projectAPI.getProject(id);
      setProject(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !id) return;

    setIsCreatingTask(true);
    try {
      const response = await taskAPI.createTask(id, newTaskTitle, newTaskDesc, newTaskPriority);
      setProject((p) => p && { ...p, tasks: [response.data, ...(p.tasks || [])] });
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskPriority('medium');
      setShowTaskModal(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create task');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleUpdateTask = async (taskId: string, status: string) => {
    try {
      const response = await taskAPI.updateTask(taskId, { status });
      setProject(
        (p) =>
          p && {
            ...p,
            tasks: p.tasks?.map((t) => (t.id === taskId ? response.data : t)),
          }
      );
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await taskAPI.deleteTask(taskId);
      setProject((p) => p && { ...p, tasks: p.tasks?.filter((t) => t.id !== taskId) });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete task');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-gray-600 mb-4">Project not found</p>
        <button onClick={() => navigate('/projects')} className="text-blue-600 hover:underline">
          Back to Projects
        </button>
      </div>
    );
  }

  const filteredTasks = (project.tasks || []).filter(
    (task) => !statusFilter || task.status === statusFilter
  );

  const tasksByStatus = {
    todo: filteredTasks.filter((t) => t.status === 'todo'),
    in_progress: filteredTasks.filter((t) => t.status === 'in_progress'),
    done: filteredTasks.filter((t) => t.status === 'done'),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft size={20} />
              Back
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
          {project.description && <p className="text-gray-600 mt-2">{project.description}</p>}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-4 py-2 rounded-lg transition ${
                !statusFilter ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700'
              }`}
            >
              All Tasks
            </button>
            {['todo', 'in_progress', 'done'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg transition capitalize ${
                  statusFilter === status ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowTaskModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Plus size={20} />
            New Task
          </button>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['todo', 'in_progress', 'done'].map((status) => (
            <div key={status} className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-4 capitalize">
                {status.replace('_', ' ')} ({tasksByStatus[status as keyof typeof tasksByStatus].length})
              </h3>
              <div className="space-y-3">
                {tasksByStatus[status as keyof typeof tasksByStatus].map((task) => (
                  <div key={task.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h4 className="font-medium text-gray-900 flex-1">{task.title}</h4>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {task.description && <p className="text-sm text-gray-600 mb-2">{task.description}</p>}
                    <div className="flex gap-2 mb-2">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          task.priority === 'high'
                            ? 'bg-red-100 text-red-700'
                            : task.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {task.priority}
                      </span>
                      {task.due_date && (
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">{task.due_date}</span>
                      )}
                    </div>
                    <select
                      value={task.status}
                      onChange={(e) => handleUpdateTask(task.id, e.target.value)}
                      className="w-full text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 mb-6">No tasks yet</p>
            <button
              onClick={() => setShowTaskModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
            >
              Create First Task
            </button>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Create New Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Design homepage"
                  disabled={isCreatingTask}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Task description"
                  rows={3}
                  disabled={isCreatingTask}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isCreatingTask}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                  disabled={isCreatingTask}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                  disabled={isCreatingTask}
                >
                  {isCreatingTask && <Loader size={16} className="animate-spin" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
