// ─── Publish Manager — Grand Edition ─────────────────────────────────────────
// Beginner-friendly SEO hub. Plain English. Guides. Boosters. Everything.

import { useState, useEffect } from 'react'
import { getSiteContent, saveSiteContent } from '../../store/contentStore'
import { addLog } from '../../store/adminStore'
import {
  savePublishConfig,
  generateSitemap,
  saveRobotsTxt,
  loadRobotsTxt,
  loadSitemapXml,
} from '../../server/publishServer'

interface Props { admin: string }

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',  icon: '🏠', label: 'Overview'         },
  { id: 'guide',     icon: '📖', label: 'Google Guide'     },
  { id: 'booster',   icon: '🚀', label: 'SEO Booster'      },
  { id: 'meta',      icon: '🏷️', label: 'Meta Tags'        },
  { id: 'social',    icon: '👁️', label: 'Social Preview'   },
  { id: 'google',    icon: '🔍', label: 'Google Tools'     },
  { id: 'sitemap',   icon: '🗺️', label: 'Sitemap'          },
  { id: 'robots',    icon: '🤖', label: 'Robots.txt'       },
  { id: 'schema',    icon: '📐', label: 'Rich Results'     },
  { id: 'backlinks', icon: '🔗', label: 'Backlinks'        },
  { id: 'checklist', icon: '✅', label: 'SEO Checklist'    },
]

// ─── Config builder ───────────────────────────────────────────────────────────

function buildCfg() {
  const c = getSiteContent()
  return {
    seoTitle:           c.seoTitle           ?? '',
    seoDescription:     c.seoDescription     ?? '',
    seoKeywords:        c.seoKeywords        ?? '',
    ogImageUrl:         c.ogImageUrl         ?? '',
    canonicalUrl:       c.canonicalUrl       ?? '',
    ga4Id:              c.ga4Id              ?? '',
    gscVerificationTag: c.gscVerificationTag ?? '',
    discordLink:        c.discordLink        ?? '',
    twitterLink:        c.twitterLink        ?? '',
    youtubeLink:        c.youtubeLink        ?? '',
    twitchLink:         c.twitchLink         ?? '',
  }
}

type Cfg = ReturnType<typeof buildCfg>

// ─── SEO Score ────────────────────────────────────────────────────────────────

interface ScoreItem { label: string; pts: number; pass: boolean; tip?: string }

function calcScore(cfg: Cfg & { sitemapDone: boolean }): { score: number; items: ScoreItem[] } {
  const items: ScoreItem[] = []
  let score = 0

  if (cfg.seoTitle) {
    const len = cfg.seoTitle.length
    const opt = len >= 50 && len <= 60
    score += opt ? 20 : 10
    items.push({ label: opt ? 'Title length is perfect (50–60 characters)' : 'Title set but a bit short or long', pts: opt ? 20 : 10, pass: true, tip: 'Aim for 50–60 characters.' })
  } else {
    items.push({ label: 'No page title — Google needs this', pts: 20, pass: false, tip: 'Go to Meta Tags and add a title.' })
  }

  if (cfg.seoDescription) {
    const len = cfg.seoDescription.length
    const opt = len >= 150 && len <= 160
    score += opt ? 20 : 10
    items.push({ label: opt ? 'Description is perfect length' : 'Description set but not ideal length', pts: opt ? 20 : 10, pass: true, tip: 'Aim for 150–160 characters.' })
  } else {
    items.push({ label: 'No description — this is the text shown on Google', pts: 20, pass: false, tip: 'Go to Meta Tags and write a short description.' })
  }

  if (cfg.seoKeywords) { score += 5; items.push({ label: 'Keywords added', pts: 5, pass: true }) }
  else { items.push({ label: 'No keywords set', pts: 5, pass: false, tip: 'Add comma-separated keywords in Meta Tags.' }) }

  if (cfg.ogImageUrl) { score += 15; items.push({ label: 'Social sharing image set', pts: 15, pass: true }) }
  else { items.push({ label: 'No social image — your links look blank when shared', pts: 15, pass: false, tip: 'Add an image URL in Meta Tags.' }) }

  if (cfg.canonicalUrl) { score += 10; items.push({ label: 'Your website address (URL) is set', pts: 10, pass: true }) }
  else { items.push({ label: 'No website URL set', pts: 10, pass: false, tip: 'Enter your live domain in Meta Tags.' }) }

  if (cfg.ga4Id) { score += 10; items.push({ label: 'Google Analytics connected — tracking visitors', pts: 10, pass: true }) }
  else { items.push({ label: 'No visitor tracking set up', pts: 10, pass: false, tip: 'Connect Google Analytics in Google Tools tab.' }) }

  if (cfg.gscVerificationTag) { score += 10; items.push({ label: 'Google Search Console verified', pts: 10, pass: true }) }
  else { items.push({ label: 'Not verified with Google Search Console yet', pts: 10, pass: false, tip: 'See the Google Tools tab.' }) }

  if (cfg.sitemapDone) { score += 10; items.push({ label: 'Sitemap created — Google knows all your pages', pts: 10, pass: true }) }
  else { items.push({ label: 'No sitemap — Google might miss some of your pages', pts: 10, pass: false, tip: 'Go to the Sitemap tab and click Generate.' }) }

  return { score, items }
}

// ─── Reusable UI ──────────────────────────────────────────────────────────────

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4500); return () => clearTimeout(t) }, [onClose])
  const c = { success: 'bg-green-500/15 border-green-500/30 text-green-400', error: 'bg-red-500/15 border-red-500/30 text-red-400', info: 'bg-[#00BFFF]/10 border-[#00BFFF]/25 text-[#00BFFF]' }[type]
  const icons = { success: '✓', error: '⚠', info: 'ℹ' }
  return (
    <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-2xl border flex items-center gap-2 ${c}`}>
      <span>{icons[type]}</span> {msg}
    </div>
  )
}

function Field({ label, desc, help, value, onChange, placeholder, multiline, maxLength, mono = false, badge }: {
  label: string; desc?: string; help?: string; value: string; onChange: (v: string) => void
  placeholder?: string; multiline?: boolean; maxLength?: number; mono?: boolean; badge?: string
}) {
  const [showHelp, setShowHelp] = useState(false)
  const cls = `w-full bg-white/3 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/40 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all placeholder-gray-700 ${mono ? 'font-mono text-xs' : ''}`
  const warn = maxLength ? value.length > maxLength * 0.9 : false
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-white text-sm font-semibold flex items-center gap-2">
          {label}
          {badge && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#00BFFF]/15 text-[#00BFFF] uppercase tracking-wider">{badge}</span>}
          {help && (
            <button onClick={() => setShowHelp(s => !s)} className="w-4 h-4 rounded-full bg-white/10 text-gray-500 hover:text-white text-[9px] font-black flex items-center justify-center transition-all">?</button>
          )}
        </label>
        {maxLength && <span className={`text-[10px] ${warn ? 'text-orange-400' : 'text-gray-600'}`}>{value.length}/{maxLength}</span>}
      </div>
      {desc && <p className="text-gray-500 text-xs mb-2">{desc}</p>}
      {showHelp && help && (
        <div className="mb-2 p-3 rounded-xl bg-[#00BFFF]/5 border border-[#00BFFF]/20 text-[11px] text-[#00BFFF]/80 leading-relaxed">
          💡 {help}
        </div>
      )}
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} rows={3} className={cls + ' resize-none'} />
        : <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} className={cls} />
      }
    </div>
  )
}

function InfoBox({ icon = 'ℹ️', color = 'blue', children }: { icon?: string; color?: 'blue' | 'green' | 'orange' | 'purple' | 'yellow'; children: React.ReactNode }) {
  const colors = {
    blue:   'bg-blue-500/5 border-blue-500/20 text-blue-300/80',
    green:  'bg-green-500/5 border-green-500/20 text-green-300/80',
    orange: 'bg-orange-500/5 border-orange-500/20 text-orange-300/80',
    purple: 'bg-purple-500/5 border-purple-500/20 text-purple-300/80',
    yellow: 'bg-yellow-500/5 border-yellow-500/20 text-yellow-300/80',
  }
  return (
    <div className={`p-4 rounded-2xl border flex gap-3 text-[12px] leading-relaxed ${colors[color]}`}>
      <span className="text-base shrink-0 mt-0.5">{icon}</span>
      <div>{children}</div>
    </div>
  )
}

function StepCard({ n, title, desc, done, link, linkLabel }: { n: number; title: string; desc: string; done?: boolean; link?: string; linkLabel?: string }) {
  return (
    <div className={`relative flex gap-4 p-4 rounded-2xl border transition-all ${done ? 'bg-green-500/5 border-green-500/20' : 'bg-white/2 border-white/8'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${done ? 'bg-green-500 text-white' : 'bg-white/8 text-gray-400'}`}>
        {done ? '✓' : n}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm ${done ? 'text-green-400' : 'text-white'}`}>{title}</p>
        <p className="text-gray-500 text-xs mt-1 leading-relaxed">{desc}</p>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#00BFFF]/10 text-[#00BFFF] border border-[#00BFFF]/20 hover:bg-[#00BFFF]/20 transition-all">
            {linkLabel || 'Open ↗'}
          </a>
        )}
      </div>
    </div>
  )
}

