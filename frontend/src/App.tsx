import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout'
import Dashboard from '@/pages/dashboard'
import Agents from '@/pages/agents'
import AgentDetail from '@/pages/agent-detail'
import Replay from '@/pages/replay'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/agents/:id" element={<AgentDetail />} />
        <Route path="/replay" element={<Replay />} />
      </Routes>
    </Layout>
  )
}
