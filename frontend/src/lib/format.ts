export function rupees(n: number | string): string {
  const v = typeof n === 'string' ? parseFloat(n) : n
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
}

export function pct(n: number | string): string {
  const v = typeof n === 'string' ? parseFloat(n) : n
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}

export function compact(n: number | string): string {
  const v = typeof n === 'string' ? parseFloat(n) : n
  if (v >= 1_00_00_000) return '₹' + (v / 1_00_00_000).toFixed(2) + 'Cr'
  if (v >= 1_00_000) return '₹' + (v / 1_00_000).toFixed(2) + 'L'
  if (v >= 1_000) return '₹' + (v / 1_000).toFixed(1) + 'K'
  return '₹' + v.toFixed(0)
}

export function timeAgo(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
