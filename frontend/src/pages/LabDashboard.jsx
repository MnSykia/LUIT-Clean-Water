import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Upload, CheckCircle, FileText, Droplet } from 'lucide-react'
import api from '../api'
import { useAuth } from '../AuthContext'

export default function LabDashboard() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [activeTab, setActiveTab] = useState('assignments')
  const [assignments, setAssignments] = useState([])
  const [selectedAssignment, setSelectedAssignment] = useState(null)
  const [showTestResultModal, setShowTestResultModal] = useState(false)
  const [showSolutionModal, setShowSolutionModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [testResultForm, setTestResultForm] = useState({
    file: null,
    testNotes: ''
  })

  const [solutionForm, setSolutionForm] = useState({
    file: null,
    solutionDescription: ''
  })

  const userEmail = localStorage.getItem('email') || 'Lab User'
  const userDistrict = localStorage.getItem('district') || 'Assam'

  useEffect(() => {
    fetchAssignments()
  }, [])

  const fetchAssignments = async () => {
    try {
      const response = await api.get('/lab/assignments', {
        params: { district: userDistrict }
      })
      setAssignments(Object.entries(response.data.data || {}).map(([id, data]) => ({
        id,
        ...data
      })))
    } catch (err) {
      console.error('Error fetching assignments:', err)
      setError('Failed to load assignments')
    }
  }

  const handleUploadTestResult = async () => {
    if (!selectedAssignment || !testResultForm.file) {
      setError('Please select a file')
      return
    }

    const formData = new FormData()
    formData.append('file', testResultForm.file)
    formData.append('testNotes', testResultForm.testNotes)

    setLoading(true)
    try {
      const response = await api.post(
        `/lab/upload-test-result/${selectedAssignment.id}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )

      if (response.data.success) {
        alert('Test result uploaded successfully!')
        setShowTestResultModal(false)
        setTestResultForm({ file: null, testNotes: '' })
        fetchAssignments()
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload test result')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadSolution = async () => {
    if (!selectedAssignment || !solutionForm.file) {
      setError('Please select a file')
      return
    }

    const formData = new FormData()
    formData.append('file', solutionForm.file)
    formData.append('solutionDescription', solutionForm.solutionDescription)

    setLoading(true)
    try {
      const response = await api.post(
        `/lab/upload-solution/${selectedAssignment.id}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )

      if (response.data.success) {
        alert('Solution uploaded successfully!')
        setShowSolutionModal(false)
        setSolutionForm({ file: null, solutionDescription: '' })
        fetchAssignments()
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload solution')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmClean = async (assignmentId) => {
    const finalNotes = prompt('Enter final notes:')
    if (finalNotes === null) return

    try {
      const response = await api.post(`/lab/confirm-clean/${assignmentId}`, {
        finalNotes: finalNotes
      })

      if (response.data.success) {
        alert('Area confirmed clean!')
        fetchAssignments()
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to confirm clean')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Droplet className="text-blue-600" size={32} />
            <div>
              <h1 className="text-2xl font-bold text-blue-600">Water Lab Dashboard</h1>
              <p className="text-sm text-gray-600">{userEmail}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 btn-danger"
          >
            <LogOut size={20} />
            Logout
          </button>
        </nav>
      </header>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 py-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
          <button
            onClick={() => setError('')}
            className="ml-4 text-red-800 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 flex gap-8">
          {['assignments', 'previous-solutions'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === tab
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent'
              }`}
            >
              {tab === 'assignments' ? 'Assignments' : 'Previous Solutions'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Assignments Tab */}
        {activeTab === 'assignments' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Lab Assignments</h2>
            {assignments.length > 0 ? (
              <div className="space-y-4">
                {assignments.map(assignment => (
                  <div key={assignment.id} className="card">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-800">{assignment.areaName}</h3>
                        <p className="text-gray-600 mt-1">{assignment.description}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        assignment.status === 'confirmed_clean' ? 'status-clean' :
                        assignment.status === 'solution_provided' ? 'bg-blue-100 text-blue-800' :
                        'status-pending'
                      }`}>
                        {assignment.status === 'pending' ? 'Pending' :
                         assignment.status === 'test_result_uploaded' ? 'Test Uploaded' :
                         assignment.status === 'solution_provided' ? 'Solution Provided' :
                         'Confirmed Clean'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm text-gray-600">
                      <div>
                        <p className="font-medium">Severity</p>
                        <p>{assignment.severity}</p>
                      </div>
                      <div>
                        <p className="font-medium">Pin Code</p>
                        <p>{assignment.pinCode || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="font-medium">Status</p>
                        <p>{assignment.status}</p>
                      </div>
                      <div>
                        <p className="font-medium">Submitted</p>
                        <p className="text-xs">
                          {assignment.phcSubmittedAt ? new Date(assignment.phcSubmittedAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      {assignment.testResultFile && (
                        <div className="flex items-center gap-2 text-green-600">
                          <FileText size={16} />
                          <span className="text-sm">Test Result: {assignment.testResultFile}</span>
                        </div>
                      )}
                      {assignment.solutionFile && (
                        <div className="flex items-center gap-2 text-green-600">
                          <FileText size={16} />
                          <span className="text-sm">Solution: {assignment.solutionFile}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {(!assignment.testResultFile || assignment.status !== 'test_result_uploaded') && (
                        <button
                          onClick={() => {
                            setSelectedAssignment(assignment)
                            setShowTestResultModal(true)
                          }}
                          className="flex-1 btn-primary text-sm py-2 flex items-center justify-center gap-2"
                        >
                          <Upload size={16} />
                          Upload Test Result
                        </button>
                      )}
                      {assignment.testResultFile && !assignment.solutionFile && (
                        <button
                          onClick={() => {
                            setSelectedAssignment(assignment)
                            setShowSolutionModal(true)
                          }}
                          className="flex-1 btn-primary text-sm py-2 flex items-center justify-center gap-2"
                        >
                          <Upload size={16} />
                          Upload Solution
                        </button>
                      )}
                      {assignment.solutionFile && assignment.status !== 'confirmed_clean' && (
                        <button
                          onClick={() => handleConfirmClean(assignment.id)}
                          className="flex-1 btn-success text-sm py-2 flex items-center justify-center gap-2"
                        >
                          <CheckCircle size={16} />
                          Confirm Clean
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card text-center py-12">
                <CheckCircle className="mx-auto text-green-600 mb-4" size={48} />
                <p className="text-gray-600 text-lg">No assignments at this time</p>
              </div>
            )}
          </div>
        )}

        {/* Previous Solutions Tab */}
        {activeTab === 'previous-solutions' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Previous Solutions</h2>
            <div className="card text-center py-12">
              <p className="text-gray-600">Previous solutions will appear here</p>
            </div>
          </div>
        )}
      </main>

      {/* Test Result Modal */}
      {showTestResultModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Upload Test Result</h2>
            <p className="text-gray-600 mb-4">Area: <strong>{selectedAssignment.areaName}</strong></p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Result PDF *
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setTestResultForm(prev => ({
                    ...prev,
                    file: e.target.files?.[0]
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Notes
                </label>
                <textarea
                  value={testResultForm.testNotes}
                  onChange={(e) => setTestResultForm(prev => ({
                    ...prev,
                    testNotes: e.target.value
                  }))}
                  placeholder="Enter test notes"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="4"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUploadTestResult}
                  disabled={loading || !testResultForm.file}
                  className="flex-1 btn-success disabled:opacity-50"
                >
                  {loading ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  onClick={() => {
                    setShowTestResultModal(false)
                    setTestResultForm({ file: null, testNotes: '' })
                  }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Solution Modal */}
      {showSolutionModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Upload Solution</h2>
            <p className="text-gray-600 mb-4">Area: <strong>{selectedAssignment.areaName}</strong></p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Solution PDF *
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setSolutionForm(prev => ({
                    ...prev,
                    file: e.target.files?.[0]
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Solution Description *
                </label>
                <textarea
                  value={solutionForm.solutionDescription}
                  onChange={(e) => setSolutionForm(prev => ({
                    ...prev,
                    solutionDescription: e.target.value
                  }))}
                  placeholder="Describe the solution provided"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="4"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUploadSolution}
                  disabled={loading || !solutionForm.file || !solutionForm.solutionDescription}
                  className="flex-1 btn-success disabled:opacity-50"
                >
                  {loading ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  onClick={() => {
                    setShowSolutionModal(false)
                    setSolutionForm({ file: null, solutionDescription: '' })
                  }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
