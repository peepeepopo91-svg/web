import { EVENT } from '../data/event'

interface CTAButtonProps {
  isDisabled?: boolean
}

export function CTAButton({ isDisabled = false }: CTAButtonProps) {
  if (isDisabled) {
    return (
      <div
        className="relative inline-flex items-center gap-2.5 px-6 py-3 rounded-full text-sm font-extrabold text-gray-400 bg-gray-800/80 border border-gray-700/50 shadow-[0_4px_15px_rgba(0,0,0,0.25)] select-none cursor-not-allowed overflow-hidden"
      >
        <span className="relative z-10 font-['Space_Grotesk'] tracking-wider uppercase">
          {EVENT.closedButtonText}
        </span>
      </div>
    )
  }

  return (
    <a
      href={EVENT.buttonLink}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative inline-flex items-center gap-2.5 px-6 py-3 rounded-full text-sm font-extrabold text-white bg-gradient-to-r from-[#0066FF] via-[#0099FF] to-[#00BFFF] shadow-[0_4px_20px_rgba(0,102,255,0.3)] hover:shadow-[0_4px_25px_rgba(0,191,255,0.6)] transition-all duration-300 hover:-translate-y-0.5 overflow-hidden active:scale-95"
    >
      {/* Gloss/Shine effect */}
      <span className="absolute inset-0 w-1/2 h-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:animate-[shine_0.8s_ease-out_forwards]" />
      
      {/* Background radial glow */}
      <span className="absolute inset-0 bg-[#00BFFF] opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-md -z-10" />

      <span className="relative z-10 font-['Space_Grotesk'] tracking-wider uppercase">
        {EVENT.buttonText}
      </span>
      
      {/* Arrow icon */}
      <svg
        className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300 relative z-10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
      </svg>
    </a>
  )
}
