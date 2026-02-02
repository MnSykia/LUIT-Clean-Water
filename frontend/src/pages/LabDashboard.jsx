import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function LabDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [solutions, setSolutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reports'); // reports, solutions
  const [selectedReport, setSelectedReport] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    test_results_pdf: null,
    solution_pdf: null,
    notes: ''
  });

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData || userData.organization_type !== 'lab') {
      navigate('/auth');
      return;
    }
    setUser(userData);
    fetchReports();
    fetchSolutions();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await api.get('/lab/reports');
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

  const handleUploadResults = async () => {
    if (!uploadData.test_results_pdf || !uploadData.solution_pdf) {
      alert('Please upload both test results and solution PDFs');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('test_results_pdf', uploadData.test_results_pdf);
      formData.append('solution_pdf', uploadData.solution_pdf);
      if (uploadData.notes) {
        formData.append('notes', uploadData.notes);
      }

      await api.post(`/lab/${selectedReport.report_id}/upload-results`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('Test results and solution uploaded successfully!');
      setShowUploadModal(false);
      setUploadData({ test_results_pdf: null, solution_pdf: null, notes: '' });
      fetchReports();
      fetchSolutions();
    } catch (error) {
      alert('Error uploading results: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleApproveClean = async (reportId) => {
    if (!confirm('Confirm that this area is now clean and safe?')) return;

    try {
      await api.post(`/lab/${reportId}/approve-clean`);
      alert('Area approved as clean. Status changed to resolved!');
      fetchReports();
    } catch (error) {
      alert('Error approving clean: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const pendingReports = reports.filter(r => !r.has_lab_results);
  const pendingApproval = reports.filter(r => r.phc_marked_clean && r.pending_lab_approval);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-primary">Water Lab Dashboard</h1>
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
              Pending Reports ({pendingReports.length})
            </button>
            <button
              onClick={() => setActiveTab('approval')}
              className={`py-4 px-2 font-semibold border-b-2 transition ${
                activeTab === 'approval'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-primary'
              }`}
            >
              Pending Approval ({pendingApproval.length})
            </button>
            <button
              onClick={() => setActiveTab('solutions')}
              className={`py-4 px-2 font-semibold border-b-2 transition ${
                activeTab === 'solutions'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-primary'
              }`}
            >
              Previous Solutions
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Reports Requiring Test Results
            </h2>
            {pendingReports.length === 0 ? (
              <p className="text-gray-600">No pending reports</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingReports.map((report) => (
                  <div key={report.report_id} className="bg-white rounded-lg shadow-lg p-6">
                    {report.image_url && (
                      <img
                        src={report.image_url}
                        alt="Report"
                        className="w-full h-40 object-cover rounded-lg mb-4"
                      />
                    )}
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-2 ${
                      report.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                      report.severity === 'High' ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {report.severity}
                    </div>
                    <h4 className="font-bold text-lg mb-2">{report.problem}</h4>
                    <p className="text-sm text-gray-600 mb-1">
                      <b>Location:</b> {report.location}
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      <b>Source:</b> {report.source_type}
                    </p>
                    {report.phc_description && (
                      <p className="text-sm text-gray-600 mb-3">
                        <b>PHC Description:</b> {report.phc_description}
                      </p>
                    )}
                    {report.phc_pdf_url && (
                      <a
                        href={report.phc_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline block mb-3"
                      >
                        View PHC Report PDF →
                      </a>
                    )}
                    <button
                      onClick={() => {
                        setSelectedReport(report);
                        setShowUploadModal(true);
                      }}
                      className="w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                      Upload Test Results
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Approval Tab */}
        {activeTab === 'approval' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Pending Clean Area Approval
            </h2>
            {pendingApproval.length === 0 ? (
              <p className="text-gray-600">No areas waiting for approval</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingApproval.map((report) => (
                  <div key={report.report_id} className="bg-white rounded-lg shadow-lg p-6">
                    {report.image_url && (
                      <img
                        src={report.image_url}
                        alt="Report"
                        className="w-full h-40 object-cover rounded-lg mb-4"
                      />
                    )}
                    <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold inline-block mb-2">
                      AWAITING APPROVAL
                    </div>
                    <h4 className="font-bold text-lg mb-2">{report.problem}</h4>
                    <p className="text-sm text-gray-600 mb-1">
                      <b>Location:</b> {report.location}
                    </p>
                    <p className="text-sm text-gray-600 mb-3">
                      <b>PHC Marked Clean:</b> {new Date(report.phc_marked_clean_at).toLocaleDateString()}
                    </p>
                    {report.lab_solution_url && (
                      <a
                        href={report.lab_solution_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline block mb-3"
                      >
                        View Your Solution →
                      </a>
                    )}
                    <button
                      onClick={() => handleApproveClean(report.report_id)}
                      className="w-full bg-success text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                      Approve as Clean
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Solutions Tab */}
        {activeTab === 'solutions' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Previous Solutions (All Districts)
            </h2>
            {solutions.length === 0 ? (
              <p className="text-gray-600">No solutions available yet</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {solutions.map((solution) => (
                  <div key={solution.report_id} className="bg-white rounded-lg shadow-lg p-6">
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-2 ${
                      solution.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {solution.status.toUpperCase()}
                    </div>
                    <h4 className="font-bold text-lg mb-2">{solution.problem}</h4>
                    <p className="text-sm text-gray-600 mb-1">
                      <b>Location:</b> {solution.location}
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      <b>District:</b> {solution.district}
                    </p>
                    {solution.lab_notes && (
                      <p className="text-sm text-gray-600 mb-3">
                        <b>Notes:</b> {solution.lab_notes}
                      </p>
                    )}
                    <div className="space-y-2">
                      {solution.lab_test_results_url && (
                        <a
                          href={solution.lab_test_results_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-4 py-2 bg-primary text-white rounded-lg text-center hover:bg-blue-700 transition text-sm"
                        >
                          View Test Results PDF
                        </a>
                      )}
                      {solution.lab_solution_url && (
                        <a
                          href={solution.lab_solution_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-4 py-2 bg-success text-white rounded-lg text-center hover:bg-green-700 transition text-sm"
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
      </div>

      {/* Upload Results Modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowUploadModal(false)}
        >
          <div
            className="bg-white rounded-xl p-8 max-w-md mx-4 w-full max-h-screen overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold mb-4">Upload Test Results & Solution</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <b>Problem:</b> {selectedReport?.problem}
              </p>
              <p className="text-sm text-gray-600">
                <b>Location:</b> {selectedReport?.location}
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Test Results PDF *
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) =>
                    setUploadData({ ...uploadData, test_results_pdf: e.target.files[0] })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Solution PDF *
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) =>
                    setUploadData({ ...uploadData, solution_pdf: e.target.files[0] })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={uploadData.notes}
                  onChange={(e) => setUploadData({ ...uploadData, notes: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  placeholder="Add any additional notes..."
                />
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={handleUploadResults}
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Upload
                </button>
                <button
                  onClick={() => setShowUploadModal(false)}
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
