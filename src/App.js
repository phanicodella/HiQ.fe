import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { HomePage } from './pages/HomePage';
import PublicInterviewRoom from './pages/PublicInterviewRoom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminAccessRequests } from './pages/AdminAccessRequests';
import Navbar from './components/Navbar';
import { VerifyEmail } from './components/auth/verifyEmail';
import { RegisterForm } from './components/RegisterForm';  // Add this import



function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            <Route path="/" element={<HomePage />} />
            
            <Route path="/login" element={<Login />} />
            
            <Route path="/:sessionId" element={<PublicInterviewRoom />} />
            <Route path="/verify-email/:token" element={<VerifyEmail />} />
            <Route path="/register/:token" element={<RegisterForm />} />

            
            <Route 
              path="/admin/access-requests" 
              element={
                <>
                  <Navbar />
                  <ProtectedRoute>
                    <AdminAccessRequests />
                  </ProtectedRoute>
                </>
              } 
            />
            
            <Route 
              path="/dashboard" 
              element={
                <>
                  <Navbar />
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                </>
              } 
            />

            <Route 
              path="*" 
              element={<Navigate to="/" replace />} 
            />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;