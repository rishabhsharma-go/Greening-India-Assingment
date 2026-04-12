import { Trash2 } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee_id: string;
}

interface Props {
  task: Task;
  users: { id: string, name: string }[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}

export const TaskCard = ({ task, users, onEdit, onDelete, onStatusChange }: Props) => {
  const assignee = users.find(u => u.id === task.assignee_id);

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group">
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[10px] font-bold uppercase py-1 px-2 rounded-md ${
          task.priority === 'high' ? 'bg-red-50 text-red-600' :
          task.priority === 'medium' ? 'bg-orange-50 text-orange-600' :
          'bg-green-50 text-green-600'
        }`}>
          {task.priority}
        </span>
        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(task)} className="text-gray-400 hover:text-indigo-600 p-1 text-xs">Edit</button>
          <button onClick={() => onDelete(task.id)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
      <h4 className="font-medium text-gray-900 mb-1 leading-tight">{task.title}</h4>
      {task.description && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{task.description}</p>}
      
      {task.assignee_id && (
        <div className="flex items-center mt-2 text-[10px] text-gray-500">
          <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 mr-2 font-bold uppercase">
            {assignee?.name.charAt(0) || '?'}
          </div>
          <span>{assignee?.name}</span>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-50">
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value)}
          className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 w-full text-gray-700 outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </div>
    </div>
  );
};
