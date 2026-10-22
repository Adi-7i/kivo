import { apiClient } from "@/lib/api/client";

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  date_joined: string;
}

export const authApi = {
  me: (signal?: AbortSignal) => apiClient<UserProfile>("/api/v1/auth/me/", { signal }),
  register: (data: { name: string; email: string; password: string }) =>
    apiClient<UserProfile>("/api/v1/auth/register/", { method: "POST", body: data }),
  login: (data: { email: string; password: string }) =>
    apiClient<UserProfile>("/api/v1/auth/login/", { method: "POST", body: data }),
  logout: () => apiClient<void>("/api/v1/auth/logout/", { method: "POST", body: {} }),
};
