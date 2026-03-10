import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import ProgressBar from '../components/ProgressBar'
import { assetAPI, maintenanceItemAPI, maintenanceLogAPI } from '../services/api'
import { parseLocalDate } from '../utils/date'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadAssets()
  }, [])

  const loadAssets = async () => {
    try {
      setLoading(true)
      const assetsResponse = await assetAPI.getAll()
      const assetsData = assetsResponse.data

      // Load maintenance items and logs for each asset to calculate health
      const assetsWithHealth = await Promise.all(
        assetsData.map(async (asset) => {
          try {
            const itemsResponse = await maintenanceItemAPI.getAll(asset.id)
            const items = itemsResponse.data

            // Load logs for each maintenance item
            const itemsWithLogs = await Promise.all(
              items.map(async (item) => {
                try {
                  const logsResponse = await maintenanceLogAPI.getAll(item.id)
                  return {
                    ...item,
                    logs: logsResponse.data
                  }
                } catch (err) {
                  return { ...item, logs: [] }
                }
              })
            )

            // Calculate health score and get top urgent items
            const health = calculateAssetHealth(asset, itemsWithLogs)
            const topUrgentItems = getTopUrgentItems(asset, itemsWithLogs, 3)

            return {
              ...asset,
              maintenanceItems: itemsWithLogs,
              health,
              topUrgentItems
            }
          } catch (err) {
            return {
              ...asset,
              maintenanceItems: [],
              health: { score: 100, status: 'good', itemsDue: 0 },
              topUrgentItems: []
            }
          }
        })
      )

      setAssets(assetsWithHealth)
    } catch (err) {
      setError('Failed to load assets')
      console.error('Error loading assets:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateAssetHealth = (asset, items) => {
    if (items.length === 0) {
      return { score: 100, status: 'good', itemsDue: 0 }
    }

    let totalPercentage = 0
    let itemsDue = 0
    let itemsOverdue = 0

    items.forEach(item => {
      const status = getItemStatus(asset, item)
      totalPercentage += status.percentageRemaining

      if (status.status === 'overdue') {
        itemsOverdue++
        itemsDue++
      } else if (status.status === 'due-soon') {
        itemsDue++
      }
    })

    const avgPercentage = totalPercentage / items.length
    let overallStatus = 'good'

    if (itemsOverdue > 0) {
      overallStatus = 'overdue'
    } else if (itemsDue > 0) {
      overallStatus = 'due-soon'
    } else if (avgPercentage < 50) {
      overallStatus = 'due-soon'
    }

    return {
      score: Math.round(avgPercentage),
      status: overallStatus,
      itemsDue,
      itemsOverdue
    }
  }

  const getTopUrgentItems = (asset, items, count = 3) => {
    const itemsWithStatus = items.map(item => ({
      ...item,
      statusInfo: getItemStatus(asset, item)
    }))

    const sorted = itemsWithStatus.sort((a, b) => {
      if (a.statusInfo.status === 'never' && b.statusInfo.status !== 'never') return 1
      if (b.statusInfo.status === 'never' && a.statusInfo.status !== 'never') return -1
      return a.statusInfo.percentageRemaining - b.statusInfo.percentageRemaining
    })

    return sorted.slice(0, count)
  }

  const getItemStatus = (asset, item) => {
    if (!item.logs || item.logs.length === 0) {
      return {
        status: 'never',
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

      return { status, percentageRemaining }
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

      return { status, percentageRemaining }
    }
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h2>Dashboard</h2>
        <div className="header-actions">
          <Button variant="outline" onClick={() => navigate('/settings')}>
            Settings
          </Button>
          <Button onClick={() => navigate('/add-asset')}>
            + Add Asset
          </Button>
        </div>
      </div>

      {error && (
        <div className="error-alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading">Loading assets...</div>
      ) : assets.length === 0 ? (
        <div className="empty-state">
          <h3>No assets yet</h3>
          <p>Get started by adding your first asset to track maintenance.</p>
          <Button onClick={() => navigate('/add-asset')}>
            Add Your First Asset
          </Button>
        </div>
      ) : (
        <div className="vehicles-grid">
          {assets.map((asset) => (
            <div key={asset.id} className="vehicle-card">
              <div className="vehicle-header">
                <div className="vehicle-title">
                  <h3>{asset.name}</h3>
                  {asset.health && asset.health.itemsDue > 0 && (
                    <span className={`health-badge health-${asset.health.status}`}>
                      {asset.health.itemsOverdue > 0 ? `${asset.health.itemsOverdue} Overdue` : `${asset.health.itemsDue} Due Soon`}
                    </span>
                  )}
                </div>
              </div>

              <div className="vehicle-details">
                {asset.category && (
                  <p className="detail-item">
                    <span className="detail-label">Category:</span> {asset.category}
                  </p>
                )}
                {asset.location && (
                  <p className="detail-item">
                    <span className="detail-label">Location:</span> {asset.location}
                  </p>
                )}
                {asset.usage_metric && (
                  <p className="detail-item">
                    <span className="detail-label">{asset.usage_metric}:</span> {asset.current_usage.toLocaleString()}
                  </p>
                )}
                {asset.maintenanceItems && (
                  <p className="detail-item">
                    <span className="detail-label">Items Tracked:</span> {asset.maintenanceItems.length}
                  </p>
                )}
              </div>

              {asset.topUrgentItems && asset.topUrgentItems.length > 0 && (
                <div className="urgent-items">
                  <h4 className="urgent-items-title">Upcoming Maintenance</h4>
                  <div className="urgent-items-list">
                    {asset.topUrgentItems.map((item) => (
                      <div key={item.id} className="urgent-item">
                        <div className="urgent-item-header">
                          <span className="urgent-item-name">{item.name}</span>
                          <span className={`urgent-item-status status-${item.statusInfo.status}`}>
                            {item.statusInfo.status === 'overdue' && 'Overdue'}
                            {item.statusInfo.status === 'due-soon' && 'Due Soon'}
                            {item.statusInfo.status === 'good' && 'Good'}
                            {item.statusInfo.status === 'never' && 'Not Done'}
                          </span>
                        </div>
                        <ProgressBar
                          percentage={item.statusInfo.percentageRemaining}
                          status={item.statusInfo.status}
                          showLabel={false}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="vehicle-actions">
                <Button variant="outline" onClick={() => navigate(`/asset/${asset.id}`)}>
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Dashboard
