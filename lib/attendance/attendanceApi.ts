/**
 * attendanceApi.ts — all attendance API calls
 * Every function maps to one GAS action in Code.gs.
 */
import { gasGet, gasPost } from '@/lib/gasClient'
import type {
  AttendanceSession, CreateSessionFields, QrData,
  AttendanceLog, AttendanceCorrection, LeaveRequest,
  AttendanceDashboard, StudentAttendanceSummary,
  DefaulterStudent, SessionSummary, AttendanceFilters,
  AttendanceStatus, LeaveStatus,
} from './types'

// ── Sessions ──────────────────────────────────────────────────────────────────
export const attendanceApi = {
  createSession: (fields: CreateSessionFields) =>
    gasPost<AttendanceSession>('createSession', { fields }),

  getSession: (sessionId: string, live = false) =>
    gasGet<AttendanceSession>('getSession', { session_id: sessionId, live }),

  listSessions: (filters?: AttendanceFilters) =>
    gasGet<AttendanceSession[]>('listSessions', { filters }),

  getActiveSessions: () =>
    gasGet<AttendanceSession[]>('getActiveSessions', {}),

  closeSession: (sessionId: string) =>
    gasPost<boolean>('closeSession', { session_id: sessionId }),

  refreshQrToken: (sessionId: string) =>
    gasPost<QrData>('refreshQrToken', { session_id: sessionId }),

  // ── Student scan ───────────────────────────────────────────────────────────
  recordAttendance: (scanData: { session_id: string; token: string; qr_string?: string }, deviceInfo: Record<string, string>) =>
    gasPost<{ status: AttendanceStatus; message: string; student_name: string }>('recordAttendance', { scan_data: scanData, device_info: deviceInfo }),

  // ── Corrections ───────────────────────────────────────────────────────────
  correctAttendance: (sessionId: string, studentId: string, status: AttendanceStatus, reason: string) =>
    gasPost<AttendanceCorrection>('correctAttendance', { session_id: sessionId, student_id: studentId, status, reason }),

  listCorrections: (filters?: AttendanceFilters) =>
    gasGet<AttendanceCorrection[]>('listCorrections', { filters }),

  // ── Leave requests ────────────────────────────────────────────────────────
  submitLeave: (fields: { From_Date: string; To_Date: string; Reason: string }) =>
    gasPost<LeaveRequest>('submitLeaveRequest', { fields }),

  processLeave: (leaveId: string, action: 'Approved' | 'Rejected') =>
    gasPost<LeaveRequest>('processLeaveRequest', { leave_id: leaveId, action }),

  listLeaves: (filters?: { status?: LeaveStatus; student_id?: string }) =>
    gasGet<LeaveRequest[]>('listLeaveRequests', { filters }),

  // ── Dashboard & stats ─────────────────────────────────────────────────────
  getDashboard: (filters?: AttendanceFilters) =>
    gasGet<AttendanceDashboard>('getAttendanceDashboard', { filters }),

  getCalendar: (year: number, month: number, filters?: AttendanceFilters) =>
    gasGet<Record<string, { present: number; absent: number; late: number; pct: number; sessions: number }>>('getAttendanceCalendar', { year, month, filters }),

  getSubjectWiseReport: (filters?: AttendanceFilters) =>
    gasGet<SessionSummary[]>('getSubjectWiseReport', { filters }),

  getDefaulters: (filters?: AttendanceFilters) =>
    gasGet<DefaulterStudent[]>('getDefaulters', { filters }),

  getMonthlySummary: (year: number, month: number, filters?: AttendanceFilters) =>
    gasGet<SessionSummary[]>('getMonthlyAttendanceSummary', { year, month, filters }),

  // ── Student self-service ──────────────────────────────────────────────────
  getMyAttendance: () =>
    gasGet<StudentAttendanceSummary>('getMyAttendance', {}),
}
