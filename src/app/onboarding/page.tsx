'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [workspaceName, setWorkspaceName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const slug = generateSlug(workspaceName)

    // Check if slug already exists
    const { data: existing } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      setError('That workspace name is already taken. Try another.')
      setLoading(false)
      return
    }

    // Create the workspace
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .insert({ name: workspaceName, slug })
      .select()
      .single()

    if (wsError) {
      setError(`Workspace error: ${wsError.message}`)
      setLoading(false)
      return
    }

    // Add the creator as Owner
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner'
      })

    if (memberError) {
      setError(`Member error: ${memberError.message}`)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f7f9]">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#5046e5] text-white font-bold text-xl mb-4">
            L
          </div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Name your workspace</h1>
          <p className="text-sm text-gray-500 mt-1">This is usually your agency's name</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleCreate} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Workspace name
              </label>
              <input
                type="text"
                required
                value={workspaceName}
                onChange={e => setWorkspaceName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#5046e5] focus:border-transparent transition"
                placeholder="Apex Creative"
              />
              {workspaceName && (
                <p className="text-xs text-gray-400 mt-1.5">
                  Your URL: lodge.app/<span className="font-mono">{generateSlug(workspaceName)}</span>
                </p>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !workspaceName.trim()}
              className="w-full bg-[#5046e5] hover:bg-[#4338ca] text-white font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating workspace…' : 'Create workspace'}
            </button>

          </form>
        </div>

      </div>
    </div>
  )
}