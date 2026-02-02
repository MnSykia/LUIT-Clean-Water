import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function LandingPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [activeReports, setActiveReports] = useState([]);
  const [reportedIssues, setReportedIssues] = useState([]);
  const [areaStatus, setAreaStatus] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
    checkAreaStatus();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await api.get('/reports/list');
      const allReports = response.data.reports || [];
      
      setReports(allReports);
      setActiveReports(allReports.filter(r => r.status === 'active'));
      setReportedIssues(allReports.filter(r => r.status === 'reported'));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setLoading(false);
    }
  };

  const checkAreaStatus = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await api.get(
              `/reports/check-area-status?latitude=${latitude}&longitude=${longitude}`
            );
            setAreaStatus(response.data);
            setShowPopup(true);
          } catch (error) {
            console.error('Error checking area status:', error);
          }
        },
        (error) => {
          console.log('Location access denied');
        }
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-primary">LUIT 3.0</h1>
              <p className="text-gray-600">Water Contamination Alert System</p>
            </div>
            <div className="space-x-4">
              <button
                onClick={() => navigate('/report')}
                className="px-6 py-3 bg-danger text-white rounded-lg font-semibold hover:bg-red-600 transition"
              >
                Report Contamination
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                PHC/Lab Login
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Area Status Popup */}
      {showPopup && areaStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowPopup(false)}>
          <div className="bg-white rounded-xl p-8 max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className={`text-center ${areaStatus.contaminated ? 'text-danger' : 'text-success'}`}>
              <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                areaStatus.contaminated ? 'bg-red-100' : 'bg-green-100'
              }`}>
                {areaStatus.contaminated ? (
                  <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <h3 className="text-2xl font-bold mb-2">
                {areaStatus.contaminated ? 'CONTAMINATED AREA' : 'AREA IS CLEAN'}
              </h3>
              <p className="text-gray-600">
                {areaStatus.contaminated
                  ? `Water contamination detected ${areaStatus.nearest_report?.distance_km}km from your location. Do not consume water without purification.`
                  : 'No contamination detected in your area. Water is safe for consumption.'}
              </p>
              {areaStatus.nearest_report && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
                  <p className="text-sm font-semibold">Problem: {areaStatus.nearest_report.problem}</p>
                  <p className="text-sm text-gray-600">Severity: {areaStatus.nearest_report.severity}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowPopup(false)}
              className="mt-6 w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Welcome Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-5xl font-bold text-gray-800 mb-6">Welcome to LUIT 3.0</h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          A comprehensive water contamination alert and management system for Assam. 
          Report contamination, track active alerts, and help keep our water sources safe.
        </p>
      </section>

      {/* Stats Cards */}
      <section className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-5xl font-bold text-primary mb-2">{reports.length}</div>
            <div className="text-gray-600 font-semibold">Total Reports</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-5xl font-bold text-danger mb-2">{activeReports.length}</div>
            <div className="text-gray-600 font-semibold">Active Contaminations</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-5xl font-bold text-warning mb-2">{reportedIssues.length}</div>
            <div className="text-gray-600 font-semibold">Pending Review</div>
          </div>
        </div>
      </section>

      {/* Active Reports */}
      <section className="container mx-auto px-4 py-8">
        <h3 className="text-3xl font-bold text-gray-800 mb-6">Active Contamination Reports</h3>
        {loading ? (
          <p className="text-center text-gray-600">Loading reports...</p>
        ) : activeReports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <p className="text-gray-600">No active contamination reports. All areas are clean!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeReports.map((report) => (
              <div key={report.report_id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
                {report.image_url && (
                  <img src={report.image_url} alt="Report" className="w-full h-48 object-cover" />
                )}
                <div className="p-6">
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-3 ${
                    report.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                    report.severity === 'High' ? 'bg-orange-100 text-orange-800' :
                    report.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {report.severity}
                  </div>
                  <h4 className="font-bold text-lg mb-2">{report.problem}</h4>
                  <p className="text-gray-600 text-sm mb-2">
                    <span className="font-semibold">Location:</span> {report.location}
                  </p>
                  <p className="text-gray-600 text-sm mb-2">
                    <span className="font-semibold">District:</span> {report.district}
                  </p>
                  <p className="text-gray-600 text-sm">
                    <span className="font-semibold">Source:</span> {report.source_type}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* About Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-white rounded-xl shadow-lg p-12">
          <h3 className="text-3xl font-bold text-gray-800 mb-6 text-center">About LUIT 3.0</h3>
          <div className="grid md:grid-cols-2 gap-8 text-gray-600">
            <div>
              <h4 className="font-bold text-xl text-primary mb-3">For Citizens</h4>
              <ul className="space-y-2">
                <li>• Report water contamination instantly</li>
                <li>• Check if your area is contaminated</li>
                <li>• View active contamination alerts</li>
                <li>• Get SMS alerts for nearby contaminations</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-xl text-primary mb-3">For PHC & Labs</h4>
              <ul className="space-y-2">
                <li>• PHC monitors district-level reports</li>
                <li>• Send reports to water labs for testing</li>
                <li>• Labs provide test results & solutions</li>
                <li>• Track contamination resolution</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p>© 2026 LUIT 3.0 - Water Contamination Alert System for Assam</p>
          <p className="text-gray-400 mt-2">Protecting water resources for a healthier future</p>
        </div>
      </footer>
    </div>
  );
}
