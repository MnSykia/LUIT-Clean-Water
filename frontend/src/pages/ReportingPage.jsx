import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { ASSAM_DISTRICTS, SEVERITY_LEVELS, SOURCE_TYPES } from '../constants';

export default function ReportingPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    problem: '',
    location: '',
    latitude: null,
    longitude: null,
    severity: 'Medium',
    source_type: 'River',
    district: '',
    image: null
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }));
        },
        (error) => {
          console.log('Location access denied');
        }
      );
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({ ...prev, image: e.target.files[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = new FormData();
      data.append('problem', formData.problem);
      data.append('location', formData.location);
      data.append('severity', formData.severity);
      data.append('source_type', formData.source_type);
      data.append('district', formData.district);
      
      if (formData.latitude) data.append('latitude', formData.latitude);
      if (formData.longitude) data.append('longitude', formData.longitude);
      if (formData.image) data.append('image', formData.image);

      await api.post('/reports/submit', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  const generateSMSSyntax = () => {
    const pinCode = formData.location.match(/\d{6}/)?.[0] || 'PINCODE';
    return `${formData.problem} ${pinCode} ${formData.severity} ${formData.source_type}`;
  };

  const handleSMSOption = () => {
    const smsText = generateSMSSyntax();
    const phoneNumber = '1234567890'; // Replace with actual helpline number
    window.open(`sms:${phoneNumber}?body=${encodeURIComponent(smsText)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="text-primary hover:underline mb-4 flex items-center"
          >
            ← Back to Home
          </button>
          <h1 className="text-4xl font-bold text-gray-800">Report Water Contamination</h1>
          <p className="text-gray-600 mt-2">Help us keep our water sources safe by reporting contamination</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6">
            Report submitted successfully! Redirecting to home...
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Problem */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Problem Description *
              </label>
              <textarea
                name="problem"
                value={formData.problem}
                onChange={handleChange}
                required
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Describe the water contamination issue..."
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Location *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter location (with pin code if possible)"
              />
              {formData.latitude && formData.longitude && (
                <p className="text-sm text-gray-600 mt-2">
                  GPS: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                </p>
              )}
            </div>

            {/* District */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                District *
              </label>
              <select
                name="district"
                value={formData.district}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select District</option>
                {ASSAM_DISTRICTS.map(district => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Severity *
              </label>
              <select
                name="severity"
                value={formData.severity}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {SEVERITY_LEVELS.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            {/* Source Type */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Type of Source *
              </label>
              <select
                name="source_type"
                value={formData.source_type}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {SOURCE_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Upload Image (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Buttons */}
            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
              <button
                type="button"
                onClick={handleSMSOption}
                className="flex-1 bg-success text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Send via SMS
              </button>
            </div>
          </form>

          {/* SMS Syntax Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">SMS Format:</h3>
            <p className="text-sm text-gray-600">
              &lt;Problem&gt; &lt;Pin Code&gt; &lt;Severity&gt; &lt;Type of Source&gt;
            </p>
            {formData.problem && formData.location && (
              <p className="text-sm font-mono bg-white p-2 rounded mt-2 border">
                {generateSMSSyntax()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
