import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as tasksApi from '../api/tasks';
import type { Task } from '../types';

interface TaskFilters {
  status?: string;
  priority?: string;
  assignee_id?: string;
}

export function useTasks(projectId: string, filters?: TaskFilters) {
  return useQuery({
    queryKey: ['tasks', projectId, filters],
    queryFn: () => tasksApi.getTasks(projectId, filters),
    enabled: !!projectId,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...data }: Partial<Task> & { projectId: string }) =>
      tasksApi.createTask(projectId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['tasks', variables.projectId] });
      qc.invalidateQueries({ queryKey: ['projects', variables.projectId] });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Task> & { id: string }) =>
      tasksApi.updateTask(id, data),
    onMutate: async (variables) => {
      // Optimistic update: snapshot current cache and apply changes immediately
      const queryKey = ['tasks', variables.project_id];
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData(queryKey);

      qc.setQueriesData<{ tasks: Task[] } | undefined>(
        { queryKey: ['tasks'] },
        (old) => {
          if (!old?.tasks) return old;
          return {
            ...old,
            tasks: old.tasks.map((t) => (t.id === variables.id ? { ...t, ...variables } : t)),
          };
        }
      );

      return { previous, queryKey };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        qc.setQueryData(context.queryKey, context.previous);
      }
    },
    onSettled: (_data, _err, variables) => {
      qc.invalidateQueries({ queryKey: ['tasks', variables.project_id] });
      qc.invalidateQueries({ queryKey: ['projects', variables.project_id] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; projectId: string }) => tasksApi.deleteTask(id),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['tasks', variables.projectId] });
      qc.invalidateQueries({ queryKey: ['projects', variables.projectId] });
    },
  });
}
