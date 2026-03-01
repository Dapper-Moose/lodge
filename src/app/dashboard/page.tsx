'use client'

import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

export default function DashboardPage() {
  const router = useRouter()

  return (
    <AppLayout>

      {/* Top bar */}
      <div style={{
        height: 56, background: 'white', borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600, fontSize: 15, color: '#1a1a2e' }}>Dashboard</span>
        <span style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>
          {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 32px' }}>
        <div style={{ maxWidth: 900 }}>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Active Projects', value: '0' },
              { label: 'Open Tasks',      value: '0' },
              { label: 'Hours This Week', value: '0h' },
              { label: 'Team Members',    value: '1' },
            ].map(stat => (
              <div key={stat.label} style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '20px 20px' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, fontWeight: 500 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Getting started */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24, marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e', marginBottom: 4 }}>Getting started</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 20 }}>Complete these steps to set up your workspace</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Create your workspace',     done: true  },
                { label: 'Invite your team members',  done: false },
                { label: 'Add your first client',     done: false },
                { label: 'Create your first project', done: false },
                { label: 'Log your first time entry', done: false },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    border: item.done ? '2px solid #5046e5' : '2px solid #d1d5db',
                    background: item.done ? '#5046e5' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {item.done && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: 13, color: item.done ? '#9ca3af' : '#374151', textDecoration: item.done ? 'line-through' : 'none' }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent projects */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e', marginBottom: 16 }}>Recent Projects</div>
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>◫</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>No projects yet</div>
              <button
                onClick={() => router.push('/projects')}
                style={{ background: '#5046e5', color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Create your first project
              </button>
            </div>
          </div>

        </div>
      </div>

    </AppLayout>
  )
}