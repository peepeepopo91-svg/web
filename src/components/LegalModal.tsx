import { useEffect } from 'react'
import { X } from 'lucide-react'

export type LegalDoc = 'terms' | 'privacy' | 'screenshare'

const DOCS: Record<LegalDoc, { title: string; icon: string; sections: { heading: string; body: string }[] }> = {
  terms: {
    title: 'Terms of Service',
    icon: '📋',
    sections: [
      {
        heading: '1. Acceptance of Terms',
        body: 'By accessing or using Blue Tiers ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms in full, you must not use the Platform. We reserve the right to update these terms at any time; continued use constitutes acceptance of any changes.',
      },
      {
        heading: '2. What Blue Tiers Is',
        body: 'Blue Tiers is a community-driven Minecraft PvP tier list and ranking platform. All tier placements, rankings, and ratings are the subjective decisions of our staff team and are not guarantees of any player\'s in-game skill or performance. Rankings may change at any time without notice.',
      },
      {
        heading: '3. User Conduct',
        body: 'You agree not to: harass, threaten, or abuse other users or staff; attempt to manipulate rankings through dishonest means; create multiple accounts to circumvent bans or restrictions; scrape, copy, or redistribute site data without written permission; or use the Platform for any unlawful purpose.',
      },
      {
        heading: '4. Mining & Economy System',
        body: 'The BlueCoin mining system, Gems, and in-platform economy are virtual systems with no real-world monetary value. Blue Tiers reserves the right to adjust, reset, or discontinue any part of the economy system at any time. Abuse of the economy system, including exploiting bugs, will result in account termination.',
      },
      {
        heading: '5. Shop & Purchases',
        body: 'All shop purchases are for in-game Minecraft items or ranks delivered by staff on the Blue Tiers server. Delivery times may vary. Blue Tiers does not guarantee specific delivery timelines. Items are non-transferable between users. Blue Tiers reserves the right to deny service for violations of these Terms.',
      },
      {
        heading: '6. Intellectual Property',
        body: 'All content on Blue Tiers — including tier lists, design, graphics, and written content — is owned by or licensed to Blue Tiers. You may not reproduce or redistribute any content without explicit written consent. Player usernames used on the site are the property of their respective owners.',
      },
      {
        heading: '7. Disclaimer of Warranties',
        body: 'Blue Tiers is provided "as is" without any warranties, expressed or implied. We do not guarantee uninterrupted access, accuracy of rankings, or fitness for any particular purpose. Your use of the Platform is entirely at your own risk.',
      },
      {
        heading: '8. Termination',
        body: 'Blue Tiers reserves the right to terminate or suspend access to any account at any time, for any reason, including but not limited to violations of these Terms. Upon termination, your right to use the Platform ceases immediately.',
      },
      {
        heading: '9. Contact',
        body: 'For questions regarding these Terms, please contact us via our Discord server. All official communications from Blue Tiers will be made through our verified Discord channels.',
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    icon: '🔒',
    sections: [
      {
        heading: '1. Overview',
        body: 'Blue Tiers respects your privacy. This policy explains what information we collect, how we use it, and your rights regarding your data. By using the Platform, you consent to the practices described here.',
      },
      {
        heading: '2. Information We Collect',
        body: 'We collect only what is necessary to operate the Platform: (a) Usernames you provide when logging into the Mining system. (b) Session data stored securely in signed cookies to keep you logged in. (c) Usage data such as page visits and interactions, collected through Google Analytics 4 in anonymised form. We do not collect real names, email addresses, payment information, or any sensitive personal data.',
      },
      {
        heading: '3. How We Use Your Information',
        body: 'Data is used solely to: operate the mining and economy system under your username; maintain your session so you stay logged in; and understand aggregate site usage to improve the Platform. We do not use your data for advertising, profiling, or any purpose beyond operating Blue Tiers.',
      },
      {
        heading: '4. Cookies',
        body: 'We use a single session cookie to keep you authenticated in the Mining system. This cookie is cryptographically signed and contains no personally identifiable information beyond your chosen username. Google Analytics may set its own cookies for aggregate traffic analysis; these do not identify you personally.',
      },
      {
        heading: '5. Data Sharing',
        body: 'We do not sell, rent, or trade your data to any third party. The only third-party services we use are Google Analytics (aggregate traffic data) and our hosting provider. Neither receives personally identifiable information.',
      },
      {
        heading: '6. Data Retention',
        body: 'Mining account data (username, balance, and mining history) is retained for as long as the Platform operates. You may request deletion of your account data at any time by contacting us on Discord. Session data expires automatically.',
      },
      {
        heading: '7. Security',
        body: 'Passwords are stored using scrypt hashing with unique salts — we cannot read your password. Sessions are protected with HMAC signatures. We apply industry-standard measures to protect your data, though no system is completely immune to security risks.',
      },
      {
        heading: '8. Children\'s Privacy',
        body: 'Blue Tiers is not directed at children under the age of 13. We do not knowingly collect data from children. If you believe a child has provided us information, please contact us on Discord and we will remove it promptly.',
      },
      {
        heading: '9. Changes to This Policy',
        body: 'We may update this Privacy Policy periodically. Changes will be posted on this page. Continued use of the Platform after changes are posted constitutes your acceptance of the updated policy.',
      },
      {
        heading: '10. Contact',
        body: 'For any privacy-related questions or data requests, please reach out via our Discord server. We aim to respond within 48 hours.',
      },
    ],
  },
  screenshare: {
    title: 'Screenshare Rules',
    icon: '🖥️',
    sections: [
      {
        heading: 'Purpose',
        body: 'Blue Tiers uses screenshares to verify the legitimacy of players seeking tier placements. Screenshares help maintain the integrity of our tier list and ensure all rankings are earned fairly. Our screenshare team is trained to detect third-party cheating software and modifications that violate fair play.',
      },
      {
        heading: 'When a Screenshare Is Required',
        body: 'A screenshare may be requested at any time during or after a tier match if staff have reasonable suspicion of cheating. Players seeking tier placements above LT3 may be subject to mandatory screenshares. Refusing a screenshare at any point during an active tier match will be treated as a ban.',
      },
      {
        heading: 'Player Rights During Screenshare',
        body: 'You have the right to: know which staff member is conducting the screenshare; request that the process be paused for a short break (up to 5 minutes, once); and have the screenshare conducted in a professional and respectful manner. Screenshare staff may not demand access to files unrelated to Minecraft or your system\'s cheating profile.',
      },
      {
        heading: 'What Is Checked',
        body: 'Screenshare staff may examine: your Minecraft client files, mods, and resource packs; running processes and recently opened applications; browser history related to cheat downloads; Windows prefetch and recent file activity; and %appdata% and other relevant system folders. All checks are conducted live and verbally explained.',
      },
      {
        heading: 'Prohibited Modifications',
        body: 'The following are strictly prohibited: any autoclicker or click-assist software; kill aura, aim assist, or combat reach modifications; X-ray, speed, or flight hacks; any injection-based or memory-editing software; and any modification not explicitly approved by Blue Tiers staff. Approved mods include: OptiFine, BetterFPS, ToggleSneak, and cosmetic-only mods.',
      },
      {
        heading: 'Refusal & Logging Off',
        body: 'Logging off, disconnecting, or refusing to share your screen after being requested constitutes an automatic ban. Stalling for more than 10 minutes without a valid reason will also be treated as a refusal. Staff will document all interactions and ban reasoning for review.',
      },
      {
        heading: 'Ban Appeals',
        body: 'If you believe you were incorrectly banned following a screenshare, you may submit an appeal through our Discord server within 7 days of the ban. Appeals must include your username, the date of the screenshare, and a written explanation. Ban appeal decisions made by senior staff are final.',
      },
      {
        heading: 'Staff Conduct',
        body: 'Screenshare staff are held to a strict code of conduct. Any staff member found to be abusing their position, leaking private information, or conducting screenshares improperly will be immediately removed. Report staff misconduct to a senior admin via Discord.',
      },
    ],
  },
}

interface Props {
  doc: LegalDoc | null
  onClose: () => void
}

export function LegalModal({ doc, onClose }: Props) {
  useEffect(() => {
    if (!doc) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [doc, onClose])

  if (!doc) return null
  const { title, icon, sections } = DOCS[doc]

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,6,15,0.80)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(5, 12, 28, 0.98)',
          border: '1px solid rgba(0, 160, 255, 0.15)',
          boxShadow: '0 0 80px rgba(0, 100, 255, 0.10), 0 30px 60px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
          <span className="text-xl">{icon}</span>
          <div className="flex-1">
            <h2 className="text-white font-black text-lg leading-none">{title}</h2>
            <p className="text-white/30 text-[11px] mt-0.5">Blue Tiers — Last updated July 2025</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-all"
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {sections.map((s) => (
            <div key={s.heading}>
              <h3 className="text-[#00BFFF] font-bold text-[13px] mb-2">{s.heading}</h3>
              <p className="text-white/55 text-[13px] leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/[0.05] flex items-center justify-between flex-shrink-0">
          <span className="text-white/20 text-[11px]">© 2025 Blue Tiers. All rights reserved.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#00BFFF]/10 border border-[#00BFFF]/25 text-[#00BFFF] text-xs font-semibold hover:bg-[#00BFFF]/20 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
