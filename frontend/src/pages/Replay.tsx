import { useEffect, useState } from 'react'
import { api, SnapshotSummary } from '../lib/api'

export default function Replay() {
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([])
  const [selected, setSelected] = useState<any | null>(null)

  useEffect(() => {
    api.snapshots.list(100).then(setSnapshots)
  }, [])

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 20px' }}>Replay — Checkpoint Timeline</h2>

      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ width: 320, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', maxHeight: '70vh', overflowY: 'auto' }}>
          {snapshots.map(s => (
            <div
              key={s.id}
              onClick={() => api.snapshots.get(s.id).then(setSelected)}
              style={{
                padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
                background: selected?.id === s.id ? '#eff6ff' : '#fff',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 500 }}>{new Date(s.captured_at).toLocaleString()}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{s.snapshot_hash.slice(0, 12)}...</div>
            </div>
          ))}
          {snapshots.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>No snapshots captured yet</div>
          )}
        </div>

        <div style={{ flex: 1, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: 24, minHeight: 400 }}>
          {selected ? (
            <>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Snapshot at {new Date(selected.captured_at).toLocaleString()}</h3>
              <pre style={{ fontSize: 12, overflow: 'auto', maxHeight: 500, color: '#374151' }}>{JSON.stringify(selected, null, 2)}</pre>
            </>
          ) : (
            <div style={{ color: '#9ca3af', textAlign: 'center', paddingTop: 80 }}>Select a snapshot from the timeline to inspect</div>
          )}
        </div>
      </div>
    </div>
  )
}
