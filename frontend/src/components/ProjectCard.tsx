import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight } from 'lucide-react';
import type { Project } from '../types';

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/projects/${project.id}`)}
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {project.name}
        </h3>
        <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-400 transition-colors shrink-0 mt-0.5" />
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 min-h-[2.5rem]">
        {project.description || 'No description'}
      </p>
      <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
        <span className="flex items-center gap-1">
          <Calendar size={13} />
          {new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        {project.tasks && (
          <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">
            {project.tasks.length} task{project.tasks.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
