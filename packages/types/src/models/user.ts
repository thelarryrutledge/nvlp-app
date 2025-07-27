export interface User {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  default_budget_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile extends User {
  budgets?: Budget[];
}

import { Budget } from './budget';