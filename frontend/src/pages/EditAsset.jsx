import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Input from '../components/Input'
import Button from '../components/Button'
import { assetAPI } from '../services/api'
import './EditVehicle.css'

function EditAsset() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    location: '',
    usage_metric: '',
    current_usage: ''
  })

  useEffect(() => {
    loadAsset()
  }, [id])

  const loadAsset = async () => {
    try {
      setLoading(true)
      const response = await assetAPI.getById(id)
      const asset = response.data
      setFormData({
        name: asset.name,
        description: asset.description || '',
        category: asset.category || '',
        location: asset.location || '',
        usage_metric: asset.usage_metric || '',
        current_usage: asset.current_usage || ''
      })
    } catch (err) {
      setError('Failed to load asset')
      console.error('Error loading asset:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await assetAPI.update(id, {
        name: formData.name,
        description: formData.description || null,
        category: formData.category || null,
        location: formData.location || null,
        usage_metric: formData.usage_metric || null,
        current_usage: formData.current_usage ? parseInt(formData.current_usage) : 0
      })

      navigate(`/asset/${id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update asset')
      console.error('Error updating asset:', err)
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading asset...</div>
  }

  if (error && !formData.name) {
    return (
      <div className="edit-vehicle-page">
        <div className="error-alert">{error}</div>
        <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
      </div>
    )
  }

  return (
    <div className="edit-vehicle-page">
      <div className="page-header">
        <h2>Edit Asset</h2>
        <Button variant="outline" onClick={() => navigate(`/asset/${id}`)}>
          Cancel
        </Button>
      </div>

      {error && (
        <div className="error-alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="edit-vehicle-form">
        <div className="form-section">
          <h3>Asset Information</h3>

          <Input
            label="Name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., 2020 Toyota Camry, HVAC System"
            required
          />

          <Input
            label="Description (Optional)"
            name="description"
            type="text"
            value={formData.description}
            onChange={handleChange}
            placeholder="e.g., Main family car, Upstairs unit"
          />

          <Input
            label="Category (Optional)"
            name="category"
            type="text"
            value={formData.category}
            onChange={handleChange}
            placeholder="e.g., Vehicle, Appliance, Room"
          />

          <Input
            label="Location (Optional)"
            name="location"
            type="text"
            value={formData.location}
            onChange={handleChange}
            placeholder="e.g., Garage, Basement, 2nd Floor"
          />

          <Input
            label="Usage Metric (Optional)"
            name="usage_metric"
            type="text"
            value={formData.usage_metric}
            onChange={handleChange}
            placeholder="e.g., miles, hours, cycles"
          />

          {formData.usage_metric && (
            <Input
              label={`Current ${formData.usage_metric || 'Usage'}`}
              name="current_usage"
              type="number"
              value={formData.current_usage}
              onChange={handleChange}
              placeholder="e.g., 45000"
              min="0"
            />
          )}
        </div>

        <div className="form-footer">
          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            fullWidth
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default EditAsset
