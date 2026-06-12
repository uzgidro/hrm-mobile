export interface User {
  id: number;
  type: 'employee' | 'master-admin' | 'admin';
  employee?: Employee;
}

export interface Employee {
  id: number;
  legal_name: string;
  photo_path?: string;
  birth_date?: string;
  email?: string;
  phone_number?: string;
  internal_phone_number?: string;
  working_hours_start?: string;
  working_hours_end?: string;
  lunch_start_time?: string;
  lunch_end_time?: string;
  working_days?: number[];
  job_position?: { id: number; name: string };
  department?: { id: number; name: string; organization_branch_id?: number };
  is_multi_org_user?: boolean;
  multi_org_employee_role?: string;
  organization_branches?: OrganizationBranch[];
  supervisor?: Employee;
}

export interface OrganizationBranch {
  id: number;
  name: string;
}

export interface AttendanceEvent {
  id: number;
  happen_time: string;
  direction_type?: string | null;
  check_in_out_type?: number | null;
  employee_id?: number | null;
  turnstile?: { acs_dev_name?: string; name?: string };
  is_granted?: boolean;
  user_type?: string | null;
}

export interface WorkLeave {
  id: number;
  type: string;
  start_date: string;
  end_date: string;
  status: string;
  employee_id?: number;
  employee?: Employee;
  description?: string;
  created_at?: string;
  updated_at?: string;
  assigned_signers?: Employee[];
  signers?: Employee[];
  rejection_reason?: string | null;
}

export interface NewsPost {
  id: number;
  title: string;
  description?: string;
  content?: string;
  created_at: string;
  author?: { legal_name: string; photo_path?: string };
  organization_branch?: OrganizationBranch;
}

export interface Notification {
  id: number;
  title: string;
  body?: string;
  is_read: boolean;
  created_at: string;
  type?: string;
}

export interface WorkExperience {
  id: number;
  company_name: string;
  position: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface Education {
  id: number;
  institution_name: string;
  faculty_name: string;
  degree_name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface EmployeeFull extends Employee {
  gender?: number;
  nationality?: string;
  maritial_status?: string;
  address?: string;
  pasport_series?: string;
  pasport_number?: string;
  pasport_individual_number?: string;
  pasport_issue_by?: string;
  personal_identification_number?: string;
  taxpayer_identification_number?: string;
  individual_accumulative_pension_account_number?: string;
  job_acceptance_date?: string;
  work_experiences?: WorkExperience[];
  educations?: Education[];
}

export interface EmployeeBirthday {
  id: number;
  legal_name: string;
  birth_date?: string;
  photo_path?: string;
  days_left: number;
  job_position?: { id: number; name: string };
}

export interface AttendanceDay {
  date: string;
  status: 'present' | 'absent' | 'weekend' | 'holiday' | 'vacation' | 'sick' | 'business_trip';
  entry_time?: string;
  exit_time?: string;
  is_late?: boolean;
  minutes_late?: number;
}
