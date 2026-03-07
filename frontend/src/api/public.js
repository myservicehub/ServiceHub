import apiClient from './client';

export const publicAPI = {
  /**
   * Submit a contact form
   * @param {Object} data - { name, email, subject, message }
   */
  async submitContactForm(data) {
    const response = await apiClient.post('/public/content/submit-contact', data);
    return response.data;
  },

  /**
   * Get public blog posts
   */
  async getBlogPosts(params = {}) {
    const response = await apiClient.get('/public/content/blog', { params });
    return response.data;
  },

  /**
   * Get blog post by slug
   */
  async getBlogPost(slug) {
    const response = await apiClient.get(`/public/content/blog/post/${slug}`);
    return response.data;
  }
};
