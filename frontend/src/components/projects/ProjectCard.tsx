import { Folder, Calendar, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export const ProjectCard = ({ project }: { project: Project }) => {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all hover:-translate-y-1 block"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
          <Folder className="w-6 h-6" />
        </div>
        <button className="text-gray-400 hover:text-gray-600 p-1">
          <Settings className="w-5 h-5" />
        </button>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{project.name}</h3>
      <p className="text-gray-500 text-sm line-clamp-2 h-10 mb-4">{project.description || 'No description provided'}</p>
      <div className="flex items-center text-xs justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center text-gray-400">
          <Calendar className="w-4 h-4 mr-1" />
          <span>{new Date(project.created_at).toLocaleDateString()}</span>
        </div>
        <span className="text-indigo-600 font-medium group-hover:underline">View tasks →</span>
      </div>
    </Link>
  );
};
