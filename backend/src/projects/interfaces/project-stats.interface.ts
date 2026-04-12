export interface ProjectStats {
  statsByStatus: Array<{ status: string; count: string | number }>;
  statsByAssignee: Array<{ assignee: string | null; count: string | number }>;
}
