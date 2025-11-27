import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../services/api'
import '../styles/Publish.css'

function Publish() {
  const navigate = useNavigate()
  const [cities, setCities] = useState([])
  const [formData, setFormData] = useState({
    pickupCity: '',
    dropCity: '',
    pickupAddress: '',
    dropAddress: '',
    onRouteCities: [],
    date: '',
    time: '',
    availableSeats: 1,
    costPerPerson: '',
    carModel: '',
    licensePlate: '',
    womenOnly: false
  })
  const [newRouteCity, setNewRouteCity] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load cities list
    api.get('/cities')
      .then(response => setCities(response.data.cities))
      .catch(error => console.error('Failed to load cities:', error))
  }, [])

  // Set minimum date to today
  const today = new Date().toISOString().split('T')[0]

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.pickupCity || !formData.dropCity) {
      alert('Please select both pickup and drop cities')
      return
    }
    
    if (!formData.pickupAddress.trim()) {
      alert('Please enter a pickup address')
      return
    }
    
    if (!formData.dropAddress.trim()) {
      alert('Please enter a drop address')
      return
    }
    
    setLoading(true)

    try {
      await api.post('/rides', {
        pickupCity: formData.pickupCity,
        dropCity: formData.dropCity,
        pickupAddress: formData.pickupAddress.trim(),
        dropAddress: formData.dropAddress.trim(),
        onRouteCities: formData.onRouteCities,
        date: formData.date,
        time: formData.time,
        availableSeats: formData.availableSeats,
        costPerPerson: formData.costPerPerson,
        carModel: formData.carModel,
        licensePlate: formData.licensePlate,
        womenOnly: formData.womenOnly
      })
      alert('Ride published successfully!')
      navigate('/my-rides')
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to publish ride')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="container">
        <div className="publish-section">
          <h2>Publish a New Ride</h2>
          <form onSubmit={handleSubmit} className="publish-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="pickupCity">Start City</label>
                <select
                  id="pickupCity"
                  name="pickupCity"
                  value={formData.pickupCity}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Start City</option>
                  {cities.map((city, index) => (
                    <option key={`${city}-${index}`} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="dropCity">Destination City</label>
                <select
                  id="dropCity"
                  name="dropCity"
                  value={formData.dropCity}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Destination City</option>
                  {cities.map((city, index) => (
                    <option key={`${city}-${index}`} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="pickupAddress">Start Address</label>
                <input
                  type="text"
                  id="pickupAddress"
                  name="pickupAddress"
                  value={formData.pickupAddress}
                  onChange={handleChange}
                  required
                  placeholder="Enter start address"
                />
              </div>
              <div className="form-group">
                <label htmlFor="dropAddress">Destination Address</label>
                <input
                  type="text"
                  id="dropAddress"
                  name="dropAddress"
                  value={formData.dropAddress}
                  onChange={handleChange}
                  required
                  placeholder="Enter destination address"
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="onRouteCities">On-Route Cities (Optional)</label>
              <p style={{fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '10px'}}>
                Add cities in the order you'll be passing through them. Rides will be shown to users searching for these cities, but only if the route order is correct (pickup before drop).
              </p>
              <div style={{display: 'flex', gap: '10px', marginBottom: '10px'}}>
                <select
                  id="newRouteCity"
                  value={newRouteCity}
                  onChange={(e) => setNewRouteCity(e.target.value)}
                  style={{flex: 1}}
                >
                  <option value="">Select a city to add</option>
                  {cities.filter(city => city !== formData.pickupCity && city !== formData.dropCity && !formData.onRouteCities.includes(city)).map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (newRouteCity && !formData.onRouteCities.includes(newRouteCity)) {
                      setFormData({...formData, onRouteCities: [...formData.onRouteCities, newRouteCity]})
                      setNewRouteCity('')
                    }
                  }}
                  disabled={!newRouteCity}
                >
                  Add Next
                </button>
              </div>
              {formData.onRouteCities.length > 0 && (
                <div style={{marginTop: '15px'}}>
                  <div style={{fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '8px', fontWeight: '600'}}>
                    Route Order: {formData.pickupCity} (Start) → {formData.onRouteCities.join(' → ')} → {formData.dropCity} (Destination)
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    {formData.onRouteCities.map((city, idx) => (
                      <div key={idx} style={{
                        background: 'var(--primary-color)',
                        color: 'white',
                        padding: '10px 15px',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                          <span style={{
                            background: 'rgba(255,255,255,0.3)',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            fontWeight: 'bold'
                          }}>
                            {idx + 1}
                          </span>
                          <span>{city}</span>
                        </div>
                        <div style={{display: 'flex', gap: '5px'}}>
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newOrder = [...formData.onRouteCities]
                                const temp = newOrder[idx]
                                newOrder[idx] = newOrder[idx - 1]
                                newOrder[idx - 1] = temp
                                setFormData({...formData, onRouteCities: newOrder})
                              }}
                              style={{
                                background: 'rgba(255,255,255,0.3)',
                                border: 'none',
                                color: 'white',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                              title="Move up"
                            >
                              ↑
                            </button>
                          )}
                          {idx < formData.onRouteCities.length - 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newOrder = [...formData.onRouteCities]
                                const temp = newOrder[idx]
                                newOrder[idx] = newOrder[idx + 1]
                                newOrder[idx + 1] = temp
                                setFormData({...formData, onRouteCities: newOrder})
                              }}
                              style={{
                                background: 'rgba(255,255,255,0.3)',
                                border: 'none',
                                color: 'white',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                              title="Move down"
                            >
                              ↓
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                onRouteCities: formData.onRouteCities.filter((_, i) => i !== idx)
                              })
                            }}
                            style={{
                              background: 'rgba(255,255,255,0.3)',
                              border: 'none',
                              color: 'white',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              marginLeft: '5px'
                            }}
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="date">Date</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  min={today}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="time">Time</label>
                <input
                  type="time"
                  id="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="availableSeats">Available Seats</label>
                <input
                  type="number"
                  id="availableSeats"
                  name="availableSeats"
                  value={formData.availableSeats}
                  onChange={handleChange}
                  min="1"
                  max="10"
                  required
                  placeholder="Number of seats"
                />
              </div>
              <div className="form-group">
                <label htmlFor="costPerPerson">Cost per Person (₹)</label>
                <input
                  type="number"
                  id="costPerPerson"
                  name="costPerPerson"
                  value={formData.costPerPerson}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="carModel">Car Model</label>
                <input
                  type="text"
                  id="carModel"
                  name="carModel"
                  value={formData.carModel}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Honda City"
                />
              </div>
              <div className="form-group">
                <label htmlFor="licensePlate">License Plate</label>
                <input
                  type="text"
                  id="licensePlate"
                  name="licensePlate"
                  value={formData.licensePlate}
                  onChange={handleChange}
                  required
                  placeholder="e.g., MH-12-AB-1234"
                />
              </div>
            </div>
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  id="womenOnly"
                  name="womenOnly"
                  checked={formData.womenOnly}
                  onChange={handleChange}
                />
                <span>Women Only Ride</span>
              </label>
            </div>
            <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
              {loading ? 'Publishing...' : 'Publish Ride'}
            </button>
          </form>
        </div>
      </main>
    </>
  )
}

export default Publish

