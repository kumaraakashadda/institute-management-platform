'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useSettingsStore } from '@/lib/settingsStore'

interface NavItem { href: string; label: string; icon: string; badge?: string }
interface NavSection { title: string; items: NavItem[] }

// ── Complete nav per role ─────────────────────────────────────────────────────
const NAV: Record<string, NavSection[]> = {
  SUPER_ADMIN: [
    { title: 'Main', items: [
      { href: '/dashboard/admissions', label: 'Admissions', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
      { href: '/dashboard/students', label: 'Students', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
      { href: '/dashboard/reports', label: 'Reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      { href: '/dashboard/announcements', label: 'Announcements', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
      { href: '/dashboard/admin', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { href: '/dashboard/attendance', label: 'Attendance', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', badge: 'Live' },
    ]},
    { title: 'Fee Management', items: [
      { href: '/dashboard/fees', label: 'Fee Dashboard', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { href: '/dashboard/fees/plans', label: 'Fee Plans', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
      { href: '/dashboard/fees/student', label: 'Student Fees', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
      { href: '/dashboard/fees/calendar', label: 'Fee Calendar', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { href: '/dashboard/fees/crm', label: 'CRM Pipeline', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      { href: '/dashboard/fees/reports', label: 'Fee Reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    ]},
    { title: 'Configuration', items: [
      { href: '/dashboard/admin/bulk-upload',  label: 'Bulk Upload',       icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
      { href: '/dashboard/custom-dashboard',   label: 'Custom Dashboard',  icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm6 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm-6 6a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm6 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z' },
      { href: '/dashboard/settings',           label: 'Settings',          icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
      { href: '/dashboard/settings/master-data', label: 'Master Data',     icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4' },
    ]},
  ],
  CENTRE_MANAGER: [
    { title: 'Main', items: [
      { href: '/dashboard/centre', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { href: '/dashboard/attendance', label: 'Attendance', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    ]},
    { title: 'Fee Management', items: [
      { href: '/dashboard/fees', label: 'Fee Dashboard', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { href: '/dashboard/fees/crm', label: 'CRM Pipeline', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      { href: '/dashboard/fees/student', label: 'Student Fees', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    ]},
    { title: 'Settings', items: [
      { href: '/dashboard/admin/bulk-upload', label: 'Bulk Upload', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
      { href: '/dashboard/settings/master-data', label: 'Master Data', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4' },
    ]},
  ],
  TEACHER: [
    { title: 'Main', items: [
      { href: '/dashboard/teacher', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    ]},
    { title: 'Attendance', items: [
      { href: '/dashboard/attendance/session/new', label: '▶ Start Session', icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { href: '/dashboard/attendance/session/list', label: 'My Sessions', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
      { href: '/dashboard/attendance/corrections', label: 'Corrections', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
      { href: '/dashboard/attendance/reports', label: 'Reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      { href: '/dashboard/teacher/students', label: 'My Students', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
      { href: '/dashboard/teacher/performance', label: 'Performance', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
      { href: '/dashboard/attendance/leave', label: 'Leave Requests', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    ]},
  ],
  COUNSELLOR: [
    { title: 'Main', items: [
      { href: '/dashboard/counsellor', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    ]},
    { title: 'Fee Management', items: [
      { href: '/dashboard/fees', label: 'Fee Dashboard', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { href: '/dashboard/fees/crm', label: 'CRM Pipeline', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      { href: '/dashboard/fees/student', label: 'Student Fees', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
      { href: '/dashboard/fees/calendar', label: 'Fee Calendar', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    ]},
  ],
  STUDENT: [
    { title: 'My Portal', items: [
      { href: '/dashboard/student', label: 'My Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { href: '/dashboard/student/profile', label: 'My Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
      { href: '/dashboard/student/id-card', label: 'Digital ID Card', icon: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0' },
    ]},
    { title: 'Attendance', items: [
      { href: '/dashboard/attendance/scan', label: '📷 Scan QR', icon: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z' },
      { href: '/dashboard/student/attendance', label: 'My Attendance', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
      { href: '/dashboard/attendance/calendar', label: 'Calendar', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { href: '/dashboard/attendance/leave', label: 'Leave Request', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
    ]},
    { title: 'Finance', items: [
      { href: '/dashboard/fees/student', label: 'My Fees', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    ]},
    { title: 'More', items: [
      { href: '/dashboard/student/profile',      label: '🗃 Form Vault',      icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8M10 12v4m4-4v4' },
      { href: '/dashboard/student/notifications', label: 'Notifications',     icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
      { href: '/dashboard/custom-dashboard',      label: 'My Dashboard',      icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm6 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm-6 6a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm6 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z' },
    ]},
  ],
  PARENT: [
    { title: 'My Portal', items: [
      { href: '/dashboard/parent', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { href: '/dashboard/fees/student', label: "Child's Fees", icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
      { href: '/dashboard/attendance/leave', label: 'Leave Request', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
      { href: '/dashboard/student/notifications', label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    ]},
  ],
  REGIONAL_MANAGER: [
    { title: 'Main', items: [
      { href: '/dashboard/regional', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { href: '/dashboard/fees/reports', label: 'Reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      { href: '/dashboard/attendance/reports', label: 'Attendance Reports', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    ]},
  ],
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', REGIONAL_MANAGER: 'Regional Manager',
  CENTRE_MANAGER: 'Centre Manager', TEACHER: 'Teacher',
  COUNSELLOR: 'Counsellor', STUDENT: 'Student', PARENT: 'Parent',
}
const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: '#7C3AED', REGIONAL_MANAGER: '#0369A1', CENTRE_MANAGER: '#2563EB',
  TEACHER: '#059669', COUNSELLOR: '#D97706', STUDENT: '#DC2626', PARENT: '#DB2777',
}

function SvgIcon({ path, size = 18 }: { path: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  )
}

function ThemeToggle() {
  const [dark, setDark] = useState(false)
  useEffect(() => { setDark(document.documentElement.classList.contains('dark')) }, [])
  function toggle() {
    const n = !dark; setDark(n)
    document.documentElement.classList.toggle('dark', n)
    localStorage.setItem('imp_theme', n ? 'dark' : 'light')
  }
  return (
    <button onClick={toggle} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {dark
          ? <path d="M12 3v1m0 16v1M4.22 4.22l.707.707m12.728 12.728l.707.707M3 12h1m16 0h1M4.927 19.073l.707-.707M18.366 5.634l.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          : <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        }
      </svg>
    </button>
  )
}

export function DashboardShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen]     = useState(false)
  const { role, name, logout } = useAuthStore()
  const settings = useSettingsStore()
  const pathname = usePathname()
  const router   = useRouter()
  const sections = NAV[role || ''] || []

  // Live brand from settings store — updates instantly when admin changes them
  const brandColour  = settings.get('BRAND_COLOUR', '#2563EB')
  const instituteName = settings.get('INSTITUTE_NAME', 'IMP')

  const roleColor = ROLE_COLORS[role || ''] || brandColour
  const initials  = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  useEffect(() => { setSidebarOpen(false) }, [pathname])

  useEffect(() => {
    if (!notifOpen) return
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!t.closest('#notif-panel') && !t.closest('#notif-btn')) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifOpen])

  const DEMO_NOTIFS: Record<string, { icon: string; title: string; body: string; time: string; unread: boolean }[]> = {
    TEACHER: [
      { icon: '📋', title: 'Session auto-closed', body: 'JEE-2026-A Physics — 42/45 present', time: '2 min ago', unread: true },
      { icon: '⚠️', title: 'Low attendance alert', body: 'Ravi Kumar is below 75% threshold', time: '1 hr ago', unread: true },
      { icon: '✅', title: 'Leave approved', body: 'Your leave request for Jul 10 approved', time: '3 hrs ago', unread: false },
    ],
    STUDENT: [
      { icon: '✅', title: 'Attendance marked', body: 'Physics session attendance confirmed', time: '5 min ago', unread: true },
      { icon: '💰', title: 'Fee reminder', body: 'Installment 2 of ₹8,500 due on Jul 15', time: '2 hrs ago', unread: true },
      { icon: '📅', title: 'Class update', body: 'Chemistry moved to 11 AM tomorrow', time: 'Yesterday', unread: false },
    ],
    PARENT: [
      { icon: '📊', title: 'Attendance update', body: 'Arjun attended 4/5 classes this week', time: '30 min ago', unread: true },
      { icon: '💰', title: 'Fee due soon', body: 'Installment of ₹8,500 due in 3 days', time: '1 day ago', unread: true },
    ],
    SUPER_ADMIN: [
      { icon: '🏫', title: 'New admissions', body: '12 new admissions this month', time: '1 hr ago', unread: true },
      { icon: '⚠️', title: 'Defaulters', body: '3 students below 60% attendance', time: '3 hrs ago', unread: true },
      { icon: '💰', title: 'Collection milestone', body: 'Monthly collection crossed ₹3.8L', time: 'Today', unread: false },
      { icon: '📋', title: 'Report ready', body: 'July attendance report generated', time: 'Yesterday', unread: false },
    ],
    CENTRE_MANAGER: [
      { icon: '👥', title: 'Session started', body: 'Teacher Meera — Physics Room 201', time: '5 min ago', unread: true },
      { icon: '⚠️', title: 'Defaulters alert', body: '5 students below attendance threshold', time: '2 hrs ago', unread: true },
      { icon: '💰', title: 'Payment received', body: '₹12,000 — Rahul Sharma Installment 2', time: '4 hrs ago', unread: false },
    ],
    COUNSELLOR: [
      { icon: '💰', title: 'Dues today', body: '4 students have installments due', time: '1 hr ago', unread: true },
      { icon: '📞', title: 'Follow-up reminder', body: 'Call Priya Singh — overdue since Jul 1', time: '2 hrs ago', unread: true },
    ],
    REGIONAL_MANAGER: [
      { icon: '📊', title: 'Weekly summary', body: 'Delhi region: 83% avg attendance', time: '2 hrs ago', unread: true },
      { icon: '🏆', title: 'Top performer', body: 'Delhi Rohini: 91% attendance rate', time: 'Today', unread: false },
    ],
  }
  const notifs = DEMO_NOTIFS[role || ''] || DEMO_NOTIFS['SUPER_ADMIN']
  const unreadCount = notifs.filter(n => n.unread).length

  function isActive(href: string) {
    if (href === pathname) return true
    const exactRoutes = ['/dashboard/admin','/dashboard/centre','/dashboard/teacher',
      '/dashboard/student','/dashboard/counsellor','/dashboard/regional','/dashboard/parent',
      '/dashboard/attendance/session/new']
    if (exactRoutes.includes(href)) return false
    return pathname.startsWith(href) && href !== '/'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0f1e] flex">

      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR ──────────────────────────────────────────────── */}
      <aside className={`
        fixed top-0 left-0 z-30 h-full w-60 flex flex-col
        bg-white dark:bg-[#0d1426]
        border-r border-gray-100 dark:border-gray-800/60
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
        shadow-xl lg:shadow-none
      `}>
        {/* Logo */}
        <div className="h-14 flex items-center px-4 shrink-0 border-b border-gray-100 dark:border-gray-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0"
              style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}>I</div>
            <div>
              <p className="text-sm font-black text-gray-900 dark:text-white tracking-tight leading-none">{instituteName.slice(0,10)}</p>
              <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold tracking-[0.15em] uppercase leading-none mt-0.5">Platform</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">Live</span>
          </div>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {sections.map(section => (
            <div key={section.title}>
              <p className="text-[9px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest px-2 mb-1">{section.title}</p>
              {section.items.map(item => {
                const active = isActive(item.href)
                return (
                  <Link key={item.href} href={item.href}
                    className={`
                      flex items-center gap-2.5 px-2.5 py-2 rounded-xl mb-0.5 text-xs font-medium transition-all duration-150 group
                      ${active
                        ? 'text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                      }
                    `}
                    style={active ? { background: `linear-gradient(135deg, ${roleColor}ee, ${roleColor}cc)` } : {}}>
                    <span className={`shrink-0 transition-colors ${active ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
                      <SvgIcon path={item.icon} size={15} />
                    </span>
                    <span className="truncate flex-1">{item.label}</span>
                    {item.badge && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${active ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'}`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}

          {/* Sign out */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800/60">
            <p className="text-[9px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest px-2 mb-1">Account</p>
            <button onClick={() => { logout(); router.push('/auth/login') }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-gray-500 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </nav>

        {/* User card */}
        <div className="p-2 border-t border-gray-100 dark:border-gray-800/60 shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0"
              style={{ background: roleColor }}>{initials}</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{name || 'User'}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-500 truncate">{ROLE_LABELS[role || ''] || role}</p>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
          </div>
        </div>
      </aside>

      {/* ── MAIN ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 bg-white dark:bg-[#0d1426] border-b border-gray-100 dark:border-gray-800/60 flex items-center px-4 gap-3 shrink-0">
          <button onClick={() => setSidebarOpen(o => !o)}
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {title && <h1 className="hidden sm:block text-sm font-bold text-gray-900 dark:text-white">{title}</h1>}

          <div className="hidden lg:flex items-center gap-2 text-xs text-gray-400">
            <span className="font-medium text-gray-600 dark:text-gray-300">IMP</span>
            <span>/</span>
            <span className="text-gray-500 dark:text-gray-400 capitalize">
              {pathname.split('/').filter(Boolean).slice(-1)[0]?.replace(/-/g, ' ') || 'Dashboard'}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            {/* Notification bell */}
            <div className="relative">
              <button id="notif-btn" onClick={() => setNotifOpen(o => !o)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all relative">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div id="notif-panel"
                  className="absolute right-0 top-10 w-76 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 z-50 overflow-hidden"
                  style={{ width: 300 }}>
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">Notifications</span>
                      {unreadCount > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">{unreadCount} new</span>}
                    </div>
                    <button onClick={() => setNotifOpen(false)} className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline">
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
                    {notifs.map((n, i) => (
                      <div key={i} className={`px-4 py-3 flex gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 ${n.unread ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}`}>
                        <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm shrink-0">{n.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">{n.title}</p>
                            {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1" />}
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{n.body}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 text-center">
                    <button onClick={() => { setNotifOpen(false); router.push('/dashboard/student/notifications') }}
                      className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline">
                      View all →
                    </button>
                  </div>
                </div>
              )}
            </div>

            <ThemeToggle />

            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black"
              style={{ background: roleColor }}>{initials}</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
