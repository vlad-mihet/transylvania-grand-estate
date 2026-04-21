import type { AdminRole } from "@/lib/permissions";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  agentId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AgentSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  slug: string;
}

export interface CreateUserPayload {
  email: string;
  name: string;
  password: string;
  role: AdminRole;
  agentId: string;
}

export interface UpdateUserPayload {
  id: string;
  name?: string;
  role?: AdminRole;
  agentId?: string | null;
}
