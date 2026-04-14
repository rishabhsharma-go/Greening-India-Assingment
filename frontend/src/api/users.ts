import apiClient from './client';

export interface UserSearchResult {
  id: string;
  name: string;
  email: string;
}

export async function searchUsers(query: string) {
  const { data } = await apiClient.get<{ users: UserSearchResult[] }>('/users/search', {
    params: { q: query },
  });
  return data.users;
}
