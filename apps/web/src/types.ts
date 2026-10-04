export interface CondominiumContext {
  id: string;
  name: string;
  roles: string[];
  units: Array<{ id: string; label: string }>;
}

export interface CurrentUser {
  id: string;
  display_name: string;
}

export interface Category {
  id: string;
  code: string;
  name: string;
}

export interface ServiceRequest {
  id: string;
  public_number: string;
  subject: string;
  location_label: string | null;
  status: string;
  priority: string;
  created_at: string;
  category_name: string;
}

export interface RequestSummary {
  open_requests: number;
  in_progress_requests: number;
}

export interface AppContext {
  user: CurrentUser;
  condominiums: CondominiumContext[];
  active_context_id: string;
}
