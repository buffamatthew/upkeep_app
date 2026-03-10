import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import ProgressBar from '../components/ProgressBar'
import CircularProgress from '../components/CircularProgress'
import { assetAPI, maintenanceItemAPI, maintenanceLogAPI, generalMaintenanceAPI } from '../services/api'
import { parseLocalDate } from '../utils/date'
import './VehicleDetail.css'

function AssetDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [asset, setAsset] = useState(null)
  const [maintenanceItems, setMaintenanceItems] = useState([])
  const [generalMaintenanceRecords, setGeneralMaintenanceRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadAssetData()
  }, [id])

  const loadAssetData = async () => {
    try {
      setLoading(true)

      const assetResponse = await assetAPI.getById(id)
      setAsset(assetResponse.data)

      const itemsResponse = await maintenanceItemAPI.getAll(id)
      const items = itemsResponse.data

      const itemsWithLogs = await Promise.all(
        items.map(async (item) => {
          const logsResponse = await maintenanceLogAPI.getAll(item.id)
          return {
            ...item,
            logs: logsResponse.data
          }
        })
      )

      setMaintenanceItems(itemsWithLogs)

      const generalMaintenanceResponse = await generalMaintenanceAPI.getAll(id)
      setGeneralMaintenanceRecords(generalMaintenanceResponse.data.sort((a, b) =>
        parseLocalDate(b.date_performed) - parseLocalDate(a.date_performed)
      ))
    } catch (err) {
      setError('Failed to load asset details')
      console.error('Error loading asset:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAsset = async () => {
    if (!window.confirm(`Are you sure you want to delete this asset? This will also delete all maintenance items and logs.`)) {
      return
    }

    try {
      await assetAPI.delete(id)
      navigate('/')
    } catch (err) {
      setError('Failed to delete asset')
      console.error('Error deleting asset:', err)
    }
  }

  const handleDeleteItem = async (itemId, itemName) => {
    if (!window.confirm(`Are you sure you want to delete "${itemName}"? This will also delete all logs for this maintenance item.`)) {
      return
    }

    try {
      await maintenanceItemAPI.delete(itemId)
      setMaintenanceItems(maintenanceItems.filter(item => item.id !== itemId))
    } catch (err) {
      setError('Failed to delete maintenance item')
      console.error('Error deleting maintenance item:', err)
    }
  }

  const getMaintenanceStatus = (item) => {
    if (!item.logs || item.logs.length === 0) {
      return {
        status: 'never',
        message: 'Never performed',
        percentageRemaining: 0
      }
    }

    const sortedLogs = [...item.logs].sort((a, b) =>
      parseLocalDate(b.date_performed) - parseLocalDate(a.date_performed)
    )
    const lastLog = sortedLogs[0]

    if (item.maintenance_type === 'usage' && asset.usage_metric) {
      const lastUsage = lastLog.usage_reading || 0
      const nextUsage = lastUsage + item.frequency_value
      const usageRemaining = nextUsage - asset.current_usage
      const percentageRemaining = Math.max(0, (usageRemaining / item.frequency_value) * 100)

      let status = 'good'
      if (usageRemaining <= 0) {
        status = 'overdue'
      } else if (usageRemaining <= item.frequency_value * 0.2) {
        status = 'due-soon'
      }

      return {
        status,
        message: `${usageRemaining > 0 ? usageRemaining : 0} ${asset.usage_metric} remaining`,
        usageRemaining,
        nextUsage,
        percentageRemaining
      }
    } else {
      const lastDate = parseLocalDate(lastLog.date_performed)
      const today = new Date()
      const daysSinceLast = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24))

      let frequencyInDays = item.frequency_value
      if (item.frequency_unit === 'weeks') {
        frequencyInDays = item.frequency_value * 7
      } else if (item.frequency_unit === 'months') {
        frequencyInDays = item.frequency_value * 30
      } else if (item.frequency_unit === 'years') {
        frequencyInDays = item.frequency_value * 365
      }

      const daysRemaining = frequencyInDays - daysSinceLast
      const percentageRemaining = Math.max(0, (daysRemaining / frequencyInDays) * 100)

      let status = 'good'
      if (daysRemaining <= 0) {
        status = 'overdue'
      } else if (daysRemaining <= frequencyInDays * 0.2) {
        status = 'due-soon'
      }

      return {
        status,
        message: daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Overdue',
        daysRemaining,
        nextDate: new Date(lastDate.getTime() + frequencyInDays * 24 * 60 * 60 * 1000),
        percentageRemaining
      }
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'good':
        return 'status-good'
      case 'due-soon':
        return 'status-due-soon'
      case 'overdue':
        return 'status-overdue'
      case 'never':
        return 'status-never'
      default:
        return ''
    }
  }

  const formatLastPerformed = (logs) => {
    if (!logs || logs.length === 0) {
      return 'Never'
    }

    const sortedLogs = [...logs].sort((a, b) =>
      parseLocalDate(b.date_performed) - parseLocalDate(a.date_performed)
    )
    const lastLog = sortedLogs[0]
    const date = parseLocalDate(lastLog.date_performed)

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return <div className="loading">Loading asset details...</div>
  }

  if (error || !asset) {
    return (
      <div className="vehicle-detail-page">
        <div className="error-alert">{error || 'Asset not found'}</div>
        <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
      </div>
    )
  }

  return (
    <div className="vehicle-detail-page">
      <div className="page-header">
        <div>
          <h2>{asset.name}</h2>
          {asset.description && <p className="engine-type">{asset.description}</p>}
        </div>
        <div className="header-actions">
          <Button onClick={() => navigate(`/asset/${id}/edit`)}>
            Edit Asset
          </Button>
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
        </div>
      </div>

      <div className="vehicle-stats">
        {asset.usage_metric && (
          <div className="stat-card">
            <div className="stat-label">Current {asset.usage_metric}</div>
            <div className="stat-value">{asset.current_usage.toLocaleString()}</div>
            <div className="stat-unit">{asset.usage_metric}</div>
          </div>
        )}
        <div className="stat-card">
          <div className="stat-label">Maintenance Items</div>
          <div className="stat-value">{maintenanceItems.length}</div>
          <div className="stat-unit">tracked</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Items Due</div>
          <div className="stat-value">
            {maintenanceItems.filter(item => {
              const status = getMaintenanceStatus(item)
              return status.status === 'overdue' || status.status === 'due-soon'
            }).length}
          </div>
          <div className="stat-unit">need attention</div>
        </div>
      </div>

      <div className="maintenance-section">
        <div className="section-header">
          <h3>Maintenance Items</h3>
          <div className="section-actions">
            <Button variant="outline" onClick={() => navigate(`/asset/${asset.id}/add-item`)}>
              + Add Item
            </Button>
            <Button onClick={() => navigate('/maintenance-log', { state: { assetId: asset.id } })}>
              + Log Maintenance
            </Button>
          </div>
        </div>

        {maintenanceItems.length === 0 ? (
          <div className="empty-state">
            <p>No maintenance items configured for this asset.</p>
            <p className="empty-hint">Click "+ Add Item" to get started!</p>
          </div>
        ) : (
          <div className="maintenance-items">
            {maintenanceItems.map((item) => {
              const status = getMaintenanceStatus(item)
              return (
                <div key={item.id} className={`maintenance-card ${getStatusColor(status.status)}`}>
                  <div className="card-header">
                    <div className="card-header-left">
                      <h4>{item.name}</h4>
                      <span className={`status-badge ${getStatusColor(status.status)}`}>
                        {status.status === 'never' && 'Not Done'}
                        {status.status === 'good' && 'Good'}
                        {status.status === 'due-soon' && 'Due Soon'}
                        {status.status === 'overdue' && 'Overdue'}
                      </span>
                    </div>
                    <CircularProgress
                      percentage={status.percentageRemaining}
                      status={status.status}
                      size={70}
                      strokeWidth={6}
                    />
                  </div>

                  <div className="card-body">
                    <div className="progress-section">
                      <ProgressBar
                        percentage={status.percentageRemaining}
                        status={status.status}
                        showLabel={false}
                      />
                    </div>
                    <div className="info-row">
                      <span className="label">Frequency:</span>
                      <span>Every {item.frequency_value} {item.frequency_unit}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Last Performed:</span>
                      <span>{formatLastPerformed(item.logs)}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Status:</span>
                      <span className="status-message">{status.message}</span>
                    </div>
                    {item.notes && (
                      <div className="info-row notes">
                        <span className="label">Notes:</span>
                        <span>{item.notes}</span>
                      </div>
                    )}
                  </div>

                  <div className="card-footer">
                    <div className="card-footer-row">
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/asset/${asset.id}/item/${item.id}/history`)}
                      >
                        View History
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => navigate('/maintenance-log', {
                          state: { assetId: asset.id, itemId: item.id }
                        })}
                      >
                        Log Maintenance
                      </Button>
                    </div>
                    <div className="card-footer-row">
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/asset/${asset.id}/item/${item.id}/edit`)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleDeleteItem(item.id, item.name)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="general-maintenance-section">
        <div className="section-header">
          <h3>General Maintenance</h3>
          <div className="section-actions">
            <Button onClick={() => navigate('/general-maintenance', { state: { assetId: asset.id } })}>
              + Log General Maintenance
            </Button>
            {generalMaintenanceRecords.length > 0 && (
              <Button variant="outline" onClick={() => navigate(`/asset/${asset.id}/general-maintenance`)}>
                View All ({generalMaintenanceRecords.length})
              </Button>
            )}
          </div>
        </div>

        {generalMaintenanceRecords.length === 0 ? (
          <div className="empty-state">
            <p>No general maintenance records yet.</p>
            <p className="empty-hint">Log one-off repairs, services, or work here!</p>
          </div>
        ) : (
          <div className="general-maintenance-preview">
            {generalMaintenanceRecords.slice(0, 3).map((record) => (
              <div key={record.id} className="general-maintenance-item">
                <div className="gm-header">
                  <h4>{record.description}</h4>
                  <span className="gm-date">
                    {parseLocalDate(record.date_performed).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="gm-details">
                  {record.usage_reading && asset.usage_metric && (
                    <span className="gm-mileage">{record.usage_reading.toLocaleString()} {asset.usage_metric}</span>
                  )}
                  {record.cost && (
                    <span className="gm-cost">${parseFloat(record.cost).toFixed(2)}</span>
                  )}
                </div>
                {record.notes && (
                  <p className="gm-notes">{record.notes}</p>
                )}
              </div>
            ))}
            {generalMaintenanceRecords.length > 3 && (
              <div className="see-more">
                <Button variant="outline" onClick={() => navigate(`/asset/${asset.id}/general-maintenance`)}>
                  See All {generalMaintenanceRecords.length} Records
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="danger-zone">
        <h3>Danger Zone</h3>
        <p>Deleting this asset will also delete all associated maintenance items and logs. This action cannot be undone.</p>
        <Button variant="danger" onClick={handleDeleteAsset}>
          Delete Asset
        </Button>
      </div>
    </div>
  )
}

export default AssetDetail
