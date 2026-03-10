import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import AddAsset from './pages/AddAsset'
import EditAsset from './pages/EditAsset'
import AssetDetail from './pages/AssetDetail'
import AddMaintenanceItem from './pages/AddMaintenanceItem'
import EditMaintenanceItem from './pages/EditMaintenanceItem'
import MaintenanceLog from './pages/MaintenanceLog'
import MaintenanceHistory from './pages/MaintenanceHistory'
import GeneralMaintenance from './pages/GeneralMaintenance'
import GeneralMaintenanceHistory from './pages/GeneralMaintenanceHistory'
import Settings from './pages/Settings'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Upkeep</h1>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/add-asset" element={<AddAsset />} />
            <Route path="/asset/:id" element={<AssetDetail />} />
            <Route path="/asset/:id/edit" element={<EditAsset />} />
            <Route path="/asset/:assetId/add-item" element={<AddMaintenanceItem />} />
            <Route path="/asset/:assetId/item/:itemId/edit" element={<EditMaintenanceItem />} />
            <Route path="/asset/:assetId/item/:itemId/history" element={<MaintenanceHistory />} />
            <Route path="/maintenance-log" element={<MaintenanceLog />} />
            <Route path="/general-maintenance" element={<GeneralMaintenance />} />
            <Route path="/asset/:assetId/general-maintenance" element={<GeneralMaintenanceHistory />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
