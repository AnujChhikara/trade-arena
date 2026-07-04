import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, AgentDetail as AgentData } from '../lib/api'

export default function AgentDetail() {
  const { id } = useParams()
  const [agent, setAgent] = useState<AgentData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    api.agents.get(id).then(setAgent).catch(e => setError(e.message))
  }, [id])

  if (error) return <div style={{ color: '#dc2626' }}>{error}</div>
  if (!agent) return <div style={{ color: '#6b7280' }}>Loading...</div>

  const pnl = agent.positions.reduce((s, p) => s + parseFloat(p.realized_pnl || '0') + parseFloat(p.unrealized_pnl || '0'), 0)

  return (
    <div>
      <Link to="/" style={{ color: '#2563eb', textDecoration: 'none', fontSize: 14, marginBottom: 16, display: 'inline-block' }}>&larr; Dashboard</Link>

      <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
        <div style={{ flex: 1, background: '#fff', borderRadius: 8, padding: 24, border: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>{agent.name}</h2>
          <div style={{ color: '#6b7280', textTransform: 'capitalize', marginBottom: 16 }}>{agent.persona || '--'} &middot; {agent.model}</div>
          <div style={{ display: 'flex', gap: 32 }}>
            <div><span style={{ color: '#6b7280', fontSize: 13 }}>Capital</span><div style={{ fontSize: 18, fontWeight: 600 }}>₹{parseFloat(agent.capital).toLocaleString()}</div></div>
            <div><span style={{ color: '#6b7280', fontSize: 13 }}>P&L</span><div style={{ fontSize: 18, fontWeight: 600, color: pnl >= 0 ? '#16a34a' : '#dc2626' }}>{pnl >= 0 ? '+' : ''}₹{pnl.toLocaleString()}</div></div>
            <div><span style={{ color: '#6b7280', fontSize: 13 }}>Open Positions</span><div style={{ fontSize: 18, fontWeight: 600 }}>{agent.positions.filter(p => p.status === 'open').length}</div></div>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: 24 }}>
        <h3 style={{ margin: 0, padding: '16px 20px', fontSize: 15, fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Open Positions</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <Th>Symbol</Th>
              <Th>Qty</Th>
              <Th>Entry</Th>
              <Th>LTP</Th>
              <Th>P&L</Th>
              <Th>Type</Th>
            </tr>
          </thead>
          <tbody>
            {agent.positions.filter(p => p.status === 'open').map(p => {
              const upnl = parseFloat(p.unrealized_pnl)
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 500 }}>{p.symbol}</td>
                  <td style={{ padding: '10px 16px' }}>{p.quantity}</td>
                  <td style={{ padding: '10px 16px' }}>₹{parseFloat(p.entry_price).toFixed(2)}</td>
                  <td style={{ padding: '10px 16px' }}>{p.current_price ? '₹' + parseFloat(p.current_price).toFixed(2) : '--'}</td>
                  <td style={{ padding: '10px 16px', color: upnl >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{upnl >= 0 ? '+' : ''}₹{upnl.toFixed(2)}</td>
                  <td style={{ padding: '10px 16px', color: '#6b7280' }}>{p.strategy_type}</td>
                </tr>
              )
            })}
            {agent.positions.filter(p => p.status === 'open').length === 0 && (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>No open positions</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <h3 style={{ margin: 0, padding: '16px 20px', fontSize: 15, fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Recent Decisions</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <Th>Time</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {agent.recent_decisions.map(d => (
              <tr key={d.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 16px', color: '#6b7280', fontSize: 13 }}>{new Date(d.created_at).toLocaleString()}</td>
                <td style={{ padding: '10px 16px' }}><span style={{ background: d.status === 'success' ? '#dcfce7' : '#fef3c7', color: d.status === 'success' ? '#16a34a' : '#b45309', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{d.status}</span></td>
              </tr>
            ))}
            {agent.recent_decisions.length === 0 && (
              <tr><td colSpan={2} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>No decisions yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children, style: s }: any) {
  return <th style={{ padding: '10px 16px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', textAlign: 'left', ...s }}>{children}</th>
}
