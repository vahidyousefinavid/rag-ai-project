export default function TypingIndicator() {
  return (
    <div className="flex gap-3 px-4 py-2">
      <div className="w-6 flex-shrink-0 pt-0.5 text-right">
        <span style={{ color: '#34d399' }} className="text-xs font-medium">AI</span>
      </div>
      <div className="flex items-center gap-1 py-1">
        <span style={{ background: 'var(--text-muted)' }} className="w-1.5 h-1.5 rounded-full dot-1" />
        <span style={{ background: 'var(--text-muted)' }} className="w-1.5 h-1.5 rounded-full dot-2" />
        <span style={{ background: 'var(--text-muted)' }} className="w-1.5 h-1.5 rounded-full dot-3" />
      </div>
    </div>
  )
}
