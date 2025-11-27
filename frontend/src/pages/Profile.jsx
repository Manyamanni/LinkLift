import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import '../styles/Profile.css'

function Profile() {
  const { user, fetchUser } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    year: '',
    email: '',
    college: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        year: user.year || '',
        email: user.email || '',
        college: user.college || ''
      })
    }
  }, [user])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
    setMessage('')
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // Note: In a real app, you'd have an update endpoint
      // For now, we'll just show a message
      setMessage('Profile update feature coming soon!')
      // await api.put('/auth/profile', formData)
      // await fetchUser()
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <>
      <Navbar />
      <main className="container">
        <div className="profile-section">
          <h2>My Profile</h2>
          
          <div className="profile-card">
            <div className="profile-header">
              <div className="profile-avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <h3>{user.name}</h3>
              <p className="profile-email">{user.email}</p>
            </div>

            <div className="profile-details">
              <div className="profile-detail-item">
                <div className="profile-detail-label">Full Name</div>
                <div className="profile-detail-value">{user.name}</div>
              </div>
              <div className="profile-detail-item">
                <div className="profile-detail-label">Year</div>
                <div className="profile-detail-value">{user.year}</div>
              </div>
              <div className="profile-detail-item">
                <div className="profile-detail-label">Email</div>
                <div className="profile-detail-value">{user.email}</div>
              </div>
              {user.phone && (
                <div className="profile-detail-item">
                  <div className="profile-detail-label">Phone</div>
                  <div className="profile-detail-value">{user.phone}</div>
                </div>
              )}
              <div className="profile-detail-item">
                <div className="profile-detail-label">College</div>
                <div className="profile-detail-value">{user.college}</div>
              </div>
            </div>

            {message && (
              <div className={`message ${message.includes('coming soon') ? 'info' : 'error'}`}>
                {message}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}

export default Profile

