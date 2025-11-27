import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import '../styles/Navbar.css'

function Navbar() {
  const { logout } = useAuth()
  const location = useLocation()

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout()
      window.location.href = '/login'
    }
  }

  return (
    <nav className="navbar">
      <div className="nav-container">
        <h1 className="logo">LinkLift</h1>
        <div className="nav-links">
          <Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
            Find Ride
          </Link>
          <Link to="/publish" className={`nav-link ${location.pathname === '/publish' ? 'active' : ''}`}>
            Publish Ride
          </Link>
          <Link to="/my-rides" className={`nav-link ${location.pathname === '/my-rides' ? 'active' : ''}`}>
            My Rides
          </Link>
          <Link to="/profile" className={`nav-link ${location.pathname === '/profile' ? 'active' : ''}`}>
            Profile
          </Link>
          <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

