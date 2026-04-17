import { Navigate } from 'react-router-dom';
import { getToken } from '../lib/storage';

export function RootRedirect() {
  return <Navigate to={getToken() ? '/projects' : '/login'} replace />;
}
