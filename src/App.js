import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import PublicInterviewRoom  from './pages/PublicInterviewRoom';
import { ProtectedRoute } from './components/ProtectedRoute';
import Navbar from './components/Navbar';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/:sessionId" element={<PublicInterviewRoom />} />
            
            {/* Protected Routes - Show Navbar */}
            <Route path="/dashboard" element={
              <>
                <Navbar />
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              </>
            } />

            {/* Default redirect to dashboard if logged in, otherwise login */}
            <Route path="/" element={
              <ProtectedRoute>
                <Navigate to="/dashboard" replace />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;