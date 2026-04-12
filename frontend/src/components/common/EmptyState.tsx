import { AlertCircle } from 'lucide-react';
import { ReactNode } from 'react';

interface Props {
  title: string;
  message: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export const EmptyState = ({ title, message, icon, action }: Props) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
      <div className="mx-auto mb-4 flex justify-center">
        {icon || <AlertCircle className="w-16 h-16 text-gray-300" />}
      </div>
      <h3 className="text-xl font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-6">{message}</p>
      {action}
    </div>
  );
};
