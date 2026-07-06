// ─── Attendance Types ────────────────────────────────────────────────────────

export interface AttendanceSession {
  Session_ID: string
  Centre: string
  Batch: string
  Course: string
  Subject: string
  Teacher_ID: string
  Classroom: string
  Start_Time: string
  Duration_Minutes: number
  Grace_Minutes: number
  Expiry_Time: string
  QR_Token: string
  Status: 'Active' | 'Closed'
  Created_At: string
  present_count?: number
  total_students?: number
}

export interface AttendanceLog {
  Log_ID: string
  Session_ID: string
  Student_ID: string
  Timestamp: string
  IP: string
  GPS_Lat: string
  GPS_Lng: string
  Device: string
  Browser: string
  OS: string
  Status: 'Present' | 'Absent' | 'Late' | 'Leave'
  Created_At: string
}

export interface SessionDetail {
  session: AttendanceSession
  present_count: number
  total_students: number
  absent_count: number
  attendance_pct: number
  is_expired: boolean
  logs: AttendanceLog[]
  students: {
    student_id: string
    name: string
    phone: string
    status: string
    timestamp: string | null
    device: string | null
  }[]
}

export interface AttendanceDashboard {
  total_students: number
  active_sessions: number
  today_sessions: number
  today_present: number
  today_absent: number
  today_attendance_pct: number
  defaulter_count: number
  threshold_pct: number
  total_sessions_all: number
  active_session_list: AttendanceSession[]
}

export interface SubjectReport {
  subject: string
  total: number
  present: number
  absent: number
  percentage: number
}

export interface DefaulterStudent {
  student_id: string
  name: string
  phone: string
  centre: string
  batch: string
  course: string
  present: number
  total: number
  percentage: number
  short_by: number
}

export interface LeaveRequest {
  Leave_ID: string
  Student_ID: string
  From_Date: string
  To_Date: string
  Reason: string
  Status: 'Pending' | 'Approved' | 'Rejected'
  Approved_By: string
  Created_At: string
}

export interface MyAttendance {
  student: { id: string; name: string; batch: string; course: string; centre: string }
  overall: {
    total: number; present: number; absent: number; late: number
    percentage: number; threshold: number; is_defaulter: boolean; needed_for_threshold: number
  }
  subject_wise: SubjectReport[]
  by_date: Record<string, { subject: string; status: string; time: string }[]>
  recent_logs: AttendanceLog[]
  leave_requests: LeaveRequest[]
}

// ─── Attendance API ─────────────────────────────────────────────────────────

import { gasGet, gasPost } from '@/lib/gasClient'

export const attApi = {
  // Sessions
  createSession:  (fields: Record<string, unknown>) =>
    gasPost<{ session: AttendanceSession; qr_token: string; qr_expiry: string; session_id: string; qr_data: string }>('createSession', { fields }),
  getSession:     (sessionId: string) =>
    gasGet<SessionDetail>('getSession', { session_id: sessionId }),
  listSessions:   (filters?: Record<string, unknown>) =>
    gasGet<AttendanceSession[]>('listSessions', { filters }),
  getActiveSessions: () =>
    gasGet<AttendanceSession[]>('getActiveSessions', {}),
  closeSession:   (sessionId: string) =>
    gasPost('closeSession', { session_id: sessionId }),
  refreshQr:      (sessionId: string) =>
    gasPost<{ qr_token: string; qr_expiry: string; qr_data: string }>('refreshQrToken', { session_id: sessionId }),

  // Student scan
  recordAttendance: (scanData: string, deviceInfo: Record<string, unknown>) =>
    gasPost<{ success: boolean; message: string; student_name: string; subject: string; timestamp: string; present_count: number }>
      ('recordAttendance', { scan_data: scanData, device_info: deviceInfo }),

  // Corrections
  correctAttendance: (sessionId: string, studentId: string, status: string, reason: string) =>
    gasPost('correctAttendance', { session_id: sessionId, student_id: studentId, status, reason }),
  listCorrections: (filters?: Record<string, unknown>) =>
    gasGet('listCorrections', { filters }),

  // Leave
  submitLeave:    (fields: Record<string, unknown>) =>
    gasPost<LeaveRequest>('submitLeaveRequest', { fields }),
  processLeave:   (leaveId: string, action: 'Approved' | 'Rejected') =>
    gasPost('processLeaveRequest', { leave_id: leaveId, action }),
  listLeave:      (filters?: Record<string, unknown>) =>
    gasGet<LeaveRequest[]>('listLeaveRequests', { filters }),

  // Dashboard & Reports
  getDashboard:   (filters?: Record<string, unknown>) =>
    gasGet<AttendanceDashboard>('getAttendanceDashboard', { filters }),
  getCalendar:    (year: number, month: number, filters?: Record<string, unknown>) =>
    gasGet<Record<string, { session_id: string; subject: string; present_count: number; total_count: number; status: string }[]>>
      ('getAttendanceCalendar', { year, month, filters }),
  getSubjectWise: (filters?: Record<string, unknown>) =>
    gasGet<SubjectReport[]>('getSubjectWiseReport', { filters }),
  getDefaulters:  (filters?: Record<string, unknown>) =>
    gasGet<DefaulterStudent[]>('getDefaulters', { filters }),
  getMonthlySummary: (year: number, month: number, filters?: Record<string, unknown>) =>
    gasGet('getMonthlyAttendanceSummary', { year, month, filters }),

  // Student self-service
  getMyAttendance: () =>
    gasGet<MyAttendance>('getMyAttendance', {}),
}
