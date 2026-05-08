import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Calendar from './pages/Calendar';
import ListView from './pages/ListView';
import MyStatus from './pages/MyStatus';
import Employees from './pages/Employees';
import Shifts from './pages/Shifts';
import AssignSchedules from './pages/AssignSchedules';
import Reports from './pages/Reports';

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" />;
  }

  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      
      <Route path="/" element={<PrivateRoute><Calendar /></PrivateRoute>} />
      <Route path="/list" element={<PrivateRoute><ListView /></PrivateRoute>} />
      <Route path="/my-status" element={<PrivateRoute><MyStatus /></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
      
      <Route path="/employees" element={<PrivateRoute adminOnly><Employees /></PrivateRoute>} />
      <Route path="/shifts" element={<PrivateRoute adminOnly><Shifts /></PrivateRoute>} />
      <Route path="/assign" element={<PrivateRoute adminOnly><AssignSchedules /></PrivateRoute>} />
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
