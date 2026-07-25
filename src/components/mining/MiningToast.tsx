import { useEffect, useState } from 'react'
import { useMining } from '../../context/MiningContext'

export function MiningToast() {
  const { toast, clearToast } = useMining()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (toast) {
      setVisible(true)
    } else {
      setVisible(false)
    }
  }, [toast])

  if (!toast) return null

  const colors = {
    success: 'border-green-500/30 bg-green-500/10 text-green-300',
    error:   'border-red-500/30 bg-red-500/10 text-red-300',
    info:    'border-[#00BFFF]/30 bg-[#00BFFF]/10 text-[#00BFFF]',
  }[toast.type]

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
      <div
        className={`flex items-center gap-3 px-5 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl shadow-black/60 text-sm font-medium transition-all duration-300 pointer-events-auto ${colors} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{ maxWidth: '90vw' }}
      >
        <span>{toast.message}</span>
        <button
          onClick={clearToast}
          className="ml-2 opacity-60 hover:opacity-100 transition-opacity text-xs"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
