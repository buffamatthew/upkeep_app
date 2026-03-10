import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import { backupAPI } from '../services/api'
import './Settings.css'

function Settings() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importMode, setImportMode] = useState('merge')
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const handleExport = async () => {
    try {
      setExporting(true)
      setMessage(null)
      setError(null)

      const response = await backupAPI.export()

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url

      const contentDisposition = response.headers['content-disposition']
      let filename = 'upkeep_backup.json'
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      setMessage('Data exported successfully!')
    } catch (err) {
      setError('Failed to export data: ' + (err.response?.data?.error || err.message))
      console.error('Export error:', err)
    } finally {
      setExporting(false)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current.click()
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.name.endsWith('.json')) {
      setError('Please select a JSON file')
      return
    }

    const confirmMessage = importMode === 'replace'
      ? 'This will DELETE ALL existing data and replace it with the backup. Are you sure?'
      : 'This will merge the backup data with your existing data. Continue?'

    if (!window.confirm(confirmMessage)) {
      e.target.value = ''
      return
    }

    try {
      setImporting(true)
      setMessage(null)
      setError(null)

      const response = await backupAPI.import(file, importMode)

      setMessage(
        `Import successful! Imported: ${response.data.counts.assets} assets, ` +
        `${response.data.counts.maintenance_items} items, ` +
        `${response.data.counts.maintenance_logs} logs, ` +
        `${response.data.counts.general_maintenance} general maintenance records. ` +
        response.data.note
      )

      e.target.value = ''
    } catch (err) {
      setError('Failed to import data: ' + (err.response?.data?.error || err.message))
      console.error('Import error:', err)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h2>Settings & Backup</h2>
        <Button variant="outline" onClick={() => navigate('/')}>
          Back to Dashboard
        </Button>
      </div>

      {message && (
        <div className="success-alert">
          {message}
        </div>
      )}

      {error && (
        <div className="error-alert">
          {error}
        </div>
      )}

      <div className="settings-section">
        <h3>Data Backup</h3>
        <p className="section-description">
          Export your data to create a backup, or import a previous backup to restore your data.
        </p>

        <div className="backup-actions">
          <div className="backup-card">
            <h4>Export Data</h4>
            <p>Download all your assets, maintenance items, and logs as a JSON file.</p>
            <Button
              onClick={handleExport}
              disabled={exporting}
              fullWidth
            >
              {exporting ? 'Exporting...' : 'Export Backup'}
            </Button>
          </div>

          <div className="backup-card">
            <h4>Import Data</h4>
            <p>Restore data from a previous backup file.</p>

            <div className="import-mode-selector">
              <label className="radio-label">
                <input
                  type="radio"
                  name="importMode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={(e) => setImportMode(e.target.value)}
                />
                <span>Merge with existing data</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={(e) => setImportMode(e.target.value)}
                />
                <span>Replace all data (deletes existing)</span>
              </label>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".json"
              style={{ display: 'none' }}
            />

            <Button
              onClick={handleImportClick}
              disabled={importing}
              variant="outline"
              fullWidth
            >
              {importing ? 'Importing...' : 'Select Backup File'}
            </Button>
          </div>
        </div>

        <div className="backup-note">
          <strong>Note:</strong> Attachment files (photos, PDFs, etc.) are not included in backups.
          Only the metadata is saved. After restoring a backup, you'll need to re-upload any attachments.
        </div>
      </div>
    </div>
  )
}

export default Settings
