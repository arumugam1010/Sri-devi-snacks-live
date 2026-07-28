import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Store, MapPin, Phone, Mail, Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { schedulesAPI } from '../services/api';
import { Pagination } from './Pagination';

interface Shop {
  id: number;
  shop_name: string;
  address: string;
  contact: string;
  email?: string;
  gst?: string;
  status: 'active' | 'inactive';
  created_date: string;
}

const DayScheduleDetails: React.FC = () => {
  const { day } = useParams<{ day: string }>();
  const navigate = useNavigate();
  const { weeklySchedule, setWeeklySchedule, userRole } = useAppContext();

  const daySchedule = weeklySchedule.find(d => d.day.toLowerCase() === day?.toLowerCase());
  const shops: Shop[] = daySchedule?.shops || [];

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(shops.length / itemsPerPage);
  const paginatedShops = shops.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const removeShopFromDay = async (shopId: number) => {
    if (!day) return;

    try {
      // First, find the schedule ID by fetching all schedules and finding the matching one
      const schedulesResponse = await schedulesAPI.getSchedules();
      if (schedulesResponse.success) {
        // Backend returns schedules grouped by day, so we need to flatten them
        const schedulesArray: any[] = [];
        Object.entries(schedulesResponse.data).forEach(([dayKey, daySchedules]: [string, any]) => {
          if (Array.isArray(daySchedules)) {
            daySchedules.forEach((schedule: any) => {
              schedulesArray.push({
                ...schedule,
                dayOfWeek: dayKey
              });
            });
          }
        });

        const scheduleToDelete = schedulesArray.find(
          (schedule: any) => schedule.shop?.id === shopId && schedule.dayOfWeek === day.toUpperCase()
        );

        if (scheduleToDelete) {
          // Delete schedule entry from backend using the correct schedule ID
          const response = await schedulesAPI.deleteSchedule(scheduleToDelete.id);

          if (response.success) {
            const updatedSchedule = weeklySchedule.map(daySchedule =>
              daySchedule.day === day.charAt(0).toUpperCase() + day.slice(1).toLowerCase()
                ? { ...daySchedule, shops: daySchedule.shops.filter(s => s.id !== shopId) }
                : daySchedule
            );
            setWeeklySchedule(updatedSchedule);
          } else {
            alert(response.message || 'Failed to remove shop from schedule');
          }
        } else {
          alert('Schedule not found');
        }
      } else {
        alert('Failed to fetch schedules');
      }
    } catch (err: any) {
      alert(err.message || 'Error removing shop from schedule');
    }
  };

  if (!day) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No day selected</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/shops')}
          className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Schedule
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shops for {day.charAt(0).toUpperCase() + day.slice(1)}</h1>
          <p className="text-gray-600">Complete list of assigned shops</p>
        </div>
      </div>

 

      {/* Shops List */}
      {shops.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <Store className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Shops Assigned</h3>
          <p className="text-gray-500">There are no shops scheduled for {day}.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {paginatedShops.map((shop) => (
              <div key={shop.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Store className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{shop.shop_name}</h3>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                        {shop.address}
                      </div>
                    </div>
                  </div>
                  {userRole !== 'STAFF' && (
                    <button
                      onClick={() => removeShopFromDay(shop.id)}
                      className="text-red-600 hover:text-red-800 focus:outline-none p-2"
                      aria-label={`Remove ${shop.shop_name} from ${day}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {shops.length > 0 && totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default DayScheduleDetails;
