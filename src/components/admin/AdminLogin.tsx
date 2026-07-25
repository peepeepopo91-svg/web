import { useState } from 'react'
import { validateAdminCredentials } from '../../server/adminAuth'
import type { AdminSession } from '../../store/adminStore'

interface Props {
  onLogin: (session: AdminSession) => void
}

export function AdminLogin({ onLogin }: Props) {
  const [username,  setUsername]  = useState('')
  const [password1, setPassword1] = useState('')
  const [password2, setPassword2] = useState('')
  const [show1, setShow1] = useState(false)
  const [show2, setShow2] = useState(false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username || !password1 || !password2) {
      setError('All three fields are required.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const result = await validateAdminCredentials({ data: { username, password1, password2 } })
      if (!result?.valid) {
        setError((result as any)?.error ?? 'Invalid credentials')
      } else {
        onLogin({ username: result.username, loginAt: result.loginAt, token: result.token })
      }
    } catch {
      setError('Authentication service unavailable')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[500px] rounded-full bg-[#0066FF]/8 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 items-center justify-center text-3xl mb-4 shadow-[0_0_30px_rgba(0,191,255,0.1)]">
            🛡️
          </div>
          <h1 className="font-['Space_Grotesk'] font-black text-2xl text-white mb-1">
            Admin Panel
          </h1>
          <p className="text-gray-600 text-sm">Blue Tiers Management System</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="glass rounded-2xl border border-white/8 p-7 space-y-4">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Admin username"
              autoComplete="username"
              className="w-full bg-white/3 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all placeholder-gray-700"
            />
          </div>

          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">
              Password 1
            </label>
            <div className="relative">
              <input
                type={show1 ? 'text' : 'password'}
                value={password1}
                onChange={e => setPassword1(e.target.value)}
                placeholder="First password"
                autoComplete="current-password"
                className="w-full bg-white/3 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/50 rounded-xl px-4 py-3 pr-10 text-white text-sm outline-none transition-all placeholder-gray-700"
              />
              <button type="button" onClick={() => setShow1(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 text-xs">
                {show1 ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">
              Password 2
            </label>
            <div className="relative">
              <input
                type={show2 ? 'text' : 'password'}
                value={password2}
                onChange={e => setPassword2(e.target.value)}
                placeholder="Second password"
                autoComplete="current-password"
                className="w-full bg-white/3 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/50 rounded-xl px-4 py-3 pr-10 text-white text-sm outline-none transition-all placeholder-gray-700"
              />
              <button type="button" onClick={() => setShow2(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 text-xs">
                {show2 ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              ⚠ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Authenticating…
              </span>
            ) : (
              'Access Admin Panel'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
