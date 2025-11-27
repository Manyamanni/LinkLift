import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import '../styles/Login.css'

function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { fetchUser } = useAuth()
  const [status, setStatus] = useState('waiting') // waiting, verifying, success, error
  const [message, setMessage] = useState('')
  const [resending, setResending] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    const stateMessage = location.state?.message
    const stateEmail = location.state?.email
    
    if (stateMessage) {
      setMessage(stateMessage)
      setUserEmail(stateEmail || '')
    }
    
    if (token) {
      setStatus('verifying')
      verifyEmail(token)
    } else if (!stateMessage) {
      // No token and no state message - show waiting state
      setStatus('waiting')
      setMessage('Please check your email for the verification link.')
    }
  }, [])

  const verifyEmail = async (token) => {
    try {
      const response = await api.post('/auth/verify-email', { token })
      const { access_token, user } = response.data
      
      // Store token and update user
      localStorage.setItem('token', access_token)
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      await fetchUser()
      
      setStatus('success')
      setMessage(response.data.message || 'Email verified successfully!')
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)
    } catch (error) {
      setStatus('error')
      setMessage(error.response?.data?.error || 'Verification failed. The link may have expired.')
    }
  }

  const resendVerification = async () => {
    setResending(true)
    try {
      // Try authenticated endpoint first (if user has token)
      const token = localStorage.getItem('token')
      if (token) {
        try {
          await api.post('/auth/resend-verification')
          setMessage('Verification email sent! Please check your inbox.')
          setStatus('success')
          setResending(false)
          return
        } catch (authError) {
          // If auth fails, try email-based endpoint
        }
      }
      
      // Use email-based endpoint (no auth required)
      if (userEmail) {
        await api.post('/auth/resend-verification-by-email', { email: userEmail })
        setMessage('Verification email sent! Please check your inbox.')
        setStatus('success')
      } else {
        setMessage('Email address not available. Please sign up again.')
        setStatus('error')
      }
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to resend verification email')
      setStatus('error')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="logo">LinkLift</h1>
          <p className="tagline">Email Verification</p>
        </div>

        <div className="auth-form active" style={{textAlign: 'center'}}>
          {status === 'waiting' && (
            <>
              <div style={{fontSize: '3rem', marginBottom: '20px'}}>📧</div>
              <h2>Check Your Email</h2>
              <p style={{color: '#666', marginBottom: '20px'}}>
                {message || 'We\'ve sent a verification email to your inbox.'}
              </p>
              {userEmail && (
                <p style={{color: '#2563eb', fontWeight: '600', marginBottom: '20px'}}>
                  {userEmail}
                </p>
              )}
              <p style={{color: '#999', fontSize: '0.9rem', marginBottom: '30px'}}>
                Click the verification link in the email to activate your account.
              </p>
              <div style={{marginTop: '30px'}}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => navigate('/login')}
                >
                  Back to Login
                </button>
              </div>
            </>
          )}

          {status === 'verifying' && (
            <>
              <div style={{fontSize: '3rem', marginBottom: '20px'}}>⏳</div>
              <h2>Verifying your email...</h2>
              <p>Please wait while we verify your email address.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div style={{fontSize: '3rem', marginBottom: '20px', color: '#10b981'}}>✓</div>
              <h2 style={{color: '#10b981'}}>Email Verified!</h2>
              <p>{message}</p>
              <p style={{color: '#666', fontSize: '0.9rem', marginTop: '20px'}}>
                Redirecting to dashboard...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{fontSize: '3rem', marginBottom: '20px', color: '#ef4444'}}>✗</div>
              <h2 style={{color: '#ef4444'}}>Verification Failed</h2>
              <p style={{color: '#666', marginBottom: '30px'}}>{message}</p>
              
              <div style={{marginTop: '30px'}}>
                <button 
                  className="btn btn-primary" 
                  onClick={resendVerification}
                  disabled={resending}
                >
                  {resending ? 'Sending...' : 'Resend Verification Email'}
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => navigate('/login')}
                  style={{marginLeft: '10px'}}
                >
                  Back to Login
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default VerifyEmail

