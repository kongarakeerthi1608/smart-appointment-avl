import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import BookAppointmentPage from './pages/BookAppointmentPage.jsx'
import ManageAppointmentsPage from './pages/ManageAppointmentsPage.jsx'
import VisualizerPage from './pages/VisualizerPage.jsx'
import AlgorithmPage from './pages/AlgorithmPage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="book" element={<BookAppointmentPage />} />
        <Route path="manage" element={<ManageAppointmentsPage />} />
        <Route path="visualizer" element={<VisualizerPage />} />
        <Route path="analysis" element={<AlgorithmPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
