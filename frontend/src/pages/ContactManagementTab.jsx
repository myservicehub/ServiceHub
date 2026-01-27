import React from 'react';
import { adminAPI } from '../api/wallet';

const ContactManagementTab = ({
  contacts,
  contactTypes,
  showAddContact,
  setShowAddContact,
  editingContact,
  setEditingContact,
  loading,
  fetchData,
  toast
}) => {
  
  // Group contacts by category for better organization
  const contactsByCategory = {};
  
  // Pre-populate with all categories from contactTypes to ensure they show up
  contactTypes.forEach(type => {
    if (!contactsByCategory[type.category]) {
      contactsByCategory[type.category] = [];
    }
  });

  contacts.forEach(contact => {
    const type = contactTypes.find(t => t.value === contact.contact_type);
    const category = type?.category || 'Other';
    if (!contactsByCategory[category]) {
      contactsByCategory[category] = [];
    }
    contactsByCategory[category].push(contact);
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Contact Management</h2>
        <div className="flex space-x-2">
          <button
            onClick={async () => {
              try {
                await adminAPI.initializeDefaultContacts();
                toast({ title: "Default contacts initialized" });
                fetchData();
              } catch (error) {
                toast({ title: "Failed to initialize contacts", variant: "destructive" });
              }
            }}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            Initialize Defaults
          </button>
          <button
            onClick={fetchData}
            className="text-blue-600 hover:text-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Contact Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-800">Total Contacts</h3>
          <p className="text-3xl font-bold text-blue-600">
            {contacts.length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-800">Active Contacts</h3>
          <p className="text-3xl font-bold text-green-600">
            {contacts.filter(c => c.is_active).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-800">Contact Types</h3>
          <p className="text-3xl font-bold text-purple-600">
            {contactTypes.length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-800">Categories</h3>
          <p className="text-3xl font-bold text-orange-600">
            {Object.keys(contactsByCategory).length}
          </p>
        </div>
      </div>

      {/* Add New Contact Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Manage Contacts</h3>
        <button
          onClick={() => setShowAddContact(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          Add New Contact
        </button>
      </div>

      {/* Add Contact Form */}
      {showAddContact && (
        <div className="bg-white p-6 rounded-lg border">
          <h4 className="text-lg font-semibold mb-4">Add New Contact</h4>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const contactData = {
              contact_type: formData.get('contact_type'),
              label: formData.get('label'),
              value: formData.get('value'),
              is_active: formData.get('is_active') === 'on',
              display_order: parseInt(formData.get('display_order')) || 0,
              notes: formData.get('notes') || ''
            };
            
            try {
              await adminAPI.createContact(contactData);
              toast({ title: "Contact created successfully" });
              setShowAddContact(false);
              fetchData();
            } catch (error) {
              toast({ title: "Failed to create contact", variant: "destructive" });
            }
          }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Type
                </label>
                <select
                  name="contact_type"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select contact type</option>
                  {contactTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} ({type.category})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  name="display_order"
                  defaultValue="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Label
              </label>
              <input
                type="text"
                name="label"
                required
                minLength="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Customer Support, Main Office"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Value
              </label>
              <textarea
                name="value"
                required
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., +2348141831420, support@servicehub.ng, or full address"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                name="notes"
                maxLength="200"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Internal notes about this contact..."
              />
            </div>
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Active (visible on website)</span>
              </label>
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                Create Contact
              </button>
              <button
                type="button"
                onClick={() => setShowAddContact(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contacts by Category */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-lg animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(contactsByCategory).map(([category, categoryContacts]) => (
            <div key={category} className="bg-white rounded-lg border overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b">
                <h4 className="text-lg font-semibold text-gray-900">{category}</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status & Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Updated
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categoryContacts.length > 0 ? (
                      categoryContacts.map((contact, index) => (
                        <tr key={contact.id || index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {contact.label}
                              </div>
                              <div className="text-sm text-gray-500 capitalize">
                                {(contact.contact_type || '').replace('_', ' ')}
                              </div>
                              {contact.notes && (
                                <div className="text-xs text-gray-400 mt-1">
                                  📝 {contact.notes}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs truncate">
                              {contact.value}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                contact.is_active 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {contact.is_active ? 'Active' : 'Inactive'}
                              </span>
                              <span className="text-xs text-gray-500 mt-1">
                                Order: {contact.display_order}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="space-y-1">
                              <div>{new Date(contact.updated_at).toLocaleDateString()}</div>
                              <div className="text-xs">by {contact.updated_by}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setEditingContact({
                                    id: contact.id,
                                    contact_type: contact.contact_type,
                                    label: contact.label,
                                    value: contact.value,
                                    is_active: contact.is_active,
                                    display_order: contact.display_order,
                                    notes: contact.notes || ''
                                  });
                                }}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Edit
                              </button>
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Delete contact "${contact.label}"?`)) {
                                    try {
                                      await adminAPI.deleteContact(contact.id);
                                      toast({ title: "Contact deleted successfully" });
                                      fetchData();
                                    } catch (error) {
                                      toast({ title: "Failed to delete contact", variant: "destructive" });
                                    }
                                  }
                                }}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500 italic">
                          No contacts created in this category. Click "Add New Contact" or "Initialize Defaults".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          
          {contacts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No contacts found. Click "Add New Contact" or "Initialize Defaults" to get started.
            </div>
          )}
        </div>
      )}

      {/* Edit Contact Modal */}
      {editingContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h4 className="text-lg font-semibold mb-4">Edit Contact</h4>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const contactData = {
                label: formData.get('label'),
                value: formData.get('value'),
                is_active: formData.get('is_active') === 'on',
                display_order: parseInt(formData.get('display_order')) || 0,
                notes: formData.get('notes') || ''
              };
              
              try {
                await adminAPI.updateContact(editingContact.id, contactData);
                toast({ title: "Contact updated successfully" });
                setEditingContact(null);
                fetchData();
              } catch (error) {
                toast({ title: "Failed to update contact", variant: "destructive" });
              }
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Type
                  </label>
                  <input
                    type="text"
                    value={contactTypes.find(t => t.value === editingContact.contact_type)?.label || editingContact.contact_type}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    name="display_order"
                    defaultValue={editingContact.display_order}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Label
                </label>
                <input
                  type="text"
                  name="label"
                  required
                  minLength="2"
                  defaultValue={editingContact.label}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Value
                </label>
                <textarea
                  name="value"
                  required
                  rows="3"
                  defaultValue={editingContact.value}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  name="notes"
                  maxLength="200"
                  defaultValue={editingContact.notes}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={editingContact.is_active}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Active (visible on website)</span>
                </label>
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Update Contact
                </button>
                <button
                  type="button"
                  onClick={() => setEditingContact(null)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
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

export default ContactManagementTab;