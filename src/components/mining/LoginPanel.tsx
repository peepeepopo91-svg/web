import { useState, useEffect } from 'react'
import { useMining } from '../../context/MiningContext'
import { getMiningAccessConfig } from '../../server/miningServer'
import type { MiningAccessConfig } from '../../server/miningServer'

const DEFAULT_CONFIG: MiningAccessConfig = {
  buttonLabel:        'New player? How to get access',
  sectionTitle:       'How to get your mining credentials',
  steps: [
    'Join the Blue Network Discord using the button below.',
    'Head to the #mining section of the server.',
    'Open a request-credential ticket — a staff member will create your account.',
  ],
  discordUrl:         'https://discord.gg/DmEPAb3NFU',
  discordButtonLabel: 'Join Discord to Request Access',
}

export function LoginPanel() {
  const { login } = useMining()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showNewUser, setShowNewUser] = useState(false)
  const [config, setConfig]     = useState<MiningAccessConfig>(DEFAULT_CONFIG)

  useEffect(() => {
    getMiningAccessConfig()
      .then(cfg => setConfig(cfg))
      .catch(() => { /* keep defaults */ })
  }, [])

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(username, password)
    if (result.error) setError(result.error)
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-md">
        {/* Glow orb */}
        <div className="absolute left-1/2 -translate-x-1/2 w-72 h-72 bg-[#0066FF]/15 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative glass rounded-2xl border border-white/8 p-8 shadow-2xl shadow-black/60">
          {/* Icon */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6 mx-auto"
            style={{ background: 'linear-gradient(135deg,#0099FF22,#0066FF33)', boxShadow: '0 0 30px rgba(0,102,255,0.2)' }}
          >
            ⛏️
          </div>

          <h2 className="font-['Space_Grotesk'] font-black text-2xl text-white text-center mb-1">
            BlueCoin <span className="text-gradient">Mining</span>
          </h2>
          <p className="text-gray-500 text-sm text-center mb-8">
            Enter your credentials to access the mining network
          </p>

          <form onSubmit={handle} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError('') }}
                placeholder="Your username"
                autoComplete="username"
                autoFocus
                className="w-full bg-white/3 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none transition-all duration-200 text-sm"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="Your password"
                  autoComplete="current-password"
                  className="w-full bg-white/3 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/50 rounded-xl px-4 py-3 pr-11 text-white placeholder-gray-600 outline-none transition-all duration-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors text-sm"
                  tabIndex={-1}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-400 text-xs font-medium flex items-center gap-1 -mt-1">
                <span>⚠</span> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!username.trim() || !password || loading}
              className="btn-primary w-full py-3 rounded-xl font-semibold text-sm text-white transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none relative overflow-hidden"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying…
                </span>
              ) : (
                'Enter Mining Network →'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 pt-5 border-t border-white/5 space-y-3">
            {[
              '🔒 Access is restricted to authorised accounts',
              '🔄 Your mining progress is saved automatically',
            ].map(txt => (
              <p key={txt} className="text-gray-600 text-xs flex items-start gap-2">{txt}</p>
            ))}

            {/* New User button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowNewUser(v => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15 text-gray-400 hover:text-gray-200 text-xs font-semibold transition-all duration-200"
              >
                <span className="flex items-center gap-2">
                  <span>🆕</span> {config.buttonLabel}
                </span>
                <span className="text-gray-600 text-[10px]">{showNewUser ? '▲' : '▼'}</span>
              </button>

              {showNewUser && (
                <div className="mt-2 p-4 rounded-xl border border-[#5865F2]/20 bg-[#5865F2]/5 space-y-3">
                  <p className="text-gray-300 text-xs font-semibold flex items-center gap-1.5">
                    <span>💬</span> {config.sectionTitle}
                  </p>
                  <ol className="space-y-1.5 text-gray-500 text-xs">
                    {config.steps.map((step, i) => (
                      <li key={i} className="flex gap-2 leading-relaxed">
                        <span className="text-[#5865F2] font-bold shrink-0 mt-px">{i + 1}.</span>
                        <span dangerouslySetInnerHTML={{ __html: step }} />
                      </li>
                    ))}
                  </ol>
                  {config.discordUrl && (
                    <a
                      href={config.discordUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="discord-btn flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all duration-300 hover:scale-[1.02] mt-1"
                    >
                      {/* Discord logo SVG */}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                      </svg>
                      {config.discordButtonLabel}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
