import { useEffect, useState } from 'react'

export interface ShopToastData {
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

interface Props {
  toast: ShopToastData | null
  onClear: () => void
}

const ICONS = {
  success: '✅',
  error:   '❌',
  info:    '💎',
  warning: '⚠️',
}

const COLORS = {
  success: 'border-green-500/30 bg-green-500/10 text-green-400',
  error:   'border-red-500/30 bg-red-500/10 text-red-400',
  info:    'border-[#00BFFF]/30 bg-[#00BFFF]/10 text-[#00BFFF]',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
}

export function ShopToast({ toast, onClear }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (toast) {
      setVisible(true)
      const t = setTimeout(() => {
        setVisible(false)
        setTimeout(onClear, 300)
      }, 3500)
      return () => clearTimeout(t)
    }
  }, [toast, onClear])

  if (!toast) return null

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border backdrop-blur-md shadow-xl transition-all duration-300 max-w-sm w-full mx-4 ${COLORS[toast.type]} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <span className="text-lg shrink-0">{ICONS[toast.type]}</span>
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button
        onClick={() => { setVisible(false); setTimeout(onClear, 300) }}
        className="text-current opacity-50 hover:opacity-100 transition-opacity shrink-0 text-xs"
      >
        ✕
      </button>
    </div>
  )
}
