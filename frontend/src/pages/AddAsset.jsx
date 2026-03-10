import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Input from '../components/Input'
import Button from '../components/Button'
import MaintenanceItemForm from '../components/MaintenanceItemForm'
import { assetAPI, maintenanceItemAPI } from '../services/api'
import './AddVehicle.css'

function AddAsset() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false)

  const [assetData, setAssetData] = useState({
    name: '',
    description: '',
    category: '',
    location: '',
    usage_metric: '',
    current_usage: ''
  })

  const [maintenanceItems, setMaintenanceItems] = useState([])

  const handleAssetChange = (e) => {
    const { name, value } = e.target
    setAssetData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAddMaintenanceItem = (item) => {
    setMaintenanceItems(prev => [...prev, item])
  }

  const handleRemoveMaintenanceItem = (index) => {
    setMaintenanceItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const assetPayload = {
        name: assetData.name,
        description: assetData.description || undefined,
        category: assetData.category || undefined,
        location: assetData.location || undefined,
        usage_metric: assetData.usage_metric || undefined,
        current_usage: assetData.current_usage ? parseInt(assetData.current_usage) : 0
      }

      const assetResponse = await assetAPI.create(assetPayload)
      const assetId = assetResponse.data.id

      for (const item of maintenanceItems) {
        await maintenanceItemAPI.create({
          ...item,
          asset_id: assetId
        })
      }

      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create asset')
      console.error('Error creating asset:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="add-vehicle-page">
      <div className="page-header">
        <h2>Add New Asset</h2>
        <Button variant="outline" onClick={() => navigate('/')}>
          Back to Dashboard
        </Button>
      </div>

      {error && (
        <div className="error-alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="add-vehicle-form">
        <section className="form-section">
          <h3>Asset Information</h3>

          <div className="form-grid">
            <Input
              label="Name"
              name="name"
              value={assetData.name}
              onChange={handleAssetChange}
              placeholder="e.g., 2020 Toyota Camry, HVAC System, Bathroom"
              required
            />

            <Input
              label="Description (Optional)"
              name="description"
              value={assetData.description}
              onChange={handleAssetChange}
              placeholder="e.g., Main family car, Upstairs unit"
            />

            <Input
              label="Category (Optional)"
              name="category"
              value={assetData.category}
              onChange={handleAssetChange}
              placeholder="e.g., Vehicle, Appliance, Room"
            />

            <Input
              label="Location (Optional)"
              name="location"
              value={assetData.location}
              onChange={handleAssetChange}
              placeholder="e.g., Garage, Basement, 2nd Floor"
            />

            <Input
              label="Usage Metric (Optional)"
              name="usage_metric"
              value={assetData.usage_metric}
              onChange={handleAssetChange}
              placeholder="e.g., miles, hours, cycles"
            />

            {assetData.usage_metric && (
              <Input
                label={`Current ${assetData.usage_metric || 'Usage'}`}
                name="current_usage"
                type="number"
                value={assetData.current_usage}
                onChange={handleAssetChange}
                placeholder="e.g., 25000"
                min="0"
              />
            )}
          </div>
        </section>

        <section className="form-section">
          <div className="section-header">
            <h3>Maintenance Items</h3>
            <p className="section-description">
              Add maintenance items to track for this asset
            </p>
          </div>

          {maintenanceItems.length > 0 && (
            <div className="maintenance-items-list">
              {maintenanceItems.map((item, index) => (
                <div key={index} className="maintenance-item-card">
                  <div className="item-info">
                    <h4>{item.name}</h4>
                    <p className="item-frequency">
                      Every {item.frequency_value} {item.frequency_unit}
                      {item.maintenance_type === 'usage' ? ' (Usage-based)' : ' (Time-based)'}
                    </p>
                    {item.notes && <p className="item-notes">{item.notes}</p>}
                  </div>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => handleRemoveMaintenanceItem(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          {showMaintenanceForm ? (
            <MaintenanceItemForm
              onAdd={handleAddMaintenanceItem}
              onCancel={() => setShowMaintenanceForm(false)}
              usageMetric={assetData.usage_metric}
            />
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowMaintenanceForm(true)}
            >
              + Add Maintenance Item
            </Button>
          )}
        </section>

        <div className="form-footer">
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            fullWidth
          >
            {loading ? 'Creating Asset...' : 'Create Asset'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default AddAsset
