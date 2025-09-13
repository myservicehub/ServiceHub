import React from 'react';
import { Trash2, Edit3, Download, Archive, RefreshCw } from 'lucide-react';

const BulkActionsBar = ({ 
  selectedItems = [], 
  totalItems = 0,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  onBulkEdit,
  onBulkExport,
  onBulkArchive,
  actions = [],
  isProcessing = false
}) => {
  const selectedCount = selectedItems.length;
  const isAllSelected = selectedCount === totalItems && totalItems > 0;
  const isPartialSelected = selectedCount > 0 && selectedCount < totalItems;

  if (selectedCount === 0) {
    return null;
  }

  const defaultActions = [
    {
      id: 'edit',
      label: 'Edit Selected',
      icon: Edit3,
      onClick: onBulkEdit,
      variant: 'primary',
      show: !!onBulkEdit
    },
    {
      id: 'archive',
      label: 'Archive Selected',
      icon: Archive,
      onClick: onBulkArchive,
      variant: 'secondary',
      show: !!onBulkArchive
    },
    {
      id: 'export',
      label: 'Export Selected',
      icon: Download,
      onClick: onBulkExport,
      variant: 'secondary',
      show: !!onBulkExport
    },
    {
      id: 'delete',
      label: 'Delete Selected',
      icon: Trash2,
      onClick: onBulkDelete,
      variant: 'danger',
      show: !!onBulkDelete
    }
  ];

  const allActions = [...defaultActions, ...actions].filter(action => action.show !== false);

  const getActionClasses = (variant) => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'secondary':
      default:
        return 'bg-gray-600 hover:bg-gray-700 text-white';
    }
  };

  return (
    <div className="sticky top-0 z-10 bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Selection Info */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(input) => {
                  if (input) input.indeterminate = isPartialSelected;
                }}
                onChange={(e) => {
                  if (e.target.checked) {
                    onSelectAll?.();
                  } else {
                    onClearSelection?.();
                  }
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={isProcessing}
              />
            </div>
            
            <div className="text-sm">
              <span className="font-medium text-blue-900">
                {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
              </span>
              {totalItems > 0 && (
                <span className="text-blue-700 ml-1">
                  out of {totalItems}
                </span>
              )}
            </div>
          </div>

          {/* Clear Selection */}
          <button
            onClick={onClearSelection}
            disabled={isProcessing}
            className="text-sm text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
          >
            Clear selection
          </button>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center space-x-2">
          {isProcessing && (
            <div className="flex items-center space-x-2 text-blue-600">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Processing...</span>
            </div>
          )}
          
          {allActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => action.onClick?.(selectedItems)}
                disabled={isProcessing || !action.onClick}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center space-x-1 ${getActionClasses(action.variant)}`}
                title={action.label}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Bulk Action Status */}
      {isProcessing && (
        <div className="mt-3 p-2 bg-blue-100 rounded border-l-4 border-blue-400">
          <p className="text-sm text-blue-800">
            Processing {selectedCount} item{selectedCount !== 1 ? 's' : ''}...
          </p>
        </div>
      )}
    </div>
  );
};

export default BulkActionsBar;