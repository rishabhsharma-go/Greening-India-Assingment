import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectsApi } from '../api/projects.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { PageLoader } from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ProjectModal from '../components/ProjectModal.jsx';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ProjectCard({ project, onEdit, onDelete }) {
  const { user } = useAuth();
  const isOwner = project.owner_id === user?.id;

  return (
    <article className="project-card" aria-label={`Project: ${project.name}`}>
      <div className="project-card__header">
        <div className="project-card__icon" aria-hidden="true">
          {project.name.charAt(0).toUpperCase()}
        </div>
        {isOwner && (
          <div className="project-card__menu">
            <button
              className="btn btn--icon"
              id={`edit-project-${project.id}`}
              onClick={(e) => { e.preventDefault(); onEdit(project); }}
              title="Edit project"
              aria-label={`Edit ${project.name}`}
            >
              ✎
            </button>
            <button
              className="btn btn--icon btn--danger-ghost"
              id={`delete-project-${project.id}`}
              onClick={(e) => { e.preventDefault(); onDelete(project); }}
              title="Delete project"
              aria-label={`Delete ${project.name}`}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <Link to={`/projects/${project.id}`} className="project-card__link">
        <h2 className="project-card__name">{project.name}</h2>
        {project.description ? (
          <p className="project-card__desc">{project.description}</p>
        ) : (
          <p className="project-card__desc project-card__desc--empty">No description</p>
        )}
      </Link>

      <div className="project-card__footer">
        <span className="project-card__date">Created {formatDate(project.created_at)}</span>
        <Link to={`/projects/${project.id}`} className="project-card__view-link">
          View tasks →
        </Link>
      </div>
    </article>
  );
}

export default function Projects() {
  const { addToast } = useToast();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    projectsApi
      .list()
      .then((data) => {
        if (!cancelled) setProjects(data?.projects ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Failed to load projects');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  function openCreate() {
    setEditingProject(null);
    setModalOpen(true);
  }

  function openEdit(project) {
    setEditingProject(project);
    setModalOpen(true);
  }

  function handleSaved(saved, wasEditing) {
    if (wasEditing) {
      setProjects((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
    } else {
      setProjects((prev) => [saved, ...prev]);
    }
  }

  async function handleDelete(project) {
    if (!window.confirm(`Delete "${project.name}"? This will also remove all its tasks.`)) return;

    setDeletingId(project.id);
    try {
      await projectsApi.delete(project.id);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      addToast('Project deleted', 'success');
    } catch (err) {
      addToast(err.message ?? 'Failed to delete project', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="page projects-page">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">
            {projects.length === 0
              ? 'Create your first project to get started'
              : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button id="new-project-btn" className="btn btn--primary" onClick={openCreate}>
          <span aria-hidden="true">+</span> New Project
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="alert alert--error" role="alert">
          {error}
          <button
            className="alert__retry"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!error && projects.length === 0 && (
        <EmptyState
          icon="🗂️"
          title="No projects yet"
          description="Projects help you organize tasks. Create one to get started."
          action={
            <button className="btn btn--primary" onClick={openCreate}>
              Create your first project
            </button>
          }
        />
      )}

      {/* Projects grid */}
      {projects.length > 0 && (
        <div className="projects-grid">
          {projects.map((project) => (
            <div
              key={project.id}
              style={{ opacity: deletingId === project.id ? 0.5 : 1, transition: 'opacity 0.2s' }}
            >
              <ProjectCard
                project={project}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      )}

      <ProjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        project={editingProject}
        onSaved={handleSaved}
      />
    </div>
  );
}
