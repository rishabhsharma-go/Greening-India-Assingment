import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useProjects, useCreateProject } from '../hooks/useProjects';
import ProjectCard from '../components/ProjectCard';
import ProjectForm from '../components/ProjectForm';
import EmptyState from '../components/EmptyState';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';

export default function ProjectsPage() {
  const { data, isLoading, error } = useProjects();
  const createProject = useCreateProject();
  const [showCreate, setShowCreate] = useState(false);

  const projects = data?.projects || [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-600 dark:text-red-400">
        Failed to load projects. Please try again.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Projects</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          message="No projects yet"
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={16} />
              Create your first project
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Project">
        <ProjectForm
          loading={createProject.isPending}
          onSubmit={(data) => {
            createProject.mutate(data, {
              onSuccess: () => setShowCreate(false),
            });
          }}
        />
      </Modal>
    </div>
  );
}
