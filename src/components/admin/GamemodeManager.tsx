import { useState, useRef } from 'react'
import { getGamemodes, saveGamemodes, resetGamemodes } from '../../store/playersStore'
import type { Gamemode } from '../../data/gamemodes'
import { addLog } from '../../store/adminStore'
import { uploadGamemodeIcon } from '../../server/gamemodeIconServer'

interface Props { admin: string }

function AdminToast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-xl border ${
      type === 'success'
        ? 'bg-green-500/15 border-green-500/30 text-green-400'
        : 'bg-red-500/15 border-red-500/30 text-red-400'
    }`}>
      {type === 'success' ? '✓ ' : '⚠ '}{msg}
    </div>
  )
}

const BLANK_GAMEMODE: Gamemode = {
  key: '',
  label: '',
  icon: '',
  fallback: '🎮',
}

function toDataKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
}

export function GamemodeManager({ admin }: Props) {
  const [modes, setModes]       = useState<Gamemode[]>(getGamemodes)
  const [editing, setEditing]   = useState<Gamemode | null>(null)
  const [isNew, setIsNew]       = useState(false)
  const [toast, setToast]       = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showConfirmReset, setShowConfirmReset] = useState(false)
  const [keyWasEdited, setKeyWasEdited] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function showToastMsg(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function persist(updated: Gamemode[]) {
    setModes(updated)
    saveGamemodes(updated)
  }

  function handleSaveEdit() {
    if (!editing) return
    const label = editing.label.trim()
    const key = editing.key.trim() || toDataKey(label)
    if (!label) {
      showToastMsg('Display label is required.', 'error')
      return
    }
    if (!key) {
      showToastMsg('Enter a display label so a data key can be generated.', 'error')
      return
    }
    if (!/^[a-z][a-z0-9_]*$/.test(key)) {
      showToastMsg('Data key must start with a letter and use only lowercase letters, numbers, or underscores.', 'error')
      return
    }
    if (isNew && modes.find(m => m.key === key)) {
      showToastMsg('A gamemode with this key already exists.', 'error')
      return
    }
    const saved = { ...editing, key, label, icon: editing.icon.trim(), fallback: editing.fallback.trim() || '🎮' }
    const updated = isNew
      ? [...modes, saved]
      : modes.map(m => m.key === editing.key ? saved : m)
    persist(updated)
    addLog(admin, isNew ? 'gamemode:add' : 'gamemode:edit', `${saved.label} (${saved.key})`)
    setEditing(null)
    showToastMsg(`Gamemode "${saved.label}" ${isNew ? 'added' : 'updated'}.`)
  }

  function handleDelete(key: string) {
    const gm = modes.find(m => m.key === key)
    persist(modes.filter(m => m.key !== key))
    setDeleteTarget(null)
    addLog(admin, 'gamemode:delete', `Deleted ${gm?.label ?? key}`)
    showToastMsg(`Gamemode deleted.`)
  }

  function moveUp(key: string) {
    const idx = modes.findIndex(m => m.key === key)
    if (idx === 0) return
    const updated = [...modes]
    ;[updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]]
    persist(updated)
  }

  function moveDown(key: string) {
    const idx = modes.findIndex(m => m.key === key)
    if (idx === modes.length - 1) return
    const updated = [...modes]
    ;[updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]]
    persist(updated)
  }

  function handleReset() {
    resetGamemodes()
    setModes(getGamemodes())
    setShowConfirmReset(false)
    addLog(admin, 'gamemode:edit', 'Reset gamemodes to defaults')
    showToastMsg('Gamemodes reset to defaults.')
  }

  async function handleIconUpload(file: File) {
    if (!editing) return
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
      showToastMsg('Only PNG, JPG, GIF, or WebP images are supported.', 'error')
      return
    }
    const key = editing.key || toDataKey(editing.label) || 'icon'
    setUploading(true)
    try {
      const b64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => res(reader.result as string)
        reader.onerror = rej
        reader.readAsDataURL(file)
      })
      const result = await uploadGamemodeIcon({ data: { key, base64: b64, ext } })
      setEditing(prev => prev ? { ...prev, icon: result.path } : prev)
      showToastMsg('Icon uploaded successfully.')
    } catch (e) {
      showToastMsg(`Upload failed: ${(e as Error).message}`, 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {toast && <AdminToast msg={toast.msg} type={toast.type} />}

      <div className="flex gap-3">
        <button
          onClick={() => { setEditing({ ...BLANK_GAMEMODE }); setKeyWasEdited(false); setIsNew(true) }}
          className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
        >
          + Add Gamemode
        </button>
        <button
          onClick={() => setShowConfirmReset(true)}
          className="px-5 py-2.5 rounded-xl text-sm text-gray-400 border border-white/10 hover:border-white/20 hover:text-white transition-all"
        >
          Reset to Defaults
        </button>
      </div>

      {/* Gamemode list */}
      <div className="glass rounded-2xl border border-white/8 divide-y divide-white/5 overflow-hidden">
        {modes.length === 0 && (
          <div className="py-12 text-center text-gray-600 text-sm">No gamemodes configured.</div>
        )}
        {modes.map((gm, i) => (
          <div key={gm.key} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/2 transition-colors">
            {/* Reorder */}
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveUp(gm.key)} disabled={i === 0} className="text-gray-700 hover:text-white disabled:opacity-20 text-xs leading-none px-0.5">▲</button>
              <button onClick={() => moveDown(gm.key)} disabled={i === modes.length - 1} className="text-gray-700 hover:text-white disabled:opacity-20 text-xs leading-none px-0.5">▼</button>
            </div>
            {/* Icon */}
            {gm.icon ? (
              <img src={gm.icon} alt={gm.label} className="w-7 h-7 rounded-md object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : (
              <span className="text-xl w-7 text-center">{gm.fallback}</span>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">{gm.label}</p>
              <p className="text-gray-600 text-xs font-mono">key: {gm.key} · {gm.icon}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setEditing({ ...gm }); setIsNew(false) }}
                className="px-3 py-1.5 rounded-lg text-xs text-[#00BFFF] border border-[#00BFFF]/20 hover:bg-[#00BFFF]/10 transition-all"
              >
                Edit
              </button>
              <button
                onClick={() => setDeleteTarget(gm.key)}
                className="px-3 py-1.5 rounded-lg text-xs text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass rounded-2xl border border-white/10 p-6 w-full max-w-md space-y-4">
            <h3 className="text-white font-bold text-lg">{isNew ? 'Add Gamemode' : `Edit: ${editing.label}`}</h3>

            <div>
              <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1.5">Data Key</label>
              {isNew ? (
                <>
                  <input
                    type="text"
                    value={editing.key}
                    onChange={e => { setKeyWasEdited(true); setEditing(prev => prev ? { ...prev, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') } : prev) }}
                    placeholder="Generated from display label"
                    className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#00BFFF]/40"
                  />
                  <p className="text-[11px] text-gray-600 mt-1.5">This is generated automatically from the display label. Edit it only if needed.</p>
                </>
              ) : (
                <input value={editing.key} readOnly className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-gray-400 text-sm" />
              )}
            </div>

            {/* Display Label */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1.5">Display Label</label>
              <input
                type="text"
                value={editing.label}
                onChange={e => setEditing(prev => {
                  if (!prev) return prev
                  const value = e.target.value
                  const next = { ...prev, label: value }
                  if (isNew && !keyWasEdited) next.key = toDataKey(value)
                  return next
                })}
                placeholder="Sword"
                className="w-full bg-white/3 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/40 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all placeholder-gray-700"
              />
            </div>

            {/* Icon */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2">Icon</label>
              <div className="flex gap-3 mb-2.5">
                {/* Live preview */}
                <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                  {editing.icon
                    ? <img src={editing.icon} alt="preview"
                        style={{ width: `${editing.iconSize ?? 18}px`, height: `${editing.iconSize ?? 18}px`, imageRendering: 'pixelated' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    : <span className="text-2xl">{editing.fallback || '🎮'}</span>
                  }
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-3 py-2 rounded-lg text-xs text-[#00BFFF] border border-[#00BFFF]/20 hover:bg-[#00BFFF]/10 transition-all disabled:opacity-50 text-left"
                  >
                    {uploading ? '⏳ Uploading…' : '⬆ Upload Image'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleIconUpload(f); e.target.value = '' }}
                  />
                  <input
                    type="text"
                    value={editing.icon}
                    onChange={e => setEditing(prev => prev ? { ...prev, icon: e.target.value } : prev)}
                    placeholder="/icons/Sword.png"
                    className="w-full bg-white/3 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/40 rounded-xl px-3 py-2 text-white text-xs font-mono outline-none transition-all placeholder-gray-700"
                  />
                </div>
              </div>
              {/* Size slider */}
              <div className="bg-white/3 rounded-xl px-3 py-2.5 border border-white/8">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500">Icon Size</span>
                  <span className="text-xs text-gray-300 font-mono">{editing.iconSize ?? 18}px</span>
                </div>
                <input
                  type="range" min={12} max={40} step={1}
                  value={editing.iconSize ?? 18}
                  onChange={e => setEditing(prev => prev ? { ...prev, iconSize: Number(e.target.value) } : prev)}
                  className="w-full accent-[#00BFFF]"
                />
                <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                  <span>12px</span><span>default: 18px</span><span>40px</span>
                </div>
              </div>
            </div>

            {/* Fallback Emoji */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1.5">Fallback Emoji</label>
              <input
                type="text"
                value={editing.fallback}
                onChange={e => setEditing(prev => prev ? { ...prev, fallback: e.target.value } : prev)}
                placeholder="⚔"
                className="w-full bg-white/3 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/40 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all placeholder-gray-700"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditing(null)} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-white/10 hover:bg-white/5">Cancel</button>
              <button onClick={handleSaveEdit} className="flex-1 py-2.5 rounded-xl text-sm font-semibold btn-primary text-white">
                {isNew ? 'Add Gamemode' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass rounded-2xl border border-red-500/20 p-6 max-w-sm w-full text-center">
            <div className="text-4xl mb-3">🎮</div>
            <h3 className="text-white font-bold text-lg mb-2">Delete Gamemode?</h3>
            <p className="text-gray-500 text-sm mb-6">This removes <strong className="text-white">"{modes.find(m => m.key === deleteTarget)?.label}"</strong> from the list. Player ranks for this gamemode remain in the data.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-white/10">Cancel</button>
              <button onClick={() => handleDelete(deleteTarget)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-red-400 border border-red-500/30 bg-red-500/10">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset confirm */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass rounded-2xl border border-orange-500/20 p-6 max-w-sm w-full text-center">
            <div className="text-4xl mb-3">🎮</div>
            <h3 className="text-white font-bold text-lg mb-2">Reset Gamemodes?</h3>
            <p className="text-gray-500 text-sm mb-6">All custom gamemode configuration will revert to the defaults in gamemodes.ts.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmReset(false)} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-white/10">Cancel</button>
              <button onClick={handleReset} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-orange-400 border border-orange-500/30 bg-orange-500/10">Reset</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
