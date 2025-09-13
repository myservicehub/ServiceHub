import React, { useState } from 'react';
import { Edit3, Trash2, Eye, MoreVertical, ChevronUp, ChevronDown } from 'lucide-react';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import InlineEditForm from './InlineEditForm';

const AdminDataTable = ({
  data = [],
  columns = [],
  entityName = 'item',
  entityNamePlural = 'items',
  onEdit,
  onDelete,
  onView,
  allowInlineEdit = true,
  allowDelete = true,
  allowView = false,
  onSelectionChange,
  selectedItems = [],
  showSelection = false,
  customActions = [],
  sortable = true,
  editFields = [],
  validationRules = {},
  isLoading = false
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [editingItem, setEditingItem] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sorting logic
  const sortedData = React.useMemo(() => {
    if (!sortConfig.key || !sortable) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig, sortable]);

  const handleSort = (key) => {
    if (!sortable) return;
    
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelection = (item, isSelected) => {
    const itemId = item.id || item._id;
    let newSelection;
    
    if (isSelected) {
      newSelection = [...selectedItems, itemId];
    } else {
      newSelection = selectedItems.filter(id => id !== itemId);
    }
    
    onSelectionChange?.(newSelection);
  };

  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      const allIds = data.map(item => item.id || item._id);
      onSelectionChange?.(allIds);
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleEdit = async (item, formData) => {
    setIsSaving(true);
    try {
      await onEdit?.(item, formData);
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item) => {
    setIsDeleting(true);
    try {
      await onDelete?.(item);
      setDeleteModal({ isOpen: false, item: null });
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getSortIcon = (columnKey) => {
    if (!sortable || sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="w-4 h-4 ml-1" /> : 
      <ChevronDown className="w-4 h-4 ml-1" />;
  };

  const renderCell = (item, column) => {
    const value = item[column.key];
    
    if (column.render) {
      return column.render(value, item);
    }
    
    if (column.type === 'date' && value) {
      return new Date(value).toLocaleDateString();
    }
    
    if (column.type === 'boolean') {
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'Yes' : 'No'}
        </span>
      );
    }
    
    if (column.type === 'status') {
      const statusColors = {
        active: 'bg-green-100 text-green-800',
        inactive: 'bg-gray-100 text-gray-800',
        pending: 'bg-yellow-100 text-yellow-800',
        suspended: 'bg-red-100 text-red-800'
      };
      
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          statusColors[value] || 'bg-gray-100 text-gray-800'
        }`}>
          {value || 'Unknown'}
        </span>
      );
    }
    
    return value || '-';
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded mb-2"></div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg mb-2">No {entityNamePlural} found</div>
        <p className="text-gray-400">There are no {entityNamePlural} to display.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {showSelection && (
                <th className="w-12 px-6 py-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === data.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
              )}
              
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    sortable && column.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center">
                    {column.title}
                    {getSortIcon(column.key)}
                  </div>
                </th>
              ))}
              
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((item) => {
              const itemId = item.id || item._id;
              const isSelected = selectedItems.includes(itemId);
              const isEditing = editingItem?.id === itemId || editingItem?._id === itemId;
              
              return (
                <React.Fragment key={itemId}>
                  <tr className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                    {showSelection && (
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelection(item, e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                    )}
                    
                    {columns.map((column) => (
                      <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {renderCell(item, column)}
                      </td>
                    ))}
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {allowView && (
                          <button
                            onClick={() => onView?.(item)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        
                        {allowInlineEdit && (
                          <button
                            onClick={() => setEditingItem(item)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        
                        {customActions.map((action) => (
                          <button
                            key={action.id}
                            onClick={() => action.onClick(item)}
                            className={action.className || "text-gray-600 hover:text-gray-900"}
                            title={action.title}
                          >
                            <action.icon className="w-4 h-4" />
                          </button>
                        ))}
                        
                        {allowDelete && (
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, item })}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  
                  {isEditing && allowInlineEdit && editFields.length > 0 && (
                    <tr>
                      <td colSpan={columns.length + (showSelection ? 2 : 1)} className="px-6 py-4">
                        <InlineEditForm
                          fields={editFields}
                          initialData={item}
                          onSave={(formData) => handleEdit(item, formData)}
                          onCancel={() => setEditingItem(null)}
                          isEditing={true}
                          isSaving={isSaving}
                          validationRules={validationRules}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, item: null })}
        onConfirm={() => handleDelete(deleteModal.item)}
        title={`Delete ${entityName}`}
        message={`Are you sure you want to delete this ${entityName}?`}
        itemName={deleteModal.item?.name || deleteModal.item?.title || deleteModal.item?.id}
        itemType={entityName}
        isDeleting={isDeleting}
        dangerLevel="high"
      />
    </>
  );
};

export default AdminDataTable;