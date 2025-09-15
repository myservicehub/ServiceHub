import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Calendar, Clock, User, Tag, Share2, Heart, MessageCircle, 
  ChevronRight, Search, Filter, TrendingUp, BookOpen, Eye,
  Facebook, Twitter, Linkedin, Link, ArrowLeft
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const BlogPage = () => {
  const navigate = useNavigate();
  const { slug } = useParams(); // For individual blog post
  const [posts, setPosts] = useState([]);
  const [featuredPosts, setFeaturedPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    tag: ''
  });

  // Blog API
  const blogAPI = {
    getPosts: async (params = {}) => {
      try {
        // Get published blog posts from public API
        const query = new URLSearchParams(params).toString();
        
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/public/content/blog?${query}`);
        const data = await response.json();
        return data.blog_posts || [];
      } catch (error) {
        console.error('Error fetching blog posts:', error);
        return [];
      }
    },

    getPostBySlug: async (slug) => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/public/content/blog/${slug}`);
        if (response.ok) {
          const data = await response.json();
          return data.blog_post;
        }
        return null;
      } catch (error) {
        console.error('Error fetching blog post:', error);
        return null;
      }
    },

    getFeaturedPosts: async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/public/content/blog/featured`);
        const data = await response.json();
        return data.featured_posts || [];
      } catch (error) {
        console.error('Error fetching featured posts:', error);
        return [];
      }
    },

    getCategories: async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/public/content/blog/categories`);
        const data = await response.json();
        return data.categories || [];
      } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
      }
    },

    likePost: async (postId) => {
      try {
        await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/public/content/blog/${postId}/like`, {
          method: 'POST'
        });
      } catch (error) {
        console.error('Error liking post:', error);
      }
    },

    sharePost: async (postId) => {
      try {
        await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/public/content/blog/${postId}/share`, {
          method: 'POST'
        });
      } catch (error) {
        console.error('Error sharing post:', error);
      }
    }
  };

  useEffect(() => {
    loadBlogData();
  }, [filters]);

  useEffect(() => {
    if (slug) {
      loadSinglePost(slug);
    }
  }, [slug]);

  const loadBlogData = async () => {
    setLoading(true);
    try {
      if (slug) {
        // If we're viewing a single post, don't load the list
        return;
      }

      // Get featured posts
      const featured = await blogAPI.getFeaturedPosts();
      setFeaturedPosts(featured);

      // Get regular posts
      const allPosts = await blogAPI.getPosts(filters);
      const regular = allPosts.filter(post => !post.is_featured);
      setPosts(regular);
      
      // Get categories
      const categoryData = await blogAPI.getCategories();
      const uniqueCategories = categoryData.map(cat => cat.category);
      setCategories(uniqueCategories);
      
    } catch (error) {
      console.error('Error loading blog data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSinglePost = async (postSlug) => {
    setLoading(true);
    try {
      const post = await blogAPI.getPostBySlug(postSlug);
      if (post) {
        setSelectedPost(post);
        // View count is automatically incremented by the API
      }
    } catch (error) {
      console.error('Error loading blog post:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getReadingTime = (content) => {
    const wordsPerMinute = 200;
    const wordCount = content.split(' ').length;
    return Math.ceil(wordCount / wordsPerMinute);
  };

  const handleShare = (post, platform) => {
    const url = `${window.location.origin}/blog/${post.slug}`;
    const title = post.title;
    
    let shareUrl = '';
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
        return;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  // Blog Post Card Component
  const BlogCard = ({ post, featured = false }) => (
    <article className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow ${featured ? 'lg:flex' : ''}`}>
      {post.featured_image && (
        <div className={`${featured ? 'lg:w-1/2' : ''} h-48 ${featured ? 'lg:h-auto' : ''} overflow-hidden`}>
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      
      <div className={`p-6 ${featured ? 'lg:w-1/2' : ''}`}>
        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
            {post.category.replace('_', ' ').toUpperCase()}
          </span>
          <span className="flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            {formatDate(post.created_at)}
          </span>
          <span className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {getReadingTime(post.content)} min read
          </span>
        </div>
        
        <h3 className={`font-bold text-gray-900 mb-3 hover:text-green-600 transition-colors ${featured ? 'text-xl' : 'text-lg'}`}>
          <button 
            onClick={() => navigate(`/blog/${post.slug}`)}
            className="text-left"
          >
            {post.title}
          </button>
        </h3>
        
        {post.excerpt && (
          <p className="text-gray-600 mb-4 line-clamp-3">
            {post.excerpt}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span className="flex items-center">
              <Eye className="w-4 h-4 mr-1" />
              {post.view_count || 0}
            </span>
            <span className="flex items-center">
              <Heart className="w-4 h-4 mr-1" />
              {post.like_count || 0}
            </span>
            <span className="flex items-center">
              <MessageCircle className="w-4 h-4 mr-1" />
              {post.comment_count || 0}
            </span>
          </div>
          
          <button
            onClick={() => navigate(`/blog/${post.slug}`)}
            className="text-green-600 hover:text-green-700 font-medium text-sm flex items-center"
          >
            Read More
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
        
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {post.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="inline-flex items-center text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );

  // Single Blog Post View
  if (selectedPost) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <button
              onClick={() => navigate('/blog')}
              className="flex items-center text-green-600 hover:text-green-700 mb-8"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </button>
            
            {/* Blog Post Header */}
            <article className="bg-white rounded-lg shadow-md overflow-hidden">
              {selectedPost.featured_image && (
                <div className="h-64 md:h-80 overflow-hidden">
                  <img
                    src={selectedPost.featured_image}
                    alt={selectedPost.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="p-6 md:p-8">
                {/* Meta Information */}
                <div className="flex flex-wrap items-center space-x-4 text-sm text-gray-500 mb-6">
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
                    {selectedPost.category.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(selectedPost.created_at)}
                  </span>
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {getReadingTime(selectedPost.content)} min read
                  </span>
                  <span className="flex items-center">
                    <Eye className="w-4 h-4 mr-1" />
                    {selectedPost.view_count || 0} views
                  </span>
                </div>
                
                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  {selectedPost.title}
                </h1>
                
                {/* Excerpt */}
                {selectedPost.excerpt && (
                  <div className="text-xl text-gray-600 mb-8 pb-8 border-b border-gray-200">
                    {selectedPost.excerpt}
                  </div>
                )}
                
                {/* Content */}
                <div 
                  className="prose prose-lg max-w-none mb-8"
                  dangerouslySetInnerHTML={{ __html: selectedPost.content }}
                />
                
                {/* Tags */}
                {selectedPost.tags && selectedPost.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-8 pb-8 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-700 mr-2">Tags:</span>
                    {selectedPost.tags.map((tag, index) => (
                      <span key={index} className="inline-flex items-center text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Share Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-700">Share:</span>
                    <button
                      onClick={() => handleShare(selectedPost, 'facebook')}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    >
                      <Facebook className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleShare(selectedPost, 'twitter')}
                      className="p-2 text-sky-500 hover:bg-sky-50 rounded-full transition-colors"
                    >
                      <Twitter className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleShare(selectedPost, 'linkedin')}
                      className="p-2 text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
                    >
                      <Linkedin className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleShare(selectedPost, 'copy')}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                    >
                      <Link className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <button className="flex items-center hover:text-red-500 transition-colors">
                      <Heart className="w-4 h-4 mr-1" />
                      {selectedPost.like_count || 0}
                    </button>
                    <span className="flex items-center">
                      <MessageCircle className="w-4 h-4 mr-1" />
                      {selectedPost.comment_count || 0}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }

  // Blog List View
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              ServiceHub Blog
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Expert insights, tips, and stories from Nigeria's home improvement community
            </p>
            
            {/* Search Bar */}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search blog posts..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Featured Posts */}
          {featuredPosts.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center mb-8">
                <TrendingUp className="w-6 h-6 text-green-600 mr-2" />
                <h2 className="text-2xl font-bold text-gray-900">Featured Posts</h2>
              </div>
              
              <div className="grid gap-8">
                {featuredPosts.map((post) => (
                  <BlogCard key={post.id} post={post} featured={true} />
                ))}
              </div>
            </section>
          )}

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Filters */}
              <div className="bg-white rounded-lg shadow-sm border p-4 mb-8">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center">
                    <Filter className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Filter by:</span>
                  </div>
                  
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters({...filters, category: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category.replace('_', ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                  
                  {(filters.category || filters.search) && (
                    <button
                      onClick={() => setFilters({ category: '', search: '', tag: '' })}
                      className="text-sm text-green-600 hover:text-green-700"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Blog Posts Grid */}
              {loading ? (
                <div className="grid md:grid-cols-2 gap-8">
                  {[...Array(6)].map((_, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                      <div className="h-48 bg-gray-200"></div>
                      <div className="p-6">
                        <div className="h-4 bg-gray-200 rounded mb-3"></div>
                        <div className="h-6 bg-gray-200 rounded mb-3"></div>
                        <div className="h-4 bg-gray-200 rounded mb-4"></div>
                        <div className="flex justify-between">
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                          <div className="h-4 bg-gray-200 rounded w-16"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : posts.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-8">
                  {posts.map((post) => (
                    <BlogCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No blog posts found</h3>
                  <p className="text-gray-500">
                    {filters.search || filters.category 
                      ? 'Try adjusting your search or filter criteria.'
                      : 'Check back soon for our latest insights and tips!'
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="space-y-8">
                {/* Newsletter Signup */}
                <div className="bg-green-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Stay Updated</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Get the latest home improvement tips and exclusive offers delivered to your inbox.
                  </p>
                  <div className="space-y-3">
                    <input
                      type="email"
                      placeholder="Your email address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    <button className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                      Subscribe
                    </button>
                  </div>
                </div>

                {/* Popular Categories */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Popular Categories</h3>
                  <div className="space-y-2">
                    {categories.slice(0, 5).map((category) => (
                      <button
                        key={category}
                        onClick={() => setFilters({...filters, category})}
                        className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-green-600 rounded transition-colors"
                      >
                        {category.replace('_', ' ').toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recent Posts */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Posts</h3>
                  <div className="space-y-4">
                    {posts.slice(0, 3).map((post) => (
                      <div key={post.id} className="flex space-x-3">
                        {post.featured_image && (
                          <img
                            src={post.featured_image}
                            alt={post.title}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
                            <button 
                              onClick={() => navigate(`/blog/${post.slug}`)}
                              className="hover:text-green-600 transition-colors"
                            >
                              {post.title}
                            </button>
                          </h4>
                          <p className="text-xs text-gray-500">
                            {formatDate(post.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default BlogPage;