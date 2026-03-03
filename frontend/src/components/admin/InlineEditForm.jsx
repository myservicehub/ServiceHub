import React, { useState } from 'react';
import { Save, X, Edit3 } from 'lucide-react';

const InlineEditForm = ({ 
  fields, 
  initialData = {}, 
  onSave, 
  onCancel, 
  isEditing = false,
  onStartEdit,
  isSaving = false,
  validationRules = {}
}) => {
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    fields.forEach(field => {
      const value = formData[field.name];
      const rules = validationRules[field.name] || {};
      
      // Required validation
      if (field.required && (!value || value.toString().trim() === '')) {
        newErrors[field.name] = `${field.label} is required`;
        return;
      }
      
      // Min length validation
      if (rules.minLength && value && value.length < rules.minLength) {
        newErrors[field.name] = `${field.label} must be at least ${rules.minLength} characters`;
        return;
      }
      
      // Max length validation
      if (rules.maxLength && value && value.length > rules.maxLength) {
        newErrors[field.name] = `${field.label} must be no more than ${rules.maxLength} characters`;
        return;
      }
      
      // Email validation
      if (rules.email && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          newErrors[field.name] = 'Invalid email format';
          return;
        }
      }
      
      // Phone validation
      if (rules.phone && value) {
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        if (!phoneRegex.test(value)) {
          newErrors[field.name] = 'Invalid phone format';
          return;
        }
      }
      
      // Custom validation
      if (rules.custom && value) {
        const customError = rules.custom(value, formData);
        if (customError) {
          newErrors[field.name] = customError;
          return;
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleCancel = () => {
    setFormData(initialData);
    setErrors({});
    onCancel();
  };

  const renderField = (field) => {
    const value = formData[field.name] || '';
    const hasError = errors[field.name];
    
    const baseInputClasses = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
      hasError 
        ? 'border-red-300 bg-red-50' 
        : 'border-gray-300 bg-white hover:border-gray-400'
    }`;

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className={`${baseInputClasses} min-h-[80px] resize-vertical`}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            rows={field.rows || 3}
            disabled={isSaving}
          />
        );
      
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className={baseInputClasses}
            disabled={isSaving}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className={baseInputClasses}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            min={field.min}
            max={field.max}
            step={field.step}
            disabled={isSaving}
          />
        );
      
      default:
        return (
          <input
            type={field.type || 'text'}
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className={baseInputClasses}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            disabled={isSaving}
          />
        );
    }
  };

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
          {fields.map((field) => (
            <div key={field.name}>
              <dt className="text-sm font-medium text-gray-600">{field.label}</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {formData[field.name] || <span className="text-gray-400 italic">Not set</span>}
              </dd>
            </div>
          ))}
        </div>
        <button
          onClick={onStartEdit}
          className="ml-4 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Edit"
        >
          <Edit3 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-blue-200 rounded-lg p-4 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {fields.map((field) => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderField(field)}
            {errors[field.name] && (
              <p className="text-red-600 text-xs mt-1">{errors[field.name]}</p>
            )}
          </div>
        ))}
      </div>
      
      <div className="flex justify-end space-x-2">
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="px-3 py-1.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-1"
        >
          <X className="w-4 h-4" />
          <span>Cancel</span>
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-1"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default InlineEditForm;