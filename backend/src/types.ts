export type Action = 'increment' | 'decrement';

export interface PostBody {
  action: Action;
}

export interface ApiResponse {
  value: number;
  updatedAt: string;
  version: number;
  idempotent?: boolean;
}
