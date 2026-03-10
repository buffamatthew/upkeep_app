import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import AttachmentDisplay from '../components/AttachmentDisplay'
import FileUpload from '../components/FileUpload'
import { assetAPI, maintenanceItemAPI, maintenanceLogAPI } from '../services/api'
import { parseLocalDate } from '../utils/date'
import './MaintenanceHistory.css'

function MaintenanceHistory() {
  const { assetId, itemId } = useParams()
  const navigate = useNavigate()

  const [asset, setAsset] = useState(null)
  const [maintenanceItem, setMaintenanceItem] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingLogId, setEditingLogId] = useState(null)
  const [editFormData, setEditFormData] = useState({
    date_performed: '',
    usage_reading: '',
    cost: '',
    notes: '',
    receipt_photo: null,
    remove_receipt: false
  })
  const [newAttachments, setNewAttachments] = useState([])

  useEffect(() => {
    loadData()
  }, [assetId, itemId])

  const loadData = async () => {
    try {
      setLoading(true)

      const [assetRes, itemRes, logsRes] = await Promise.all([
        assetAPI.getById(assetId),
        maintenanceItemAPI.getById(itemId),
        maintenanceLogAPI.getAll(itemId)
      ])

      setAsset(assetRes.data)
      setMaintenanceItem(itemRes.data)
      setLogs(logsRes.data.sort((a, b) =>
        parseLocalDate(b.date_performed) - parseLocalDate(a.date_performed)
      ))
    } catch (err) {
      setError('Failed to load maintenance history')
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (log) => {
    setEditingLogId(log.id)
    setEditFormData({
      date_performed: log.date_performed,
      usage_reading: log.usage_reading || '',
      cost: log.cost || '',
      notes: log.notes || '',
      receipt_photo: null,
      remove_receipt: false
    })
  }

  const handleCancelEdit = () => {
    setEditingLogId(null)
    setEditFormData({
      date_performed: '',
      usage_reading: '',
      cost: '',
      notes: '',
      receipt_photo: null,
      remove_receipt: false
    })
    setNewAttachments([])
  }

  const handleRemoveReceipt = () => {
    setEditFormData(prev => ({
      ...prev,
      receipt_photo: null,
      remove_receipt: true
    }))
  }

  const handleEditFormChange = (e) => {
    const { name, value } = e.target
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    setEditFormData(prev => ({
      ...prev,
      receipt_photo: file
    }))
  }

  const handleRemoveNewAttachment = (index) => {
    setNewAttachments(newAttachments.filter((_, i) => i !== index))
  }

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) {
      return
    }

    try {
      await maintenanceLogAPI.deleteAttachment(attachmentId)
      loadData()
    } catch (err) {
      setError('Failed to delete attachment')
      console.error('Error deleting attachment:', err)
    }
  }

  const handleSaveEdit = async (logId) => {
    try {
      let submitData
      if (editFormData.receipt_photo || newAttachments.length > 0) {
        submitData = new FormData()
        submitData.append('date_performed', editFormData.date_performed)
        if (editFormData.usage_reading) {
          submitData.append('usage_reading', editFormData.usage_reading)
        }
        if (editFormData.cost) {
          submitData.append('cost', editFormData.cost)
        }
        if (editFormData.notes) {
          submitData.append('notes', editFormData.notes)
        }
        if (editFormData.receipt_photo) {
          submitData.append('receipt_photo', editFormData.receipt_photo)
        }
        newAttachments.forEach(file => {
          submitData.append('attachments', file)
        })
      } else {
        submitData = {
          date_performed: editFormData.date_performed,
          usage_reading: editFormData.usage_reading || null,
          cost: editFormData.cost || null,
          notes: editFormData.notes || null,
          remove_receipt: editFormData.remove_receipt
        }
      }

      const response = await maintenanceLogAPI.update(logId, submitData)

      setLogs(logs.map(log => log.id === logId ? response.data : log))
      setEditingLogId(null)
      setEditFormData({
        date_performed: '',
        usage_reading: '',
        cost: '',
        notes: '',
        receipt_photo: null,
        remove_receipt: false
      })
      setNewAttachments([])
    } catch (err) {
      setError('Failed to update log')
      console.error('Error updating log:', err)
    }
  }

  const handleDelete = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this maintenance log?')) {
      return
    }

    try {
      await maintenanceLogAPI.delete(logId)
      setLogs(logs.filter(log => log.id !== logId))
    } catch (err) {
      setError('Failed to delete log')
      console.error('Error deleting log:', err)
    }
  }

  const formatDate = (dateString) => {
    const date = parseLocalDate(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return <div className="loading">Loading history...</div>
  }

  if (error || !asset || !maintenanceItem) {
    return (
      <div className="maintenance-history-page">
        <div className="error-alert">{error || 'Data not found'}</div>
        <Button onClick={() => navigate(`/asset/${assetId}`)}>
          Back to Asset
        </Button>
      </div>
    )
  }

  return (
    <div className="maintenance-history-page">
      <div className="page-header">
        <div>
          <h2>{maintenanceItem.name} History</h2>
          <p className="vehicle-name">
            {asset.name}
          </p>
          <p className="frequency-info">
            Frequency: Every {maintenanceItem.frequency_value} {maintenanceItem.frequency_unit}
          </p>
        </div>
        <div className="header-actions">
          <Button
            onClick={() => navigate('/maintenance-log', {
              state: { assetId: asset.id, itemId: maintenanceItem.id }
            })}
          >
            + Log New
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/asset/${assetId}`)}
          >
            Back to Asset
          </Button>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="empty-state">
          <h3>No maintenance logged yet</h3>
          <p>This maintenance item has never been performed.</p>
          <Button
            onClick={() => navigate('/maintenance-log', {
              state: { assetId: asset.id, itemId: maintenanceItem.id }
            })}
          >
            Log First Maintenance
          </Button>
        </div>
      ) : (
        <div className="logs-list">
          <div className="logs-summary">
            <h3>Maintenance History ({logs.length} {logs.length === 1 ? 'entry' : 'entries'})</h3>
          </div>

          {logs.map((log) => (
            <div key={log.id} className="log-card">
              {editingLogId === log.id ? (
                <div className="log-edit-form">
                  <div className="form-group">
                    <label>Date Performed</label>
                    <input
                      type="date"
                      name="date_performed"
                      value={editFormData.date_performed}
                      onChange={handleEditFormChange}
                      required
                    />
                  </div>

                  {asset.usage_metric && (
                    <div className="form-group">
                      <label>{asset.usage_metric} (optional)</label>
                      <input
                        type="number"
                        name="usage_reading"
                        value={editFormData.usage_reading}
                        onChange={handleEditFormChange}
                        placeholder={`e.g., 50000`}
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label>Cost (optional)</label>
                    <input
                      type="number"
                      name="cost"
                      value={editFormData.cost}
                      onChange={handleEditFormChange}
                      placeholder="e.g., 45.99"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label>Notes (optional)</label>
                    <textarea
                      name="notes"
                      value={editFormData.notes}
                      onChange={handleEditFormChange}
                      rows="3"
                      placeholder="Add any notes about this maintenance..."
                    />
                  </div>

                  {log.attachments && log.attachments.length > 0 && (
                    <AttachmentDisplay
                      attachments={log.attachments}
                      onDelete={handleDeleteAttachment}
                      showDelete={true}
                    />
                  )}

                  {log.receipt_photo && (
                    <div className="legacy-receipt-notice">
                      <span>Legacy receipt: {log.receipt_photo}</span>
                      <Button
                        variant="danger"
                        onClick={handleRemoveReceipt}
                        type="button"
                      >
                        Remove
                      </Button>
                    </div>
                  )}

                  <FileUpload
                    files={newAttachments}
                    onChange={setNewAttachments}
                    onRemove={handleRemoveNewAttachment}
                    label="Add More Attachments"
                  />

                  <div className="log-actions">
                    <Button
                      variant="primary"
                      onClick={() => handleSaveEdit(log.id)}
                    >
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="log-header">
                    <div className="log-date">
                      <span className="date-label">Date:</span>
                      <span className="date-value">{formatDate(log.date_performed)}</span>
                    </div>
                    {log.usage_reading && asset.usage_metric && (
                      <div className="log-mileage">
                        <span className="mileage-value">{log.usage_reading.toLocaleString()}</span>
                        <span className="mileage-unit">{asset.usage_metric}</span>
                      </div>
                    )}
                    {log.cost && (
                      <div className="log-cost">
                        <span className="cost-label">Cost:</span>
                        <span className="cost-value">${parseFloat(log.cost).toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {log.notes && (
                    <div className="log-notes">
                      <span className="notes-label">Notes:</span>
                      <p>{log.notes}</p>
                    </div>
                  )}

                  {log.attachments && log.attachments.length > 0 && (
                    <AttachmentDisplay attachments={log.attachments} />
                  )}

                  {log.receipt_photo && (
                    <div className="log-receipt legacy-receipt">
                      <span className="receipt-label">Legacy Receipt:</span>
                      <div className="receipt-preview">
                        {log.receipt_photo.toLowerCase().endsWith('.pdf') ? (
                          <a
                            href={`/uploads/${log.receipt_photo}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="receipt-link"
                          >
                            View PDF Receipt
                          </a>
                        ) : (
                          <a
                            href={`/uploads/${log.receipt_photo}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img
                              src={`/uploads/${log.receipt_photo}`}
                              alt="Receipt"
                              className="receipt-image"
                            />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="log-actions">
                    <Button
                      variant="outline"
                      onClick={() => handleEdit(log)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDelete(log.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MaintenanceHistory
