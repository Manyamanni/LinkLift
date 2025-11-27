import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import '../styles/MyRides.css'

function MyRides() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState('published')
  const [publishedRides, setPublishedRides] = useState([])
  const [requestedRides, setRequestedRides] = useState([])
  const [rideHistory, setRideHistory] = useState({ published: [], requested: [] })
  const [upcomingRides, setUpcomingRides] = useState({ published: [], requested: [] })
  const [selectedRide, setSelectedRide] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadPublishedRides()
    loadRequestedRides()
    loadUpcomingRides()
    
    // Check if we should switch to requested tab
    const tab = searchParams.get('tab')
    if (tab === 'requested') {
      setActiveTab('requested')
    } else if (tab === 'upcoming') {
      setActiveTab('upcoming')
    }
    
    const rideId = searchParams.get('ride')
    if (rideId) {
      setTimeout(() => showRideDetails(rideId), 500)
    }
  }, [])

  const loadPublishedRides = async () => {
    try {
      const response = await api.get('/rides/my-published')
      const allRides = response.data.rides || []
      const now = new Date()
      
      // Separate current and past rides
      const currentRides = allRides.filter(ride => {
        const rideDateTime = new Date(`${ride.date}T${ride.time}`)
        return rideDateTime >= now
      })
      const pastRides = allRides.filter(ride => {
        const rideDateTime = new Date(`${ride.date}T${ride.time}`)
        return rideDateTime < now
      })
      
      setPublishedRides(currentRides)
      setRideHistory(prev => ({ ...prev, published: pastRides }))
    } catch (error) {
      console.error('Failed to load published rides:', error)
    }
  }

  const loadRequestedRides = async () => {
    try {
      const response = await api.get('/requests/my-requests')
      console.log('Requested rides response:', response.data)
      const allRequests = response.data.requests || []
      const now = new Date()
      
      // Separate current and past requests
      const currentRequests = allRequests.filter(item => {
        if (!item.ride) return false
        const rideDateTime = new Date(`${item.ride.date}T${item.ride.time}`)
        return rideDateTime >= now
      })
      const pastRequests = allRequests.filter(item => {
        if (!item.ride) return false
        const rideDateTime = new Date(`${item.ride.date}T${item.ride.time}`)
        return rideDateTime < now
      })
      
      setRequestedRides(currentRequests)
      setRideHistory(prev => ({ ...prev, requested: pastRequests }))
    } catch (error) {
      console.error('Failed to load requested rides:', error)
      setRequestedRides([])
    }
  }

  const loadUpcomingRides = async () => {
    try {
      // Load published rides
      const publishedResponse = await api.get('/rides/my-published')
      const allPublished = publishedResponse.data.rides || []
      
      // Load requested rides
      const requestedResponse = await api.get('/requests/my-requests')
      const allRequested = requestedResponse.data.requests || []
      
      const now = new Date()
      
      // Filter upcoming rides (future rides, approved or pending)
      const upcomingPublished = allPublished.filter(ride => {
        const rideDateTime = new Date(`${ride.date}T${ride.time}`)
        return rideDateTime >= now
      })
      
      const upcomingRequested = allRequested.filter(item => {
        if (!item.ride) return false
        const rideDateTime = new Date(`${item.ride.date}T${item.ride.time}`)
        return rideDateTime >= now && (item.status === 'approved' || item.status === 'pending')
      })
      
      // Sort by date and time
      upcomingPublished.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`)
        const dateB = new Date(`${b.date}T${b.time}`)
        return dateA - dateB
      })
      
      upcomingRequested.sort((a, b) => {
        const dateA = new Date(`${a.ride.date}T${a.ride.time}`)
        const dateB = new Date(`${b.ride.date}T${b.ride.time}`)
        return dateA - dateB
      })
      
      setUpcomingRides({
        published: upcomingPublished,
        requested: upcomingRequested
      })
    } catch (error) {
      console.error('Failed to load upcoming rides:', error)
    }
  }

  const showRideDetails = async (rideId) => {
    try {
      const response = await api.get(`/rides/${rideId}`)
      setSelectedRide(response.data)
      setShowModal(true)
      loadChatMessages(rideId)
      // Reload upcoming rides to get latest data
      loadUpcomingRides()
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to load ride details')
    }
  }

  const loadChatMessages = async (rideId) => {
    try {
      const response = await api.get(`/rides/${rideId}/messages`)
      setChatMessages(response.data.messages)
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const sendMessage = async (rideId) => {
    if (!newMessage.trim()) return
    
    try {
      const response = await api.post(`/rides/${rideId}/messages`, {
        message: newMessage
      })
      setChatMessages([...chatMessages, response.data.message])
      setNewMessage('')
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to send message')
    }
  }

  const approveRequest = async (requestId, rideId) => {
    try {
      await api.put(`/requests/${requestId}/approve`)
      alert('Request approved!')
      // Reload ride details to refresh the requests list
      await showRideDetails(rideId)
      loadPublishedRides()
      loadRequestedRides()
      loadUpcomingRides()
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to approve request')
    }
  }

  const rejectRequest = async (requestId, rideId) => {
    try {
      await api.put(`/requests/${requestId}/reject`)
      alert('Request rejected.')
      // Reload ride details to refresh the requests list
      await showRideDetails(rideId)
      loadPublishedRides()
      loadUpcomingRides()
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to reject request')
    }
  }

  const cancelRequest = async (requestId, rideId = null) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) return
    
    try {
      await api.delete(`/requests/${requestId}`)
      alert('Request cancelled.')
      loadRequestedRides()
      loadUpcomingRides()
      // Reload ride details if modal is open
      if (rideId && selectedRide && selectedRide.ride.id === rideId) {
        await showRideDetails(rideId)
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to cancel request')
    }
  }

  const cancelRide = async (rideId) => {
    if (!window.confirm('Are you sure you want to cancel this ride? All requests will be cancelled.')) return
    
    try {
      await api.delete(`/rides/${rideId}`)
      alert('Ride cancelled.')
      setShowModal(false)
      loadPublishedRides()
      loadRequestedRides()
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to cancel ride')
    }
  }

  const triggerSOS = async (rideId) => {
    if (!window.confirm('Are you sure you want to trigger an emergency alert?')) return
    
    try {
      const response = await api.post(`/rides/${rideId}/sos`)
      alert(response.data.message)
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to trigger SOS')
    }
  }

  const isActiveRide = (ride) => {
    const rideDate = new Date(`${ride.date}T${ride.time}`)
    return rideDate <= new Date() && selectedRide?.pendingRequests?.length === 0 && 
           selectedRide?.allPassengers?.length > 1
  }

  const isWithin30Minutes = (ride) => {
    if (!ride || !ride.date || !ride.time) return false
    const rideDateTime = new Date(`${ride.date}T${ride.time}`)
    const now = new Date()
    const minutesUntilRide = (rideDateTime - now) / (1000 * 60)
    return minutesUntilRide < 30 && minutesUntilRide > 0
  }

  const removePassenger = async (requestId, rideId) => {
    if (!window.confirm('Are you sure you want to remove this passenger from the ride?')) return
    
    try {
      await api.put(`/requests/${requestId}/remove`)
      alert('Passenger removed successfully.')
      await showRideDetails(rideId)
      loadPublishedRides()
      loadRequestedRides()
      loadUpcomingRides()
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to remove passenger')
    }
  }

  const cancelApprovedRequest = async (requestId, rideId) => {
    if (!window.confirm('Are you sure you want to cancel your approved ride request?')) return
    
    try {
      await api.delete(`/requests/${requestId}`)
      alert('Ride request cancelled successfully.')
      await showRideDetails(rideId)
      loadRequestedRides()
      loadUpcomingRides()
      setShowModal(false)
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to cancel request')
    }
  }

  return (
    <>
      <Navbar />
      <main className="container">
        <div className="my-rides-section">
          <h2>My Rides</h2>
          
          <div className="rides-tabs">
            <button
              className={`tab-btn ${activeTab === 'published' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('published')
                loadPublishedRides()
              }}
            >
              Published Rides
            </button>
            <button
              className={`tab-btn ${activeTab === 'requested' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('requested')
                loadRequestedRides()
              }}
            >
              Requested Rides
            </button>
            <button
              className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('upcoming')
                loadUpcomingRides()
              }}
            >
              Upcoming Rides
            </button>
            <button
              className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('history')
                loadPublishedRides()
                loadRequestedRides()
              }}
            >
              Ride History
            </button>
          </div>

          {activeTab === 'published' && (
            <div className="rides-tab-content active">
              {publishedRides.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🚗</div>
                  <h3>No Published Rides</h3>
                  <p>You haven't published any rides yet. <a href="/publish">Publish your first ride!</a></p>
                </div>
              ) : (
                <div className="rides-container">
                  {publishedRides.map(ride => (
                    <div key={ride.id} className="ride-card">
                      <div className="ride-card-header">
                        <div className="ride-creator">{ride.pickupCity} → {ride.dropCity}</div>
                        {ride.pendingRequestsCount > 0 && (
                          <span className="match-score" style={{background: 'var(--warning-color)'}}>
                            {ride.pendingRequestsCount} Request{ride.pendingRequestsCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="ride-details">
                        <div className="ride-detail-item">
                          <div className="ride-detail-label">Date & Time</div>
                          <div className="ride-detail-value">
                            {new Date(ride.date).toLocaleDateString()} at {ride.time}
                          </div>
                        </div>
                        <div className="ride-detail-item">
                          <div className="ride-detail-label">Available Seats</div>
                          <div className="ride-detail-value">{ride.availableSeats} / {ride.capacity}</div>
                        </div>
                        <div className="ride-detail-item">
                          <div className="ride-detail-label">Cost per Person</div>
                          <div className="ride-detail-value">₹{ride.costPerPerson.toFixed(2)}</div>
                        </div>
                      </div>
                      {ride.womenOnly && <span className="women-only-badge">Women Only Ride</span>}
                      <div className="ride-card-footer">
                        <button className="btn btn-primary" onClick={() => showRideDetails(ride.id)}>
                          View Details {ride.pendingRequestsCount > 0 && `(${ride.pendingRequestsCount} pending)`}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'requested' && (
            <div className="rides-tab-content active">
              {requestedRides.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🎫</div>
                  <h3>No Requested Rides</h3>
                  <p>You haven't requested any rides yet. <a href="/dashboard">Find a ride!</a></p>
                </div>
              ) : (
                <div className="rides-container">
                  {requestedRides.map(item => {
                    const statusBadge = item.status === 'approved' 
                      ? <span className="match-score" style={{background: 'var(--success-color)'}}>Approved</span>
                      : item.status === 'rejected'
                      ? <span className="match-score" style={{background: 'var(--danger-color)'}}>Rejected</span>
                      : <span className="match-score" style={{background: 'var(--warning-color)'}}>Pending</span>

                    return (
                      <div key={item.id} className="ride-card">
                        <div className="ride-card-header">
                          <div className="ride-creator">{item.publisher?.name || 'Unknown'}</div>
                          {statusBadge}
                        </div>
                        <div className="ride-details">
                          <div className="ride-detail-item">
                            <div className="ride-detail-label">Date & Time</div>
                            <div className="ride-detail-value">
                              {new Date(item.ride.date).toLocaleDateString()} at {item.ride.time}
                            </div>
                          </div>
                          <div className="ride-detail-item">
                            <div className="ride-detail-label">Ride Route</div>
                            <div className="ride-detail-value">{item.ride.pickupCity} → {item.ride.dropCity}</div>
                          </div>
                          {item.pickupCity && (
                            <div className="ride-detail-item">
                              <div className="ride-detail-label">Your Pickup</div>
                              <div className="ride-detail-value">{item.pickupCity}{item.pickupAddress && ` - ${item.pickupAddress}`}</div>
                            </div>
                          )}
                          {item.dropCity && (
                            <div className="ride-detail-item">
                              <div className="ride-detail-label">Your Drop</div>
                              <div className="ride-detail-value">{item.dropCity}{item.dropAddress && ` - ${item.dropAddress}`}</div>
                            </div>
                          )}
                          <div className="ride-detail-item">
                            <div className="ride-detail-label">Requested Seats</div>
                            <div className="ride-detail-value">{item.numPassengers}</div>
                          </div>
                          <div className="ride-detail-item">
                            <div className="ride-detail-label">Your Price</div>
                            <div className="ride-detail-value" style={{color: 'var(--primary-color)', fontWeight: '600'}}>
                              ₹{(() => {
                                // Show requested price if available, otherwise original price
                                return item.priceRequest !== null && item.priceRequest !== undefined
                                  ? item.priceRequest.toFixed(2)
                                  : (item.originalPrice || item.ride.costPerPerson).toFixed(2)
                              })()}
                            </div>
                          </div>
                        </div>
                        <div className="ride-card-footer">
                          {item.status !== 'rejected' && (
                            <button className="btn btn-primary" onClick={() => showRideDetails(item.ride.id)}>
                              View Details
                            </button>
                          )}
                          {item.status === 'pending' && (
                            <button className="btn btn-danger" onClick={() => cancelRequest(item.id)}>
                              Cancel Request
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'upcoming' && (
            <div className="rides-tab-content active">
              <h3>Upcoming Published Rides</h3>
              {upcomingRides.published.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📅</div>
                  <h3>No Upcoming Published Rides</h3>
                  <p>You don't have any upcoming published rides.</p>
                </div>
              ) : (
                <div className="rides-container">
                  {upcomingRides.published.map(ride => (
                    <div key={ride.id} className="ride-card">
                      <div className="ride-card-header">
                        <div className="ride-creator">Your Ride</div>
                        {ride.pendingRequestsCount > 0 && (
                          <span className="match-score" style={{background: 'var(--warning-color)'}}>
                            {ride.pendingRequestsCount} Request{ride.pendingRequestsCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="ride-details">
                        <div className="ride-detail-item">
                          <div className="ride-detail-label">Date & Time</div>
                          <div className="ride-detail-value">
                            {new Date(ride.date).toLocaleDateString()} at {ride.time}
                          </div>
                        </div>
                        <div className="ride-detail-item">
                          <div className="ride-detail-label">Route</div>
                          <div className="ride-detail-value">{ride.pickupCity} → {ride.dropCity}</div>
                        </div>
                        <div className="ride-detail-item">
                          <div className="ride-detail-label">Available Seats</div>
                          <div className="ride-detail-value">{ride.availableSeats} / {ride.capacity}</div>
                        </div>
                        <div className="ride-detail-item">
                          <div className="ride-detail-label">Cost per Person</div>
                          <div className="ride-detail-value">₹{ride.costPerPerson.toFixed(2)}</div>
                        </div>
                      </div>
                      {ride.womenOnly && <span className="women-only-badge">Women Only Ride</span>}
                      <div className="ride-card-footer">
                        <button className="btn btn-primary" onClick={() => showRideDetails(ride.id)}>
                          View Details {ride.pendingRequestsCount > 0 && `(${ride.pendingRequestsCount} pending)`}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h3 style={{marginTop: '40px', marginBottom: '20px'}}>Upcoming Requested Rides</h3>
              {upcomingRides.requested.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🎫</div>
                  <h3>No Upcoming Requested Rides</h3>
                  <p>You don't have any upcoming requested rides.</p>
                </div>
              ) : (
                <div className="rides-container">
                  {upcomingRides.requested.map(item => {
                    const statusBadge = item.status === 'approved' 
                      ? <span className="match-score" style={{background: 'var(--success-color)'}}>Approved</span>
                      : item.status === 'rejected'
                      ? <span className="match-score" style={{background: 'var(--danger-color)'}}>Rejected</span>
                      : <span className="match-score" style={{background: 'var(--warning-color)'}}>Pending</span>

                    return (
                      <div key={item.id} className="ride-card">
                        <div className="ride-card-header">
                          <div className="ride-creator">{item.publisher?.name || 'Unknown'}</div>
                          {statusBadge}
                        </div>
                        <div className="ride-details">
                          <div className="ride-detail-item">
                            <div className="ride-detail-label">Date & Time</div>
                            <div className="ride-detail-value">
                              {new Date(item.ride.date).toLocaleDateString()} at {item.ride.time}
                            </div>
                          </div>
                          <div className="ride-detail-item">
                            <div className="ride-detail-label">Ride Route</div>
                            <div className="ride-detail-value">{item.ride.pickupCity} → {item.ride.dropCity}</div>
                          </div>
                          {item.pickupCity && (
                            <div className="ride-detail-item">
                              <div className="ride-detail-label">Your Pickup</div>
                              <div className="ride-detail-value">{item.pickupCity}{item.pickupAddress && ` - ${item.pickupAddress}`}</div>
                            </div>
                          )}
                          {item.dropCity && (
                            <div className="ride-detail-item">
                              <div className="ride-detail-label">Your Drop</div>
                              <div className="ride-detail-value">{item.dropCity}{item.dropAddress && ` - ${item.dropAddress}`}</div>
                            </div>
                          )}
                          <div className="ride-detail-item">
                            <div className="ride-detail-label">Requested Seats</div>
                            <div className="ride-detail-value">{item.numPassengers}</div>
                          </div>
                          <div className="ride-detail-item">
                            <div className="ride-detail-label">Your Price</div>
                            <div className="ride-detail-value" style={{color: 'var(--primary-color)', fontWeight: '600'}}>
                              ₹{(() => {
                                return item.priceRequest !== null && item.priceRequest !== undefined
                                  ? item.priceRequest.toFixed(2)
                                  : (item.originalPrice || item.ride.costPerPerson).toFixed(2)
                              })()}
                            </div>
                          </div>
                        </div>
                        <div className="ride-card-footer">
                          {item.status !== 'rejected' && (
                            <button className="btn btn-primary" onClick={() => showRideDetails(item.ride.id)}>
                              View Details
                            </button>
                          )}
                          {item.status === 'pending' && (
                            <button className="btn btn-danger" onClick={() => cancelRequest(item.id)}>
                              Cancel Request
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="rides-tab-content active">
              <div className="history-section">
                <h3>Published Rides History</h3>
                {rideHistory.published.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📜</div>
                    <h3>No Published Ride History</h3>
                    <p>You haven't completed any published rides yet.</p>
                  </div>
                ) : (
                  <div className="rides-container">
                    {rideHistory.published.map(ride => (
                      <div key={ride.id} className="ride-card" style={{opacity: 0.8}}>
                        <div className="ride-card-header">
                          <div className="ride-creator">{ride.pickupCity} → {ride.dropCity}</div>
                          <span className="match-score" style={{background: 'var(--text-light)'}}>Completed</span>
                        </div>
                        <div className="ride-details">
                          <div className="ride-detail-item">
                            <div className="ride-detail-label">Date & Time</div>
                            <div className="ride-detail-value">
                              {new Date(ride.date).toLocaleDateString()} at {ride.time}
                            </div>
                          </div>
                          <div className="ride-detail-item">
                            <div className="ride-detail-label">Available Seats</div>
                            <div className="ride-detail-value">{ride.availableSeats} / {ride.capacity}</div>
                          </div>
                          <div className="ride-detail-item">
                            <div className="ride-detail-label">Cost per Person</div>
                            <div className="ride-detail-value">₹{ride.costPerPerson.toFixed(2)}</div>
                          </div>
                        </div>
                        {ride.womenOnly && <span className="women-only-badge">Women Only Ride</span>}
                        <div className="ride-card-footer">
                          <button className="btn btn-primary" onClick={() => showRideDetails(ride.id)}>
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <h3 style={{marginTop: '40px', marginBottom: '20px'}}>Requested Rides History</h3>
                {rideHistory.requested.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📜</div>
                    <h3>No Requested Ride History</h3>
                    <p>You haven't completed any requested rides yet.</p>
                  </div>
                ) : (
                  <div className="rides-container">
                    {rideHistory.requested.map(item => {
                      const statusBadge = item.status === 'approved' 
                        ? <span className="match-score" style={{background: 'var(--success-color)'}}>Completed</span>
                        : item.status === 'rejected'
                        ? <span className="match-score" style={{background: 'var(--danger-color)'}}>Rejected</span>
                        : <span className="match-score" style={{background: 'var(--text-light)'}}>Past</span>

                      return (
                        <div key={item.id} className="ride-card" style={{opacity: 0.8}}>
                          <div className="ride-card-header">
                            <div className="ride-creator">{item.publisher?.name || 'Unknown'}</div>
                            {statusBadge}
                          </div>
                          <div className="ride-details">
                            <div className="ride-detail-item">
                              <div className="ride-detail-label">Date & Time</div>
                              <div className="ride-detail-value">
                                {new Date(item.ride.date).toLocaleDateString()} at {item.ride.time}
                              </div>
                            </div>
                            <div className="ride-detail-item">
                              <div className="ride-detail-label">Route</div>
                              <div className="ride-detail-value">{item.ride.pickupCity} → {item.ride.dropCity}</div>
                            </div>
                            <div className="ride-detail-item">
                              <div className="ride-detail-label">Requested Seats</div>
                              <div className="ride-detail-value">{item.numPassengers}</div>
                            </div>
                            <div className="ride-detail-item">
                            <div className="ride-detail-label">Your Price</div>
                            <div className="ride-detail-value" style={{color: 'var(--primary-color)', fontWeight: '600'}}>
                              ₹{(() => {
                                // Show requested price if available, otherwise original price
                                return item.priceRequest !== null && item.priceRequest !== undefined
                                  ? item.priceRequest.toFixed(2)
                                  : (item.originalPrice || item.ride.costPerPerson).toFixed(2)
                              })()}
                            </div>
                          </div>
                          </div>
                          <div className="ride-card-footer">
                            {item.status !== 'rejected' && (
                              <button className="btn btn-primary" onClick={() => showRideDetails(item.ride.id)}>
                                View Details
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {showModal && selectedRide && (
        <div className="modal active" onClick={(e) => e.target.className === 'modal active' && setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="close-modal" onClick={() => setShowModal(false)}>&times;</span>
            <div className="ride-detail-full">
              <h3>Ride Details</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-item-label">Publisher</div>
                  <div className="detail-item-value">{selectedRide.ride.publisher.name}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item-label">Date & Time</div>
                  <div className="detail-item-value">
                    {new Date(selectedRide.ride.date).toLocaleDateString()} at {selectedRide.ride.time}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-item-label">Route</div>
                  <div className="detail-item-value">
                    {(() => {
                      // Build full route showing all cities
                      const fullRoute = [
                        selectedRide.ride.pickupCity,
                        ...(selectedRide.ride.onRouteCities || []),
                        selectedRide.ride.dropCity
                      ]
                      return fullRoute.join(' → ')
                    })()}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-item-label">Start Address</div>
                  <div className="detail-item-value">{selectedRide.ride.pickupAddress}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item-label">Destination Address</div>
                  <div className="detail-item-value">{selectedRide.ride.dropAddress}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item-label">Available Seats</div>
                  <div className="detail-item-value">{selectedRide.ride.availableSeats} / {selectedRide.ride.capacity}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item-label">Cost per Person</div>
                  <div className="detail-item-value">₹{selectedRide.ride.costPerPerson.toFixed(2)}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item-label">Vehicle</div>
                  <div className="detail-item-value">{selectedRide.ride.carModel} ({selectedRide.ride.licensePlate})</div>
                </div>
              </div>
              {selectedRide.ride.womenOnly && <span className="women-only-badge">Women Only Ride</span>}
            </div>

            {/* Show price and journey members for requestors */}
            {user && selectedRide.ride.publisher.id !== user.id && (() => {
              // Check if user has an approved request
              const userRequest = selectedRide.allPassengers?.find(p => p.id === user.id && !p.isPublisher)
              const isApproved = userRequest !== undefined
              
              // Get user's route data (from approved request or pending request)
              let userPickupCity = null
              let userDropCity = null
              
              if (userRequest) {
                // Approved request - get from allPassengers
                userPickupCity = userRequest.pickupCity
                userDropCity = userRequest.dropCity
              } else {
                // Check pending requests
                const pendingReq = selectedRide.pendingRequests?.find(r => r.requestor.id === user.id)
                if (pendingReq) {
                  userPickupCity = pendingReq.pickupCity
                  userDropCity = pendingReq.dropCity
                }
              }
              
              // Build publisher's full route: [start_city, ...on_route_cities, destination_city]
              const publisherRoute = [
                selectedRide.ride.pickupCity,
                ...(selectedRide.ride.onRouteCities || []),
                selectedRide.ride.dropCity
              ]
              
              // Check route overlap: user's pickup and drop must be in publisher's route, and pickup must come before drop
              let hasRouteOverlap = false
              if (userPickupCity && userDropCity && publisherRoute.length > 0) {
                const userPickupIndex = publisherRoute.indexOf(userPickupCity)
                const userDropIndex = publisherRoute.indexOf(userDropCity)
                
                // Overlap exists if both cities are in the route and pickup comes before drop
                hasRouteOverlap = userPickupIndex >= 0 && userDropIndex >= 0 && userPickupIndex < userDropIndex
              }
              
              // Find overlapping passengers - check if their route overlaps with publisher's route
              const overlappingPassengers = isApproved && hasRouteOverlap
                ? selectedRide.allPassengers?.filter(p => {
                    if (!p.pickupCity || !p.dropCity) {
                      // Publisher doesn't have pickup/drop cities, include them
                      return p.isPublisher
                    }
                    
                    // Check if passenger's route overlaps with publisher's route
                    const passengerPickupIndex = publisherRoute.indexOf(p.pickupCity)
                    const passengerDropIndex = publisherRoute.indexOf(p.dropCity)
                    
                    // Overlap if both cities are in route and pickup comes before drop
                    return passengerPickupIndex >= 0 && passengerDropIndex >= 0 && passengerPickupIndex < passengerDropIndex
                  }) || []
                : []
              
              return (
                <>
                  <div style={{padding: '20px', background: 'var(--bg-light)', borderRadius: '8px', marginBottom: '20px'}}>
                    <h4>Your Price</h4>
                    <div style={{fontSize: '1.5rem', fontWeight: '600', color: 'var(--primary-color)', marginTop: '10px'}}>
                      ₹{(() => {
                        if (userRequest) {
                          return userRequest.price.toFixed(2)
                        }
                        // If not found, show original price
                        return selectedRide.ride.costPerPerson.toFixed(2)
                      })()}
                    </div>
                  </div>
                  
                  {/* Show journey members only if approved and route overlaps */}
                  {isApproved && hasRouteOverlap && overlappingPassengers.length > 0 && (
                    <div style={{padding: '20px', background: 'var(--bg-light)', borderRadius: '8px', marginBottom: '20px'}}>
                      <h4>Journey Members</h4>
                      <div style={{marginTop: '15px'}}>
                        {overlappingPassengers.map((passenger, idx) => (
                          <div key={passenger.id || idx} style={{
                            padding: '10px',
                            background: 'white',
                            borderRadius: '8px',
                            marginBottom: '8px',
                            border: '1px solid var(--border-color)'
                          }}>
                            <div style={{fontWeight: '600'}}>
                              {passenger.name} {passenger.isPublisher && '(Publisher)'} {passenger.id === user.id && '(You)'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )
            })()}

            {/* Show full route for publishers */}
            {user && selectedRide.ride.publisher.id === user.id && (
              <div style={{padding: '20px', background: 'var(--bg-light)', borderRadius: '8px', marginBottom: '20px'}}>
                <h4>Full Route</h4>
                <div style={{marginTop: '15px', fontSize: '1.1rem', fontWeight: '600', color: 'var(--primary-color)'}}>
                  {(() => {
                    const fullRoute = [
                      selectedRide.ride.pickupCity,
                      ...(selectedRide.ride.onRouteCities || []),
                      selectedRide.ride.dropCity
                    ]
                    return fullRoute.join(' → ')
                  })()}
                </div>
                <div style={{marginTop: '15px', fontSize: '0.9rem', color: 'var(--text-light)'}}>
                  <div><strong>Start Address:</strong> {selectedRide.ride.pickupAddress}</div>
                  <div style={{marginTop: '8px'}}><strong>Destination Address:</strong> {selectedRide.ride.dropAddress}</div>
                </div>
              </div>
            )}

            {/* Show all passengers for publishers */}
            {user && selectedRide.ride.publisher.id === user.id && selectedRide.allPassengers && (
              <div style={{padding: '20px', background: 'var(--bg-light)', borderRadius: '8px', marginBottom: '20px'}}>
                <h4>All Passengers</h4>
                <div style={{marginTop: '15px'}}>
                  {selectedRide.allPassengers.map((passenger, idx) => (
                    <div key={passenger.id || idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '15px',
                      background: 'white',
                      borderRadius: '8px',
                      marginBottom: '10px',
                      border: '1px solid var(--border-color)'
                    }}>
                      <div>
                        <div style={{fontWeight: '600', fontSize: '1rem'}}>
                          {passenger.name} {passenger.isPublisher && '(You)'}
                        </div>
                        <div style={{fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '5px'}}>
                          {passenger.email} • {passenger.numPassengers} seat{passenger.numPassengers > 1 ? 's' : ''}
                        </div>
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                        <div style={{textAlign: 'right'}}>
                          <div style={{fontSize: '0.85rem', color: 'var(--text-light)'}}>Price</div>
                          <div style={{fontSize: '1.1rem', fontWeight: '600', color: 'var(--primary-color)'}}>
                            ₹{passenger.price.toFixed(2)}
                          </div>
                        </div>
                        {!passenger.isPublisher && (
                          <button
                            className="btn btn-danger"
                            onClick={() => removePassenger(passenger.requestId, selectedRide.ride.id)}
                            disabled={isWithin30Minutes(selectedRide.ride)}
                            style={{minWidth: '80px'}}
                            title={isWithin30Minutes(selectedRide.ride) ? 'Cannot remove within 30 minutes of ride' : 'Remove passenger'}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {user && selectedRide.ride.publisher.id === user.id && (
              <div className="requests-section">
                <h4>Incoming Seat Requests</h4>
                {selectedRide.pendingRequests && selectedRide.pendingRequests.length > 0 ? (
                  selectedRide.pendingRequests.map(req => (
                    <div key={req.id} className="request-item">
                      <div className="request-info">
                        <div className="request-name">{req.requestor.name}</div>
                        <div className="request-contact">Requesting {req.numPassengers} seat(s)</div>
                        {req.requestor.email && (
                          <div className="request-contact" style={{fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '5px'}}>
                            {req.requestor.email}
                          </div>
                        )}
                        <div style={{marginTop: '10px', padding: '10px', background: 'var(--bg-light)', borderRadius: '8px'}}>
                          <div style={{fontSize: '0.9rem', fontWeight: '600', marginBottom: '5px'}}>Price:</div>
                          <div style={{fontSize: '1rem', color: 'var(--text-dark)'}}>
                            {req.priceRequest !== null && req.priceRequest !== undefined ? (
                              <div>
                                <span style={{color: 'var(--primary-color)', fontWeight: '600'}}>₹{req.priceRequest.toFixed(2)}</span>
                                <span style={{fontSize: '0.85rem', color: 'var(--text-light)', marginLeft: '10px'}}>
                                  (Original: ₹{req.originalPrice?.toFixed(2) || selectedRide.ride.costPerPerson.toFixed(2)})
                                </span>
                              </div>
                            ) : (
                              <span>₹{req.originalPrice?.toFixed(2) || selectedRide.ride.costPerPerson.toFixed(2)} (Original Price)</span>
                            )}
                          </div>
                        </div>
                        {req.pickupCity && (
                          <div style={{marginTop: '10px', padding: '10px', background: 'var(--bg-light)', borderRadius: '8px'}}>
                            <div style={{fontSize: '0.9rem', fontWeight: '600', marginBottom: '5px'}}>Requestor's Route:</div>
                            <div style={{fontSize: '0.85rem', color: 'var(--text-dark)'}}>
                              <div><strong>Pickup:</strong> {req.pickupCity}{req.pickupAddress && ` - ${req.pickupAddress}`}</div>
                              <div style={{marginTop: '5px'}}><strong>Drop:</strong> {req.dropCity}{req.dropAddress && ` - ${req.dropAddress}`}</div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="request-actions">
                        <button className="btn btn-success" onClick={() => approveRequest(req.id, selectedRide.ride.id)}>
                          Approve
                        </button>
                        <button className="btn btn-danger" onClick={() => rejectRequest(req.id, selectedRide.ride.id)}>
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{textAlign: 'center', color: 'var(--text-light)', padding: '20px'}}>
                    No pending requests for this ride.
                  </p>
                )}
              </div>
            )}

            {isActiveRide(selectedRide.ride) && (
              <button className="sos-button" onClick={() => triggerSOS(selectedRide.ride.id)}>
                SOS / EMERGENCY
              </button>
            )}

            <div className="chat-section">
              <h4>In-App Chat</h4>
              <div className="chat-messages">
                {chatMessages.length === 0 ? (
                  <p style={{textAlign: 'center', color: 'var(--text-light)'}}>No messages yet. Start the conversation!</p>
                ) : (
                  chatMessages.map(msg => (
                    <div key={msg.id} className="chat-message">
                      <div className="chat-message-author">{msg.author.name}</div>
                      <div className="chat-message-text">{msg.message}</div>
                    </div>
                  ))
                )}
              </div>
              <div className="chat-input-area">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage(selectedRide.ride.id))}
                  placeholder="Type your message..."
                />
                <button className="btn btn-primary" onClick={() => sendMessage(selectedRide.ride.id)}>Send</button>
              </div>
            </div>

            <div className="action-buttons">
              {user && selectedRide.ride.publisher.id === user.id && (
                <button className="btn btn-danger" onClick={() => cancelRide(selectedRide.ride.id)}>
                  Cancel Ride
                </button>
              )}
              {user && selectedRide.ride.publisher.id !== user.id && (() => {
                const userRequest = selectedRide.allPassengers?.find(p => p.id === user.id && !p.isPublisher)
                const pendingReq = selectedRide.pendingRequests?.find(r => r.requestor.id === user.id)
                
                // Check if request is rejected by checking all requested rides
                const allRequestedRides = [...requestedRides, ...rideHistory.requested, ...upcomingRides.requested]
                const userRequestStatus = allRequestedRides.find(r => r.ride?.id === selectedRide.ride.id)?.status
                const isRejected = userRequestStatus === 'rejected'
                
                // Don't show cancel button if rejected
                if (isRejected) {
                  return null
                }
                
                const isApproved = userRequest !== undefined
                const isPending = pendingReq !== undefined
                
                // Get request ID
                let requestId = null
                if (isApproved && userRequest.requestId) {
                  requestId = userRequest.requestId
                } else if (isPending && pendingReq.id) {
                  requestId = pendingReq.id
                }
                
                if (isApproved && requestId) {
                  return (
                    <button
                      className="btn btn-danger"
                      onClick={() => cancelApprovedRequest(requestId, selectedRide.ride.id)}
                      disabled={isWithin30Minutes(selectedRide.ride)}
                      title={isWithin30Minutes(selectedRide.ride) ? 'Cannot cancel within 30 minutes of ride' : 'Cancel your ride'}
                    >
                      Cancel Ride
                    </button>
                  )
                } else if (isPending && requestId) {
                  return (
                    <button
                      className="btn btn-danger"
                      onClick={() => cancelRequest(requestId, selectedRide.ride.id)}
                      title="Cancel your ride request"
                    >
                      Cancel Request
                    </button>
                  )
                }
                return null
              })()}
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default MyRides

