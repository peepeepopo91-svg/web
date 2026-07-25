import type { Tournament } from '../../data/tournament'

interface Props { tournament: Tournament | null }

export function TournamentRules({ tournament }: Props) {
  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="text-6xl mb-4 opacity-20">📜</div>
        <p className="text-gray-500">No active tournament.</p>
      </div>
    )
  }

  const { rules, name } = tournament

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="font-['Space_Grotesk'] font-bold text-white text-xl">{name} — Rules</h2>
        <p className="text-gray-500 text-sm mt-0.5">All participants must follow these rules. Staff decisions are final.</p>
      </div>

      <RuleSection icon="✅" title="Allowed Mods" items={rules.allowedMods} color="green" />
      <RuleSection icon="🖥️" title="Allowed Clients" items={rules.allowedClients} color="blue" />
      <RuleSection icon="⛔" title="Banned Modifications" items={rules.bannedMods} color="red" />

      <TextRule icon="🎬" title="Replay Requirements" text={rules.replayRequirements} />
      <TextRule icon="🔌" title="Disconnect Rules" text={rules.disconnectRules} />
      <TextRule icon="⚖️" title="Staff Decisions" text={rules.staffDecisions} />

      {rules.custom.length > 0 && (
        <div className="bg-[#111827] border border-white/5 rounded-xl p-6 space-y-3">
          <h3 className="font-['Space_Grotesk'] font-semibold text-white flex items-center gap-2">
            <span>📋</span> Tournament-Specific Rules
          </h3>
          <ul className="space-y-2">
            {rules.custom.map((rule, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="text-[#00BFFF] font-bold flex-shrink-0">{i + 1}.</span>
                <span className="text-gray-300">{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function RuleSection({ icon, title, items, color }: { icon: string; title: string; items: string[]; color: 'green' | 'blue' | 'red' }) {
  const colorMap = {
    green: 'text-green-400 bg-green-400/5 border-green-400/15',
    blue:  'text-[#00BFFF] bg-[#00BFFF]/5 border-[#00BFFF]/15',
    red:   'text-red-400 bg-red-400/5 border-red-400/15',
  }
  const dotColor = { green: 'bg-green-400', blue: 'bg-[#00BFFF]', red: 'bg-red-400' }

  return (
    <div className={`rounded-xl border p-6 space-y-3 ${colorMap[color]}`}>
      <h3 className="font-['Space_Grotesk'] font-semibold flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      {items.length === 0
        ? <p className="text-gray-600 text-sm italic">None specified.</p>
        : (
          <div className="flex flex-wrap gap-2">
            {items.map((item, i) => (
              <span key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/20 text-white text-xs font-medium`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor[color]}`} />
                {item}
              </span>
            ))}
          </div>
        )}
    </div>
  )
}

function TextRule({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="bg-[#111827] border border-white/5 rounded-xl p-6 space-y-2">
      <h3 className="font-['Space_Grotesk'] font-semibold text-white flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      <p className="text-gray-400 text-sm leading-relaxed">{text || 'Not specified.'}</p>
    </div>
  )
}
