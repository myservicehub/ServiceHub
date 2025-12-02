import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Activity, Settings, Eye, Trash2, Edit, Key, AlertTriangle } from 'lucide-react';

const AdminManagement = () => {
  const [activeTab, setActiveTab] = useState('admins');
  const [admins, setAdmins] = useState([]);
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [adminsPage, setAdminsPage] = useState(1);
  const [adminsLimit, setAdminsLimit] = useState(20);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [activitiesLimit, setActivitiesLimit] = useState(20);

  // API functions
  const adminManagementAPI = {
    getAdmins: async (status = 'active') => {
      const url = `${process.env.REACT_APP_BACKEND_URL}/api/admin-management/admins${status ? `?status=${status}` : ''}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      return response.json();
    },

    createAdmin: async (adminData) => {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin-management/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(adminData)
      });
      return response.json();
    },

    updateAdmin: async (adminId, updateData) => {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin-management/admins/${adminId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(updateData)
      });
      return response.json();
    },

    deleteAdmin: async (adminId) => {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin-management/admins/${adminId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      return response.json();
    },

    resetPassword: async (adminId, newPassword) => {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin-management/admins/${adminId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ admin_id: adminId, new_password: newPassword })
      });
      return response.json();
    },

    getRoles: async () => {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin-management/roles`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      return response.json();
    },

    getActivities: async () => {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin-management/activity`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      return response.json();
    },

    getStats: async () => {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin-management/stats`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      return response.json();
    }
  };

  // Load data
  useEffect(() => {
    loadData();
    loadRoles();
  }, [activeTab, adminsPage, activitiesPage]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'admins') {
        const data = await adminManagementAPI.getAdmins('active');
        setAdmins(data.admins || []);
      } else if (activeTab === 'activities') {
        const data = await adminManagementAPI.getActivities();
        setActivities(data.activities || []);
      } else if (activeTab === 'stats') {
        const data = await adminManagementAPI.getStats();
        setStats(data.admin_stats || {});
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const data = await adminManagementAPI.getRoles();
      setRoles(data.roles || []);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  // Helper functions
  const getRoleBadgeColor = (role) => {
    const colors = {
      'super_admin': 'bg-red-100 text-red-800',
      'finance_admin': 'bg-green-100 text-green-800',
      'content_admin': 'bg-blue-100 text-blue-800',
      'user_admin': 'bg-purple-100 text-purple-800',
      'support_admin': 'bg-yellow-100 text-yellow-800',
      'read_only_admin': 'bg-gray-100 text-gray-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadgeColor = (status) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Admin Creation Modal
  const CreateAdminModal = () => {
    const [formData, setFormData] = useState({
      username: '',
      email: '',
      full_name: '',
      role: 'read_only_admin',
      phone: '',
      notes: ''
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const result = await adminManagementAPI.createAdmin(formData);
        alert(`Admin created successfully! Temporary password: ${result.temporary_password}`);
        setShowCreateModal(false);
        loadData();
      } catch (error) {
        alert('Error creating admin: ' + error.message);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">Create New Admin</h3>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {roles.filter(role => role.can_assign).map(role => (
                    <option key={role.role} value={role.role}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (Optional)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Create Admin
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Admin Management</h2>
          <p className="text-gray-600">Manage administrators and their permissions</p>
        </div>
        {activeTab === 'admins' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Admin</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <div className="overflow-x-auto">
            <nav className="-mb-px flex sm:space-x-4 md:space-x-8 whitespace-nowrap px-2">
            {[
              { id: 'admins', label: 'Administrators', icon: Users },
              { id: 'activities', label: 'Activity Logs', icon: Activity },
              { id: 'stats', label: 'Statistics', icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
            </nav>
          </div>
        </div>

        <div className="p-6">
          {/* Administrators Tab */}
      {activeTab === 'admins' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading administrators...</p>
            </div>
          ) : admins.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h4 className="text-lg font-medium mb-2">No administrators found</h4>
              <p>Create your first admin account to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {(() => {
                const start = (adminsPage - 1) * adminsLimit;
                const end = start + adminsLimit;
                const visibleAdmins = admins.slice(start, end);
                return (
                  <>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Admin Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role & Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Login
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {visibleAdmins.map((admin) => (
                        <tr key={admin.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-900">{admin.full_name}</div>
                              <div className="text-sm text-gray-600">@{admin.username}</div>
                              <div className="text-sm text-gray-500">{admin.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-2">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(admin.role)}`}>
                                {admin.role.replace('_', ' ').toUpperCase()}
                              </span>
                              <div>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(admin.status)}`}>
                                  {admin.status.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {admin.last_login ? formatDateTime(admin.last_login) : 'Never'}
                            <div className="text-xs text-gray-500">
                              {admin.login_count || 0} total logins
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium space-x-2">
                            <button
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setShowEditModal(true);
                              }}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setShowPasswordReset(true);
                              }}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setShowDeleteConfirm(true);
                              }}
                              className="text-red-600 hover:text-red-900"
                              disabled={admin.role === 'super_admin'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t rounded-b-lg">
                    <div className="text-sm text-gray-600">Page {adminsPage}</div>
                    <div className="flex space-x-2">
                      <button
                        className={`px-3 py-1 rounded border ${adminsPage > 1 ? 'bg-white text-gray-700 hover:bg-gray-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                        disabled={adminsPage <= 1}
                        onClick={() => setAdminsPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </button>
                      <button
                        className={`px-3 py-1 rounded border ${(admins.length > end) ? 'bg-white text-gray-700 hover:bg-gray-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                        disabled={!(admins.length > end)}
                        onClick={() => setAdminsPage((p) => p + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

          {/* Activity Logs Tab */}
      {activeTab === 'activities' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading activities...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h4 className="text-lg font-medium mb-2">No activities logged</h4>
              <p>Admin activities will appear here when actions are performed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(() => {
                const start = (activitiesPage - 1) * activitiesLimit;
                const end = start + activitiesLimit;
                const visibleActivities = activities.slice(start, end);
                return visibleActivities.map((activity) => (
                  <div key={activity.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {activity.admin_username} - {activity.activity_type.replace('_', ' ')}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                        {activity.metadata && (
                          <div className="text-xs text-gray-500 mt-2">
                            Additional data: {JSON.stringify(activity.metadata)}
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDateTime(activity.created_at)}
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border rounded-lg mt-4">
            <div className="text-sm text-gray-600">Page {activitiesPage}</div>
            <div className="flex space-x-2">
              <button
                className={`px-3 py-1 rounded border ${activitiesPage > 1 ? 'bg-white text-gray-700 hover:bg-gray-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                disabled={activitiesPage <= 1}
                onClick={() => setActivitiesPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                className={`px-3 py-1 rounded border ${(activities.length > (activitiesPage * activitiesLimit)) ? 'bg-white text-gray-700 hover:bg-gray-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                disabled={!(activities.length > (activitiesPage * activitiesLimit))}
                onClick={() => setActivitiesPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

          {/* Statistics Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600">Loading statistics...</p>
                </div>
              ) : stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{stats.total_admins || 0}</div>
                    <div className="text-sm text-gray-600">Total Admins</div>
                  </div>
                  <div className="bg-green-50 p-6 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.active_admins || 0}</div>
                    <div className="text-sm text-gray-600">Active Admins</div>
                  </div>
                  <div className="bg-yellow-50 p-6 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{stats.recent_activities || 0}</div>
                    <div className="text-sm text-gray-600">Recent Activities (7 days)</div>
                  </div>
                  <div className="bg-purple-50 p-6 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{stats.total_logins || 0}</div>
                    <div className="text-sm text-gray-600">Total Logins</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <h4 className="text-lg font-medium mb-2">No statistics available</h4>
                  <p>Statistics will appear here once admin activities are recorded.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && <CreateAdminModal />}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold">Delete Administrator</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{selectedAdmin.full_name}</strong>? 
              This action cannot be undone and will deactivate their account.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={async () => {
                  try {
                    await adminManagementAPI.deleteAdmin(selectedAdmin.id);
                    setShowDeleteConfirm(false);
                    setSelectedAdmin(null);
                    loadData();
                  } catch (error) {
                    alert('Error deleting admin: ' + error.message);
                  }
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedAdmin(null);
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordReset && selectedAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Reset Password</h3>
            <p className="text-gray-600 mb-4">
              Reset password for <strong>{selectedAdmin.full_name}</strong>
            </p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const newPassword = e.target.password.value;
              try {
                const result = await adminManagementAPI.resetPassword(selectedAdmin.id, newPassword);
                alert('Password reset successfully!');
                setShowPasswordReset(false);
                setSelectedAdmin(null);
              } catch (error) {
                alert('Error resetting password: ' + error.message);
              }
            }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  name="password"
                  minLength="8"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg"
                >
                  Reset Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordReset(false);
                    setSelectedAdmin(null);
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;