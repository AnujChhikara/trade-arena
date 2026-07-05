export function rupees(n: number | string): string {
  const v = typeof n === 'string' ? parseFloat(n) : n
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
}

export function pct(n: number | string): string {
  const v = typeof n === 'string' ? parseFloat(n) : n
  const sign = v >= 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}%`
}

export function compact(n: number | string): string {
  const v = typeof n === 'string' ? parseFloat(n) : n
  if (v >= 1_00_00_000) return (v / 1_00_00_000).toFixed(1) + 'Cr'
  if (v >= 1_00_000) return (v / 1_00_000).toFixed(1) + 'L'
  if (v >= 1000) return (v / 1000).toFixed(1) + 'K'
  return v.toFixed(0)
}

export function timeAgo(date: string | Date): string {
  const now = Date.now()
  const d = new Date(date).getTime()
  const diff = now - d
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}
