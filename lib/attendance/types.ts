// ─── Session ──────────────────────────────────────────────────────────────────
export type SessionStatus = 'Active' | 'Closed' | 'Expired' | 'Cancelled'

export interface AttendanceSession {
  Session_ID: string
  Centre: string
  Batch: string
  Course: string
  Subject: string
  Teacher_ID: string
  Teacher_Name?: string
  Classroom: string
  Start_Time: string
  Duration_Minutes: number
  Grace_Minutes: number
  Expiry_Time: string
  QR_Token: string
  Status: SessionStatus
  Created_At: string
  // Live counts (populated by getSession with live=true)
  present_count?: number
  absent_count?: number
  total_students?: number
  last_marked?: string
}

export interface CreateSessionFields {
  Centre: string
  Batch: string
  Course: string
  Subject: string
  Classroom: string
  Duration_Minutes: number
  Grace_Minutes: number
  Start_Time?: string
}

export interface QrData {
  session_id: string
  token: string
  expires_at: string
  qr_string: string  // JSON string to encode into QR
  seconds_left: number
}

// ─── Attendance Log ───────────────────────────────────────────────────────────
export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused'

export interface AttendanceLog {
  Log_ID: string
  Session_ID: string
  Student_ID: string
  Student_Name?: string
  Timestamp: string
  IP: string
  GPS_Lat: string
  GPS_Lng: string
  Device: string
  Browser: string
  OS: string
  Network: string
  Classroom: string
  Status: AttendanceStatus
  Created_At: string
}

// ─── Corrections ──────────────────────────────────────────────────────────────
export interface AttendanceCorrection {
  Correction_ID: string
  Session_ID: string
  Student_ID: string
  Student_Name?: string
  Original_Status: AttendanceStatus
  Corrected_Status: AttendanceStatus
  Reason: string
  Approved_By: string
  Timestamp: string
}

// ─── Leave Requests ───────────────────────────────────────────────────────────
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected'

export interface LeaveRequest {
  Leave_ID: string
  Student_ID: string
  Student_Name?: string
  From_Date: string
  To_Date: string
  Reason: string
  Status: LeaveStatus
  Approved_By: string
  Created_At: string
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface AttendanceDashboard {
  today: {
    total_students: number
    present: number
    absent: number
    late: number
    attendance_pct: number
    active_sessions: number
  }
  week: {
    avg_pct: number
    total_sessions: number
  }
  month: {
    avg_pct: number
    total_sessions: number
    defaulters: number
  }
  sessions: AttendanceSession[]
  recent_logs: AttendanceLog[]
}

// ─── Calendar ─────────────────────────────────────────────────────────────────
export interface CalendarDay {
  date: string
  sessions: number
  present: number
  absent: number
  late: number
  pct: number
}

// ─── Student Attendance ───────────────────────────────────────────────────────
export interface StudentAttendanceSummary {
  student_id: string
  student_name: string
  overall_pct: number
  total_classes: number
  present: number
  absent: number
  late: number
  by_subject: SubjectAttendance[]
  calendar: CalendarDay[]
  monthly: MonthlyAttendance[]
  threshold_pct: number
  is_defaulter: boolean
}

export interface SubjectAttendance {
  subject: string
  course: string
  total: number
  present: number
  absent: number
  late: number
  pct: number
  status: 'good' | 'warning' | 'critical'
}

export interface MonthlyAttendance {
  year: number
  month: number
  month_name: string
  total: number
  present: number
  pct: number
}

// ─── Reports ─────────────────────────────────────────────────────────────────
export interface DefaulterStudent {
  student_id: string
  student_name: string
  phone: string
  centre: string
  batch: string
  course: string
  overall_pct: number
  total_classes: number
  present: number
  absent: number
  days_absent_last_7: number
  is_continuous_absentee: boolean
}

export interface SessionSummary {
  session_id: string
  subject: string
  batch: string
  course: string
  teacher: string
  date: string
  start_time: string
  duration: number
  total_students: number
  present: number
  absent: number
  late: number
  pct: number
}

// ─── Scan ────────────────────────────────────────────────────────────────────
export interface ScanResult {
  success: boolean
  message: string
  student_name?: string
  session?: string
  timestamp?: string
  status?: AttendanceStatus
  error?: string
}

// ─── Filters ─────────────────────────────────────────────────────────────────
export interface AttendanceFilters {
  centre?: string
  batch?: string
  course?: string
  subject?: string
  teacher_id?: string
  student_id?: string
  from_date?: string
  to_date?: string
  status?: AttendanceStatus
}
