import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import MaintenanceItemForm from '../components/MaintenanceItemForm'
import { assetAPI, maintenanceItemAPI } from '../services/api'
import './AddMaintenanceItem.css'

function AddMaintenanceItem() {
  const { assetId } = useParams()
  const navigate = useNavigate()

  const [asset, setAsset] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadAsset()
  }, [assetId])

  const loadAsset = async () => {
    try {
      setLoading(true)
      const response = await assetAPI.getById(assetId)
      setAsset(response.data)
    } catch (err) {
      setError('Failed to load asset')
      console.error('Error loading asset:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async (item) => {
    setSubmitting(true)
    setError(null)

    try {
      await maintenanceItemAPI.create({
        ...item,
        asset_id: parseInt(assetId)
      })

      navigate(`/asset/${assetId}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add maintenance item')
      console.error('Error adding maintenance item:', err)
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (error && !asset) {
    return (
      <div className="add-maintenance-item-page">
        <div className="error-alert">{error}</div>
        <Button onClick={() => navigate(`/asset/${assetId}`)}>Back to Asset</Button>
      </div>
    )
  }

  return (
    <div className="add-maintenance-item-page">
      <div className="page-header">
        <div>
          <h2>Add Maintenance Item</h2>
          {asset && (
            <p className="vehicle-name">
              {asset.name}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={() => navigate(`/asset/${assetId}`)}>
          Cancel
        </Button>
      </div>

      {error && (
        <div className="error-alert">
          {error}
        </div>
      )}

      <div className="form-container">
        <MaintenanceItemForm
          onAdd={handleAddItem}
          usageMetric={asset?.usage_metric}
        />
      </div>
    </div>
  )
}

export default AddMaintenanceItem
