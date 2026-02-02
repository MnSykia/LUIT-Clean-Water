import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, AlertCircle, Droplet } from 'lucide-react'
import api from '../api'

export default function ReportingPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    problem: '',
    latitude: '',
    longitude: '',
    severity: 'medium',
    sourceType: 'domestic',
    areaName: '',
    pinCode: '',
    district: 'Assam'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [smsFormat, setSmsFormat] = useState('')

  const assam_districts = [
    'Assam', 'Barpeta', 'Bongaigaon', 'Cachar', 'Darrang',
    'Dhemaji', 'Dhubri', 'Dibrugarh', 'Goalpara', 'Golaghat',
    'Hailakandi', 'Jorhat', 'Kamrup', 'Kamrup Metropolitan', 'Karbi Anglong',
    'Karimganj', 'Lakhimpur', 'Morigaon', 'Nagaland', 'Nalbari',
    'Sichar', 'Sonitpur', 'Tinsukia'
  ]

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        }))
      })
    }
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const generateSMSFormat = () => {
    const format = `${formData.problem} ${formData.pinCode} ${formData.severity} ${formData.sourceType}`
    setSmsFormat(format)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      if (!formData.problem || !formData.latitude || !formData.longitude) {
        setError('Please fill in all required fields')
        setLoading(false)
        return
      }

      const response = await api.post('/reporting/submit-report', {
        problem: formData.problem,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        severity: formData.severity,
        sourceType: formData.sourceType,
        areaName: formData.areaName,
        pinCode: formData.pinCode,
        district: formData.district
      })

      if (response.data.success) {
        setSuccess(true)
        setFormData({
          problem: '',
          latitude: '',
          longitude: '',
          severity: 'medium',
          sourceType: 'domestic',
          areaName: '',
          pinCode: '',
          district: 'Assam'
        })
        setSmsFormat('')

        // Redirect after 2 seconds
        setTimeout(() => {
          navigate('/')
        }, 2000)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <nav className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Droplet className="text-blue-600" size={32} />
            <h1 className="text-2xl font-bold text-blue-600">LUIT Clean Water</h1>
          </div>
          <button onClick={() => navigate('/')} className="btn-secondary">
            Back to Home
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="card">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Report Water Contamination</h2>
            <p className="text-gray-600">Help us keep track of water quality issues in your area</p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              <AlertCircle className="inline mr-2" size={20} />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6">
              Report submitted successfully! Redirecting...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Problem Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Problem Description *
              </label>
              <textarea
                name="problem"
                value={formData.problem}
                onChange={handleInputChange}
                placeholder="Describe the water contamination issue"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="4"
                required
              />
            </div>

            {/* Area Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Area Name
              </label>
              <input
                type="text"
                name="areaName"
                value={formData.areaName}
                onChange={handleInputChange}
                placeholder="e.g., Guwahati Main Water Tank"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Pin Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pin Code
              </label>
              <input
                type="text"
                name="pinCode"
                value={formData.pinCode}
                onChange={handleInputChange}
                placeholder="Enter pin code"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* District */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                District
              </label>
              <select
                name="district"
                value={formData.district}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {assam_districts.map(district => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Latitude *
                </label>
                <input
                  type="number"
                  step="0.000001"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  placeholder="GPS Latitude"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Longitude *
                </label>
                <input
                  type="number"
                  step="0.000001"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  placeholder="GPS Longitude"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity Level *
              </label>
              <select
                name="severity"
                value={formData.severity}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Source Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type of Source *
              </label>
              <select
                name="sourceType"
                value={formData.sourceType}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="domestic">Domestic Waste</option>
                <option value="industrial">Industrial Pollution</option>
                <option value="agricultural">Agricultural Runoff</option>
                <option value="natural">Natural Contamination</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* SMS Format Section */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <button
                type="button"
                onClick={generateSMSFormat}
                className="btn-secondary mb-4"
              >
                Generate SMS Format
              </button>
              {smsFormat && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">SMS to send (without SMS module):</p>
                  <div className="bg-white p-3 border border-gray-300 rounded text-sm font-mono">
                    {smsFormat}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Format: [Problem] [Pin Code] [Severity] [Source Type]
                  </p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="btn-success flex-1 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
