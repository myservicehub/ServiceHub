import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Search, Filter, Eye, Edit, Trash2, Upload, 
  Calendar, BarChart3, Tag, Globe, Users, Image, Video, 
  Megaphone, BookOpen, HelpCircle, Mail, Zap, Star, Archive,
  Clock, CheckCircle, XCircle, TrendingUp, Activity, Briefcase,
  MapPin, Building, User, Send
} from 'lucide-react';
import careersAPI from '../../api/careers';

const ContentManagement = () => {
  const [activeTab, setActiveTab] = useState('content');
  const [contentItems, setContentItems] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [jobPostings, setJobPostings] = useState([]);
  const [jobApplications, setJobApplications] = useState([]);
  const [jobStatistics, setJobStatistics] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Filter and search states
  const [filters, setFilters] = useState({
    content_type: '',
    status: '',
    category: '',
    search: ''
  });
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  
  // Job-specific modal states
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);
  const [showEditJobModal, setShowEditJobModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplicationsModal, setShowApplicationsModal] = useState(false);
  const [jobsSubTab, setJobsSubTab] = useState('postings'); // postings, applications, statistics

  // Content Management API
  const contentAPI = {
    getItems: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/content/items?${query}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      return response.json();
    },

    createItem: async (data) => {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/content/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(data)
      });
      return response.json();
    },

    updateItem: async (id, data) => {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/content/items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(data)
      });
      return response.json();
    },

    deleteItem: async (id) => {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/content/items/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      return response.json();
    },

    publishItem: async (id, publishDate = null) => {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/content/items/${id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ publish_date: publishDate })
      });
      return response.json();
    },

    getStatistics: async () => {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/content/statistics`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      return response.json();
    },

    getTemplates: async (contentType = null) => {
      const query = contentType ? `?content_type=${contentType}` : '';
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/content/templates${query}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      return response.json();
    },

    uploadMedia: async (file, folder = 'general', metadata = {}) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      Object.keys(metadata).forEach(key => {
        formData.append(key, metadata[key]);
      });

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/content/media/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: formData
      });
      return response.json();
    },

    getMedia: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/content/media?${query}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      return response.json();
    }
  };

  // Load data based on active tab
  useEffect(() => {
    loadData();
  }, [activeTab, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'content':
          const contentData = await contentAPI.getItems(filters);
          setContentItems(contentData.content_items || []);
          break;
        case 'templates':
          const templatesData = await contentAPI.getTemplates();
          setTemplates(templatesData.templates || []);
          break;
        case 'media':
          const mediaData = await contentAPI.getMedia(filters);
          setMediaFiles(mediaData.media_files || []);
          break;
        case 'analytics':
          const statsData = await contentAPI.getStatistics();
          setStatistics(statsData.statistics || {});
          break;
        case 'jobs':
          await loadJobsData();
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadJobsData = async () => {
    try {
      switch (jobsSubTab) {
        case 'postings':
          const jobsData = await careersAPI.admin.getJobPostings({ limit: 50 });
          setJobPostings(jobsData.job_postings || []);
          break;
        case 'applications':
          const applicationsData = await careersAPI.admin.getJobApplications({ limit: 50 });
          setJobApplications(applicationsData.applications || []);
          break;
        case 'statistics':
          const jobStatsData = await careersAPI.admin.getJobStatistics();
          setJobStatistics(jobStatsData.statistics || {});
          break;
      }
    } catch (error) {
      console.error('Error loading jobs data:', error);
    }
  };

  // Job management handlers
  const handlePublishJob = async (jobId) => {
    try {
      await careersAPI.admin.publishJobPosting(jobId);
      loadJobsData();
      alert('Job posting published successfully!');
    } catch (error) {
      console.error('Error publishing job:', error);
      alert('Failed to publish job posting.');
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (window.confirm('Are you sure you want to delete this job posting?')) {
      try {
        await careersAPI.admin.deleteJobPosting(jobId);
        loadJobsData();
        alert('Job posting deleted successfully!');
      } catch (error) {
        console.error('Error deleting job:', error);
        alert('Failed to delete job posting.');
      }
    }
  };

  // Content type icons and labels
  const contentTypeConfig = {
    banner: { icon: Megaphone, label: 'Banner', color: 'bg-red-100 text-red-800' },
    announcement: { icon: Zap, label: 'Announcement', color: 'bg-yellow-100 text-yellow-800' },
    blog_post: { icon: FileText, label: 'Blog Post', color: 'bg-blue-100 text-blue-800' },
    faq: { icon: HelpCircle, label: 'FAQ', color: 'bg-green-100 text-green-800' },
    help_article: { icon: BookOpen, label: 'Help Article', color: 'bg-purple-100 text-purple-800' },
    landing_page: { icon: Globe, label: 'Landing Page', color: 'bg-indigo-100 text-indigo-800' },
    email_template: { icon: Mail, label: 'Email Template', color: 'bg-pink-100 text-pink-800' },
    push_notification: { icon: Zap, label: 'Push Notification', color: 'bg-orange-100 text-orange-800' },
    promotion: { icon: Star, label: 'Promotion', color: 'bg-amber-100 text-amber-800' },
    testimonial: { icon: Users, label: 'Testimonial', color: 'bg-teal-100 text-teal-800' }
  };

  const statusConfig = {
    draft: { icon: Edit, label: 'Draft', color: 'bg-gray-100 text-gray-800' },
    published: { icon: CheckCircle, label: 'Published', color: 'bg-green-100 text-green-800' },
    scheduled: { icon: Clock, label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
    archived: { icon: Archive, label: 'Archived', color: 'bg-red-100 text-red-800' }
  };

  // Content Creation/Edit Modal
  const ContentModal = ({ isEdit = false, content = null, onClose, onSave }) => {
    const [formData, setFormData] = useState({
      title: content?.title || '',
      slug: content?.slug || '',
      content_type: content?.content_type || 'blog_post',
      status: content?.status || 'draft',
      category: content?.category || 'general',
      visibility: content?.visibility || 'public',
      content: content?.content || '',
      excerpt: content?.excerpt || '',
      meta_title: content?.meta_title || '',
      meta_description: content?.meta_description || '',
      keywords: content?.keywords?.join(', ') || '',
      tags: content?.tags?.join(', ') || '',
      featured_image: content?.featured_image || '',
      is_featured: content?.is_featured || false,
      is_sticky: content?.is_sticky || false
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const submitData = {
          ...formData,
          keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k),
          tags: formData.tags.split(',').map(t => t.trim()).filter(t => t)
        };

        if (isEdit) {
          await contentAPI.updateItem(content.id, submitData);
        } else {
          await contentAPI.createItem(submitData);
        }

        onSave();
        onClose();
        loadData();
      } catch (error) {
        console.error('Error saving content:', error);
        alert('Error saving content. Please try again.');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">
              {isEdit ? 'Edit Content' : 'Create New Content'}
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Basic Information</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({...formData, slug: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="auto-generated from title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
                  <select
                    value={formData.content_type}
                    onChange={(e) => setFormData({...formData, content_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(contentTypeConfig).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>
              </div>

              {/* Settings & SEO */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Settings & SEO</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="general">General</option>
                    <option value="marketing">Marketing</option>
                    <option value="support">Support</option>
                    <option value="product">Product</option>
                    <option value="tutorial">Tutorial</option>
                    <option value="news">News</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                  <select
                    value={formData.visibility}
                    onChange={(e) => setFormData({...formData, visibility: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="public">Public</option>
                    <option value="registered_users">Registered Users</option>
                    <option value="tradespeople">Tradespeople</option>
                    <option value="homeowners">Homeowners</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
                  <input
                    type="text"
                    value={formData.meta_title}
                    onChange={(e) => setFormData({...formData, meta_title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    maxLength="60"
                    placeholder="SEO title (60 chars max)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({...formData, tags: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="tag1, tag2, tag3"
                  />
                </div>
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="10"
                placeholder="Enter your content here (HTML/Markdown supported)"
                required
              />
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
              <textarea
                value={formData.excerpt}
                onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="3"
                maxLength="500"
                placeholder="Brief description (500 chars max)"
              />
            </div>

            {/* Options */}
            <div className="flex space-x-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({...formData, is_featured: e.target.checked})}
                  className="mr-2"
                />
                Featured Content
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_sticky}
                  onChange={(e) => setFormData({...formData, is_sticky: e.target.checked})}
                  className="mr-2"
                />
                Sticky (Top Priority)
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {isEdit ? 'Update Content' : 'Create Content'}
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
          <h2 className="text-2xl font-bold text-gray-800">Content Management</h2>
          <p className="text-gray-600">Manage all platform content, media, and templates</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowMediaModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Media</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Content</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'content', label: 'Content Items', icon: FileText },
              { id: 'media', label: 'Media Library', icon: Image },
              { id: 'templates', label: 'Templates', icon: BookOpen },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'jobs', label: 'Jobs & Careers', icon: Briefcase }
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

        <div className="p-6">
          {/* Content Items Tab */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <input
                      type="text"
                      placeholder="Search content..."
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <select
                      value={filters.content_type}
                      onChange={(e) => setFilters({...filters, content_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Types</option>
                      {Object.entries(contentTypeConfig).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({...filters, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Status</option>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div>
                    <select
                      value={filters.category}
                      onChange={(e) => setFilters({...filters, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Categories</option>
                      <option value="marketing">Marketing</option>
                      <option value="support">Support</option>
                      <option value="product">Product</option>
                      <option value="tutorial">Tutorial</option>
                      <option value="news">News</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Content List */}
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {contentItems.map((item) => {
                    const typeConfig = contentTypeConfig[item.content_type] || contentTypeConfig.blog_post;
                    const statusConfig = statusConfig[item.status] || statusConfig.draft;
                    const TypeIcon = typeConfig.icon;
                    const StatusIcon = statusConfig.icon;

                    return (
                      <div key={item.id} className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <TypeIcon className="w-5 h-5 text-gray-600" />
                              <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                              {item.is_featured && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                              {item.is_sticky && <Zap className="w-4 h-4 text-red-500" />}
                            </div>
                            
                            <div className="flex items-center space-x-4 mb-3">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${typeConfig.color}`}>
                                {typeConfig.label}
                              </span>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusConfig.color}`}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusConfig.label}
                              </span>
                              <span className="text-sm text-gray-500">
                                {item.category.replace('_', ' ')}
                              </span>
                              <span className="text-sm text-gray-500">
                                {new Date(item.created_at).toLocaleDateString()}
                              </span>
                            </div>

                            {item.excerpt && (
                              <p className="text-gray-600 text-sm mb-3">{item.excerpt}</p>
                            )}

                            {item.tags && item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {item.tags.slice(0, 3).map((tag, index) => (
                                  <span key={index} className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                    <Tag className="w-3 h-3 mr-1" />
                                    {tag}
                                  </span>
                                ))}
                                {item.tags.length > 3 && (
                                  <span className="text-xs text-gray-500">+{item.tags.length - 3} more</span>
                                )}
                              </div>
                            )}

                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span className="flex items-center">
                                <Eye className="w-4 h-4 mr-1" />
                                {item.view_count || 0} views
                              </span>
                              <span className="flex items-center">
                                <TrendingUp className="w-4 h-4 mr-1" />
                                {item.like_count || 0} likes
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => setShowPreviewModal(item)}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedContent(item);
                                setShowEditModal(true);
                              }}
                              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {item.status === 'draft' && (
                              <button
                                onClick={() => contentAPI.publishItem(item.id)}
                                className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                                title="Publish"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => contentAPI.deleteItem(item.id)}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {contentItems.length === 0 && !loading && (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No content found</h3>
                      <p className="text-gray-500">Create your first content item to get started.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-600 text-sm font-medium">Total Content</p>
                      <p className="text-2xl font-bold text-blue-900">{statistics.total_content || 0}</p>
                    </div>
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <div className="bg-green-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 text-sm font-medium">Published</p>
                      <p className="text-2xl font-bold text-green-900">{statistics.published_content || 0}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                <div className="bg-yellow-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-600 text-sm font-medium">Drafts</p>
                      <p className="text-2xl font-bold text-yellow-900">{statistics.draft_content || 0}</p>
                    </div>
                    <Edit className="w-8 h-8 text-yellow-600" />
                  </div>
                </div>
                <div className="bg-purple-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-600 text-sm font-medium">Scheduled</p>
                      <p className="text-2xl font-bold text-purple-900">{statistics.scheduled_content || 0}</p>
                    </div>
                    <Clock className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Content by Type Chart */}
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4">Content by Type</h3>
                <div className="space-y-3">
                  {Object.entries(statistics.content_by_type || {}).map(([type, count]) => {
                    const config = contentTypeConfig[type];
                    const percentage = ((count / (statistics.total_content || 1)) * 100).toFixed(1);
                    
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {config && <config.icon className="w-4 h-4 text-gray-600" />}
                          <span className="text-sm font-medium">{config?.label || type}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Performing Content */}
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4">Top Performing Content</h3>
                <div className="space-y-3">
                  {(statistics.top_performing || []).map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                          {index + 1}
                        </span>
                        <span className="font-medium">{item.title}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${contentTypeConfig[item.content_type]?.color || 'bg-gray-100 text-gray-800'}`}>
                          {contentTypeConfig[item.content_type]?.label || item.content_type}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{item.view_count || 0} views</span>
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Media Library Tab */}
          {activeTab === 'media' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {mediaFiles.map((file) => (
                  <div key={file.id} className="bg-white border rounded-lg p-3 hover:shadow-md transition-shadow">
                    <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center">
                      {file.file_type === 'image' ? (
                        <img src={file.file_url} alt={file.alt_text} className="w-full h-full object-cover rounded-lg" />
                      ) : file.file_type === 'video' ? (
                        <Video className="w-8 h-8 text-gray-400" />
                      ) : (
                        <FileText className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 truncate">{file.original_filename}</p>
                    <p className="text-xs text-gray-400">{(file.file_size / 1024).toFixed(1)} KB</p>
                  </div>
                ))}
              </div>

              {mediaFiles.length === 0 && !loading && (
                <div className="text-center py-12">
                  <Image className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No media files</h3>
                  <p className="text-gray-500">Upload your first media file to get started.</p>
                </div>
              )}
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="grid gap-4">
                {templates.map((template) => (
                  <div key={template.id} className="bg-white border rounded-lg p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                        <p className="text-gray-600 text-sm mb-2">{template.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className={`px-2 py-1 rounded-full ${contentTypeConfig[template.content_type]?.color || 'bg-gray-100 text-gray-800'}`}>
                            {contentTypeConfig[template.content_type]?.label || template.content_type}
                          </span>
                          <span>{template.variables.length} variables</span>
                          <span>{new Date(template.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded">
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {templates.length === 0 && !loading && (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No templates</h3>
                  <p className="text-gray-500">Create your first content template to get started.</p>
                </div>
              )}
            </div>
          )}

          {/* Jobs & Careers Tab */}
          {activeTab === 'jobs' && (
            <div className="space-y-6">
              {/* Jobs Sub-tabs */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  {[
                    { id: 'postings', label: 'Job Postings', icon: Briefcase },
                    { id: 'applications', label: 'Applications', icon: Users },
                    { id: 'statistics', label: 'Statistics', icon: BarChart3 }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setJobsSubTab(tab.id)}
                      className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                        jobsSubTab === tab.id
                          ? 'border-green-500 text-green-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Job Postings Sub-tab */}
              {jobsSubTab === 'postings' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Job Postings</h3>
                    <button
                      onClick={() => setShowCreateJobModal(true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Job Posting</span>
                    </button>
                  </div>

                  <div className="grid gap-4">
                    {jobPostings.map((job) => (
                      <div key={job.id} className="bg-white border rounded-lg p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                job.status === 'published' ? 'bg-green-100 text-green-800' :
                                job.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {job.status}
                              </span>
                              {job.settings?.is_featured && (
                                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                                  Featured
                                </span>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                              {job.settings?.department && (
                                <span className="flex items-center">
                                  <Building className="w-4 h-4 mr-1" />
                                  {job.settings.department}
                                </span>
                              )}
                              {job.settings?.location && (
                                <span className="flex items-center">
                                  <MapPin className="w-4 h-4 mr-1" />
                                  {job.settings.location}
                                </span>
                              )}
                              {job.settings?.job_type && (
                                <span className="flex items-center">
                                  <Clock className="w-4 h-4 mr-1" />
                                  {job.settings.job_type.replace('_', ' ')}
                                </span>
                              )}
                              {job.settings?.experience_level && (
                                <span className="flex items-center">
                                  <User className="w-4 h-4 mr-1" />
                                  {job.settings.experience_level}
                                </span>
                              )}
                            </div>
                            
                            <p className="text-gray-700 text-sm mb-3 line-clamp-2">{job.content}</p>
                            
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>{job.settings?.applications_count || 0} applications</span>
                              <span>Created {new Date(job.created_at).toLocaleDateString()}</span>
                              {job.settings?.expires_at && (
                                <span>Expires {new Date(job.settings.expires_at).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex space-x-2 ml-4">
                            <button 
                              onClick={() => window.open(`/careers/${job.slug}`, '_blank')}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedJob(job);
                                setShowEditJobModal(true);
                              }}
                              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {job.status === 'draft' && (
                              <button 
                                onClick={() => handlePublishJob(job.id)}
                                className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded"
                                title="Publish"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteJob(job.id)}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {jobPostings.length === 0 && !loading && (
                    <div className="text-center py-12">
                      <Briefcase className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No job postings</h3>
                      <p className="text-gray-500 mb-4">Create your first job posting to get started.</p>
                      <button
                        onClick={() => setShowCreateJobModal(true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium"
                      >
                        Create Job Posting
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Job Applications Sub-tab */}
              {jobsSubTab === 'applications' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Job Applications</h3>
                  
                  <div className="grid gap-4">
                    {jobApplications.map((application) => (
                      <div key={application.id} className="bg-white border rounded-lg p-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{application.name}</h3>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                application.status === 'new' ? 'bg-blue-100 text-blue-800' :
                                application.status === 'reviewed' ? 'bg-yellow-100 text-yellow-800' :
                                application.status === 'shortlisted' ? 'bg-green-100 text-green-800' :
                                application.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {application.status}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                              <span>{application.job_title}</span>
                              <span>{application.email}</span>
                              {application.phone && <span>{application.phone}</span>}
                              {application.experience_level && <span>{application.experience_level}</span>}
                            </div>
                            
                            <p className="text-gray-700 text-sm mb-3 line-clamp-2">{application.message}</p>
                            
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>Applied {new Date(application.applied_at).toLocaleDateString()}</span>
                              <span>Source: {application.source}</span>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2 ml-4">
                            <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded">
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {jobApplications.length === 0 && !loading && (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
                      <p className="text-gray-500">Applications will appear here once people start applying to your job postings.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Job Statistics Sub-tab */}
              {jobsSubTab === 'statistics' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Jobs Statistics</h3>
                  
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-lg border">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Briefcase className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                          <p className="text-2xl font-semibold text-gray-900">{jobStatistics.total_jobs || 0}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-lg border">
                      <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Active Jobs</p>
                          <p className="text-2xl font-semibold text-gray-900">{jobStatistics.active_jobs || 0}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-lg border">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Users className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Applications</p>
                        <p className="text-2xl font-semibold text-gray-900">{jobStatistics.total_applications || 0}</p>
                      </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-lg border">
                      <div className="flex items-center">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <Edit className="w-6 h-6 text-gray-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Draft Jobs</p>
                          <p className="text-2xl font-semibold text-gray-900">{jobStatistics.draft_jobs || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Jobs by Department */}
                  {jobStatistics.jobs_by_department && Object.keys(jobStatistics.jobs_by_department).length > 0 && (
                    <div className="bg-white p-6 rounded-lg border">
                      <h4 className="text-lg font-semibold mb-4">Jobs by Department</h4>
                      <div className="space-y-3">
                        {Object.entries(jobStatistics.jobs_by_department).map(([department, count]) => (
                          <div key={department} className="flex items-center justify-between">
                            <span className="text-gray-700">{department}</span>
                            <span className="font-semibold text-gray-900">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top Jobs */}
                  {jobStatistics.top_jobs && jobStatistics.top_jobs.length > 0 && (
                    <div className="bg-white p-6 rounded-lg border">
                      <h4 className="text-lg font-semibold mb-4">Top Jobs by Applications</h4>
                      <div className="space-y-3">
                        {jobStatistics.top_jobs.map((job, index) => (
                          <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <span className="flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full text-sm font-medium">
                                {index + 1}
                              </span>
                              <span className="font-medium">{job.title}</span>
                              <span className="text-sm text-gray-500">({job.department})</span>
                            </div>
                            <span className="text-sm text-gray-600">{job.applications_count || 0} applications</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <ContentModal
          onClose={() => setShowCreateModal(false)}
          onSave={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}

      {showEditModal && selectedContent && (
        <ContentModal
          isEdit={true}
          content={selectedContent}
          onClose={() => {
            setShowEditModal(false);
            setSelectedContent(null);
          }}
          onSave={() => {
            setShowEditModal(false);
            setSelectedContent(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};

export default ContentManagement;