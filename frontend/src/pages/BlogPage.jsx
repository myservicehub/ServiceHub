import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Calendar, Clock, User, Tag, Share2, Heart, MessageCircle, 
  ChevronRight, Search, Filter, TrendingUp, BookOpen, Eye,
  Facebook, Twitter, Linkedin, Link, ArrowLeft
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useToast } from '../hooks/use-toast';

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
  const { toast } = useToast();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  // Fallback sample posts shown when backend has no content
  const FALLBACK_POSTS = [
    {
      id: 'fallback-1',
      title: 'How to create a winning tradeperson profile',
      slug: 'winning-tradesperson-profile',
      content: `
        <p>A strong profile significantly increases your chances of getting hired.
        Focus on a clear headline, high-quality photos of past work, and a concise
        description of your skills and services. List certifications and years of
        experience, and ask past customers for short testimonials.</p>
        <ul>
          <li>Use a professional photo and brand colors consistently.</li>
          <li>Describe 3–5 signature services you offer.</li>
          <li>Add before/after project images to build trust.</li>
        </ul>
      `,
      excerpt: 'Boost your chances of getting hired with a standout profile.',
      featured_image: '',
      gallery_images: [],
      category: 'getting_started',
      tags: ['profile', 'getting-started', 'trust'],
      is_featured: true,
      is_sticky: false,
      view_count: 0,
      like_count: 0,
      share_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'fallback-2',
      title: "Understanding ServiceHub's payment system",
      slug: 'servicehub-payment-system',
      content: `
        <p>Payments for completed jobs are released to your ServiceHub wallet
        after homeowner approval. You can withdraw to your bank account within
        1–2 business days. Keep job records updated to avoid delays.</p>
        <p>For faster withdrawals, verify your identity and bank details in the
        Account settings page.</p>
      `,
      excerpt: 'How payments work, when funds arrive, and how to withdraw.',
      featured_image: '',
      gallery_images: [],
      category: 'payments_earnings',
      tags: ['payments', 'wallet', 'withdrawals'],
      is_featured: false,
      is_sticky: false,
      view_count: 0,
      like_count: 0,
      share_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'fallback-3',
      title: 'Verification process and requirements',
      slug: 'verification-process',
      content: `
        <p>To get verified, upload a valid ID, provide trade experience or
        certifications, and complete a short skills assessment. Verification
        typically takes 2–3 business days.</p>
        <p>Verified tradespeople appear higher in search and get more job requests.</p>
      `,
      excerpt: 'Steps to become a verified tradeperson on ServiceHub.',
      featured_image: '',
      gallery_images: [],
      category: 'account_management',
      tags: ['verification', 'trust', 'profile'],
      is_featured: false,
      is_sticky: false,
      view_count: 0,
      like_count: 0,
      share_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'fallback-4',
      title: 'How to get more job requests',
      slug: 'get-more-job-requests',
      content: `
        <p>Respond quickly to new job requests, keep your calendar updated, and
        maintain a high rating by delivering quality work. Add clear pricing and
        photos of completed jobs to attract more customers.</p>
      `,
      excerpt: 'Practical tips that increase your visibility and conversions.',
      featured_image: '',
      gallery_images: [],
      category: 'job_management',
      tags: ['requests', 'visibility', 'pricing'],
      is_featured: false,
      is_sticky: false,
      view_count: 0,
      like_count: 0,
      share_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'fallback-5',
      title: 'Handling difficult customers professionally',
      slug: 'handling-difficult-customers',
      content: `
        <p>Stay calm, document everything, and offer clear next steps. Use
        ServiceHub messaging and contracts to keep communication professional
        and expectations aligned.</p>
      `,
      excerpt: 'De-escalation and communication tips to protect your reputation.',
      featured_image: '',
      gallery_images: [],
      category: 'safety_policies',
      tags: ['customers', 'communication', 'policy'],
      is_featured: false,
      is_sticky: false,
      view_count: 0,
      like_count: 0,
      share_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  // Blog API
  const BASE_URL = '';
  const blogAPI = {
    getPosts: async (params = {}) => {
      try {
        // Get published blog posts from public API
        const query = new URLSearchParams(params).toString();
        const response = await fetch(`${BASE_URL}/api/public/content/blog?${query}`);
        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          throw new Error(`HTTP ${response.status} ${errText}`);
        }
        const data = await response.json();
        return data.blog_posts || [];
      } catch (error) {
        console.error('Error fetching blog posts:', error);
        // propagate so callers know something went wrong
        throw error;
      }
    },

    getPostBySlug: async (slug) => {
      try {
        const response = await fetch(`${BASE_URL}/api/public/content/blog/post/${slug}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data.blog_post || null;
      } catch (error) {
        console.error('Error fetching blog post:', error);
        return null;
      }
    },

    getFeaturedPosts: async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/public/content/blog/featured`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.featured_posts || [];
      } catch (error) {
        console.error('Error fetching featured posts:', error);
        return [];
      }
    },

    getCategories: async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/public/content/blog/categories`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.categories || [];
      } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
      }
    },

    likePost: async (postId) => {
      try {
        await fetch(`${BASE_URL}/api/public/content/blog/${postId}/like`, {
          method: 'POST'
        });
      } catch (error) {
        console.error('Error liking post:', error);
      }
    },

    sharePost: async (postId) => {
      try {
        await fetch(`${BASE_URL}/api/public/content/blog/${postId}/share`, {
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
    } else {
      setSelectedPost(null);
      loadBlogData();
    }
  }, [slug]);

  const loadBlogData = async () => {
    try {
      if (slug) {
        setLoading(false);
        return;
      }
      setLoading(true);

      // Get featured posts
      const featured = await blogAPI.getFeaturedPosts();
      if (featured && featured.length > 0) {
        setFeaturedPosts(featured);
      } else {
        // Fallback to local featured posts
        setFeaturedPosts(FALLBACK_POSTS.filter(p => p.is_featured));
      }

      // Get regular posts
      let allPosts = [];
      try {
        allPosts = await blogAPI.getPosts(filters);
      } catch (err) {
        // network or server error - show a warning but continue with fallback
        console.error('Blog API error, will show sample content', err);
        toast({ title: 'Unable to load posts', description: 'Showing sample content instead', variant: 'destructive' });
      }
      
      // Filter out featured posts for the regular list
      let regularPosts = (allPosts || []).filter(post => !post.is_featured);

      // If no posts from backend and no filters, use fallback
      if (regularPosts.length === 0 && !filters.category && !filters.search && (!allPosts || allPosts.length === 0)) {
        regularPosts = FALLBACK_POSTS.filter(p => !p.is_featured);
      }
      
      setPosts(regularPosts);
      
      // Get categories
      const categoryData = await blogAPI.getCategories();
      let uniqueCategories = (categoryData || []).map(cat => cat.category);
      if (!uniqueCategories || uniqueCategories.length === 0) {
        uniqueCategories = Array.from(new Set(FALLBACK_POSTS.map(p => p.category)));
      }
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
      } else {
        // Fallback: find local sample post by slug
        const local = FALLBACK_POSTS.find(p => p.slug === postSlug);
        if (local) {
          setSelectedPost(local);
        }
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

  const getReadingTime = (content, precalculatedTime) => {
    if (precalculatedTime !== undefined) return precalculatedTime;
    if (!content) return 1;

    const wordsPerMinute = 200;
    const text = String(content).replace(/<[^>]*>/g, ' ');
    const wordCount = text.trim().split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  };

  const handleNewsletterSubscribe = async () => {
    if (!newsletterEmail) {
      toast({ title: 'Email required', description: 'Please enter your email address.', variant: 'destructive' });
      return;
    }
    setNewsletterLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/public/content/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail, source: 'blog_sidebar' })
      });
      if (!res.ok) throw new Error('Subscription failed');
      await res.json();
      toast({ title: 'Subscribed!', description: 'You will now receive our newsletter.' });
      setNewsletterSubscribed(true);
      setNewsletterEmail('');
      setTimeout(() => setNewsletterSubscribed(false), 3000);
    } catch (err) {
      toast({ title: 'Subscription failed', description: 'Please try again later.', variant: 'destructive' });
    } finally {
      setNewsletterLoading(false);
    }
  };

  const handleShare = async (post, platform) => {
    const url = `${window.location.origin}/blog/${post.slug}`;
    const title = post.title;
    
    // Increment share count
    await blogAPI.sharePost(post.id);
    
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

  const handleLike = async (post) => {
    await blogAPI.likePost(post.id);
    // Update local state to reflect the like
    if (selectedPost && selectedPost.id === post.id) {
      setSelectedPost({
        ...selectedPost,
        like_count: (selectedPost.like_count || 0) + 1
      });
    }
  };

  // Blog Post Card Component
  const BlogCard = ({ post, featured = false }) => (
    <article className={`group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-[#34D164]/20 transition-all duration-300 ${featured ? 'lg:flex' : ''}`}>
      {post.featured_image && (
        <div className={`${featured ? 'lg:w-1/2' : ''} h-44 ${featured ? 'lg:h-auto' : ''} overflow-hidden`}>
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      
      <div className={`p-5 ${featured ? 'lg:w-1/2' : ''}`}>
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
          <span className="bg-[#34D164]/10 text-[#34D164] px-2 py-0.5 rounded-full font-medium">
            {post.category.replace('_', ' ')}
          </span>
          <span className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {getReadingTime(post.content, post.reading_time)} min
          </span>
        </div>
        
        <h3 className={`font-semibold font-montserrat text-[#121E3C] mb-2 group-hover:text-[#34D164] transition-colors ${featured ? 'text-lg' : 'text-base'}`}>
          <button 
            onClick={() => navigate(`/blog/${post.slug}`)}
            className="text-left"
          >
            {post.title}
          </button>
        </h3>
        
        {post.excerpt && (
          <p className="text-gray-500 text-sm font-lato mb-4 line-clamp-2">
            {post.excerpt}
          </p>
        )}
        
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center">
              <Eye className="w-3 h-3 mr-1" />
              {post.view_count || 0}
            </span>
            <span className="flex items-center">
              <Heart className="w-3 h-3 mr-1" />
              {post.like_count || 0}
            </span>
          </div>
          
          <button
            onClick={() => navigate(`/blog/${post.slug}`)}
            className="text-[#34D164] hover:text-[#2ab854] font-medium text-xs flex items-center"
          >
            Read More
            <ChevronRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </article>
  );

  // Single Blog Post View
  if (selectedPost) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        {/* Hero for single post */}
        <section className="relative py-12 lg:py-14 overflow-hidden">
          <div className="absolute inset-0">
            {selectedPost.featured_image ? (
              <img src={selectedPost.featured_image} alt="" className="w-full h-full object-cover" />
            ) : (
              <img src="/stock/bg4.jpg" alt="" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-[#121E3C]/90 via-[#121E3C]/85 to-[#121E3C]/90" />
          </div>
          
          <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
            <div className="max-w-3xl mx-auto">
              <button
                onClick={() => { setSelectedPost(null); navigate('/blog'); }}
                className="flex items-center text-white/70 hover:text-white mb-6 text-sm font-lato"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Blog
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-[#34D164]/20 text-[#34D164] px-3 py-1 rounded-full text-xs font-medium">
                  {selectedPost.category.replace('_', ' ')}
                </span>
                <span className="text-white/60 text-xs flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {getReadingTime(selectedPost.content, selectedPost.reading_time)} min read
                </span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-bold font-montserrat text-white mb-4">
                {selectedPost.title}
              </h1>
              
              <div className="flex items-center gap-4 text-white/60 text-xs">
                <span className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {formatDate(selectedPost.created_at)}
                </span>
                <span className="flex items-center">
                  <Eye className="w-3 h-3 mr-1" />
                  {selectedPost.view_count || 0} views
                </span>
              </div>
            </div>
          </div>
        </section>
        
        <main 
          className="py-10 lg:py-12"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.97), rgba(255,255,255,0.97)), 
              linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px),
              linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)`,
            backgroundSize: '100% 100%, 20px 20px, 20px 20px'
          }}
        >
          <div className="container mx-auto px-6 md:px-8 lg:px-12">
            <div className="max-w-3xl mx-auto">
              <article className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
                {/* Excerpt */}
                {selectedPost.excerpt && (
                  <div className="text-gray-600 font-lato mb-6 pb-6 border-b border-gray-100 text-sm leading-relaxed">
                    {selectedPost.excerpt}
                  </div>
                )}
                
                {/* Content */}
                <div 
                  className="prose prose-sm max-w-none mb-8 font-lato"
                  dangerouslySetInnerHTML={{ __html: selectedPost.content }}
                />
                
                {/* Tags */}
                {selectedPost.tags && selectedPost.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6 pb-6 border-b border-gray-100">
                    {selectedPost.tags.map((tag, index) => (
                      <span key={index} className="inline-flex items-center text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Share & Like */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 mr-1">Share:</span>
                    {[
                      { icon: Facebook, handler: 'facebook', color: 'text-blue-600' },
                      { icon: Twitter, handler: 'twitter', color: 'text-sky-500' },
                      { icon: Linkedin, handler: 'linkedin', color: 'text-blue-700' },
                      { icon: Link, handler: 'copy', color: 'text-gray-500' }
                    ].map(({ icon: Icon, handler, color }) => (
                      <button
                        key={handler}
                        onClick={() => handleShare(selectedPost, handler)}
                        className={`p-2 ${color} hover:bg-gray-100 rounded-lg transition-colors`}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                  
                  <button 
                    onClick={() => handleLike(selectedPost)}
                    className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors text-xs"
                  >
                    <Heart className="w-4 h-4" />
                    {selectedPost.like_count || 0}
                  </button>
                </div>
              </article>
            </div>
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
      <section className="relative py-14 lg:py-16 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/stock/bg9.jpg" 
            alt="" 
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#121E3C]/85 via-[#121E3C]/75 to-[#121E3C]/85" />
        </div>
        
        <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block px-4 py-1.5 mb-4 text-xs font-semibold font-lato tracking-wider uppercase text-[#34D164] bg-white/5 backdrop-blur-sm border border-white/10 rounded-full">
              Resources
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-montserrat text-white mb-3">
              ServiceHub Blog
            </h1>
            <p className="text-white/70 font-lato text-sm mb-8 max-w-md mx-auto">
              Expert insights, tips, and stories from Nigeria's home improvement community
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-md mx-auto">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                <Search className="text-white/60" size={18} />
              </div>
              <input
                type="text"
                placeholder="Search blog posts..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="w-full pl-11 pr-4 py-2.5 text-sm bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:border-[#34D164]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      {featuredPosts.length > 0 && (
        <section className="relative py-12 overflow-hidden">
          <div className="absolute inset-0 bg-[#121E3C]" />
          
          <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-4 h-4 text-[#34D164]" />
                <h2 className="text-base font-semibold font-montserrat text-white">Featured Posts</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-5">
                {featuredPosts.slice(0, 2).map((post) => (
                  <article 
                    key={post.id}
                    onClick={() => navigate(`/blog/${post.slug}`)}
                    className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 cursor-pointer hover:bg-white/10 transition-all duration-300"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="bg-[#34D164]/20 text-[#34D164] px-2 py-0.5 rounded-full text-xs font-medium">
                        {post.category.replace('_', ' ')}
                      </span>
                      <span className="text-white/50 text-xs">{getReadingTime(post.content, post.reading_time)} min read</span>
                    </div>
                    <h3 className="text-base font-semibold font-montserrat text-white mb-2 group-hover:text-[#34D164] transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-white/60 text-xs font-lato line-clamp-2">{post.excerpt}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <main 
        className="py-10 lg:py-12"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.97), rgba(255,255,255,0.97)), 
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 20px 20px, 20px 20px'
        }}
      >
        <div className="container mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-4 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-3">
                {/* Filters */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center">
                      <Filter className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-xs font-medium text-gray-500">Filter:</span>
                    </div>
                    
                    <select
                      value={filters.category}
                      onChange={(e) => setFilters({...filters, category: e.target.value})}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-[#34D164]/20 focus:border-[#34D164]"
                    >
                      <option value="">All Categories</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                    
                    {(filters.category || filters.search) && (
                      <button
                        onClick={() => setFilters({ category: '', search: '', tag: '' })}
                        className="text-xs text-[#34D164] hover:text-[#2ab854]"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Blog Posts Grid */}
                {loading ? (
                  <div className="grid md:grid-cols-2 gap-5">
                    {[...Array(4)].map((_, index) => (
                      <div key={index} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                        <div className="h-40 bg-gray-100"></div>
                        <div className="p-5">
                          <div className="h-3 bg-gray-100 rounded mb-3 w-20"></div>
                          <div className="h-4 bg-gray-100 rounded mb-2"></div>
                          <div className="h-3 bg-gray-100 rounded mb-4"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : posts.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-5">
                    {posts.map((post) => (
                      <BlogCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#121E3C] mb-2">No posts found</h3>
                    <p className="text-gray-400 text-sm">
                      {filters.search || filters.category 
                        ? 'Try adjusting your search or filter.'
                        : 'Check back soon for new content!'
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="space-y-5">
                  {/* Newsletter Signup */}
                  <div className="bg-[#121E3C] rounded-2xl p-5">
                    <h3 className="text-sm font-semibold font-montserrat text-white mb-2">Stay Updated</h3>
                    <p className="text-white/60 text-xs font-lato mb-4">
                      Get tips and offers in your inbox.
                    </p>
                    <div className="space-y-2">
                      <input
                        type="email"
                        placeholder="Your email"
                        className="w-full px-3 py-2 text-xs bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:outline-none focus:border-[#34D164]"
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                      />
                      <button
                        onClick={handleNewsletterSubscribe}
                        disabled={newsletterLoading}
                        className="w-full bg-[#34D164] hover:bg-[#2ab854] disabled:opacity-70 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                      >
                        {newsletterLoading ? 'Subscribing…' : newsletterSubscribed ? 'Subscribed ✓' : 'Subscribe'}
                      </button>
                    </div>
                  </div>

                  {/* Popular Categories */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <h3 className="text-sm font-semibold font-montserrat text-[#121E3C] mb-3">Categories</h3>
                    <div className="space-y-1">
                      {categories.slice(0, 5).map((category) => (
                        <button
                          key={category}
                          onClick={() => setFilters({...filters, category})}
                          className={`block w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${
                            filters.category === category 
                              ? 'bg-[#34D164]/10 text-[#34D164] font-medium' 
                              : 'text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {category.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recent Posts */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <h3 className="text-sm font-semibold font-montserrat text-[#121E3C] mb-3">Recent Posts</h3>
                    <div className="space-y-3">
                      {posts.slice(0, 3).map((post) => (
                        <button 
                          key={post.id} 
                          onClick={() => navigate(`/blog/${post.slug}`)}
                          className="block w-full text-left group"
                        >
                          <h4 className="font-medium text-[#121E3C] text-xs mb-1 line-clamp-2 group-hover:text-[#34D164] transition-colors">
                            {post.title}
                          </h4>
                          <p className="text-[10px] text-gray-400">
                            {formatDate(post.created_at)}
                          </p>
                        </button>
                      ))}
                    </div>
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
