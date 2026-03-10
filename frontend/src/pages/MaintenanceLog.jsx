import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Input from '../components/Input'
import Select from '../components/Select'
import TextArea from '../components/TextArea'
import Button from '../components/Button'
import FileUpload from '../components/FileUpload'
import { assetAPI, maintenanceItemAPI, maintenanceLogAPI } from '../services/api'
import './MaintenanceLog.css'

function MaintenanceLog() {
  const navigate = useNavigate()
  const location = useLocation()

  const preSelectedAssetId = location.state?.assetId
  const preSelectedItemId = location.state?.itemId

  const [assets, setAssets] = useState([])
  const [maintenanceItems, setMaintenanceItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    asset_id: preSelectedAssetId || '',
    maintenance_item_id: preSelectedItemId || '',
    date_performed: new Date().toISOString().split('T')[0],
    usage_reading: '',
    cost: '',
    notes: ''
  })

  const [attachments, setAttachments] = useState([])

  useEffect(() => {
    loadAssets()
  }, [])

  useEffect(() => {
    if (formData.asset_id) {
      loadMaintenanceItems(formData.asset_id)
    }
  }, [formData.asset_id])

  const loadAssets = async () => {
    try {
      setLoading(true)
      const response = await assetAPI.getAll()
      setAssets(response.data)

      if (preSelectedAssetId) {
        const asset = response.data.find(a => a.id === preSelectedAssetId)
        if (asset && asset.usage_metric) {
          setFormData(prev => ({
            ...prev,
            usage_reading: asset.current_usage.toString()
          }))
        }
      }
    } catch (err) {
      setError('Failed to load assets')
      console.error('Error loading assets:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadMaintenanceItems = async (assetId) => {
    try {
      const response = await maintenanceItemAPI.getAll(assetId)
      setMaintenanceItems(response.data)
    } catch (err) {
      setError('Failed to load maintenance items')
      console.error('Error loading maintenance items:', err)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    if (name === 'asset_id') {
      setFormData(prev => ({
        ...prev,
        maintenance_item_id: ''
      }))

      const asset = assets.find(a => a.id === parseInt(value))
      if (asset && asset.usage_metric) {
        setFormData(prev => ({
          ...prev,
          usage_reading: asset.current_usage.toString()
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          usage_reading: ''
        }))
      }
    }
  }

  const handleRemoveAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const submitData = new FormData()
      submitData.append('maintenance_item_id', formData.maintenance_item_id)
      submitData.append('date_performed', formData.date_performed)
      if (formData.usage_reading) {
        submitData.append('usage_reading', formData.usage_reading)
      }
      if (formData.cost) {
        submitData.append('cost', formData.cost)
      }
      if (formData.notes) {
        submitData.append('notes', formData.notes)
      }
      attachments.forEach(file => {
        submitData.append('attachments', file)
      })

      await maintenanceLogAPI.create(submitData)

      setSuccess(true)

      setTimeout(() => {
        navigate(`/asset/${formData.asset_id}`)
      }, 1500)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to log maintenance')
      console.error('Error logging maintenance:', err)
      setSubmitting(false)
    }
  }

  const selectedAsset = assets.find(a => a.id === parseInt(formData.asset_id))

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (success) {
    return (
      <div className="maintenance-log-page">
        <div className="success-message">
          <h2>Maintenance Logged Successfully!</h2>
          <p>Redirecting back to asset details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="maintenance-log-page">
      <div className="page-header">
        <h2>Log Maintenance</h2>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>
      </div>

      {error && (
        <div className="error-alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="maintenance-log-form">
        <div className="form-section">
          <h3>Select Asset & Maintenance Item</h3>

          <Select
            label="Asset"
            name="asset_id"
            value={formData.asset_id}
            onChange={handleChange}
            options={[
              { value: '', label: 'Select an asset...' },
              ...assets.map(a => ({
                value: a.id.toString(),
                label: a.name
              }))
            ]}
            required
          />

          {formData.asset_id && (
            <Select
              label="Maintenance Item"
              name="maintenance_item_id"
              value={formData.maintenance_item_id}
              onChange={handleChange}
              options={[
                { value: '', label: 'Select a maintenance item...' },
                ...maintenanceItems.map(item => ({
                  value: item.id.toString(),
                  label: `${item.name} (Every ${item.frequency_value} ${item.frequency_unit})`
                }))
              ]}
              required
            />
          )}
        </div>

        {formData.maintenance_item_id && (
          <>
            <div className="form-section">
              <h3>Maintenance Details</h3>

              <div className="form-row-2col">
                <Input
                  label="Date Performed"
                  name="date_performed"
                  type="date"
                  value={formData.date_performed}
                  onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />

                {selectedAsset?.usage_metric && (
                  <Input
                    label={`Current ${selectedAsset.usage_metric}`}
                    name="usage_reading"
                    type="number"
                    value={formData.usage_reading}
                    onChange={handleChange}
                    placeholder={`e.g., 25000`}
                    min="0"
                  />
                )}
              </div>

              {selectedAsset?.usage_metric && (
                <p className="mileage-hint">
                  Last recorded {selectedAsset.usage_metric}: {selectedAsset.current_usage.toLocaleString()}
                </p>
              )}

              <Input
                label="Cost (Optional)"
                name="cost"
                type="number"
                value={formData.cost}
                onChange={handleChange}
                placeholder="e.g., 45.99"
                min="0"
                step="0.01"
              />

              <TextArea
                label="Notes (Optional)"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="e.g., Parts used, any issues noticed..."
                rows={4}
              />
            </div>

            <div className="form-section">
              <FileUpload
                files={attachments}
                onChange={setAttachments}
                onRemove={handleRemoveAttachment}
                label="Receipts & Documents"
              />
            </div>

            <div className="form-footer">
              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                fullWidth
              >
                {submitting ? 'Logging Maintenance...' : 'Log Maintenance'}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}

export default MaintenanceLog
