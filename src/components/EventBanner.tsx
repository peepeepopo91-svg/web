import { useEffect, useRef, useState } from 'react'
import { Badge } from './Badge'
import { CountdownTimer } from './CountdownTimer'
import { CTAButton } from './CTAButton'
import { EVENT } from '../data/event'

export function EventBanner() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = canvas.offsetWidth)
    let height = (canvas.height = canvas.offsetHeight)

    // Handle resize
    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = canvas.offsetWidth
      height = canvas.height = canvas.offsetHeight
    }
    window.addEventListener('resize', handleResize)

    // Particle class
    class Particle {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      color: string
      opacity: number

      constructor() {
        this.x = Math.random() * width
        this.y = Math.random() * height
        this.size = Math.random() * 1.5 + 0.5
        this.speedX = (Math.random() - 0.5) * 0.3
        this.speedY = (Math.random() - 0.5) * 0.3
        this.opacity = Math.random() * 0.5 + 0.2
        this.color = `rgba(0, 191, 255, ${this.opacity})` // Blue Tiers Brand Blue
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY

        if (this.x < 0 || this.x > width) this.speedX *= -1
        if (this.y < 0 || this.y > height) this.speedY *= -1
      }

      draw(context: CanvasRenderingContext2D) {
        context.beginPath()
        context.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        context.fillStyle = this.color
        context.fill()
      }
    }

    const particles: Particle[] = []
    const particleCount = 20
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle())
    }

    // Animation Loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height)
      particles.forEach((particle) => {
        particle.update()
        particle.draw(ctx)
      })
      animationFrameId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  // Parse title to extract "Blue Network" styling if present
  const renderTitle = () => {
    const defaultPrefix = "Blue Network"
    if (EVENT.title.startsWith(defaultPrefix)) {
      const remaining = EVENT.title.substring(defaultPrefix.length)
      return (
        <>
          <span className="text-[#00BFFF] drop-shadow-[0_0_8px_rgba(0,191,255,0.4)]">{defaultPrefix}</span>
          {remaining}
        </>
      )
    }
    return EVENT.title
  }

  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-r from-[#070b12] via-[#09152a] to-[#070b12] border-b border-[#00BFFF]/15 px-4 py-4 md:py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8 shadow-[0_4px_30px_rgba(0,191,255,0.05)] select-none animate-[fadeIn_0.8s_ease-out] z-50">
      {/* Dynamic particles background */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-60" />

      {/* Radial soft glows */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-48 h-48 bg-[#0066FF]/5 blur-[60px] pointer-events-none rounded-full" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-48 h-48 bg-[#00BFFF]/5 blur-[60px] pointer-events-none rounded-full" />

      {/* Left side: branding & event info */}
      <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2 md:gap-1 relative z-10 md:pl-4">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
          <h2 className="font-['Space_Grotesk'] font-black text-sm sm:text-base md:text-lg text-white tracking-widest uppercase select-none">
            {renderTitle()}
          </h2>
          <div className="hidden sm:block">
            <Badge />
          </div>
        </div>
        <p className="text-xs sm:text-sm font-medium text-gray-400 font-['Inter']">
          {isExpired ? "Registrations are now closed." : EVENT.subtitle}
        </p>
        <div className="sm:hidden mt-1">
          <Badge />
        </div>
      </div>

      {/* Center: Live countdown */}
      <div className="relative z-10 w-full md:w-auto">
        <CountdownTimer onExpire={setIsExpired} />
      </div>

      {/* Right side: Action CTA */}
      <div className="relative z-10 md:pr-4 flex justify-center items-center">
        <CTAButton isDisabled={isExpired} />
      </div>
    </div>
  )
}