function ScoreGauge({ score }: { score: number }) {
  const r = 70; const circ = 2 * Math.PI * r
  const pct = score / 100
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444'
  const label = score >= 80 ? 'Excellent!' : score >= 60 ? 'Looking Good' : score >= 40 ? 'Needs Work' : 'Just Starting'
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-44 h-44">
        <svg className="w-full h-full -rotate-[135deg]" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14"
            strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeLinecap="round" />
          <circle cx="90" cy="90" r={r} fill="none" stroke={color} strokeWidth="14"
            strokeDasharray={`${circ * 0.75 * pct} ${circ * (1 - 0.75 * pct)}`}
            strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${color}80)`, transition: 'stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black" style={{ color }}>{score}</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">/ 100</span>
        </div>
      </div>
      <div className="text-center">
        <span className="text-sm font-bold" style={{ color }}>{label}</span>
        <p className="text-gray-600 text-[10px] mt-0.5">Your Google Readiness Score</p>
      </div>
    </div>
  )
}

function SaveBtn({ onClick, saving, label = '💾 Save Changes' }: { onClick: () => void; saving: boolean; label?: string }) {
  return (
    <button onClick={onClick} disabled={saving}
      className="w-full py-3.5 rounded-xl font-bold text-sm bg-[#00BFFF] text-black hover:bg-[#00BFFF]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(0,191,255,0.2)] active:scale-[0.98]">
      {saving ? '⟳ Saving…' : label}
    </button>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ cfg, sitemapDone, setTab }: { cfg: Cfg; sitemapDone: boolean; setTab: (t: string) => void }) {
  const { score, items } = calcScore({ ...cfg, sitemapDone })
  const passing = items.filter(i => i.pass).length
  const failing  = items.filter(i => !i.pass)

  const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444'

  return (
    <div className="space-y-6">
      {/* Hero welcome */}
      <div className="bg-gradient-to-br from-[#00BFFF]/8 via-white/2 to-white/1 border border-[#00BFFF]/15 rounded-2xl p-6">
        <h2 className="text-white font-black text-xl mb-1">Welcome to the Publish Hub 🚀</h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          This section helps you get Blue Tiers on Google's first page — even if you've never done SEO before.
          Everything is explained in plain English with step-by-step guides. Just follow the tabs from left to right!
        </p>
      </div>

      {/* Score + stats */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <ScoreGauge score={score} />
          <div className="flex-1 w-full space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-500/5 border border-green-500/15 rounded-xl p-3 text-center">
                <p className="text-green-400 font-black text-2xl">{passing}</p>
                <p className="text-gray-500 text-[10px] mt-0.5">Things Done ✓</p>
              </div>
              <div className="bg-orange-500/5 border border-orange-500/15 rounded-xl p-3 text-center">
                <p className="text-orange-400 font-black text-2xl">{failing.length}</p>
                <p className="text-gray-500 text-[10px] mt-0.5">To Fix ⚠</p>
              </div>
            </div>
            <div className="space-y-2">
              {items.slice(0, 4).map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`text-xs shrink-0 ${item.pass ? 'text-green-400' : 'text-red-400/60'}`}>{item.pass ? '✓' : '✗'}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: item.pass ? '100%' : '0%', background: item.pass ? '#22c55e' : 'transparent', transition: 'width 0.8s ease' }} />
                  </div>
                  <span className="text-gray-600 text-[10px] w-36 text-right truncate">{item.label}</span>
                </div>
              ))}
              {items.length > 4 && <p className="text-gray-700 text-[10px] text-center">+{items.length - 4} more checks in SEO Checklist tab</p>}
            </div>
          </div>
        </div>
      </div>

      {/* What to do next */}
      {failing.length > 0 && (
        <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-3">
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-[10px] text-orange-400">!</span>
            Fix These First — They Matter Most
          </h3>
          <p className="text-gray-500 text-xs">These are the things holding your Google ranking back. Click any tab to fix them.</p>
          <div className="space-y-2">
            {failing.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                <span className="text-red-400/60 mt-0.5 shrink-0 text-xs">✗</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-semibold">{item.label}</p>
                  {item.tip && <p className="text-gray-500 text-[10px] mt-0.5">👉 {item.tip}</p>}
                </div>
                <span className="text-gray-700 text-[10px] shrink-0">−{item.pts}pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Your roadmap */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-3">
        <h3 className="text-white font-bold text-sm">Your Roadmap to Google's First Page</h3>
        <p className="text-gray-500 text-xs">Follow these in order. Each one moves you higher.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { icon: '📖', title: 'Read the Guide',        desc: 'Understand how Google works in 5 minutes',       tab: 'guide',     color: '#8b5cf6' },
            { icon: '🏷️', title: 'Set Your Meta Tags',    desc: 'The title + description Google shows people',    tab: 'meta',      color: '#00BFFF' },
            { icon: '🔍', title: 'Connect Google Tools',  desc: 'Analytics + Search Console — essential',          tab: 'google',    color: '#f59e0b' },
            { icon: '🗺️', title: 'Generate Sitemap',      desc: 'Tell Google about all your pages',               tab: 'sitemap',   color: '#22c55e' },
            { icon: '🚀', title: 'Use the SEO Booster',   desc: 'Keywords, content ideas, quick wins',            tab: 'booster',   color: '#f97316' },
            { icon: '🔗', title: 'Build Backlinks',       desc: 'Get other sites to mention you',                  tab: 'backlinks', color: '#ec4899' },
          ].map(a => (
            <button key={a.tab} onClick={() => setTab(a.tab)}
              className="text-left p-4 rounded-2xl border border-white/8 bg-white/2 hover:bg-white/4 hover:border-white/15 transition-all group active:scale-[0.98]">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3" style={{ background: `${a.color}18`, border: `1px solid ${a.color}30` }}>{a.icon}</div>
              <p className="text-white font-bold text-sm">{a.title}</p>
              <p className="text-gray-500 text-[10px] mt-1">{a.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Quick status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: '📊', label: 'Analytics',    value: cfg.ga4Id ? '● Active' : '✗ Not set',    ok: !!cfg.ga4Id },
          { icon: '🗺️', label: 'Sitemap',      value: sitemapDone ? '● Live' : '✗ Not made',  ok: sitemapDone },
          { icon: '🏷️', label: 'Meta Title',   value: cfg.seoTitle ? '● Set' : '✗ Missing',   ok: !!cfg.seoTitle },
          { icon: '🔗', label: 'Search Console', value: cfg.gscVerificationTag ? '● Linked' : '✗ Not linked', ok: !!cfg.gscVerificationTag },
        ].map(s => (
          <div key={s.label} className={`p-3 rounded-xl border text-center ${s.ok ? 'bg-green-500/5 border-green-500/15' : 'bg-white/2 border-white/8'}`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className="text-gray-500 text-[9px] uppercase tracking-wider">{s.label}</p>
            <p className={`font-bold text-[11px] mt-0.5 ${s.ok ? 'text-green-400' : 'text-gray-600'}`}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Google Guide Tab ─────────────────────────────────────────────────────────

function GoogleGuideTab({ cfg, sitemapDone, setTab }: { cfg: Cfg; sitemapDone: boolean; setTab: (t: string) => void }) {
  const [open, setOpen] = useState<number | null>(0)

  const hasUrl  = !!cfg.canonicalUrl
  const hasMeta = !!cfg.seoTitle && !!cfg.seoDescription
  const hasGSC  = !!cfg.gscVerificationTag
  const hasGA4  = !!cfg.ga4Id

  const sections = [
    {
      icon: '🤔',
      title: 'How does Google actually work?',
      content: (
        <div className="space-y-3 text-gray-400 text-sm leading-relaxed">
          <p>Think of Google like a giant librarian. Every day it sends little robots (called "crawlers" or "bots") around the entire internet to read every website. Then it stores all that information in a massive database called an "index".</p>
          <p>When someone types "minecraft pvp tier list" into Google, it searches its index and shows the websites it thinks are most useful. The better your site looks to Google, the higher up you appear.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            {[
              { icon: '🕷️', title: 'Step 1: Google finds you', desc: 'Its robots visit your site and read it' },
              { icon: '📚', title: 'Step 2: Google indexes you', desc: 'It adds your pages to its database' },
              { icon: '🏆', title: 'Step 3: You appear in results', desc: 'When someone searches, you show up' },
            ].map(s => (
              <div key={s.title} className="bg-white/3 border border-white/8 rounded-xl p-3 text-center">
                <div className="text-2xl mb-2">{s.icon}</div>
                <p className="text-white font-bold text-xs">{s.title}</p>
                <p className="text-gray-600 text-[10px] mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      icon: '🌐',
      title: 'Step 1 — Publish your site (get a real web address)',
      done: hasUrl,
      content: (
        <div className="space-y-3">
          <p className="text-gray-400 text-sm leading-relaxed">
            Right now your site probably has a temporary address like <code className="bg-white/10 px-1 rounded text-[#00BFFF]">something.replit.dev</code>. For Google to take you seriously, you need a proper domain like <code className="bg-white/10 px-1 rounded text-white">bluetiers.com</code>.
          </p>
          <InfoBox icon="💡" color="blue">
            <strong className="text-white">A domain is your website's permanent home address.</strong> Google trusts sites with real domains more than temporary ones. A <code>.com</code> or <code>.gg</code> domain costs about $10–15 per year.
          </InfoBox>
          <div className="space-y-2">
            <p className="text-white text-xs font-bold">Where to get a domain:</p>
            {[
              { name: 'Namecheap', url: 'https://namecheap.com', desc: 'Cheap and easy — great for beginners', icon: '🟢' },
              { name: 'Cloudflare', url: 'https://cloudflare.com', desc: 'Fast + free privacy protection included', icon: '🟠' },
              { name: 'Google Domains', url: 'https://domains.google', desc: 'Simple, integrates with Google tools', icon: '🔵' },
            ].map(d => (
              <a key={d.name} href={d.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/8 hover:bg-white/5 transition-all group">
                <span className="text-lg">{d.icon}</span>
                <div className="flex-1">
                  <p className="text-white font-semibold text-xs">{d.name}</p>
                  <p className="text-gray-600 text-[10px]">{d.desc}</p>
                </div>
                <span className="text-gray-600 group-hover:text-[#00BFFF] text-xs transition-all">↗</span>
              </a>
            ))}
          </div>
          <div className="p-3 rounded-xl bg-white/2 border border-white/8">
            <p className="text-white text-xs font-bold mb-1">After you get a domain:</p>
            <ol className="space-y-1 text-gray-500 text-[11px]">
              <li>1. Point the domain to your Replit app (Replit Deployments has a "Custom Domain" option)</li>
              <li>2. Copy your new domain (e.g. <code className="text-gray-300">bluetiers.gg</code>) into Meta Tags → Canonical URL</li>
              <li>3. Come back here and set it in the Canonical URL field</li>
            </ol>
          </div>
          {hasUrl && (
            <div className="p-3 rounded-xl bg-green-500/8 border border-green-500/20 text-green-400 text-xs font-semibold flex items-center gap-2">
              ✓ Your URL is set: {cfg.canonicalUrl}
            </div>
          )}
        </div>
      ),
    },
    {
      icon: '🏷️',
      title: 'Step 2 — Tell Google what your site is about (Meta Tags)',
      done: hasMeta,
      content: (
        <div className="space-y-3">
          <p className="text-gray-400 text-sm leading-relaxed">
            Meta tags are invisible text that describe your site to Google. Think of it like a business card — Google reads it to understand what your site is and what searches it should show up for.
          </p>
          <InfoBox icon="🎯" color="purple">
            <strong className="text-white">The most important two things:</strong>
            <br />• <strong>Title:</strong> The blue headline that appears in Google results. Make it catchy and include keywords like "Minecraft PvP Tier List".
            <br />• <strong>Description:</strong> The small text under the title. This convinces people to click on your site.
          </InfoBox>
          <div className="bg-white rounded-xl p-4 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-[#00BFFF] flex items-center justify-center text-[7px] text-black font-black">B</div>
              <p className="text-[#4d5156] text-[10px]">{cfg.canonicalUrl || 'https://bluetiers.gg'}</p>
            </div>
            <p className="text-[#1a0dab] text-base font-normal leading-snug">
              {cfg.seoTitle || 'Blue Tiers — #1 Minecraft PvP Tier List (EXAMPLE TITLE)'}
            </p>
            <p className="text-[#4d5156] text-xs leading-relaxed">
              {cfg.seoDescription || 'This is where your description appears. Go to Meta Tags and fill it in to see it here!'}
            </p>
          </div>
          <p className="text-gray-600 text-[10px]">☝️ This is exactly how your site appears in Google search results</p>
          {hasMeta ? (
            <div className="p-3 rounded-xl bg-green-500/8 border border-green-500/20 text-green-400 text-xs font-semibold">✓ Meta tags are set!</div>
          ) : (
            <button onClick={() => setTab('meta')} className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#00BFFF]/10 text-[#00BFFF] border border-[#00BFFF]/20 hover:bg-[#00BFFF]/20 transition-all">
              Go to Meta Tags →
            </button>
          )}
        </div>
      ),
    },
    {
      icon: '🔎',
      title: 'Step 3 — Register with Google Search Console (free)',
      done: hasGSC,
      content: (
        <div className="space-y-3">
          <p className="text-gray-400 text-sm leading-relaxed">
            Google Search Console (GSC) is like a "control panel" for your site on Google. It's 100% free. Once you register, Google officially knows your site exists and you can see exactly what searches people use to find you.
          </p>
          <InfoBox icon="🎁" color="green">
            <strong className="text-white">Why this is a big deal:</strong> Without GSC, you're invisible to Google. With it, Google actively crawls your site and you get data on exactly how many people searched for you and what they typed.
          </InfoBox>
          <div className="space-y-2">
            <p className="text-white text-xs font-bold">How to set it up (takes 5 minutes):</p>
            {[
              { n: 1, step: 'Go to Google Search Console', url: 'https://search.google.com/search-console/', action: 'Open GSC →' },
              { n: 2, step: 'Click "Add property" → enter your website address (e.g. https://bluetiers.gg)', url: null },
              { n: 3, step: 'Choose "HTML tag" as the verification method', url: null },
              { n: 4, step: 'Copy the long code that appears (just the part inside content="...")', url: null },
              { n: 5, step: 'Go to the Google Tools tab here and paste it into "Verification Tag" → Save', url: null },
              { n: 6, step: 'Come back to GSC and click "Verify" — you\'re done!', url: null },
            ].map(s => (
              <div key={s.n} className="flex items-start gap-3 p-3 rounded-xl bg-white/2 border border-white/6">
                <div className="w-6 h-6 rounded-full bg-[#00BFFF]/15 border border-[#00BFFF]/25 flex items-center justify-center text-[#00BFFF] text-[10px] font-black shrink-0 mt-0.5">{s.n}</div>
                <p className="text-gray-400 text-[11px] leading-relaxed flex-1">{s.step}</p>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer"
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-[#00BFFF]/10 text-[#00BFFF] border border-[#00BFFF]/20 hover:bg-[#00BFFF]/20 transition-all shrink-0">
                    {s.action}
                  </a>
                )}
              </div>
            ))}
          </div>
          {hasGSC ? (
            <div className="p-3 rounded-xl bg-green-500/8 border border-green-500/20 text-green-400 text-xs font-semibold">✓ Search Console is linked!</div>
          ) : (
            <button onClick={() => setTab('google')} className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#00BFFF]/10 text-[#00BFFF] border border-[#00BFFF]/20 hover:bg-[#00BFFF]/20 transition-all">
              Go to Google Tools →
            </button>
          )}
        </div>
      ),
    },
    {
      icon: '🗺️',
      title: 'Step 4 — Create and submit a sitemap',
      done: sitemapDone,
      content: (
        <div className="space-y-3">
          <p className="text-gray-400 text-sm leading-relaxed">
            A sitemap is like a table of contents for your website. You give it to Google and it knows exactly which pages exist and how important they are. Without it, Google has to figure out your pages by itself (and might miss some).
          </p>
          <InfoBox icon="📋" color="orange">
            <strong className="text-white">Example:</strong> Your sitemap tells Google: "Hey, I have a Home page, a Rankings page, a Tournament page..." — Google then goes and reads all of them.
          </InfoBox>
          <div className="space-y-2 text-[11px] text-gray-500">
            <p>1. Go to the Sitemap tab → click "Generate Sitemap"</p>
            <p>2. Then go to Google Search Console → Sitemaps → Enter "sitemap.xml" → Submit</p>
            <p>3. Google will start indexing your pages within 1–3 days</p>
          </div>
          {sitemapDone ? (
            <div className="p-3 rounded-xl bg-green-500/8 border border-green-500/20 text-green-400 text-xs font-semibold">✓ Sitemap is generated!</div>
          ) : (
            <button onClick={() => setTab('sitemap')} className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#00BFFF]/10 text-[#00BFFF] border border-[#00BFFF]/20 hover:bg-[#00BFFF]/20 transition-all">
              Go to Sitemap →
            </button>
          )}
        </div>
      ),
    },
    {
      icon: '📈',
      title: 'Step 5 — Track your visitors (Google Analytics)',
      done: hasGA4,
      content: (
        <div className="space-y-3">
          <p className="text-gray-400 text-sm leading-relaxed">
            Google Analytics tells you how many people visit your site, where they come from, what pages they read, and how long they stay. It's completely free and helps you understand what's working.
          </p>
          <InfoBox icon="📊" color="blue">
            <strong className="text-white">What you'll see once it's set up:</strong><br/>
            How many visitors you get each day, which pages are most popular, which countries your visitors are from, and whether people are coming from Google, Discord, or other places.
          </InfoBox>
          <div className="space-y-2 text-[11px] text-gray-500">
            <p>1. Go to <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-[#00BFFF] hover:underline">analytics.google.com</a> → create a free account</p>
            <p>2. Create a new "Property" with your website's name</p>
            <p>3. Choose "Web" → enter your URL</p>
            <p>4. Copy the Measurement ID (looks like G-XXXXXXXXXX)</p>
            <p>5. Paste it in the Google Tools tab here</p>
          </div>
          {hasGA4 ? (
            <div className="p-3 rounded-xl bg-green-500/8 border border-green-500/20 text-green-400 text-xs font-semibold">✓ Analytics is tracking your visitors!</div>
          ) : (
            <button onClick={() => setTab('google')} className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#00BFFF]/10 text-[#00BFFF] border border-[#00BFFF]/20 hover:bg-[#00BFFF]/20 transition-all">
              Set up Analytics →
            </button>
          )}
        </div>
      ),
    },
    {
      icon: '⏰',
      title: 'How long does it take to reach page 1?',
      content: (
        <div className="space-y-3">
          <p className="text-gray-400 text-sm leading-relaxed">
            This is the big question everyone asks. The honest answer: it depends, but here's a realistic timeline for a Minecraft gaming site:
          </p>
          <div className="space-y-2">
            {[
              { time: 'Day 1–3',     icon: '🕷️', desc: 'Google finds and reads your site after you submit the sitemap', color: '#00BFFF' },
              { time: 'Week 1–2',    icon: '📚', desc: 'Your pages get indexed — you\'ll start appearing for your site\'s exact name', color: '#8b5cf6' },
              { time: 'Month 1–2',   icon: '📈', desc: 'You start appearing for specific keyword searches. Backlinks help a lot here.', color: '#f59e0b' },
              { time: 'Month 3–6',   icon: '🏆', desc: 'With good content + backlinks, you can reach page 1 for niche terms like "minecraft pvp tier list"', color: '#22c55e' },
            ].map(t => (
              <div key={t.time} className="flex gap-3 p-3 rounded-xl bg-white/2 border border-white/6">
                <div className="text-xl shrink-0">{t.icon}</div>
                <div>
                  <p className="font-bold text-xs" style={{ color: t.color }}>{t.time}</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <InfoBox icon="💡" color="yellow">
            <strong className="text-white">The #1 fastest way to speed this up:</strong> Get other Minecraft sites, forums, and Discord servers to link to your site. Google sees those links as "votes" that you're worth showing.
          </InfoBox>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <InfoBox icon="📖" color="blue">
        <strong className="text-white">This is your complete beginner's guide to getting on Google.</strong> Read it top to bottom — each step builds on the last. Don't skip ahead!
      </InfoBox>

      {sections.map((s, i) => (
        <div key={i} className={`border rounded-2xl overflow-hidden transition-all ${open === i ? 'border-[#00BFFF]/25' : s.done ? 'border-green-500/20' : 'border-white/8'}`}>
          <button className={`w-full flex items-center gap-3 p-4 text-left transition-all ${open === i ? 'bg-[#00BFFF]/5' : s.done ? 'bg-green-500/4' : 'bg-white/2 hover:bg-white/3'}`}
            onClick={() => setOpen(open === i ? null : i)}>
            <span className="text-xl shrink-0">{s.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-sm ${s.done ? 'text-green-400' : 'text-white'}`}>{s.title}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {s.done !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${s.done ? 'bg-green-500/15 text-green-400 border-green-500/25' : 'bg-white/5 text-gray-600 border-white/10'}`}>
                  {s.done ? '✓ Done' : 'To do'}
                </span>
              )}
              <span className={`text-gray-600 text-xs transition-transform ${open === i ? 'rotate-180' : ''}`}>▼</span>
            </div>
          </button>
          {open === i && (
            <div className="p-5 pt-0 border-t border-white/5">{s.content}</div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── SEO Booster Tab ──────────────────────────────────────────────────────────

function SEOBoosterTab({ cfg, setTab }: { cfg: Cfg; setTab: (t: string) => void }) {
  const [copiedKw, setCopiedKw] = useState<string | null>(null)

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedKw(id)
    setTimeout(() => setCopiedKw(null), 2000)
  }

  const KEYWORDS = {
    primary: [
      'minecraft pvp tier list',
      'minecraft pvp rankings',
      'crystal pvp tier list',
      'sword pvp rankings minecraft',
      'best minecraft pvp players',
      'minecraft pvp tier list 2024',
    ],
    longtail: [
      'who is the best crystal pvp player',
      'top minecraft pvp players ranked',
      'minecraft pvp player rankings list',
      'best sword pvp players in minecraft',
      'pvp tier list bedwars',
      'minecraft competitive pvp rankings',
      'blue tiers minecraft',
    ],
    questions: [
      'who is the best pvp player in minecraft',
      'how to get ranked in minecraft pvp',
      'what is crystal pvp minecraft',
      'minecraft pvp tier list explained',
      'how are minecraft pvp players ranked',
    ],
  }

  const CONTENT_IDEAS = [
    { icon: '📰', title: 'Weekly Rankings Update', desc: 'Post a "This Week\'s Top Movers" update. Fresh content = Google loves you more.', effort: 'Easy' },
    { icon: '🎮', title: 'Gamemode Explainer Pages', desc: 'Make a page explaining each gamemode (Crystal PvP, Sword PvP, etc). People Google these.', effort: 'Medium' },
    { icon: '❓', title: 'FAQ Page', desc: '"How do I get ranked?" "What is Crystal PvP?" Answer questions people actually search.', effort: 'Easy' },
    { icon: '🏆', title: 'Player Spotlight Pages', desc: 'A dedicated page per top player. People search their favorite players by name.', effort: 'Medium' },
    { icon: '📋', title: 'Tier Explanations', desc: '"What does S tier mean?" "How does our tier system work?" Explain everything.', effort: 'Easy' },
    { icon: '🎯', title: 'Tournament Recaps', desc: 'After each tournament, write a recap post. News = fresh content.', effort: 'Medium' },
    { icon: '📚', title: 'PvP Guides', desc: '"Best Crystal PvP settings", "How to get better at sword pvp" — people search these constantly.', effort: 'Hard' },
    { icon: '🆕', title: 'Changelog / News Page', desc: 'Log changes to the tier list. "Player X moved to S tier because..." — builds trust and content.', effort: 'Easy' },
  ]

  const QUICK_WINS = [
    { win: 'Put your main keywords in your page title', impact: 'High', time: '2 min', tab: 'meta' },
    { win: 'Write a 155-character description that includes "Minecraft PvP Tier List"', impact: 'High', time: '5 min', tab: 'meta' },
    { win: 'Generate your sitemap and submit to Google', impact: 'High', time: '3 min', tab: 'sitemap' },
    { win: 'Add your Discord & social links to your site', impact: 'Medium', time: '2 min', tab: null },
    { win: 'Set a canonical URL to your real domain', impact: 'High', time: '1 min', tab: 'meta' },
    { win: 'Link your site in your Discord server\'s #links channel', impact: 'Medium', time: '1 min', tab: null },
    { win: 'Post your site on r/Minecraft and r/CompetitiveMinecraft', impact: 'Medium', time: '10 min', tab: null },
    { win: 'Get 5 Discord friends to share your link in their servers', impact: 'Medium', time: '10 min', tab: null },
    { win: 'Create an /about page explaining who Blue Tiers is', impact: 'Medium', time: '20 min', tab: null },
    { win: 'Connect Google Analytics to track real visitor data', impact: 'Medium', time: '5 min', tab: 'google' },
  ]

  return (
    <div className="space-y-6">
      <InfoBox icon="🚀" color="purple">
        <strong className="text-white">SEO Booster gives you ready-to-use tools to rank faster.</strong> Use these keywords in your titles, descriptions, and page content. The more you use them naturally, the more Google understands what your site is about.
      </InfoBox>

      {/* Quick Wins */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-white font-bold text-sm">⚡ Quick Wins — Do These Today</h3>
          <p className="text-gray-500 text-xs mt-0.5">Sorted by impact. Each one takes less than 10 minutes.</p>
        </div>
        <div className="space-y-2">
          {QUICK_WINS.map((w, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/2 border border-white/6 hover:bg-white/4 transition-all">
              <div className="w-6 h-6 rounded-full bg-white/8 flex items-center justify-center text-[10px] text-gray-500 font-bold shrink-0">{i + 1}</div>
              <p className="flex-1 text-gray-300 text-xs">{w.win}</p>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${w.impact === 'High' ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>{w.impact}</span>
                <span className="text-gray-700 text-[10px]">{w.time}</span>
                {w.tab && (
                  <button onClick={() => setTab(w.tab!)} className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-[#00BFFF]/10 text-[#00BFFF] border border-[#00BFFF]/20 hover:bg-[#00BFFF]/20 transition-all">
                    Fix →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Keywords */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-5">
        <div>
          <h3 className="text-white font-bold text-sm">🎯 Keywords to Target</h3>
          <p className="text-gray-500 text-xs mt-0.5">These are real things people type into Google. Use them naturally in your titles, descriptions, and page content.</p>
        </div>

        {([
          { label: '🔥 Primary Keywords', desc: 'Most searched — put these in your title & description', kws: KEYWORDS.primary, color: '#ef4444' },
          { label: '📌 Long-tail Keywords', desc: 'Less competition — easier to rank for. Add these to page content.', kws: KEYWORDS.longtail, color: '#f59e0b' },
          { label: '❓ Question Keywords', desc: 'People ask these exact questions — make FAQ pages to answer them', kws: KEYWORDS.questions, color: '#8b5cf6' },
        ] as const).map(group => (
          <div key={group.label}>
            <div className="mb-2">
              <p className="text-white text-xs font-bold">{group.label}</p>
              <p className="text-gray-600 text-[10px]">{group.desc}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.kws.map(kw => (
                <button key={kw} onClick={() => copyText(kw, kw)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all hover:scale-105 active:scale-95"
                  style={{ background: `${group.color}12`, borderColor: `${group.color}30`, color: copiedKw === kw ? '#22c55e' : group.color }}>
                  {copiedKw === kw ? '✓ Copied!' : kw}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="p-3 rounded-xl bg-white/3 border border-white/8 text-[11px] text-gray-400 leading-relaxed">
          💡 <strong className="text-white">How to use these:</strong> Click any keyword to copy it. Then use it naturally in your page title, description, and page content. Don't stuff them in unnaturally — Google is smart enough to detect that.
        </div>
      </div>

      {/* Content ideas */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-white font-bold text-sm">💡 Content Ideas (More Content = Better Rankings)</h3>
          <p className="text-gray-500 text-xs mt-0.5">Google rewards sites that regularly add useful content. Here are ideas specifically for Blue Tiers.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CONTENT_IDEAS.map(idea => (
            <div key={idea.title} className="p-4 rounded-xl bg-white/2 border border-white/6 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{idea.icon}</span>
                  <p className="text-white font-bold text-xs">{idea.title}</p>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${idea.effort === 'Easy' ? 'bg-green-500/15 text-green-400' : idea.effort === 'Medium' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-red-500/15 text-red-400'}`}>
                  {idea.effort}
                </span>
              </div>
              <p className="text-gray-500 text-[11px] leading-relaxed">{idea.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Title generator */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-3">
        <h3 className="text-white font-bold text-sm">✍️ Ready-to-Use Page Title Templates</h3>
        <p className="text-gray-500 text-xs">Click any to copy. Then paste it in Meta Tags → Page Title and adjust as needed.</p>
        <div className="space-y-2">
          {[
            'Blue Tiers — #1 Minecraft PvP Tier List | All Gamemodes',
            'Minecraft PvP Tier List 2024 — Blue Tiers Official Rankings',
            'Blue Tiers | Top Minecraft Crystal & Sword PvP Players Ranked',
            'Official Minecraft PvP Rankings — Blue Network Tier List',
            'Best Minecraft PvP Players — Blue Tiers | Updated Tier List',
          ].map(title => (
            <button key={title} onClick={() => copyText(title, title)}
              className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-white/3 border border-white/8 hover:bg-white/5 hover:border-white/12 transition-all group text-left">
              <p className={`text-xs ${copiedKw === title ? 'text-green-400' : 'text-gray-300'}`}>{title}</p>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] ${title.length >= 50 && title.length <= 60 ? 'text-green-400' : 'text-orange-400'}`}>{title.length} chars</span>
                <span className={`text-[10px] font-semibold ${copiedKw === title ? 'text-green-400' : 'text-gray-600 group-hover:text-gray-400'}`}>{copiedKw === title ? '✓ Copied!' : '📋 Copy'}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Description generator */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-3">
        <h3 className="text-white font-bold text-sm">📝 Ready-to-Use Description Templates</h3>
        <p className="text-gray-500 text-xs">Click any to copy. Descriptions should be 150–160 characters — the green ones are perfect.</p>
        <div className="space-y-2">
          {[
            'The official Minecraft PvP tier list — ranking the best Crystal, Sword, UHC, and Bedwars players. Updated regularly. Join our Discord to apply for a rank.',
            'Blue Tiers is the #1 Minecraft PvP ranking site. See where top players rank across Crystal, Sword, and all major gamemodes. Free to join — apply today!',
            'Ranked Minecraft PvP players by gamemode. Crystal, Sword, UHC, and more. Blue Tiers is the most trusted tier list in the community. Apply for ranking.',
          ].map(desc => (
            <button key={desc} onClick={() => copyText(desc, desc)}
              className="w-full flex items-start justify-between gap-3 p-3 rounded-xl bg-white/3 border border-white/8 hover:bg-white/5 transition-all group text-left">
              <p className={`text-xs leading-relaxed ${copiedKw === desc ? 'text-green-400' : 'text-gray-300'}`}>{desc}</p>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-[10px] font-bold ${desc.length >= 150 && desc.length <= 160 ? 'text-green-400' : 'text-orange-400'}`}>{desc.length}/160</span>
                <span className={`text-[10px] ${copiedKw === desc ? 'text-green-400' : 'text-gray-600 group-hover:text-gray-400'}`}>{copiedKw === desc ? '✓' : '📋'}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Meta Tags Tab ────────────────────────────────────────────────────────────

function MetaTagsTab({ cfg, setCfg, onSave, saving }: { cfg: Cfg; setCfg: (c: Cfg) => void; onSave: () => void; saving: boolean }) {
  const up = (k: keyof Cfg) => (v: string) => setCfg({ ...cfg, [k]: v })
  const tl = cfg.seoTitle.length
  const dl = cfg.seoDescription.length

  return (
    <div className="space-y-6">
      <InfoBox icon="🏷️" color="blue">
        <strong className="text-white">Meta Tags tell Google what your site is about.</strong> They're invisible to your visitors but super important for Google. The title and description are exactly what appears in search results — so make them count!
      </InfoBox>

      {/* Page title */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-white font-bold text-sm">Page Title <span className="text-red-400 text-xs font-normal">(most important field on this page)</span></h3>
          <p className="text-gray-500 text-xs mt-1">This is the big blue headline people see when your site shows up on Google. It's also the browser tab title.</p>
        </div>
        <Field label="Page Title" badge="critical"
          value={cfg.seoTitle} onChange={up('seoTitle')} maxLength={70}
          placeholder="Blue Tiers — #1 Minecraft PvP Tier List"
          help="Put your main keyword near the beginning. For example: 'Minecraft PvP Tier List — Blue Tiers'. Google shows about 60 characters, so stay close to that." />
        <div className="flex gap-4 text-[10px]">
          <span className={tl >= 50 && tl <= 60 ? 'text-green-400' : tl > 60 ? 'text-orange-400' : tl > 0 ? 'text-yellow-400' : 'text-gray-600'}>
            {tl >= 50 && tl <= 60 ? '✓ Perfect length!' : tl > 60 ? `⚠ A bit too long — try to cut to 60 chars (${tl}/60)` : tl > 0 ? `→ Could be longer — aim for 50 chars minimum (${tl}/50)` : '— Not set yet'}
          </span>
        </div>
        <div className="bg-white rounded-xl p-3">
          <p className="text-[#1a0dab] text-sm font-normal leading-snug">{cfg.seoTitle || 'Your page title will appear here in blue...'}</p>
          <p className="text-[#4d5156] text-xs mt-0.5 truncate">{cfg.canonicalUrl || 'https://your-site.com'}</p>
        </div>
        <p className="text-gray-600 text-[10px]">☝️ Live preview of how your title looks in Google search results</p>
      </div>

      {/* Description */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-white font-bold text-sm">Meta Description</h3>
          <p className="text-gray-500 text-xs mt-1">The short text that appears under your title in Google. This is what convinces people to click your link instead of a competitor's.</p>
        </div>
        <Field label="Meta Description" badge="critical"
          value={cfg.seoDescription} onChange={up('seoDescription')} maxLength={170} multiline
          placeholder="The definitive Minecraft PvP tier list — ranking the best Crystal, Sword, UHC, and Bedwars players. Apply for a rank in our Discord!"
          help="Write it like you're convincing a friend to visit. Include a keyword naturally, mention what makes you special, and ideally end with a call to action like 'Join our Discord'." />
        <div className="flex gap-4 text-[10px]">
          <span className={dl >= 150 && dl <= 160 ? 'text-green-400' : dl > 160 ? 'text-orange-400' : dl > 0 ? 'text-yellow-400' : 'text-gray-600'}>
            {dl >= 150 && dl <= 160 ? '✓ Perfect length!' : dl > 160 ? `⚠ Too long — cut it to 160 chars (${dl}/160)` : dl > 0 ? `→ Too short — add more text, aim for 150 chars (${dl}/150)` : '— Not set yet'}
          </span>
        </div>
        <div className="bg-white rounded-xl p-3">
          <p className="text-[#1a0dab] text-sm">{cfg.seoTitle || 'Your Site Title'}</p>
          <p className="text-[#4d5156] text-xs mt-1 leading-relaxed">{cfg.seoDescription ? cfg.seoDescription.slice(0, 160) + (dl > 160 ? '…' : '') : 'Your description will appear here. Fill in the field above!'}</p>
        </div>
        <p className="text-gray-600 text-[10px]">☝️ This is exactly how your result looks on Google</p>
      </div>

      {/* Keywords */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-white font-bold text-sm">Keywords</h3>
          <p className="text-gray-500 text-xs mt-1">These aren't a major ranking factor anymore, but they help Google understand the theme of your site. Separate them with commas.</p>
        </div>
        <Field label="Keywords" value={cfg.seoKeywords} onChange={up('seoKeywords')}
          placeholder="minecraft pvp tier list, crystal pvp, sword pvp, blue tiers, minecraft rankings"
          help="Use 5–10 keywords that describe your site. Think about what people would type into Google to find you. Use the SEO Booster tab for a ready-made keyword list!" />
      </div>

      {/* OG Image */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-white font-bold text-sm">Social Sharing Image</h3>
          <p className="text-gray-500 text-xs mt-1">When someone shares your link on Discord, Twitter, or WhatsApp, this image shows up. Without it, your link looks boring and gets ignored.</p>
        </div>
        <InfoBox icon="📸" color="blue">
          <strong className="text-white">Ideal size: 1200 × 630 pixels (about 2:1 ratio)</strong><br/>
          Make something eye-catching — your logo, site name, or a cool screenshot. Upload it to a free image host like <a href="https://imgur.com" target="_blank" rel="noopener noreferrer" className="underline">imgur.com</a> and paste the direct link below.
        </InfoBox>
        <Field label="Image URL" badge="recommended"
          value={cfg.ogImageUrl} onChange={up('ogImageUrl')}
          placeholder="https://i.imgur.com/your-image.png"
          help="Upload your image to Imgur (free, no account needed) then right-click it → 'Copy image address' and paste that URL here." />
        {cfg.ogImageUrl && (
          <div>
            <p className="text-gray-600 text-[10px] mb-2">Image preview:</p>
            <div className="rounded-xl overflow-hidden border border-white/10 aspect-[2/1] bg-white/3 max-w-sm">
              <img src={cfg.ogImageUrl} alt="Social share preview" className="w-full h-full object-cover"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
            </div>
          </div>
        )}
      </div>

      {/* Canonical URL */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-white font-bold text-sm">Your Website's URL</h3>
          <p className="text-gray-500 text-xs mt-1">This is your site's permanent public address. It tells Google "this is my official home" and is called the "canonical URL".</p>
        </div>
        <InfoBox icon="🌐" color="orange">
          <strong className="text-white">Don't have a real domain yet?</strong> Check the Google Guide tab for where to get one cheaply. For now, if you've deployed on Replit, use that URL.
        </InfoBox>
        <Field label="Canonical URL" badge="important"
          value={cfg.canonicalUrl} onChange={up('canonicalUrl')}
          placeholder="https://bluetiers.gg"
          help="This should be the main URL people use to reach your site. Include https:// at the start. Don't add a trailing slash." />
      </div>

      <SaveBtn onClick={onSave} saving={saving} label="💾 Save Meta Tags — Go Live on Google" />
    </div>
  )
}

// ─── Social Preview Tab ───────────────────────────────────────────────────────

function SocialPreviewTab({ cfg }: { cfg: Cfg }) {
  const title   = cfg.seoTitle       || 'Blue Tiers — #1 Minecraft PvP Tier List'
  const desc    = cfg.seoDescription || '#1 Tier List for all types of Minecraft PvP players. Join our Discord!'
  const url     = cfg.canonicalUrl   || 'https://bluetiers.gg'
  const ogImage = cfg.ogImageUrl
  const domain  = (() => { try { return new URL(url).hostname } catch { return url } })()

  return (
    <div className="space-y-6">
      <InfoBox icon="👁️" color="blue">
        <strong className="text-white">See exactly how your site looks before it goes live.</strong> Every time someone shares your link somewhere, this is what they see. Make it look so good that people can't help but click!
      </InfoBox>

      {/* Google */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔍</span>
          <div>
            <h3 className="text-white font-bold text-sm">Google Search Result</h3>
            <p className="text-gray-600 text-[10px]">This is what people see when they find you on Google</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-[#00BFFF] flex items-center justify-center text-[9px] text-black font-black">B</div>
            <div>
              <p className="text-[#202124] text-xs font-medium">Blue Tiers</p>
              <p className="text-[#4d5156] text-[10px]">{domain}</p>
            </div>
            <span className="ml-auto text-[10px] text-[#4d5156] border border-[#dadce0] rounded px-1.5 py-0.5">▼</span>
          </div>
          <h4 className="text-[#1a0dab] text-lg font-normal hover:underline cursor-pointer leading-snug">{title}</h4>
          <p className="text-[#4d5156] text-sm mt-1 leading-relaxed">{desc.slice(0, 160)}{desc.length > 160 ? '…' : ''}</p>
          <p className="text-[#006621] text-xs mt-1">{url}</p>
          <div className="flex gap-4 mt-2 pt-2 border-t border-gray-100">
            {['Rankings', 'Tournament', 'Mining', 'Shop'].map(p => (
              <span key={p} className="text-[#1a0dab] text-xs hover:underline cursor-pointer">{p}</span>
            ))}
          </div>
        </div>
        {(!cfg.seoTitle || !cfg.seoDescription) && (
          <div className="p-3 rounded-xl bg-orange-500/8 border border-orange-500/20 text-orange-300/80 text-[11px]">
            ⚠️ You're seeing example text. Go to Meta Tags and fill in your title and description to make this real.
          </div>
        )}
      </div>

      {/* Discord */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          <div>
            <h3 className="text-white font-bold text-sm">Discord Link Preview</h3>
            <p className="text-gray-600 text-[10px]">When someone pastes your link in Discord, this embed appears</p>
          </div>
        </div>
        <div className="bg-[#313338] rounded-xl overflow-hidden max-w-md border-l-4 border-[#00BFFF]">
          {ogImage ? (
            <div className="aspect-video overflow-hidden">
              <img src={ogImage} alt="Preview" className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
            </div>
          ) : (
            <div className="aspect-video bg-gradient-to-br from-[#0B0F17] to-[#1a2744] flex flex-col items-center justify-center gap-2">
              <span className="text-3xl">🎮</span>
              <p className="text-gray-500 text-xs">Add a social image to see it here</p>
            </div>
          )}
          <div className="p-3">
            <p className="text-[#00BFFF] text-[10px] font-semibold uppercase tracking-wider">{domain}</p>
            <p className="text-white text-sm font-semibold mt-0.5">{title}</p>
            <p className="text-[#b5bac1] text-xs mt-1 leading-relaxed">{desc.slice(0, 120)}{desc.length > 120 ? '…' : ''}</p>
          </div>
        </div>
        {!ogImage && (
          <p className="text-orange-400/70 text-[11px]">⚠️ No image set — your Discord links look plain. Go to Meta Tags → Social Sharing Image to fix this.</p>
        )}
      </div>

      {/* Twitter */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐦</span>
          <div>
            <h3 className="text-white font-bold text-sm">Twitter / X Card</h3>
            <p className="text-gray-600 text-[10px]">When posted on Twitter or X, your link shows this card</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl overflow-hidden max-w-md border border-gray-200">
          {ogImage ? (
            <div className="aspect-[2/1] overflow-hidden">
              <img src={ogImage} alt="Preview" className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
            </div>
          ) : (
            <div className="aspect-[2/1] bg-gray-100 flex flex-col items-center justify-center gap-2">
              <span className="text-3xl">🎮</span>
              <p className="text-gray-500 text-xs">No image set</p>
            </div>
          )}
          <div className="p-3 border-t border-gray-100">
            <p className="text-[#536471] text-xs">{domain}</p>
            <p className="text-[#0f1419] text-sm font-bold leading-snug mt-0.5">{title}</p>
            <p className="text-[#536471] text-xs mt-0.5">{desc.slice(0, 100)}{desc.length > 100 ? '…' : ''}</p>
          </div>
        </div>
      </div>

      {/* WhatsApp */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">📱</span>
          <div>
            <h3 className="text-white font-bold text-sm">WhatsApp / iMessage Preview</h3>
            <p className="text-gray-600 text-[10px]">Link previews in chat apps use the same image</p>
          </div>
        </div>
        <div className="bg-[#1a1a1a] rounded-2xl p-4 max-w-xs">
          <div className="bg-[#25d366]/15 border border-[#25d366]/25 rounded-xl overflow-hidden">
            {ogImage ? (
              <div className="aspect-video overflow-hidden">
                <img src={ogImage} alt="" className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
              </div>
            ) : (
              <div className="aspect-video bg-[#111] flex items-center justify-center">
                <span className="text-gray-600 text-xs">No image</span>
              </div>
            )}
            <div className="p-2.5">
              <p className="text-white text-xs font-bold">{title}</p>
              <p className="text-gray-400 text-[10px] mt-0.5 leading-relaxed">{desc.slice(0, 80)}{desc.length > 80 ? '…' : ''}</p>
              <p className="text-[#25d366] text-[10px] mt-1">{domain}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Google Tools Tab ─────────────────────────────────────────────────────────

function GoogleToolsTab({ cfg, setCfg, onSave, saving }: { cfg: Cfg; setCfg: (c: Cfg) => void; onSave: () => void; saving: boolean }) {
  const up = (k: keyof Cfg) => (v: string) => setCfg({ ...cfg, [k]: v })
  const canonical = cfg.canonicalUrl || 'https://bluetiers.gg'

  return (
    <div className="space-y-6">
      <InfoBox icon="🔍" color="orange">
        <strong className="text-white">Google's free tools are non-negotiable for ranking.</strong> Analytics shows you who's visiting. Search Console tells Google you exist and shows you what searches bring people to you. Both take about 5 minutes to set up.
      </InfoBox>

      {/* GA4 */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center text-xl">📊</div>
            <div>
              <h3 className="text-white font-bold text-sm">Google Analytics 4 (GA4)</h3>
              <p className="text-gray-500 text-[11px]">See who visits your site, where they're from, and what they do</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${cfg.ga4Id ? 'bg-green-500/15 text-green-400 border-green-500/25' : 'bg-white/5 text-gray-600 border-white/10'}`}>
            {cfg.ga4Id ? '● Active' : '○ Not set up'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: '👥', label: 'See visitor count', desc: 'Daily/weekly/monthly visitors' },
            { icon: '🌍', label: 'See where they\'re from', desc: 'Country, city, device type' },
            { icon: '📄', label: 'See popular pages', desc: 'Which pages get the most views' },
          ].map(f => (
            <div key={f.label} className="p-3 rounded-xl bg-white/2 border border-white/6 text-center">
              <div className="text-2xl mb-1">{f.icon}</div>
              <p className="text-white text-[11px] font-semibold">{f.label}</p>
              <p className="text-gray-600 text-[10px] mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <p className="text-white text-xs font-bold">How to get your Analytics ID (5 steps):</p>
          {[
            { n: 1, text: 'Go to analytics.google.com → sign in with Google', url: 'https://analytics.google.com' },
            { n: 2, text: 'Click "Start measuring" → enter your account name (e.g. "Blue Tiers")', url: null },
            { n: 3, text: 'Create a property → choose "Web" → enter your website URL', url: null },
            { n: 4, text: 'Click through the setup until you see "Measurement ID" (G-XXXXXXXXXX)', url: null },
            { n: 5, text: 'Copy that ID and paste it in the field below → click Save', url: null },
          ].map(s => (
            <div key={s.n} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-orange-500/15 flex items-center justify-center text-orange-400 text-[10px] font-black shrink-0">{s.n}</div>
              <p className="text-gray-400 text-[11px] flex-1">{s.text}</p>
              {s.url && (
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                  className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-orange-500/10 text-orange-300 border border-orange-500/20 hover:bg-orange-500/20 transition-all shrink-0">
                  Open ↗
                </a>
              )}
            </div>
          ))}
        </div>

        <Field label="Measurement ID" value={cfg.ga4Id} onChange={up('ga4Id')} placeholder="G-XXXXXXXXXX"
          help="Your Measurement ID always starts with 'G-' followed by letters and numbers. Find it in GA4 → Admin → Data Streams → click your stream." />

        {cfg.ga4Id && (
          <div className="p-3 rounded-xl bg-white/2 border border-white/6 font-mono text-[10px] text-gray-500">
            {'<!-- Auto-injected into every page <head> -->'}<br/>
            {`<script async src="gtag/js?id=${cfg.ga4Id}"></script>`}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <a href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-orange-500/10 border border-orange-500/20 text-orange-300 hover:bg-orange-500/20 transition-all min-w-[140px]">
            📊 Open Analytics
          </a>
          {cfg.ga4Id && (
            <a href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-green-500/10 border border-green-500/20 text-green-300 hover:bg-green-500/20 transition-all min-w-[140px]">
              📈 View Live Data
            </a>
          )}
        </div>
      </div>

      {/* GSC */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-xl">🔎</div>
            <div>
              <h3 className="text-white font-bold text-sm">Google Search Console</h3>
              <p className="text-gray-500 text-[11px]">Tell Google your site exists + see what searches bring people to you</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${cfg.gscVerificationTag ? 'bg-green-500/15 text-green-400 border-green-500/25' : 'bg-white/5 text-gray-600 border-white/10'}`}>
            {cfg.gscVerificationTag ? '● Verified' : '○ Not verified'}
          </span>
        </div>

        <InfoBox icon="💡" color="blue">
          <strong className="text-white">This is the single most important free tool for SEO.</strong> Without it, you're flying blind. With it, you'll see exactly what keywords bring people to your site, what position you rank at, and whether Google has any issues with your pages.
        </InfoBox>

        <div className="space-y-3">
          <p className="text-white text-xs font-bold">Step-by-step setup:</p>
          {[
            { n: 1, text: 'Go to Google Search Console and sign in', url: 'https://search.google.com/search-console/', action: 'Open Search Console →' },
            { n: 2, text: 'Click "Add property" in the top left → enter your website URL', url: null },
            { n: 3, text: 'For verification method, choose "HTML tag"', url: null },
            { n: 4, text: 'You\'ll see a code like: <meta name="google-site-verification" content="abc123xyz456...">. Copy ONLY the part inside content="" (the letters/numbers)', url: null },
            { n: 5, text: 'Paste that code into the "Verification Tag" field below and click Save', url: null },
            { n: 6, text: 'Go back to Search Console and click the "Verify" button', url: null },
            { n: 7, text: 'Go to Sitemap tab → generate your sitemap → come back to GSC and submit it', url: null },
          ].map(s => (
            <div key={s.n} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-400 text-[10px] font-black shrink-0 mt-0.5">{s.n}</div>
              <p className="text-gray-400 text-[11px] flex-1 leading-relaxed">{s.text}</p>
              {s.url && (
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                  className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20 hover:bg-blue-500/20 transition-all shrink-0">
                  {s.action}
                </a>
              )}
            </div>
          ))}
        </div>

        <Field label="Verification Tag Content"
          value={cfg.gscVerificationTag} onChange={up('gscVerificationTag')}
          placeholder="AbCdEf123XyZ456..."
          help="Only paste the code that goes INSIDE content=&quot;...&quot; — not the whole <meta> tag. Just the letters and numbers part." />

        {cfg.gscVerificationTag && (
          <div className="p-3 rounded-xl bg-white/2 border border-white/6 font-mono text-[10px] text-gray-500">
            {`<meta name="google-site-verification" content="${cfg.gscVerificationTag}" />`}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <a href="https://search.google.com/search-console/" target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 transition-all min-w-[140px]">
            🔎 Open Search Console
          </a>
          <a href={`https://search.google.com/search-console/sitemaps`} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/8 transition-all min-w-[140px]">
            🗺️ Submit Sitemap
          </a>
        </div>
      </div>

      {/* PageSpeed */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-xl">⚡</div>
          <div>
            <h3 className="text-white font-bold text-sm">Page Speed Test</h3>
            <p className="text-gray-500 text-[11px]">Google ranks fast sites higher. Check your speed score.</p>
          </div>
        </div>
        <InfoBox icon="⚡" color="purple">
          <strong className="text-white">Speed is a ranking factor.</strong> If your site takes more than 3 seconds to load, Google penalizes you AND visitors leave. Run the PageSpeed test and aim for 90+ score. A score of 100 is not needed — 85+ is great.
        </InfoBox>
        <div className="flex gap-2 flex-wrap">
          <a href={`https://pagespeed.web.dev/report?url=${encodeURIComponent(canonical)}`} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-all min-w-[140px]">
            ⚡ Test My Speed
          </a>
          <a href={`https://search.google.com/test/mobile-friendly?url=${encodeURIComponent(canonical)}`} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/8 transition-all min-w-[140px]">
            📱 Mobile-Friendly Test
          </a>
        </div>
        <a href={`https://www.google.com/search?q=site:${cfg.canonicalUrl || 'bluetiers.gg'}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-white/4 border border-white/8 text-gray-400 hover:text-white hover:bg-white/8 transition-all w-full">
          🔎 Check if Google has indexed my site
        </a>
        <p className="text-gray-700 text-[10px]">☝️ The "site:" search shows you which pages Google has already indexed. At first it might be 0, and that's normal.</p>
      </div>

      <SaveBtn onClick={onSave} saving={saving} label="💾 Save Google Settings" />
    </div>
  )
}

// ─── Sitemap Tab ──────────────────────────────────────────────────────────────

function SitemapTab({ cfg, sitemapDone, setSitemapDone, toast }: {
  cfg: Cfg; sitemapDone: boolean; setSitemapDone: (v: boolean) => void
  toast: (m: string, t: 'success' | 'error' | 'info') => void
}) {
  const [extra, setExtra]    = useState('')
  const [generating, setGen] = useState(false)
  const [xml, setXml]        = useState<string | null>(null)
  const canonical = cfg.canonicalUrl || 'https://bluetiers.gg'

  useEffect(() => {
    loadSitemapXml().then(x => { if (x) { setXml(x); setSitemapDone(true) } }).catch(() => {})
  }, [])

  async function handleGenerate() {
    setGen(true)
    try {
      const additionalUrls = extra.split('\n').filter(u => u.trim())
      const res = await generateSitemap({ data: { baseUrl: canonical, additionalUrls } })
      setXml(res.xml)
      setSitemapDone(true)
      localStorage.setItem('pub_sitemap_done', '1')
      toast(`✓ Sitemap generated — ${res.count} pages included`, 'success')
    } catch (e: any) {
      toast('Failed to generate sitemap: ' + e.message, 'error')
    } finally { setGen(false) }
  }

  const sitemapUrl = canonical.replace(/\/$/, '') + '/sitemap.xml'

  return (
    <div className="space-y-6">
      <InfoBox icon="🗺️" color="green">
        <strong className="text-white">A sitemap is a file that tells Google about all your pages.</strong> Without it, Google has to "discover" your pages by following links — and might miss some. With a sitemap, you hand Google a complete list and it indexes everything much faster.
      </InfoBox>

      {/* Status */}
      <div className={`p-4 rounded-2xl border flex items-start gap-3 ${sitemapDone ? 'bg-green-500/5 border-green-500/20' : 'bg-orange-500/5 border-orange-500/20'}`}>
        <span className="text-xl">{sitemapDone ? '✅' : '⚠️'}</span>
        <div className="flex-1">
          <p className={`font-bold text-sm ${sitemapDone ? 'text-green-400' : 'text-orange-400'}`}>
            {sitemapDone ? 'Your sitemap is live!' : 'No sitemap yet — generate one below'}
          </p>
          <p className="text-gray-500 text-[11px] mt-0.5">
            {sitemapDone ? `Accessible at: ${sitemapUrl}` : 'Click the Generate button below — it takes 2 seconds.'}
          </p>
        </div>
        {sitemapDone && (
          <a href={sitemapUrl} target="_blank" rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-all shrink-0">
            View ↗
          </a>
        )}
      </div>

      {/* Pages included */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-4">
        <h3 className="text-white font-bold text-sm">Pages in Your Sitemap</h3>
        <p className="text-gray-500 text-xs">These pages will be told to Google. Priority means how important the page is (1.0 = most important).</p>
        <div className="space-y-1.5">
          {[
            { path: '/ (Home page)',          priority: '1.0', note: 'Most important — shown first' },
            { path: '/rankings',              priority: '0.9', note: 'High priority — your main feature' },
            { path: '/tournament',            priority: '0.8', note: '' },
            { path: '/mining',                priority: '0.7', note: '' },
            { path: '/exchange',              priority: '0.6', note: '' },
            { path: '/shop',                  priority: '0.6', note: '' },
          ].map(r => (
            <div key={r.path} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/2 border border-white/5">
              <span className="text-green-400 text-xs shrink-0">✓</span>
              <span className="text-gray-300 text-[11px] font-mono flex-1">{r.path}</span>
              <span className="text-[#00BFFF] text-[10px] font-mono">{r.priority}</span>
              {r.note && <span className="text-gray-600 text-[9px] hidden sm:block">{r.note}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Extra URLs */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-3">
        <h3 className="text-white font-bold text-sm">Add Extra Pages (Optional)</h3>
        <p className="text-gray-500 text-xs">If you've added extra pages to your site (like /about, /rules, /apply), add their paths here. One per line.</p>
        <textarea value={extra} onChange={e => setExtra(e.target.value)} rows={3}
          className="w-full bg-white/3 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/40 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all resize-none font-mono placeholder-gray-700"
          placeholder="/about&#10;/rules&#10;/apply" />
      </div>

      <button onClick={handleGenerate} disabled={generating}
        className="w-full py-4 rounded-xl font-bold text-sm bg-[#00BFFF] text-black hover:bg-[#00BFFF]/90 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(0,191,255,0.2)] active:scale-[0.98]">
        {generating ? '⟳ Generating Sitemap…' : '🗺️ Generate Sitemap (takes 2 seconds)'}
      </button>

      {xml && (
        <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold text-sm">Generated Sitemap</h3>
            <button onClick={() => navigator.clipboard.writeText(xml).then(() => toast('Copied!', 'info'))}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all">
              📋 Copy
            </button>
          </div>
          <pre className="bg-black/30 rounded-xl p-4 text-[10px] font-mono text-gray-400 overflow-auto max-h-48 border border-white/5">{xml}</pre>
        </div>
      )}

      {/* Submit steps */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-4">
        <h3 className="text-white font-bold text-sm">📬 Next Step: Submit to Google</h3>
        <p className="text-gray-500 text-xs">After generating, tell Google about it. This makes Google index your pages much faster.</p>
        <div className="space-y-2">
          {[
            'Generate your sitemap above (click the blue button)',
            'Open Google Search Console in a new tab',
            'In the left menu, click "Sitemaps"',
            'In the "Add a new sitemap" box, type: sitemap.xml',
            'Click "Submit" — Google will start crawling your pages within 1–3 days!',
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#00BFFF]/15 flex items-center justify-center text-[#00BFFF] text-[10px] font-black shrink-0 mt-0.5">{i + 1}</div>
              <p className="text-gray-400 text-[11px] leading-relaxed">{s}</p>
            </div>
          ))}
        </div>
        <a href="https://search.google.com/search-console/sitemaps" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#00BFFF]/10 text-[#00BFFF] border border-[#00BFFF]/25 hover:bg-[#00BFFF]/20 transition-all">
          🔗 Open Google Search Console Sitemaps →
        </a>
      </div>
    </div>
  )
}

// ─── Robots Tab ───────────────────────────────────────────────────────────────

function RobotsTab({ cfg, toast }: { cfg: Cfg; toast: (m: string, t: 'success' | 'error' | 'info') => void }) {
  const canonical = cfg.canonicalUrl || 'https://bluetiers.gg'
  const DEFAULT_TXT = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${canonical.replace(/\/$/, '')}/sitemap.xml`
  const [content, setContent] = useState(DEFAULT_TXT)
  const [saving, setSaving]   = useState(false)
  const [loaded, setLoaded]   = useState(false)

  useEffect(() => {
    loadRobotsTxt().then(txt => { if (txt) setContent(txt) }).catch(() => {}).finally(() => setLoaded(true))
  }, [])

  const PRESETS = [
    { label: '✅ Recommended', value: `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${canonical.replace(/\/$/, '')}/sitemap.xml`, desc: 'Allow all search engines, block admin' },
    { label: '🚫 Block AI Bots', value: `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nUser-agent: GPTBot\nDisallow: /\n\nUser-agent: ChatGPT-User\nDisallow: /\n\nUser-agent: CCBot\nDisallow: /\n\nSitemap: ${canonical.replace(/\/$/, '')}/sitemap.xml`, desc: 'Also block AI training bots' },
    { label: '🔒 Extra Private', value: `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /private/\n\nSitemap: ${canonical.replace(/\/$/, '')}/sitemap.xml`, desc: 'Block admin, api, and private pages' },
  ]

  async function handleSave() {
    setSaving(true)
    try {
      await saveRobotsTxt({ data: { content } })
      toast('✓ robots.txt saved and live', 'success')
    } catch (e: any) {
      toast('Failed: ' + e.message, 'error')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <InfoBox icon="🤖" color="blue">
        <strong className="text-white">robots.txt is a simple file that tells Google's bots what they can and can't read.</strong> Think of it like a "sign on the door" for search engine robots. For most sites, you want to allow everything except your admin panel. The recommended preset below is perfect for you.
      </InfoBox>

      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-4">
        <h3 className="text-white font-bold text-sm">Choose a Preset (Recommended)</h3>
        <p className="text-gray-500 text-xs">Click a preset to load it. "Recommended" is perfect for most sites like yours.</p>
        <div className="space-y-2">
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => setContent(p.value)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:border-white/20 ${content === p.value ? 'bg-[#00BFFF]/5 border-[#00BFFF]/25' : 'bg-white/2 border-white/8 hover:bg-white/4'}`}>
              <div className="flex-1">
                <p className={`font-bold text-xs ${content === p.value ? 'text-[#00BFFF]' : 'text-white'}`}>{p.label}</p>
                <p className="text-gray-600 text-[10px] mt-0.5">{p.desc}</p>
              </div>
              {content === p.value && <span className="text-[#00BFFF] text-xs shrink-0">✓ Selected</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-sm">robots.txt Content</h3>
            <p className="text-gray-500 text-[10px] mt-0.5">Advanced: edit manually if needed</p>
          </div>
          <span className="text-gray-600 text-[10px]">{content.split('\n').length} lines</span>
        </div>
        {!loaded ? (
          <div className="h-48 flex items-center justify-center text-gray-600 text-sm">Loading…</div>
        ) : (
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={10}
            className="w-full bg-black/30 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/40 rounded-xl px-4 py-3 text-[#7dd3fc] text-xs font-mono outline-none transition-all resize-none" />
        )}
        <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-600">
          {[
            ['User-agent: *', 'Applies to all search engine bots'],
            ['Allow: /', 'Allow reading all pages'],
            ['Disallow: /admin', 'Block bots from reading /admin'],
            ['Sitemap: /sitemap.xml', 'Tells bots where your sitemap is'],
          ].map(([k, v]) => (
            <div key={k as string} className="flex gap-2 p-2 rounded-lg bg-white/2">
              <code className="text-gray-400 shrink-0 text-[9px]">{k as string}</code>
              <span className="text-[9px]">— {v as string}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-3.5 rounded-xl font-bold text-sm bg-[#00BFFF] text-black hover:bg-[#00BFFF]/90 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(0,191,255,0.2)]">
        {saving ? '⟳ Saving…' : '🤖 Save robots.txt'}
      </button>

      <div className="flex gap-2">
        <a href="/robots.txt" target="_blank" rel="noopener noreferrer"
          className="flex-1 text-center py-2.5 rounded-xl text-xs font-semibold bg-white/4 border border-white/8 text-gray-400 hover:text-white transition-all">
          View Live robots.txt ↗
        </a>
        <a href={`https://www.google.com/search?q=site:${cfg.canonicalUrl || 'bluetiers.gg'}`} target="_blank" rel="noopener noreferrer"
          className="flex-1 text-center py-2.5 rounded-xl text-xs font-semibold bg-white/4 border border-white/8 text-gray-400 hover:text-white transition-all">
          Check Google Index ↗
        </a>
      </div>
    </div>
  )
}

// ─── Schema / Rich Results Tab ────────────────────────────────────────────────

function SchemaTab({ cfg }: { cfg: Cfg }) {
  const [copied, setCopied] = useState(false)
  const canonical = cfg.canonicalUrl || 'https://bluetiers.gg'

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Blue Tiers',
    url: canonical,
    description: cfg.seoDescription || 'The #1 Minecraft PvP tier list, ranking Crystal, Sword, and UHC players.',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${canonical}/rankings?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
    sameAs: [cfg.discordLink, cfg.twitterLink, cfg.youtubeLink, cfg.twitchLink].filter(Boolean),
    publisher: {
      '@type': 'Organization',
      name: 'Blue Tiers',
      url: canonical,
      logo: { '@type': 'ImageObject', url: `${canonical}/icons/icon-192x192.png` },
    },
  }

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: canonical },
      { '@type': 'ListItem', position: 2, name: 'Rankings', item: `${canonical}/rankings` },
      { '@type': 'ListItem', position: 3, name: 'Tournament', item: `${canonical}/tournament` },
      { '@type': 'ListItem', position: 4, name: 'Mining', item: `${canonical}/mining` },
    ],
  }

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'What is Blue Tiers?', acceptedAnswer: { '@type': 'Answer', text: 'Blue Tiers is the #1 Minecraft PvP tier list, ranking players across all gamemodes including Crystal, Sword, UHC, and Bedwars.' } },
      { '@type': 'Question', name: 'How do I get ranked on Blue Tiers?', acceptedAnswer: { '@type': 'Answer', text: 'Join our Discord server and apply for a rank. Our staff team will review your gameplay and assign you the appropriate tier.' } },
      { '@type': 'Question', name: 'Is Blue Tiers free?', acceptedAnswer: { '@type': 'Answer', text: 'Yes! Viewing rankings and applying for a tier is completely free.' } },
    ],
  }

  const jsonStr = JSON.stringify([schema, breadcrumbs, faq], null, 2)

  return (
    <div className="space-y-6">
      <InfoBox icon="📐" color="purple">
        <strong className="text-white">Rich Results = your site stands out in Google.</strong> Structured data (JSON-LD) is special code that helps Google understand your content deeply. In return, Google can show your site with extra info like FAQs, breadcrumbs, and sitelinks — making you look bigger and more trustworthy in results.
      </InfoBox>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { type: 'WebSite', desc: 'Tells Google this is your official site', icon: '🌐', benefit: 'Sitelinks & search box in Google', color: '#00BFFF' },
          { type: 'BreadcrumbList', desc: 'Shows page hierarchy in results', icon: '🔗', benefit: 'Breadcrumbs shown under your link', color: '#8b5cf6' },
          { type: 'FAQPage', desc: 'FAQ questions in search results', icon: '❓', benefit: 'FAQ dropdown shown on Google', color: '#22c55e' },
        ].map(s => (
          <div key={s.type} className="p-4 rounded-xl border bg-white/2 border-white/8 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{s.icon}</span>
              <span className="text-white text-xs font-bold">{s.type}</span>
            </div>
            <p className="text-gray-600 text-[10px]">{s.desc}</p>
            <div className="p-2 rounded-lg text-[9px]" style={{ background: `${s.color}10`, color: s.color }}>
              ✨ {s.benefit}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-white font-bold text-sm">Your Generated JSON-LD Code</h3>
            <p className="text-gray-500 text-[10px] mt-0.5">Auto-generated from your settings and already injected into every page</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { navigator.clipboard.writeText(jsonStr); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all">
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
            <a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-all">
              Test ↗
            </a>
          </div>
        </div>
        <pre className="bg-black/30 rounded-xl p-4 text-[10px] font-mono text-[#7dd3fc] overflow-auto max-h-72 border border-white/5">{jsonStr}</pre>
        <div className="p-3 rounded-xl bg-white/2 border border-white/6 text-[11px] text-gray-400">
          ✅ This code is automatically injected into your site's <code className="font-mono bg-white/10 px-1 rounded">&lt;head&gt;</code> tag on every page. You don't need to do anything — it's already live.
        </div>
      </div>

      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-3">
        <h3 className="text-white font-bold text-sm">Test Your Rich Results</h3>
        <p className="text-gray-500 text-xs">Use Google's own tools to check that your structured data is valid.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { label: 'Google Rich Results Test', url: 'https://search.google.com/test/rich-results', icon: '🔍', desc: 'Official Google validator' },
            { label: 'Schema.org Validator', url: 'https://validator.schema.org/', icon: '✅', desc: 'Checks schema accuracy' },
          ].map(t => (
            <a key={t.label} href={t.url} target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/8 hover:bg-white/5 hover:border-white/15 transition-all group">
              <span className="text-xl">{t.icon}</span>
              <div>
                <p className="text-white font-semibold text-xs group-hover:text-[#00BFFF] transition-all">{t.label}</p>
                <p className="text-gray-600 text-[10px] mt-0.5">{t.desc}</p>
              </div>
            </a>
          ))}
        </div>
        <p className="text-gray-600 text-[10px]">To test: copy your site's URL into the Rich Results Test tool and it will show you exactly which rich result types your site qualifies for.</p>
      </div>
    </div>
  )
}

// ─── Backlinks Tab ────────────────────────────────────────────────────────────

function BacklinksTab({ cfg }: { cfg: Cfg }) {
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('pub_backlinks') || '{}') } catch { return {} }
  })

  function toggle(id: string) {
    const next = { ...done, [id]: !done[id] }
    setDone(next)
    localStorage.setItem('pub_backlinks', JSON.stringify(next))
  }

  const checked = Object.values(done).filter(Boolean).length

  const SOURCES = [
    {
      cat: '🎮 Minecraft Communities', color: '#22c55e',
      items: [
        { id: 'mc-forum', title: 'Minecraft Forums', desc: 'Post your site in the "Server Listings" or "Community Projects" section.', url: 'https://www.minecraftforum.net/', effort: 'Easy' },
        { id: 'hypixel', title: 'Hypixel Forums', desc: 'Share your tier list in the "General Discussion" or "PvP" subforum.', url: 'https://hypixel.net/', effort: 'Easy' },
        { id: 'pvpland', title: 'PvPland / MC Community Sites', desc: 'Get listed on Minecraft server listing sites by searching "minecraft server list" and submitting.', url: 'https://www.minecraft-server-list.com/', effort: 'Medium' },
        { id: 'namemc', title: 'NameMC Community', desc: 'Create a NameMC presence and link back to your site from your page.', url: 'https://namemc.com/', effort: 'Easy' },
      ],
    },
    {
      cat: '💬 Reddit', color: '#ff6314',
      items: [
        { id: 'r-minecraft', title: 'r/Minecraft', desc: 'Share your tier list with context. Post "I made a PvP tier list for the community" — be genuine, not spammy.', url: 'https://reddit.com/r/Minecraft', effort: 'Easy' },
        { id: 'r-pvp', title: 'r/CompetitiveMinecraft', desc: 'More niche PvP community — they will appreciate a serious tier list.', url: 'https://reddit.com/r/CompetitiveMinecraft', effort: 'Easy' },
        { id: 'r-mcpvp', title: 'r/MCPVP', desc: 'Dedicated PvP subreddit.', url: 'https://reddit.com/r/MCPVP', effort: 'Easy' },
      ],
    },
    {
      cat: '🎥 YouTube & Twitch', color: '#ff0000',
      items: [
        { id: 'yt-desc', title: 'YouTube Video Descriptions', desc: 'If any popular Minecraft YouTuber features your tier list, ask them to add your URL in the description.', url: null, effort: 'Hard' },
        { id: 'yt-own', title: 'Your Own YouTube Channel', desc: 'Create a YouTube video "Revealing the Official PvP Tier List" and link your site. Very effective!', url: 'https://youtube.com', effort: 'Hard' },
        { id: 'twitch-panels', title: 'Twitch Stream Panels', desc: 'If streamers are on your tier list, ask them to link your site in their Twitch panels.', url: null, effort: 'Medium' },
      ],
    },
    {
      cat: '🌐 General Directories', color: '#00BFFF',
      items: [
        { id: 'google-biz', title: 'Google Business Profile', desc: 'Create a free Google Business Profile for Blue Tiers. It creates an instant backlink from Google itself.', url: 'https://business.google.com/', effort: 'Easy' },
        { id: 'github', title: 'GitHub', desc: 'Create a GitHub profile for Blue Tiers, add your site URL. GitHub links are indexed by Google.', url: 'https://github.com', effort: 'Easy' },
        { id: 'twitter-bio', title: 'Twitter/X Bio', desc: 'Add your website URL to your Twitter bio. Social profiles show up in Google.', url: 'https://twitter.com', effort: 'Easy' },
        { id: 'linktree', title: 'Linktree / Beacons', desc: 'Create a link-in-bio page listing all your links. These pages get indexed.', url: 'https://linktr.ee', effort: 'Easy' },
      ],
    },
    {
      cat: '💎 Discord Strategy', color: '#5865F2',
      items: [
        { id: 'discord-own', title: 'Your Discord Server', desc: 'Put your website in the #links or #info channel. Pin it. Add it to the server description.', url: null, effort: 'Easy' },
        { id: 'discord-other', title: 'Other Minecraft Servers\' Discords', desc: 'With permission from mods, share your tier list in relevant channels of popular Minecraft Discord servers.', url: null, effort: 'Medium' },
        { id: 'discord-streamer', title: 'PvP Streamers & Content Creators', desc: 'DM top PvP creators and ask them to share your tier list. Offer to feature them or their viewers.', url: null, effort: 'Medium' },
      ],
    },
  ]

  const total = SOURCES.flatMap(s => s.items).length

  return (
    <div className="space-y-6">
      <InfoBox icon="🔗" color="purple">
        <strong className="text-white">Backlinks are the #1 way to move up in Google rankings.</strong> A "backlink" is when another website links to yours. Google sees this as a vote of confidence — the more quality sites that link to you, the higher Google ranks you. Think of it like getting recommendations from popular people.
      </InfoBox>

      {/* Progress */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-white text-sm font-bold">Your Backlink Progress</p>
          <span className="text-gray-400 text-xs">{checked}/{total} sources completed</span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full rounded-full bg-[#00BFFF] transition-all duration-500" style={{ width: `${(checked / total) * 100}%` }} />
        </div>
        {checked === 0 && <p className="text-gray-600 text-[10px] mt-2">Start with the "Easy" ones — they take 2–5 minutes each</p>}
        {checked > 0 && checked < 5 && <p className="text-gray-500 text-[10px] mt-2">Good start! The more you tick off, the faster Google ranks you.</p>}
        {checked >= 5 && <p className="text-green-400 text-[10px] mt-2">🚀 You're building serious backlink momentum!</p>}
      </div>

      <InfoBox icon="💡" color="yellow">
        <strong className="text-white">Pro tip:</strong> Focus on "Easy" ones first — they take 2–5 minutes and still help. Each checkmark here represents a real website linking back to you. Try to get at least 10 before expecting to see results.
      </InfoBox>

      {SOURCES.map(group => (
        <div key={group.cat} className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-3">
          <h3 className="text-white font-bold text-sm">{group.cat}</h3>
          <div className="space-y-2">
            {group.items.map(item => (
              <div key={item.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${done[item.id] ? 'bg-green-500/5 border-green-500/15' : 'bg-white/2 border-white/6 hover:bg-white/4'}`}
                onClick={() => toggle(item.id)}>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${done[item.id] ? 'bg-green-500 border-green-500' : 'border-white/20'}`}>
                  {done[item.id] && <span className="text-white text-[9px] font-black">✓</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-bold text-xs ${done[item.id] ? 'text-green-400 line-through opacity-70' : 'text-white'}`}>{item.title}</p>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${item.effort === 'Easy' ? 'bg-green-500/15 text-green-400' : item.effort === 'Medium' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-red-500/15 text-red-400'}`}>
                      {item.effort}
                    </span>
                  </div>
                  <p className="text-gray-500 text-[11px] mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-white/6 border border-white/10 text-gray-500 hover:text-[#00BFFF] hover:bg-[#00BFFF]/10 transition-all shrink-0">
                    Open ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <InfoBox icon="⚠️" color="orange">
        <strong className="text-white">Important:</strong> Never buy backlinks or use link farms. Google detects this and will penalize your site — pushing you to the bottom. Only get backlinks naturally by sharing genuinely useful content and asking real people.
      </InfoBox>
    </div>
  )
}

// ─── Checklist Tab ────────────────────────────────────────────────────────────

const CHECKLIST = [
  { id: 'publish',    cat: '🚀 First Steps',      label: 'Publish your site on a real domain (e.g. bluetiers.gg)',          desc: 'Without a real domain, Google won\'t take you seriously', link: '' },
  { id: 'title',      cat: '🏷️ Meta Tags',         label: 'Write your page title (50–60 characters)',                         desc: 'This is the blue headline Google shows', link: '' },
  { id: 'desc',       cat: '🏷️ Meta Tags',         label: 'Write your meta description (150–160 characters)',                  desc: 'This is the text under your title on Google', link: '' },
  { id: 'keywords',   cat: '🏷️ Meta Tags',         label: 'Add relevant keywords (comma-separated)',                           desc: 'Helps Google understand your topic', link: '' },
  { id: 'canonical',  cat: '🏷️ Meta Tags',         label: 'Set your canonical URL to your live domain',                       desc: 'Your official website address', link: '' },
  { id: 'ogimage',    cat: '👁️ Social',             label: 'Upload an OG image (1200×630px)',                                  desc: 'Makes your links look great when shared', link: '' },
  { id: 'twitter',    cat: '👁️ Social',             label: 'Test your Twitter card preview',                                   desc: 'Check the Social Preview tab', link: 'https://cards-dev.twitter.com/validator' },
  { id: 'ga4',        cat: '📊 Analytics',         label: 'Connect Google Analytics 4',                                       desc: 'Track your visitor count and behaviour', link: '' },
  { id: 'gsc',        cat: '📊 Analytics',         label: 'Verify site in Google Search Console',                             desc: 'Register with Google — essential step', link: 'https://search.google.com/search-console/' },
  { id: 'sitemap',    cat: '⚙️ Technical',         label: 'Generate sitemap.xml and submit to GSC',                           desc: 'Tells Google about all your pages', link: '' },
  { id: 'robots',     cat: '⚙️ Technical',         label: 'Configure robots.txt (use the Recommended preset)',                desc: 'Tells bots what they can crawl', link: '' },
  { id: 'pagespeed',  cat: '⚙️ Technical',         label: 'Score 85+ on PageSpeed Insights',                                  desc: 'Slow sites rank lower', link: 'https://pagespeed.web.dev/' },
  { id: 'mobile',     cat: '⚙️ Technical',         label: 'Pass Google Mobile-Friendly Test',                                 desc: 'Most users browse on mobile', link: 'https://search.google.com/test/mobile-friendly' },
  { id: 'schema',     cat: '📐 Rich Results',      label: 'Validate JSON-LD structured data',                                 desc: 'Enables rich results in Google search', link: 'https://search.google.com/test/rich-results' },
  { id: 'backlink-1', cat: '🔗 Backlinks',         label: 'Post on Reddit (r/Minecraft or r/CompetitiveMinecraft)',          desc: 'Easy backlink from a trusted site', link: 'https://reddit.com/r/CompetitiveMinecraft' },
  { id: 'backlink-2', cat: '🔗 Backlinks',         label: 'Create a Google Business Profile',                                 desc: 'Free backlink from Google itself', link: 'https://business.google.com/' },
  { id: 'backlink-3', cat: '🔗 Backlinks',         label: 'Add your site to your Discord server\'s info',                    desc: 'Your community creates organic traffic', link: '' },
  { id: 'backlink-4', cat: '🔗 Backlinks',         label: 'Get listed on 3+ Minecraft community sites',                      desc: 'Multiple backlinks = faster ranking', link: '' },
  { id: 'content-1',  cat: '📝 Content',           label: 'Update your tier rankings at least monthly',                       desc: 'Fresh content = Google loves you more', link: '' },
  { id: 'content-2',  cat: '📝 Content',           label: 'Create an About or FAQ page',                                      desc: 'Helps trust and answers search questions', link: '' },
  { id: 'discord',    cat: '🌐 Community',         label: 'Make sure Discord link is visible on your site',                  desc: 'Community engagement boosts trust', link: '' },
]

function ChecklistTab() {
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('pub_checklist') || '{}') } catch { return {} }
  })

  function toggle(id: string) {
    const next = { ...done, [id]: !done[id] }
    setDone(next)
    localStorage.setItem('pub_checklist', JSON.stringify(next))
  }

  const cats = [...new Set(CHECKLIST.map(i => i.cat))]
  const total   = CHECKLIST.length
  const checked = Object.values(done).filter(Boolean).length
  const pct     = Math.round((checked / total) * 100)
  const scoreColor = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="space-y-6">
      <InfoBox icon="✅" color="green">
        <strong className="text-white">This is your master to-do list for reaching Google's first page.</strong> Tick things off as you complete them. Aim for 80%+ to see serious results. Start with the ones at the top — they have the biggest impact.
      </InfoBox>

      {/* Progress */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-white font-bold">Your SEO Progress</h3>
            <p className="text-gray-600 text-[10px] mt-0.5">{checked} of {total} tasks completed</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black" style={{ color: scoreColor }}>{pct}%</span>
            <p className="text-gray-600 text-[10px]">{pct >= 80 ? 'Excellent! 🏆' : pct >= 50 ? 'Good progress 📈' : pct >= 25 ? 'Keep going 💪' : 'Just getting started 🚀'}</p>
          </div>
        </div>
        <div className="h-3 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: scoreColor }} />
        </div>
        {pct < 100 && (
          <p className="text-gray-600 text-[10px] mt-2">{total - checked} tasks remaining to reach 100%</p>
        )}
      </div>

      {/* Categories */}
      {cats.map(cat => {
        const items = CHECKLIST.filter(i => i.cat === cat)
        const catDone = items.filter(i => done[i.id]).length
        return (
          <div key={cat} className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-sm">{cat}</h3>
              <span className={`text-[10px] font-semibold ${catDone === items.length ? 'text-green-400' : 'text-gray-500'}`}>
                {catDone}/{items.length} {catDone === items.length ? '✓ Complete!' : ''}
              </span>
            </div>
            {items.map(item => (
              <div key={item.id} onClick={() => toggle(item.id)}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all group ${done[item.id] ? 'bg-green-500/5 border-green-500/10' : 'border-white/5 hover:bg-white/3 hover:border-white/10'}`}>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${done[item.id] ? 'bg-green-500 border-green-500' : 'border-white/20 group-hover:border-white/40'}`}>
                  {done[item.id] && <span className="text-white text-[9px] font-black">✓</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold transition-all ${done[item.id] ? 'text-gray-600 line-through' : 'text-gray-200'}`}>{item.label}</p>
                  <p className="text-gray-600 text-[10px] mt-0.5">{item.desc}</p>
                </div>
                {item.link && (
                  <a href={item.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                    className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-gray-600 hover:text-[#00BFFF] hover:bg-[#00BFFF]/10 transition-all shrink-0">
                    ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function PublishManager({ admin }: Props) {
  const [tab, setTab]                 = useState('overview')
  const [cfg, setCfg]                 = useState(buildCfg)
  const [saving, setSaving]           = useState(false)
  const [sitemapDone, setSitemapDone] = useState(() => !!localStorage.getItem('pub_sitemap_done'))
  const [toast, setToast]             = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)

  function showToast(msg: string, type: 'success' | 'error' | 'info') { setToast({ msg, type }) }

  async function handleSave() {
    setSaving(true)
    try {
      const existing = getSiteContent()
      saveSiteContent({ ...existing, ...cfg })
      await savePublishConfig({
        data: {
          canonicalUrl: cfg.canonicalUrl, ga4Id: cfg.ga4Id,
          gscVerificationTag: cfg.gscVerificationTag, seoTitle: cfg.seoTitle,
          seoDescription: cfg.seoDescription, seoKeywords: cfg.seoKeywords,
          ogImageUrl: cfg.ogImageUrl,
        },
      })
      addLog(admin, 'publish-config', 'Saved publish / SEO settings')
      showToast('✓ Saved! Your changes are now live on Google.', 'success')
    } catch (e: any) {
      showToast('Save failed: ' + e.message, 'error')
    } finally { setSaving(false) }
  }

  const activeTab = TABS.find(t => t.id === tab)

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-white font-black text-lg flex items-center gap-2">
            🚀 Publish & SEO Hub
          </h2>
          <p className="text-gray-500 text-xs mt-0.5">Everything you need to get Blue Tiers on Google's first page — in plain English</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {(() => {
            const { score } = calcScore({ ...cfg, sitemapDone })
            const c = score >= 80 ? 'text-green-400 bg-green-500/10 border-green-500/20' : score >= 60 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' : 'text-orange-400 bg-orange-500/10 border-orange-500/20'
            return <span className={`px-3 py-1.5 rounded-full font-bold border ${c}`}>Score: {score}/100</span>
          })()}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
              tab === t.id
                ? 'bg-[#00BFFF]/15 border-[#00BFFF]/30 text-[#00BFFF]'
                : 'bg-white/2 border-white/8 text-gray-500 hover:text-gray-300 hover:bg-white/4 hover:border-white/15'
            }`}>
            <span className="text-sm leading-none">{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Section label */}
      {activeTab && (
        <div className="flex items-center gap-2 py-1">
          <span className="text-lg">{activeTab.icon}</span>
          <h3 className="text-white font-bold text-sm">{activeTab.label}</h3>
          <div className="flex-1 h-px bg-white/5" />
        </div>
      )}

      {/* Content */}
      {tab === 'overview'  && <OverviewTab     cfg={cfg} sitemapDone={sitemapDone} setTab={setTab} />}
      {tab === 'guide'     && <GoogleGuideTab  cfg={cfg} sitemapDone={sitemapDone} setTab={setTab} />}
      {tab === 'booster'   && <SEOBoosterTab   cfg={cfg} setTab={setTab} />}
      {tab === 'meta'      && <MetaTagsTab     cfg={cfg} setCfg={setCfg} onSave={handleSave} saving={saving} />}
      {tab === 'social'    && <SocialPreviewTab cfg={cfg} />}
      {tab === 'google'    && <GoogleToolsTab  cfg={cfg} setCfg={setCfg} onSave={handleSave} saving={saving} />}
      {tab === 'sitemap'   && <SitemapTab      cfg={cfg} sitemapDone={sitemapDone} setSitemapDone={setSitemapDone} toast={showToast} />}
      {tab === 'robots'    && <RobotsTab       cfg={cfg} toast={showToast} />}
      {tab === 'schema'    && <SchemaTab       cfg={cfg} />}
      {tab === 'backlinks' && <BacklinksTab    cfg={cfg} />}
      {tab === 'checklist' && <ChecklistTab />}
    </div>
  )
}
