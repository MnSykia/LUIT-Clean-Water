import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function PHCDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [solutions, setSolutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reports'); // reports, solutions, map
  const [selectedReport, setSelectedReport] = useState(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendData, setSendData] = useState({ description: '', pdf_file: null });

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData || userData.organization_type !== 'phc') {
      navigate('/auth');
      return;
    }
    setUser(userData);
    fetchReports();
    fetchSolutions();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await api.get('/reports/district');
      setReports(response.data.reports || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setLoading(false);
    }
  };

  const fetchSolutions = async () => {
    try {
      const response = await api.get('/lab/solutions');
      setSolutions(response.data.solutions || []);
    } catch (error) {
      console.error('Error fetching solutions:', error);
    }
  };

  const handleSendToLab = async () => {
    try {
      const formData = new FormData();
      formData.append('description', sendData.description);
      if (sendData.pdf_file) {
        formData.append('pdf_file', sendData.pdf_file);
      }

      await api.post(`/reports/${selectedReport.report_id}/send-to-lab`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('Report sent to lab successfully. Area marked as contaminated!');
      setShowSendModal(false);
      setSendData({ description: '', pdf_file: null });
      fetchReports();
    } catch (error) {
      alert('Error sending to lab: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleMarkClean = async (reportId) => {
    if (!confirm('Mark this area as clean? This will notify the lab for confirmation.')) return;

    try {
      await api.post(`/reports/${reportId}/mark-clean`);
      alert('Area marked as clean. Waiting for lab confirmation.');
      fetchReports();
    } catch (error) {
      alert('Error marking clean: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const activeReports = reports.filter(r => r.status === 'active');
  const reportedReports = reports.filter(r => r.status === 'reported');
  const resolvedReports = reports.filter(r => r.status === 'resolved');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-primary">PHC Dashboard</h1>
              <p className="text-gray-600">{user?.organization_name} - {user?.district}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-danger text-white rounded-lg hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-4 px-2 font-semibold border-b-2 transition ${
                activeTab === 'reports'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-primary'
              }`}
            >
              Active Reports ({activeReports.length})
            </button>
            <button
              onClick={() => setActiveTab('solutions')}
              className={`py-4 px-2 font-semibold border-b-2 transition ${
                activeTab === 'solutions'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-primary'
              }`}
            >
              Lab Solutions
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`py-4 px-2 font-semibold border-b-2 transition ${
                activeTab === 'map'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-primary'
              }`}
            >
              Hotspot Map
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">District Reports</h2>
            
            {/* Pending Reports */}
            {reportedReports.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-warning mb-4">Pending Review ({reportedReports.length})</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {reportedReports.map((report) => (
                    <div key={report.report_id} className="bg-white rounded-lg shadow-lg p-6">
                      {report.image_url && (
                        <img src={report.image_url} alt="Report" className="w-full h-40 object-cover rounded-lg mb-4" />
                      )}
                      <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-2 ${
                        report.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                        report.severity === 'High' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {report.severity}
                      </div>
                      <h4 className="font-bold text-lg mb-2">{report.problem}</h4>
                      <p className="text-sm text-gray-600 mb-1"><b>Location:</b> {report.location}</p>
                      <p className="text-sm text-gray-600 mb-4"><b>Source:</b> {report.source_type}</p>
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setShowSendModal(true);
                        }}
                        className="w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                      >
                        Send to Lab
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Contaminations */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-danger mb-4">Active Contaminations ({activeReports.length})</h3>
              {activeReports.length === 0 ? (
                <p className="text-gray-600">No active contaminations</p>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeReports.map((report) => (
                    <div key={report.report_id} className="bg-white rounded-lg shadow-lg p-6">
                      {report.image_url && (
                        <img src={report.image_url} alt="Report" className="w-full h-40 object-cover rounded-lg mb-4" />
                      )}
                      <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold inline-block mb-2">
                        CONTAMINATED
                      </div>
                      <h4 className="font-bold text-lg mb-2">{report.problem}</h4>
                      <p className="text-sm text-gray-600 mb-1"><b>Location:</b> {report.location}</p>
                      {report.phc_description && (
                        <p className="text-sm text-gray-600 mb-2"><b>Description:</b> {report.phc_description}</p>
                      )}
                      {report.lab_solution_url && (
                        <a
                          href={report.lab_solution_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline block mb-2"
                        >
                          View Lab Solution →
                        </a>
                      )}
                      <button
                        onClick={() => handleMarkClean(report.report_id)}
                        disabled={report.phc_marked_clean}
                        className={`w-full px-4 py-2 rounded-lg transition ${
                          report.phc_marked_clean
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            : 'bg-success text-white hover:bg-green-700'
                        }`}
                      >
                        {report.phc_marked_clean ? 'Waiting for Lab Approval' : 'Mark as Clean'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Solutions Tab */}
        {activeTab === 'solutions' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Lab Solutions & Test Results</h2>
            {solutions.length === 0 ? (
              <p className="text-gray-600">No lab solutions available yet</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {solutions.map((solution) => (
                  <div key={solution.report_id} className="bg-white rounded-lg shadow-lg p-6">
                    <h4 className="font-bold text-lg mb-2">{solution.problem}</h4>
                    <p className="text-sm text-gray-600 mb-2"><b>Location:</b> {solution.location}</p>
                    <p className="text-sm text-gray-600 mb-2"><b>District:</b> {solution.district}</p>
                    {solution.lab_notes && (
                      <p className="text-sm text-gray-600 mb-3"><b>Notes:</b> {solution.lab_notes}</p>
                    )}
                    <div className="space-y-2">
                      {solution.lab_test_results_url && (
                        <a
                          href={solution.lab_test_results_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-4 py-2 bg-primary text-white rounded-lg text-center hover:bg-blue-700 transition"
                        >
                          View Test Results PDF
                        </a>
                      )}
                      {solution.lab_solution_url && (
                        <a
                          href={solution.lab_solution_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-4 py-2 bg-success text-white rounded-lg text-center hover:bg-green-700 transition"
                        >
                          View Solution PDF
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Map Tab */}
        {activeTab === 'map' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Contamination Hotspot Map</h2>
            <div className="bg-white rounded-lg shadow-lg p-4">
              {reports.filter(r => r.latitude && r.longitude).length > 0 ? (
                <MapContainer
                  center={[26.2006, 92.9376]} // Assam center
                  zoom={7}
                  style={{ height: '500px', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {reports.filter(r => r.latitude && r.longitude).map((report) => (
                    <CircleMarker
                      key={report.report_id}
                      center={[report.latitude, report.longitude]}
                      radius={report.status === 'active' ? 15 : 8}
                      fillColor={report.status === 'active' ? '#ef4444' : report.status === 'reported' ? '#f59e0b' : '#10b981'}
                      color={report.status === 'active' ? '#dc2626' : report.status === 'reported' ? '#d97706' : '#059669'}
                      fillOpacity={0.6}
                    >
                      <Popup>
                        <div>
                          <h4 className="font-bold">{report.problem}</h4>
                          <p className="text-sm">{report.location}</p>
                          <p className="text-sm">Status: {report.status}</p>
                          <p className="text-sm">Severity: {report.severity}</p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              ) : (
                <p className="text-center text-gray-600 py-12">No location data available for reports</p>
              )}
            </div>
            <div className="mt-4 flex space-x-4 justify-center">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-danger rounded-full mr-2"></div>
                <span className="text-sm">Active Contamination</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-warning rounded-full mr-2"></div>
                <span className="text-sm">Pending Review</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-success rounded-full mr-2"></div>
                <span className="text-sm">Resolved</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Send to Lab Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowSendModal(false)}>
          <div className="bg-white rounded-xl p-8 max-w-md mx-4 w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold mb-4">Send Report to Lab</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2"><b>Problem:</b> {selectedReport?.problem}</p>
              <p className="text-sm text-gray-600"><b>Location:</b> {selectedReport?.location}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Description</label>
                <textarea
                  value={sendData.description}
                  onChange={(e) => setSendData({ ...sendData, description: e.target.value })}
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  placeholder="Describe the contamination and any observations..."
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Upload PDF (Optional)</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setSendData({ ...sendData, pdf_file: e.target.files[0] })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={handleSendToLab}
                  disabled={!sendData.description}
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                >
                  Send to Lab
                </button>
                <button
                  onClick={() => setShowSendModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
