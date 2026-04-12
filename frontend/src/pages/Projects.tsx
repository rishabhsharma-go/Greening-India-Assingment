import { useEffect, useState } from 'react';
import api from '../api';
import { Plus, Folder } from 'lucide-react';
import { Spinner } from '../components/common/Spinner';
import { ProjectCard } from '../components/projects/ProjectCard';
import { EmptyState } from '../components/common/EmptyState';

interface Project {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  created_at: string;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState({ total_projects: 0, total_tasks: 0, completed_tasks: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [projRes, statsRes] = await Promise.all([
        api.get('/projects'),
        api.get('/projects/stats')
      ]);
      setProjects(projRes.data.data.projects);
      setStats(statsRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name) return;
    setCreating(true);
    try {
      const res = await api.post('/projects', newProject);
      setProjects([res.data.data, ...projects]);
      setShowModal(false);
      setNewProject({ name: '', description: '' });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="py-20"><Spinner size="lg" /></div>;

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">Manage your active projects and tasks</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all transform hover:scale-105 active:scale-95 flex items-center space-x-2 shadow-lg shadow-indigo-100"
        >
          <Plus className="w-5 h-5" />
          <span>New Project</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Projects</p>
          <p className="text-2xl font-black text-indigo-600">{stats.total_projects}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Tasks</p>
          <p className="text-2xl font-black text-blue-600">{stats.total_tasks}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Completed</p>
          <p className="text-2xl font-black text-green-600">{stats.completed_tasks}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex justify-between items-center">
          <p className="text-sm font-medium">{error}</p>
          <button onClick={fetchProjects} className="text-xs font-bold underline">Retry</button>
        </div>
      )}

      {projects.length === 0 ? (
        <EmptyState 
          title="No projects found" 
          message="Create a new project to start managing tasks."
          icon={<Folder className="w-16 h-16 text-gray-300" />}
          action={
            <button
              onClick={() => setShowModal(true)}
              className="bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 px-6 py-2 rounded-xl font-medium transition-colors inline-flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Create your first project</span>
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Create New Project</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold p-2">&times;</button>
            </div>
            <form onSubmit={handleCreate} className="p-6">
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="E.g. Website Redesign"
                    value={newProject.name}
                    onChange={e => setNewProject({...newProject, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px]"
                    placeholder="Brief description of the project..."
                    value={newProject.description}
                    onChange={e => setNewProject({...newProject, description: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
