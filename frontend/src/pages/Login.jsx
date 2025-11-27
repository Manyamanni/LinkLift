import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import '../styles/Login.css'

function Login() {
  const [isSignup, setIsSignup] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    year: '',
    email: '',
    college: '',
    password: '',
    loginEmail: '',
    loginPassword: ''
  })
  const [error, setError] = useState('')
  const { login, signup } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(formData.loginEmail, formData.loginPassword)
      navigate('/dashboard')
    } catch (err) {
      const errorData = err.response?.data
      if (errorData?.email_verified === false) {
        // Email not verified - redirect to verification page
        setError(errorData.message || 'Please verify your email address')
        setTimeout(() => {
          navigate('/verify-email', {
            state: {
              message: errorData.message || 'Please verify your email address to continue.',
              email: formData.loginEmail
            }
          })
        }, 2000)
      } else {
        setError(errorData?.error || errorData?.message || 'Login failed')
      }
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!formData.email.includes('@')) {
      setError('Please enter a valid institutional email address.')
      return
    }

    // Validate all fields are filled
    if (!formData.name.trim() || !formData.year || !formData.email.trim() || !formData.college.trim() || !formData.password) {
      setError('Please fill in all fields.')
      return
    }
    
    if (formData.year === '') {
      setError('Please select your year.')
      return
    }

    try {
      const result = await signup({
        name: formData.name.trim(),
        year: formData.year,
        email: formData.email.trim(),
        college: formData.college.trim(),
        password: formData.password
      })
      
      // Signup successful - redirect to verification page
      setError('')
      // Navigate immediately without alert
      navigate('/verify-email', { 
        state: { 
          message: result.message || 'Account created! Please check your email to verify your account.',
          email: formData.email.trim()
        } 
      })
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Signup failed'
      setError(errorMessage)
      console.error('Signup error:', err.response?.data || err)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="logo">LinkLift</h1>
          <p className="tagline">Smart Campus Ride Sharing</p>
        </div>

        {!isSignup ? (
          <div className="auth-form active">
            <h2>Login</h2>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="loginEmail">Email</label>
                <input
                  type="email"
                  id="loginEmail"
                  name="loginEmail"
                  value={formData.loginEmail}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email"
                />
              </div>
              <div className="form-group">
                <label htmlFor="loginPassword">Password</label>
                <input
                  type="password"
                  id="loginPassword"
                  name="loginPassword"
                  value={formData.loginPassword}
                  onChange={handleChange}
                  required
                  placeholder="Enter your password"
                />
              </div>
              <button type="submit" className="btn btn-primary">Login</button>
            </form>
            <p className="auth-switch">
              Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setIsSignup(true) }}>Sign up</a>
            </p>
          </div>
        ) : (
          <div className="auth-form active">
            <h2>Sign Up</h2>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSignup}>
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="year">Year</label>
                <select
                  id="year"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Graduate">Graduate</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="email">Institutional Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="your.name@college.edu"
                />
              </div>
              <div className="form-group">
                <label htmlFor="college">College</label>
                <input
                  type="text"
                  id="college"
                  name="college"
                  value={formData.college}
                  onChange={handleChange}
                  required
                  placeholder="Enter your college name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Create a password"
                />
              </div>
              <button type="submit" className="btn btn-primary">Sign Up</button>
            </form>
            <p className="auth-switch">
              Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setIsSignup(false) }}>Login</a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Login

