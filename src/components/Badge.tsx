export function Badge() {
  return (
    <span className="relative inline-flex items-center justify-center px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-[#0066FF] to-[#00BFFF] text-white shadow-[0_0_15px_rgba(0,191,255,0.3)] border border-[#00BFFF]/30 animate-[pulse_3s_infinite] select-none tracking-wide">
      <span className="absolute inset-0 rounded-full bg-[#00BFFF]/20 blur-sm -z-10" />
      Registrations Closing Soon
    </span>
  )
}
