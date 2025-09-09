import React, { useState, useEffect, createContext, useContext } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons for different severity levels
const createCustomIcon = (severity) => {
  const colors = {
    critical: '#ef4444',
    moderate: '#f97316', 
    low: '#22c55e'
  };
  
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 20px; 
      height: 20px; 
      border-radius: 50%; 
      background: ${colors[severity] || colors.moderate}; 
      border: 2px solid white; 
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState(localStorage.getItem('session_token'));

  const login = (token, userData) => {
    setSessionToken(token);
    setUser(userData);
    localStorage.setItem('session_token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const logout = () => {
    setSessionToken(null);
    setUser(null);
    localStorage.removeItem('session_token');
    delete axios.defaults.headers.common['Authorization'];
  };

  useEffect(() => {
    const token = localStorage.getItem('session_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Verify token
      axios.get(`${API}/auth/me`)
        .then(response => {
          setUser(response.data);
          setSessionToken(token);
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, sessionToken, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// Components
const LoadingSpinner = () => (
  <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
  </div>
);

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <nav className="fixed left-0 top-0 h-full w-20 hover:w-64 bg-black/10 backdrop-blur-xl border-r border-white/5 transition-all duration-300 z-50 group">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-4 border-b border-white/5">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center cursor-pointer shadow-lg" onClick={() => navigate('/dashboard')}>
            <span className="text-white font-bold text-xl">DD</span>
          </div>
          <p className="text-white/70 text-sm mt-2 opacity-0 group-hover:opacity-100 transition-opacity">DisasterDash</p>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 p-4 space-y-4">
          <NavItem icon="🏠" label="Dashboard" onClick={() => navigate('/dashboard')} />
          <NavItem icon="📝" label="Report Issue" onClick={() => navigate('/report')} />
          <NavItem icon="👤" label="Profile" onClick={() => navigate('/profile')} />
          {user.role === 'admin' && (
            <NavItem icon="⚙️" label="Admin" onClick={() => navigate('/admin')} />
          )}
        </div>

        {/* User & Logout */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-sm font-semibold">{user.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white text-sm truncate">{user.name}</p>
              <button onClick={logout} className="text-red-400 text-xs hover:text-red-300">Logout</button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

const NavItem = ({ icon, label, onClick }) => (
  <div 
    className="flex items-center space-x-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-all duration-200 group backdrop-blur-sm"
    onClick={onClick}
  >
    <span className="text-2xl">{icon}</span>
    <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity">{label}</span>
  </div>
);

const TopNavbar = () => (
  <nav className="fixed top-0 right-0 p-6 z-40">
    <div className="flex space-x-6">
      <a href="#about" className="text-white/70 hover:text-white transition-colors">About Us</a>
      <a href="#contact" className="text-white/70 hover:text-white transition-colors">Contact</a>
      <a href="#services" className="text-white/70 hover:text-white transition-colors">Services</a>
      <a href="#sponsors" className="text-white/70 hover:text-white transition-colors">Sponsors</a>
    </div>
  </nav>
);

const Landing = () => {
  const handleLogin = () => {
    const previewUrl = encodeURIComponent(window.location.origin + '/profile');
    window.location.href = `https://auth.emergentagent.com/?redirect=${previewUrl}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      <TopNavbar />
      
      {/* Hero Section */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-6 bg-gradient-to-r from-red-400 via-orange-500 to-yellow-400 bg-clip-text text-transparent">
            DisasterDash
          </h1>
          <p className="text-xl md:text-2xl text-white/80 mb-8 leading-relaxed">
            AI-Powered Disaster Management & Emergency Response Platform
          </p>
          <p className="text-lg text-white/60 mb-12 max-w-2xl mx-auto">
            Real-time monitoring, intelligent analysis, and coordinated response for disaster situations worldwide.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={handleLogin}
              className="px-8 py-4 bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold rounded-2xl hover:from-red-600 hover:to-orange-700 transform hover:scale-105 transition-all duration-200 shadow-2xl"
            >
              Get Started
            </button>
            <button 
              onClick={handleLogin}
              className="px-8 py-4 border-2 border-white/20 text-white font-semibold rounded-2xl hover:bg-white/10 transition-all duration-200"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-16">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon="🗺️"
              title="Interactive Mapping"
              description="Real-time disaster tracking with AI-powered severity analysis and incident clustering"
            />
            <FeatureCard 
              icon="🤖"
              title="AI Analysis"
              description="Intelligent assessment of disaster reports with automated severity scoring and prioritization"
            />
            <FeatureCard 
              icon="📱"
              title="Crowdsourced Reports"
              description="Community-driven incident reporting with GPS integration and image upload capabilities"
            />
          </div>
        </div>
      </div>

      {/* Sponsors Section */}
      <div className="relative z-10 py-20 px-6 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-12">Trusted Partners</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-60">
            <div className="h-16 bg-white/10 rounded-xl flex items-center justify-center">
              <span className="text-white font-semibold">FEMA</span>
            </div>
            <div className="h-16 bg-white/10 rounded-xl flex items-center justify-center">
              <span className="text-white font-semibold">Red Cross</span>
            </div>
            <div className="h-16 bg-white/10 rounded-xl flex items-center justify-center">
              <span className="text-white font-semibold">UN OCHA</span>
            </div>
            <div className="h-16 bg-white/10 rounded-xl flex items-center justify-center">
              <span className="text-white font-semibold">WHO</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="relative z-10 py-20 px-6 border-t border-white/10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-8">Get in Touch</h2>
          <p className="text-white/70 mb-8">
            Ready to enhance your disaster preparedness? Contact our team for more information.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:contact@disasterdash.com" className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors">
              Email Us
            </a>
            <a href="tel:+1-800-DISASTER" className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors">
              Call Now
            </a>
          </div>
        </div>
      </div>

      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 via-purple-900/50 to-slate-900/50"></div>
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-red-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/2 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <div className="p-6 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300">
    <div className="text-4xl mb-4">{icon}</div>
    <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
    <p className="text-white/70">{description}</p>
  </div>
);

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axios.get(`${API}/dashboard/data`);
        setDashboardData(response.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pl-20">
      <div className="flex h-screen">
        {/* Left Panel - City Data */}
        <div className="w-80 p-6 bg-black/5 backdrop-blur-xl border-r border-white/5 overflow-y-auto">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <span className="mr-2">🏙️</span>
            Local Incidents
          </h2>
          
          <InfoSection title="Critical" items={dashboardData?.city_data?.critical || []} severity="critical" />
          <InfoSection title="Moderate" items={dashboardData?.city_data?.moderate || []} severity="moderate" />
          <InfoSection title="Low" items={dashboardData?.city_data?.low || []} severity="low" />
        </div>

        {/* Center - Map */}
        <div className="flex-1 relative p-4">
          <div className="h-full bg-black/5 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
            <MapCanvas reports={dashboardData?.reports || []} shelters={dashboardData?.shelters || []} />
          </div>
        </div>

        {/* Right Panel - World Data */}
        <div className="w-80 p-6 bg-black/5 backdrop-blur-xl border-l border-white/5 overflow-y-auto">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <span className="mr-2">🌍</span>
            Global Incidents
          </h2>
          
          <InfoSection title="Critical" items={dashboardData?.world_data?.critical || []} severity="critical" />
          <InfoSection title="Moderate" items={dashboardData?.world_data?.moderate || []} severity="moderate" />
          <InfoSection title="Low" items={dashboardData?.world_data?.low || []} severity="low" />
        </div>
      </div>

      {/* Footer */}
      <FooterClock lastAiUpdate={dashboardData?.last_ai_update} />
    </div>
  );
};

const InfoSection = ({ title, items, severity }) => {
  const getColorClass = () => {
    switch (severity) {
      case 'critical': return 'text-red-400 border-red-500/10 bg-red-500/5';
      case 'moderate': return 'text-orange-400 border-orange-500/10 bg-orange-500/5';
      default: return 'text-green-400 border-green-500/10 bg-green-500/5';
    }
  };

  return (
    <div className="mb-6">
      <h3 className={`text-lg font-semibold mb-3 ${getColorClass().split(' ')[0]}`}>{title}</h3>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-white/40 text-sm">No incidents reported</p>
        ) : (
          items.map((item, index) => (
            <div key={index} className={`p-3 rounded-xl border backdrop-blur-sm ${getColorClass()}`}>
              <h4 className="text-white font-medium text-sm mb-1">{item.title}</h4>
              <p className="text-white/60 text-xs mb-2">{item.city}, {item.country}</p>
              <p className="text-white/40 text-xs">{new Date(item.created_at).toLocaleTimeString()}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const MapCanvas = ({ reports, shelters }) => {
  const [mapCenter, setMapCenter] = useState([40.7128, -74.0060]); // Default to NYC
  
  useEffect(() => {
    // Try to get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.log("Location access denied, using default location");
        }
      );
    }
  }, []);

  return (
    <div className="h-full w-full relative">
      <MapContainer 
        center={mapCenter} 
        zoom={10} 
        className="h-full w-full rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'transparent' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        {/* Render report markers */}
        {reports.map((report) => (
          <Marker
            key={report.id}
            position={[report.location.lat, report.location.lng]}
            icon={createCustomIcon(report.severity)}
          >
            <Popup className="custom-popup">
              <div className="p-2 bg-black/80 backdrop-blur-lg rounded-lg border border-white/20">
                <h3 className="font-bold text-white mb-1">{report.title}</h3>
                <p className="text-white/80 text-sm mb-2">{report.description}</p>
                <div className="flex justify-between items-center">
                  <span className={`px-2 py-1 rounded text-xs ${
                    report.severity === 'critical' ? 'bg-red-500/20 text-red-300' :
                    report.severity === 'moderate' ? 'bg-orange-500/20 text-orange-300' :
                    'bg-green-500/20 text-green-300'
                  }`}>
                    {report.severity}
                  </span>
                  <span className="text-white/60 text-xs">
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        
        {/* Render shelter markers */}
        {shelters.map((shelter) => (
          <CircleMarker
            key={shelter.id}
            center={[shelter.location.lat, shelter.location.lng]}
            radius={8}
            pathOptions={{
              fillColor: '#3b82f6',
              color: '#1d4ed8',
              weight: 2,
              opacity: 0.8,
              fillOpacity: 0.6
            }}
          >
            <Popup className="custom-popup">
              <div className="p-2 bg-black/80 backdrop-blur-lg rounded-lg border border-white/20">
                <h3 className="font-bold text-white mb-1">🏠 {shelter.name}</h3>
                <p className="text-white/80 text-sm">Capacity: {shelter.capacity}</p>
                <p className="text-white/80 text-sm">Contact: {shelter.contact}</p>
                <p className="text-white/60 text-xs">Type: {shelter.type}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Map Controls Overlay */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2 z-[1000]">
        <button 
          onClick={() => setMapCenter([40.7128, -74.0060])}
          className="p-3 bg-black/30 backdrop-blur-lg rounded-xl text-white border border-white/20 hover:bg-black/50 transition-all duration-200"
          title="New York"
        >
          🗽
        </button>
        <button 
          onClick={() => setMapCenter([34.0522, -118.2437])}
          className="p-3 bg-black/30 backdrop-blur-lg rounded-xl text-white border border-white/20 hover:bg-black/50 transition-all duration-200"
          title="Los Angeles"
        >
          🌴
        </button>
        <button 
          onClick={() => setMapCenter([51.5074, -0.1278])}
          className="p-3 bg-black/30 backdrop-blur-lg rounded-xl text-white border border-white/20 hover:bg-black/50 transition-all duration-200"
          title="London"
        >
          🇬🇧
        </button>
        <button 
          onClick={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  setMapCenter([position.coords.latitude, position.coords.longitude]);
                }
              );
            }
          }}
          className="p-3 bg-black/30 backdrop-blur-lg rounded-xl text-white border border-white/20 hover:bg-black/50 transition-all duration-200"
          title="My Location"
        >
          📍
        </button>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 p-4 bg-black/30 backdrop-blur-lg rounded-xl border border-white/20 z-[1000]">
        <h4 className="text-white font-semibold mb-2 text-sm">Legend</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-white/80">Critical</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-white/80">Moderate</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-white/80">Low Risk</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-white/80">Shelters</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const FooterClock = ({ lastAiUpdate }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-0 left-20 right-0 h-14 bg-black/20 backdrop-blur-lg border-t border-white/10 flex items-center justify-between px-6">
      <p className="text-white/70 text-sm">© DisasterDash 2024</p>
      
      <div className="flex items-center space-x-4">
        <div className="text-center">
          <p className="text-white font-mono text-sm">{currentTime.toLocaleTimeString()}</p>
          <p className="text-white/50 text-xs">Local Time</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <p className="text-white/70 text-sm">
          Last AI Update: {lastAiUpdate ? new Date(lastAiUpdate).toLocaleTimeString() : 'Never'}
        </p>
        <button className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
          <span className="text-white text-xs">🔄</span>
        </button>
      </div>
    </div>
  );
};

const ReportForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: { lat: 0, lng: 0 },
    address: '',
    city: '',
    country: '',
    severity: 'moderate'
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get GPS location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const updatedFormData = {
            ...formData,
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          };

          await axios.post(`${API}/reports`, updatedFormData);
          alert('Report submitted successfully!');
          navigate('/dashboard');
        });
      } else {
        await axios.post(`${API}/reports`, formData);
        alert('Report submitted successfully!');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Error submitting report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pl-20 flex items-center justify-center">
      <div className="max-w-2xl w-full mx-6">
        <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-8">
          <h1 className="text-3xl font-bold text-white mb-8">Report an Incident</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-red-500"
                placeholder="Brief title of the incident"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Description</label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-red-500"
                placeholder="Detailed description of what happened"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-red-500"
                  placeholder="City name"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-red-500"
                  placeholder="Country name"
                />
              </div>
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-red-500"
                placeholder="Street address (optional)"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Severity Level</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({...formData, severity: e.target.value})}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-red-500"
              >
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-orange-700 disabled:opacity-50 transition-all duration-200"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-8 py-3 border border-white/20 text-white rounded-xl hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const AdminPanel = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await axios.get(`${API}/reports`);
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (reportId, status) => {
    try {
      await axios.put(`${API}/reports/${reportId}`, { status });
      fetchReports();
    } catch (error) {
      console.error('Error updating report:', error);
    }
  };

  const triggerAiAnalysis = async () => {
    setAnalyzing(true);
    try {
      await axios.post(`${API}/ai/analyze`);
      alert('AI analysis completed successfully!');
      fetchReports();
    } catch (error) {
      console.error('Error triggering AI analysis:', error);
      alert('Error running AI analysis.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pl-20 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Admin Dashboard</h1>
          <button
            onClick={triggerAiAnalysis}
            disabled={analyzing}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-blue-700 disabled:opacity-50 transition-all duration-200"
          >
            {analyzing ? 'Analyzing...' : 'Run AI Analysis'}
          </button>
        </div>

        <div className="grid gap-6">
          {reports.map((report) => (
            <div key={report.id} className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{report.title}</h3>
                  <p className="text-white/70 mb-2">{report.description}</p>
                  <div className="flex space-x-4 text-sm text-white/50">
                    <span>📍 {report.city}, {report.country}</span>
                    <span>⏰ {new Date(report.created_at).toLocaleString()}</span>
                    <span className={`px-2 py-1 rounded ${
                      report.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                      report.severity === 'moderate' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {report.severity}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {report.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateReportStatus(report.id, 'validated')}
                        className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg border border-green-500/20 hover:bg-green-500/30"
                      >
                        Validate
                      </button>
                      <button
                        onClick={() => updateReportStatus(report.id, 'rejected')}
                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 hover:bg-red-500/30"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <span className={`px-3 py-2 rounded-lg text-sm ${
                    report.status === 'validated' ? 'bg-green-500/20 text-green-400' :
                    report.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                    report.status === 'resolved' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {report.status}
                  </span>
                </div>
              </div>
              {report.ai_severity_score && (
                <div className="mt-4 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <p className="text-purple-400 text-sm">
                    AI Severity Score: {(report.ai_severity_score * 100).toFixed(0)}%
                    {report.ai_auto_flag && <span className="ml-2 text-red-400">⚠️ Flagged</span>}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Profile = () => {
  const { user, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Handle session from URL fragment
  useEffect(() => {
    const handleSessionAuth = async () => {
      const fragment = location.hash.substring(1);
      const params = new URLSearchParams(fragment);
      const sessionId = params.get('session_id');

      if (sessionId) {
        try {
          const response = await axios.post(`${API}/auth/session`, { session_id: sessionId });
          login(response.data.session_token, response.data.user);
          navigate('/dashboard');
        } catch (error) {
          console.error('Session processing error:', error);
          navigate('/');
        }
      }
    };

    handleSessionAuth();
  }, [location, navigate, login]);

  if (!user) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pl-20 flex items-center justify-center">
      <div className="max-w-2xl w-full mx-6">
        <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-8 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-white text-3xl font-bold">{user.name?.[0]?.toUpperCase()}</span>
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2">{user.name}</h1>
          <p className="text-white/70 mb-6">{user.email}</p>
          
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-white font-semibold mb-2">Role</h3>
              <p className="text-white/70">{user.role}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-white font-semibold mb-2">Joined</h3>
              <p className="text-white/70">{new Date(user.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="px-8 py-3 bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-orange-700 transition-all duration-200"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/" replace />;
  
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  
  return children;
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/profile" element={<Profile />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Navbar />
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/report" 
              element={
                <ProtectedRoute>
                  <Navbar />
                  <ReportForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <AdminRoute>
                  <Navbar />
                  <AdminPanel />
                </AdminRoute>
              } 
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;