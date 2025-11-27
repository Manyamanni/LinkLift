import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import api from '../services/api'
import '../styles/Dashboard.css'

function Dashboard() {
  const [cities, setCities] = useState([])
  const [searchData, setSearchData] = useState({
    pickupCity: '',
    pickupAddress: '',
    dropCity: '',
    dropAddress: '',
    date: '',
    passengers: 1,
    womenOnly: false
  })
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [selectedRide, setSelectedRide] = useState(null)
  const [priceRequests, setPriceRequests] = useState({}) // Store price requests for each ride

  useEffect(() => {
    // Load cities list
    api.get('/cities')
      .then(response => setCities(response.data.cities))
      .catch(error => console.error('Failed to load cities:', error))
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setSearchData({
      ...searchData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    
    if (!searchData.pickupCity) {
      alert('Please select a pickup city')
      return
    }
    
    if (!searchData.pickupAddress.trim()) {
      alert('Please enter a pickup address')
      return
    }
    
    if (!searchData.dropCity) {
      alert('Please select a drop city')
      return
    }
    
    if (!searchData.dropAddress.trim()) {
      alert('Please enter a drop address')
      return
    }
    
    setLoading(true)
    try {
      const response = await api.post('/rides/search', {
        pickupCity: searchData.pickupCity,
        pickupAddress: searchData.pickupAddress.trim(),
        dropCity: searchData.dropCity,
        dropAddress: searchData.dropAddress.trim(),
        date: searchData.date,
        passengers: searchData.passengers,
        womenOnly: searchData.womenOnly
      })
      setResults(response.data.rides)
      setShowResults(true)
      
      // Update search date display if provided by backend
      if (response.data.searchDate) {
        // Date is already in searchData, no need to update
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestSeat = (ride) => {
    setSelectedRide(ride)
    // Initialize price request from stored value or empty
    if (!priceRequests[ride.id]) {
      setPriceRequests({...priceRequests, [ride.id]: ''})
    }
    setShowRequestModal(true)
  }

  const handlePriceRequestChange = (rideId, value) => {
    setPriceRequests({...priceRequests, [rideId]: value})
  }

  const handleSubmitRequest = async () => {
    if (!selectedRide) return
    
    try {
      const requestData = {
        rideId: selectedRide.id,
        numPassengers: parseInt(searchData.passengers),
        pickupCity: searchData.pickupCity,
        dropCity: searchData.dropCity,
        pickupAddress: searchData.pickupAddress,
        dropAddress: searchData.dropAddress
      }
      
      // Add price request if provided
      const priceRequestValue = priceRequests[selectedRide.id] || ''
      if (priceRequestValue && priceRequestValue.trim() !== '') {
        const price = parseFloat(priceRequestValue)
        if (!isNaN(price) && price >= 0) {
          requestData.priceRequest = price
        }
      }
      
      await api.post('/requests', requestData)
      alert('Seat request sent! Check "My Rides" for updates.')
      setShowRequestModal(false)
      setSelectedRide(null)
      // Navigate to My Rides page and show requested rides tab
      window.location.href = `/my-rides?tab=requested&ride=${selectedRide.id}`
    } catch (error) {
      alert(error.response?.data?.error || 'Request failed')
    }
  }

  const handleNextDaySearch = async () => {
    if (!searchData.date) return
    
    // Calculate next day
    const currentDate = new Date(searchData.date)
    currentDate.setDate(currentDate.getDate() + 1)
    const nextDate = currentDate.toISOString().split('T')[0]
    
    // Update search data with next date
    const updatedSearchData = {
      ...searchData,
      date: nextDate
    }
    
    setSearchData(updatedSearchData)
    setLoading(true)
    
    try {
      const response = await api.post('/rides/search', {
        pickupCity: updatedSearchData.pickupCity,
        pickupAddress: updatedSearchData.pickupAddress.trim(),
        dropCity: updatedSearchData.dropCity,
        dropAddress: updatedSearchData.dropAddress.trim(),
        date: nextDate,
        passengers: updatedSearchData.passengers,
        womenOnly: updatedSearchData.womenOnly
      })
      setResults(response.data.rides)
      setShowResults(true)
    } catch (error) {
      alert(error.response?.data?.error || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleInvertCities = () => {
    setSearchData({
      ...searchData,
      pickupCity: searchData.dropCity,
      dropCity: searchData.pickupCity
    })
  }

  return (
    <>
      <Navbar />
      <main className="container">
        <div className="search-section">
          <h2>Find Your Perfect Ride</h2>
          <form onSubmit={handleSearch} className="search-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="pickupCity">Pickup City</label>
                <select
                  id="pickupCity"
                  name="pickupCity"
                  value={searchData.pickupCity}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Pickup City</option>
                  {cities.map((city, index) => (
                    <option key={`${city}-${index}`} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              <div style={{display: 'flex', alignItems: 'flex-end', paddingBottom: '5px'}}>
                <button
                  type="button"
                  onClick={handleInvertCities}
                  style={{
                    background: 'var(--primary-color)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'rotate(180deg)'
                    e.currentTarget.style.background = 'var(--primary-dark, #0056b3)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'rotate(0deg)'
                    e.currentTarget.style.background = 'var(--primary-color)'
                  }}
                  title="Swap pickup and drop locations"
                >
                  ⇅
                </button>
              </div>
              <div className="form-group">
                <label htmlFor="dropCity">Drop City</label>
                <select
                  id="dropCity"
                  name="dropCity"
                  value={searchData.dropCity}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Drop City</option>
                  {cities.map((city, index) => (
                    <option key={`${city}-${index}`} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="pickupAddress">Pickup Address</label>
                <input
                  type="text"
                  id="pickupAddress"
                  name="pickupAddress"
                  value={searchData.pickupAddress}
                  onChange={handleChange}
                  required
                  placeholder="Enter pickup address"
                />
              </div>
              <div className="form-group" style={{visibility: 'hidden'}}>
                {/* Spacer to align with invert button above */}
              </div>
              <div className="form-group">
                <label htmlFor="dropAddress">Drop Address</label>
                <input
                  type="text"
                  id="dropAddress"
                  name="dropAddress"
                  value={searchData.dropAddress}
                  onChange={handleChange}
                  required
                  placeholder="Enter drop address"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="date">Date</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={searchData.date}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="passengers">Number of Passengers</label>
                <input
                  type="number"
                  id="passengers"
                  name="passengers"
                  value={searchData.passengers}
                  onChange={handleChange}
                  min="1"
                  required
                  placeholder="1"
                />
              </div>
            </div>
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  id="womenOnly"
                  name="womenOnly"
                  checked={searchData.womenOnly}
                  onChange={handleChange}
                />
                <span>Women Only Rides</span>
              </label>
            </div>
            <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
              {loading ? 'Searching...' : 'Search Rides'}
            </button>
          </form>
        </div>

        {showResults && (
          <div className="results-section">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h3>Search Results</h3>
              {searchData.date && (
                <div style={{fontSize: '1.1rem', color: 'var(--text-dark)', fontWeight: '600'}}>
                  Date: {new Date(searchData.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              )}
            </div>
            {results.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🚗</div>
                <h3>No rides found</h3>
                <p>Try adjusting your search criteria or check back later.</p>
                {searchData.date && (
                  <button 
                    className="btn btn-primary" 
                    onClick={handleNextDaySearch}
                    style={{marginTop: '20px'}}
                  >
                    Search for Next Day
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="results-container">
                  {results.map(ride => (
                    <div key={ride.id} className="ride-card">
                      <div className="ride-card-header">
                        <div className="ride-creator">{ride.publisher?.name || 'Unknown'}</div>
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
                      {ride.pickupAddress && (
                        <div className="ride-detail-item">
                          <div className="ride-detail-label">Start Address</div>
                          <div className="ride-detail-value">{ride.pickupAddress}</div>
                        </div>
                      )}
                      {ride.dropAddress && (
                        <div className="ride-detail-item">
                          <div className="ride-detail-label">Destination Address</div>
                          <div className="ride-detail-value">{ride.dropAddress}</div>
                        </div>
                      )}
                      <div className="ride-detail-item">
                        <div className="ride-detail-label">Available Seats</div>
                        <div className="ride-detail-value">{ride.availableSeats} / {ride.capacity}</div>
                      </div>
                      <div className="ride-detail-item">
                        <div className="ride-detail-label">Cost per Person</div>
                        <div className="ride-detail-value">₹{(ride.costPerPerson || 0).toFixed(2)}</div>
                      </div>
                    </div>
                    {ride.womenOnly && <span className="women-only-badge">Women Only</span>}
                    <div style={{padding: '15px', background: 'var(--bg-light)', borderRadius: '8px', marginTop: '10px'}}>
                      <label htmlFor={`priceRequest-${ride.id}`} style={{fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px', display: 'block'}}>
                        Price Request (Optional)
                      </label>
                      <input
                        type="number"
                        id={`priceRequest-${ride.id}`}
                        value={priceRequests[ride.id] || ''}
                        onChange={(e) => handlePriceRequestChange(ride.id, e.target.value)}
                        placeholder={`Original: ₹${(ride.costPerPerson || 0).toFixed(2)}`}
                        min="0"
                        step="0.01"
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.95rem'
                        }}
                      />
                      <p style={{fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '5px', marginBottom: 0}}>
                        Enter your price offer per person
                      </p>
                    </div>
                    <div className="ride-card-footer">
                      <div className="cost-display">₹{(ride.costPerPerson || 0).toFixed(2)}</div>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleRequestSeat(ride)}
                      >
                        Send Ride Request
                      </button>
                    </div>
                  </div>
                ))}
                </div>
                {searchData.date && (
                  <div style={{marginTop: '30px', textAlign: 'center'}}>
                    <button 
                      className="btn btn-primary btn-large" 
                      onClick={handleNextDaySearch}
                    >
                      Search for Next Day
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Request Modal */}
        {showRequestModal && selectedRide && (
          <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Request Seat</h3>
                <button className="modal-close" onClick={() => setShowRequestModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div style={{marginBottom: '20px'}}>
                  <h4>Ride Details</h4>
                  <p><strong>Publisher:</strong> {selectedRide.publisher?.name || 'Unknown'}</p>
                  <p><strong>Route:</strong> {selectedRide.pickupCity} → {selectedRide.dropCity}</p>
                  <p><strong>Date & Time:</strong> {new Date(selectedRide.date).toLocaleDateString()} at {selectedRide.time}</p>
                  <p><strong>Original Price:</strong> ₹{(selectedRide.costPerPerson || 0).toFixed(2)} per person</p>
                </div>
                <div style={{marginBottom: '20px'}}>
                  <h4>Your Request</h4>
                  <p><strong>Seats:</strong> {searchData.passengers}</p>
                  <p><strong>Your Pickup:</strong> {searchData.pickupCity}{searchData.pickupAddress && ` - ${searchData.pickupAddress}`}</p>
                  <p><strong>Your Drop:</strong> {searchData.dropCity}{searchData.dropAddress && ` - ${searchData.dropAddress}`}</p>
                </div>
                <div className="form-group">
                  <label htmlFor="priceRequest">Price Request (Optional)</label>
                  <p style={{fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '5px'}}>
                    Enter the price you're willing to pay per person. Leave empty to accept the original price.
                  </p>
                  <input
                    type="number"
                    id="priceRequest"
                    value={priceRequests[selectedRide.id] || ''}
                    onChange={(e) => handlePriceRequestChange(selectedRide.id, e.target.value)}
                    placeholder={`Original: ₹${(selectedRide.costPerPerson || 0).toFixed(2)}`}
                    min="0"
                    step="0.01"
                    style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)'}}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowRequestModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleSubmitRequest}>
                  Send Request
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}

export default Dashboard

