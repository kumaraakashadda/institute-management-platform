/**
 * useAttendance.ts — React Query hooks for the Attendance module.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { attendanceApi } from './attendanceApi'
import type { AttendanceFilters, CreateSessionFields, AttendanceStatus } from './types'

// ── Query key factory ─────────────────────────────────────────────────────────
export const attKeys = {
  all:          ()             => ['attendance'] as const,
  sessions:     (f?: AttendanceFilters) => [...attKeys.all(), 'sessions', f] as const,
  session:      (id: string)   => [...attKeys.all(), 'session', id] as const,
  sessionLive:  (id: string)   => [...attKeys.all(), 'session-live', id] as const,
  active:       ()             => [...attKeys.all(), 'active'] as const,
  dashboard:    (f?: AttendanceFilters) => [...attKeys.all(), 'dashboard', f] as const,
  calendar:     (y: number, m: number) => [...attKeys.all(), 'calendar', y, m] as const,
  defaulters:   (f?: AttendanceFilters) => [...attKeys.all(), 'defaulters', f] as const,
  corrections:  ()             => [...attKeys.all(), 'corrections'] as const,
  leaves:       ()             => [...attKeys.all(), 'leaves'] as const,
  myAttendance: ()             => [...attKeys.all(), 'my'] as const,
}

// ── Sessions ──────────────────────────────────────────────────────────────────
export function useActiveSessions() {
  return useQuery({
    queryKey: attKeys.active(),
    queryFn: attendanceApi.getActiveSessions,
    refetchInterval: 10_000, // poll every 10s for live updates
    staleTime: 5_000,
  })
}

export function useSession(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: attKeys.session(sessionId),
    queryFn: () => attendanceApi.getSession(sessionId, false),
    enabled: !!sessionId && enabled,
  })
}

/** Polls every 5 seconds to get live present/absent counts during an active session */
export function useSessionLive(sessionId: string, active = true) {
  return useQuery({
    queryKey: attKeys.sessionLive(sessionId),
    queryFn: () => attendanceApi.getSession(sessionId, true),
    enabled: !!sessionId && active,
    refetchInterval: active ? 5_000 : false,
    staleTime: 3_000,
  })
}

export function useSessions(filters?: AttendanceFilters) {
  return useQuery({
    queryKey: attKeys.sessions(filters),
    queryFn: () => attendanceApi.listSessions(filters),
    staleTime: 30_000,
  })
}

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fields: CreateSessionFields) => attendanceApi.createSession(fields),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attKeys.all() })
    },
  })
}

export function useCloseSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => attendanceApi.closeSession(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attKeys.all() })
    },
  })
}

// ── QR refresh ────────────────────────────────────────────────────────────────
export function useRefreshQr() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => attendanceApi.refreshQrToken(sessionId),
    onSuccess: (data, sessionId) => {
      qc.setQueryData(attKeys.session(sessionId), (old: unknown) => {
        if (!old || typeof old !== 'object') return old
        return { ...(old as object), QR_Token: (data as { token: string }).token }
      })
    },
  })
}

// ── Record attendance (student scan) ──────────────────────────────────────────
export function useRecordAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ scanData, deviceInfo }: { scanData: { session_id: string; token: string }; deviceInfo: Record<string, string> }) =>
      attendanceApi.recordAttendance(scanData, deviceInfo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attKeys.myAttendance() })
    },
  })
}

// ── Corrections ───────────────────────────────────────────────────────────────
export function useCorrections(filters?: AttendanceFilters) {
  return useQuery({
    queryKey: attKeys.corrections(),
    queryFn: () => attendanceApi.listCorrections(filters),
    staleTime: 30_000,
  })
}

export function useCorrectAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionId, studentId, status, reason }: { sessionId: string; studentId: string; status: AttendanceStatus; reason: string }) =>
      attendanceApi.correctAttendance(sessionId, studentId, status, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attKeys.all() })
    },
  })
}

// ── Leave requests ────────────────────────────────────────────────────────────
export function useLeaveRequests() {
  return useQuery({
    queryKey: attKeys.leaves(),
    queryFn: () => attendanceApi.listLeaves(),
    staleTime: 60_000,
  })
}

export function useSubmitLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fields: { From_Date: string; To_Date: string; Reason: string }) =>
      attendanceApi.submitLeave(fields),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attKeys.leaves() })
    },
  })
}

export function useProcessLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ leaveId, action }: { leaveId: string; action: 'Approved' | 'Rejected' }) =>
      attendanceApi.processLeave(leaveId, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attKeys.leaves() })
    },
  })
}

// ── Dashboard & reports ───────────────────────────────────────────────────────
export function useAttendanceDashboard(filters?: AttendanceFilters) {
  return useQuery({
    queryKey: attKeys.dashboard(filters),
    queryFn: () => attendanceApi.getDashboard(filters),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function useAttendanceCalendar(year: number, month: number) {
  return useQuery({
    queryKey: attKeys.calendar(year, month),
    queryFn: () => attendanceApi.getCalendar(year, month),
    staleTime: 5 * 60_000,
  })
}

export function useDefaulters(filters?: AttendanceFilters) {
  return useQuery({
    queryKey: attKeys.defaulters(filters),
    queryFn: () => attendanceApi.getDefaulters(filters),
    staleTime: 5 * 60_000,
  })
}

// ── Student self-service ──────────────────────────────────────────────────────
export function useMyAttendance() {
  return useQuery({
    queryKey: attKeys.myAttendance(),
    queryFn: attendanceApi.getMyAttendance,
    staleTime: 5 * 60_000,
  })
}
