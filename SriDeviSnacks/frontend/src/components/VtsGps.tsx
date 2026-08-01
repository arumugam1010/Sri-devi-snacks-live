import React, { useState, useEffect } from 'react';
import { MapPin, RefreshCw, ExternalLink, Settings, Save, AlertTriangle } from 'lucide-react';

const DEFAULT_GPS_URL = 'https://gpsvts.vamosys.com/gps/public/login'; // Updated default URL

const VtsGps: React.FC = () => {
  const [gpsUrl, setGpsUrl] = useState<string>(DEFAULT_GPS_URL);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [inputUrl, setInputUrl] = useState<string>('');

  useEffect(() => {
    const savedUrl = localStorage.getItem('sri_devi_snacks_gps_url');
    if (savedUrl) {
      setGpsUrl(savedUrl);
      setInputUrl(savedUrl);
    } else {
      setInputUrl(DEFAULT_GPS_URL);
    }
  }, []);

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
  };

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    let formattedUrl = inputUrl.trim();
    if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }
    localStorage.setItem('sri_devi_snacks_gps_url', formattedUrl);
    setGpsUrl(formattedUrl);
    setInputUrl(formattedUrl);
    setIsEditing(false);
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Premium Notification & Action Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <MapPin className="h-6 w-6 text-blue-600 animate-bounce" />
              <h2 className="text-xl font-bold text-blue-900">VTS GPS Vehicle Tracking</h2>
            </div>
            <p className="text-sm text-blue-800 font-medium">
              பாதுகாப்பு காரணங்களால் பக்கம் கீழே லோட் ஆகவில்லை எனில், கீழே உள்ள பட்டனை கிளிக் செய்யவும்.
            </p>
            <p className="text-xs text-gray-500">
              If the tracking page refuses to connect below due to provider security policies, please open it in a new window.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <a
              href={gpsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:-translate-y-0.5 duration-150 w-full sm:w-auto text-center"
            >
              <ExternalLink className="h-5 w-5 mr-2" />
              Open GPS in New Tab / புதிய விண்டோவில் திறக்க
            </a>

            <button
              onClick={handleRefresh}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 shadow-sm focus:outline-none transition w-full sm:w-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh / புதுப்பிக்க
            </button>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 shadow-sm focus:outline-none transition w-full sm:w-auto"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure / லிங்க் மாற்ற
            </button>
          </div>
        </div>

        {/* Configuration Panel */}
        {isEditing && (
          <form onSubmit={handleSaveUrl} className="mt-6 p-4 bg-white rounded-xl border border-gray-200 shadow-inner transition-all duration-200">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Configure VTS GPS Tracking Link</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://gpsvts.vamosys.com/gps/public/login"
                className="flex-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 outline-none"
                required
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setInputUrl(gpsUrl);
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-center">
              <AlertTriangle className="h-4 w-4 text-amber-500 mr-1 flex-shrink-0" />
              Ensure the URL starts with https://
            </p>
          </form>
        )}
      </div>

      {/* Map iframe Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[650px]">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center text-xs text-gray-500">
          <span>Target URL: <span className="font-mono text-blue-600 select-all">{gpsUrl}</span></span>
          <span className="flex items-center text-amber-600">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Iframe Sandbox Mode Active
          </span>
        </div>
        <iframe
          key={iframeKey}
          src={gpsUrl}
          title="VTS GPS Tracker"
          className="w-full h-full flex-grow border-0 bg-gray-50"
          allow="geolocation"
        />
      </div>
    </div>
  );
};

export default VtsGps;
