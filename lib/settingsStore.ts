/**
 * settingsStore.ts
 * Global Zustand store for platform settings so that changes made on the
 * Settings page (even in demo mode) reflect instantly everywhere —
 * header branding, institute name in emails, colours, etc.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  values: Record<string, string>
  setValues: (v: Record<string, string>) => void
  setValue: (key: string, value: string) => void
  get: (key: string, fallback?: string) => string
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      values: {
        INSTITUTE_NAME:   'My Institute',
        BRAND_COLOUR:     '#2563EB',
        INSTITUTE_EMAIL:  'info@institute.com',
        INSTITUTE_PHONE:  '',
        INSTITUTE_LOGO_URL: '',
        ACADEMIC_YEAR:    '2025-26',
        ATTENDANCE_THRESHOLD_PERCENT: '75',
        QR_EXPIRY_SECONDS: '90',
        GPS_RADIUS_METERS: '150',
      },
      setValues: (v) => set(s => ({ values: { ...s.values, ...v } })),
      setValue:  (key, value) => set(s => ({ values: { ...s.values, [key]: value } })),
      get: (key, fallback = '') => get().values[key] ?? fallback,
    }),
    { name: 'imp-settings' }
  )
)
