import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AgentDetail from './pages/AgentDetail'
import Replay from './pages/Replay'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/agents/:id" element={<AgentDetail />} />
        <Route path="/replay" element={<Replay />} />
      </Routes>
    </Layout>
  )
}
