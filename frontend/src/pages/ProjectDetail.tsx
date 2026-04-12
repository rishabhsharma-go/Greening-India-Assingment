import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, Plus, Circle, Clock, CheckCircle } from 'lucide-react';
import { Spinner } from '../components/common/Spinner';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskModal } from '../components/tasks/TaskModal';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee_id: string;
  due_date: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  tasks: Task[];
}

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [users, setUsers] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [filters, setFilters] = useState({ status: '', assignee: '' });
  
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    status: 'todo' as const,
    priority: 'medium' as const,
    assignee_id: null as string | null,
  });

  useEffect(() => {
    fetchProject();
    fetchUsers();
  }, [id, filters]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data.data.users);
    } catch (err) { console.error(err); }
  };

  const fetchProject = async () => {
    try {
      setError(null);
      let url = `/projects/${id}/tasks`;
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.assignee) params.append('assignee', filters.assignee);
      if (params.toString()) url += `?${params.toString()}`;
      
      const [projRes, tasksRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(url)
      ]);
      
      setProject({
        ...projRes.data.data,
        tasks: tasksRes.data.data.tasks
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch project');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTask) {
        const res = await api.patch(`/tasks/${editingTask.id}`, taskForm);
        setProject(p => p ? { ...p, tasks: p.tasks.map(t => t.id === editingTask.id ? res.data.data : t) } : null);
      } else {
        const res = await api.post(`/projects/${id}/tasks`, taskForm);
        setProject(p => p ? { ...p, tasks: [...p.tasks, res.data.data] } : null);
      }
      setShowModal(false);
      setEditingTask(null);
    } catch (err: any) { alert(err.response?.data?.error || 'Action failed'); }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await api.patch(`/tasks/${taskId}`, { status: newStatus });
      setProject(p => p ? {
        ...p,
        tasks: p.tasks.map(t => t.id === taskId ? res.data.data : t)
      } : null);
    } catch (err) {
      fetchProject();
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setProject(p => p ? { ...p, tasks: p.tasks.filter(t => t.id !== taskId) } : null);
    } catch (err: any) { alert(err.response?.data?.error || 'Delete failed'); }
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignee_id: task.assignee_id
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setTaskForm({ title: '', description: '', status: 'todo', priority: 'medium', assignee_id: null });
    setShowModal(true);
  };

  if (loading) return <div className="py-20"><Spinner size="lg" /></div>;

  if (error || !project) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl inline-block">
          <p className="font-bold">Error loading project</p>
          <p className="text-sm">{error || 'Project not found'}</p>
          <Link to="/projects" className="mt-4 inline-block text-sm font-bold underline">Back to projects</Link>
        </div>
      </div>
    );
  }

  const columns = [
    { id: 'todo', title: 'To Do', icon: Circle, color: 'text-gray-400' },
    { id: 'in-progress', title: 'In Progress', icon: Clock, color: 'text-blue-500' },
    { id: 'done', title: 'Done', icon: CheckCircle, color: 'text-green-500' },
  ];

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-6">
        <Link to="/projects" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to projects
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-500 mt-2 max-w-2xl">{project.description}</p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all transform hover:scale-105 active:scale-95 flex items-center space-x-2 shadow-lg shadow-indigo-200"
          >
            <Plus className="w-5 h-5" />
            <span>Add Task</span>
          </button>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-4 mb-8 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-500">Status:</span>
          <select 
            value={filters.status}
            onChange={e => setFilters({...filters, status: e.target.value})}
            className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">All</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-500">Assignee:</span>
          <select 
            value={filters.assignee}
            onChange={e => setFilters({...filters, assignee: e.target.value})}
            className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">All</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <button 
          onClick={() => setFilters({ status: '', assignee: '' })}
          className="text-sm text-indigo-600 font-medium hover:underline ml-auto"
        >
          Clear filters
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map(col => (
          <div key={col.id} className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100/50 h-full min-h-[500px]">
            <div className="flex items-center mb-4 px-2">
              <col.icon className={`w-5 h-5 mr-2 ${col.color}`} />
              <h3 className="font-semibold text-gray-900">{col.title}</h3>
              <span className="ml-auto bg-white px-2 py-0.5 rounded-full text-xs font-bold text-gray-500 shadow-sm border border-gray-100">
                {project.tasks.filter(t => t.status === col.id).length}
              </span>
            </div>
            
            <div className="space-y-3">
              {project.tasks.filter(t => t.status === col.id).map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  users={users} 
                  onEdit={openEditModal} 
                  onDelete={handleDelete} 
                  onStatusChange={handleStatusChange} 
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <TaskModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleTaskSubmit}
        users={users}
        taskData={taskForm}
        setTaskData={setTaskForm}
        isEditing={!!editingTask}
      />
    </div>
  );
}
