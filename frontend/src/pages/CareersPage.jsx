import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Briefcase, MapPin, Clock, Users, Heart, TrendingUp, 
  Award, Coffee, Laptop, Globe, Mail, Phone, Send,
  ChevronRight, Star, Building, Target, Zap, Shield,
  ArrowRight, CheckCircle, User, Calendar, AlertCircle
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import careersAPI from '../api/careers';
import { statsAPI } from '../api/services';

const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Failed to read selected file.'));
  reader.readAsDataURL(file);
});

const CareersPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openPositions, setOpenPositions] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [departments, setDepartments] = useState(['all']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [platformStats, setPlatformStats] = useState({
    total_tradespeople: 0,
    total_jobs_completed: 0
  });
  const [submitting, setSubmitting] = useState(false);
  const [applicationForm, setApplicationForm] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    experience: '',
    message: '',
    resume: null
  });
  // Load job positions from API
  const loadJobPositions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await careersAPI.getJobPostings({ limit: 50 });
      const jobs = response?.job_postings || [];
      
      setOpenPositions(jobs);
      
      // Extract unique departments
      const uniqueDepartments = ['all', ...new Set(jobs.map(job => job.department).filter(Boolean))];
      setDepartments(uniqueDepartments);
      
    } catch (err) {
      console.error('Error loading job positions:', err);
      setError('Failed to load job positions. Please try again later.');
      setOpenPositions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPlatformStats = async () => {
    try {
      const stats = await statsAPI.getStats();
      setPlatformStats({
        total_tradespeople: Number(stats?.total_tradespeople ?? 0),
        total_jobs_completed: Number(stats?.total_jobs_completed ?? stats?.total_jobs ?? 0)
      });
    } catch (err) {
      console.error('Error loading platform stats for careers page:', err);
      setPlatformStats({
        total_tradespeople: 0,
        total_jobs_completed: 0
      });
    }
  };

  const companyValues = [
    {
      icon: Target,
      title: 'Mission-Driven',
      description: 'We\'re building Nigeria\'s most trusted platform for home improvement, connecting millions of homeowners with skilled tradespeople.'
    },
    {
      icon: Users,
      title: 'Team First',
      description: 'We believe in collaboration, mutual respect, and supporting each other to achieve great things together.'
    },
    {
      icon: TrendingUp,
      title: 'Growth Mindset',
      description: 'We embrace challenges, learn from failures, and continuously improve ourselves and our platform.'
    },
    {
      icon: Heart,
      title: 'Customer Obsessed',
      description: 'Every decision we make is guided by what\'s best for our users - homeowners and tradespeople alike.'
    },
    {
      icon: Zap,
      title: 'Innovation',
      description: 'We use cutting-edge technology and creative solutions to solve real problems in the home improvement industry.'
    },
    {
      icon: Shield,
      title: 'Integrity',
      description: 'We operate with transparency, honesty, and ethical standards in everything we do.'
    }
  ];

  const benefits = [
    {
      icon: Heart,
      title: 'Health & Wellness',
      items: ['Comprehensive health insurance', 'Mental health support', 'Wellness stipend', 'Gym membership']
    },
    {
      icon: TrendingUp,
      title: 'Career Growth',
      items: ['Learning & development budget', 'Conference attendance', 'Mentorship programs', 'Internal mobility']
    },
    {
      icon: Coffee,
      title: 'Work-Life Balance',
      items: ['Flexible working hours', 'Remote work options', 'Unlimited PTO', 'Sabbatical opportunities']
    },
    
    {
      icon: Users,
      title: 'Team Culture',
      items: ['Team building events', 'Company retreats', 'Diversity & inclusion', 'Open communication']
    },
    {
      icon: Award,
      title: 'Compensation',
      items: ['Competitive salaries', 'Equity participation', 'Performance bonuses', 'Annual reviews']
    }
  ];

  useEffect(() => {
    loadJobPositions();
    loadPlatformStats();
  }, []);

  useEffect(() => {
    if (!openPositions.length) return;

    const params = new URLSearchParams(location.search);
    const requestedPosition = params.get('position');
    const targetHash = location.hash;

    if (requestedPosition) {
      const decodedPosition = decodeURIComponent(requestedPosition);
      const matchingJob = openPositions.find(
        (job) =>
          job.slug === decodedPosition ||
          job.id === decodedPosition ||
          job.title?.toLowerCase() === decodedPosition.toLowerCase()
      );

      if (matchingJob) {
        setApplicationForm((prev) => ({
          ...prev,
          position: matchingJob.title
        }));
      }
    }

    if (targetHash === '#application-form') {
      const scrollToForm = () => {
        const formSection = document.getElementById('application-form');
        formSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      requestAnimationFrame(() => requestAnimationFrame(scrollToForm));
    }
  }, [location.hash, location.search, openPositions]);

  const filteredPositions = selectedDepartment === 'all' 
    ? openPositions 
    : openPositions.filter(job => job.department === selectedDepartment);

  const handleApplicationSubmit = async (e) => {
    e.preventDefault();
    
    if (!applicationForm.name || !applicationForm.email || !applicationForm.message) {
      alert('Please fill in all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      const selectedJob = applicationForm.position && applicationForm.position !== 'General Application'
        ? openPositions.find(job => job.title === applicationForm.position)
        : null;

      let resumeDataUrl;
      if (applicationForm.resume) {
        if (applicationForm.resume.size > MAX_RESUME_SIZE_BYTES) {
          throw new Error('Resume/CV must be 5MB or smaller.');
        }
        resumeDataUrl = await fileToDataUrl(applicationForm.resume);
      }

      const applicationData = {
        name: applicationForm.name,
        email: applicationForm.email,
        phone: applicationForm.phone || undefined,
        position_of_interest: applicationForm.position || 'General Application',
        experience_level: applicationForm.experience || undefined,
        message: applicationForm.message,
        resume_filename: applicationForm.resume?.name || undefined,
        resume_data_url: resumeDataUrl || undefined,
        resume_mime_type: applicationForm.resume?.type || undefined,
        resume_size_bytes: applicationForm.resume?.size || undefined
      };

      if (selectedJob) {
        await careersAPI.applyToJob(selectedJob.id, applicationData);
      } else {
        await careersAPI.applyGeneral(applicationData);
      }
      
      alert('Thank you for your application! We\'ll be in touch soon.');
      
      // Reset form
      setApplicationForm({
        name: '',
        email: '',
        phone: '',
        position: '',
        experience: '',
        message: '',
        resume: null
      });
      
    } catch (err) {
      console.error('Error submitting application:', err);
      alert(err?.message || 'Failed to submit application. Please try again or contact us directly.');
    } finally {
      setSubmitting(false);
    }
  };

  const JobCard = ({ job }) => {
    const jobPath = `/careers/${encodeURIComponent(job.slug || job.id)}`;

    return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(jobPath)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(jobPath);
        }
      }}
      className="group bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-[#34D164]/20 transition-all duration-300 cursor-pointer"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-base font-semibold font-montserrat text-[#121E3C] mb-2 group-hover:text-[#34D164] transition-colors">{job.title}</h3>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
            {job.department && (
              <span className="flex items-center">
                <Building className="w-3 h-3 mr-1" />
                {job.department}
              </span>
            )}
            {job.location && (
              <span className="flex items-center">
                <MapPin className="w-3 h-3 mr-1" />
                {job.location}
              </span>
            )}
            {job.job_type && (
              <span className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {job.job_type.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 ml-3">
          <span className="bg-[#34D164]/10 text-[#34D164] text-[10px] font-medium px-2 py-0.5 rounded-full">
            Open
          </span>
          {job.is_featured && (
            <span className="bg-amber-50 text-amber-600 text-[10px] font-medium px-2 py-0.5 rounded-full">
              Featured
            </span>
          )}
        </div>
      </div>
      
      <p className="text-gray-500 text-xs font-lato mb-4 line-clamp-2">{job.description}</p>
      
      {job.requirements && job.requirements.length > 0 && (
        <div className="mb-4">
          <ul className="space-y-1">
            {job.requirements.slice(0, 2).map((req, index) => (
              <li key={index} className="text-xs text-gray-500 font-lato flex items-start">
                <CheckCircle className="w-3 h-3 mr-2 mt-0.5 text-[#34D164] flex-shrink-0" />
                {req}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <span className="text-[10px] text-gray-400">
          <Calendar className="w-3 h-3 inline mr-1" />
          {new Date(job.created_at).toLocaleDateString()}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(jobPath);
            }}
            className="border border-[#34D164] text-[#34D164] hover:bg-[#34D164]/10 px-4 py-1.5 rounded-full text-xs font-medium transition-colors"
          >
            View details
          </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setApplicationForm({...applicationForm, position: job.title});
            document.getElementById('application-form').scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-[#34D164] hover:bg-[#2ab854] text-white px-4 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center"
        >
          Apply
          <ArrowRight className="w-3 h-3 ml-1" />
        </button>
        </div>
      </div>
    </div>
  );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-28 lg:pt-32 pb-16 lg:pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/stock/bg5.jpg" 
            alt="" 
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#121E3C]/90 via-[#121E3C]/85 to-[#121E3C]/90" />
        </div>
        
        <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block px-4 py-1.5 mb-5 text-xs font-semibold font-lato tracking-wider uppercase text-[#34D164] bg-white/5 backdrop-blur-sm border border-white/10 rounded-full">
              We're Hiring
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-montserrat text-white mb-4 leading-tight">
              Join Our Mission to Transform Home Improvement
            </h1>
            <p className="text-white/70 font-lato text-sm mb-8 max-w-xl mx-auto">
              We're building Nigeria's most trusted platform connecting homeowners with skilled tradespeople. Join our team of passionate innovators.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={() => document.getElementById('open-positions').scrollIntoView({ behavior: 'smooth' })}
                className="bg-[#34D164] hover:bg-[#2ab854] text-white px-6 py-2.5 text-sm font-medium rounded-full transition-all duration-300 hover:scale-105 flex items-center justify-center"
              >
                View Open Positions
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
              <button 
                onClick={() => document.getElementById('culture').scrollIntoView({ behavior: 'smooth' })}
                className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-6 py-2.5 text-sm font-medium rounded-full hover:bg-white/20 transition-all duration-300"
              >
                Our Culture
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-10 overflow-hidden">
        <div className="absolute inset-0 bg-[#121E3C]" />
        
        <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { value: '10+', label: 'Team Members' },
                { value: platformStats.total_tradespeople.toLocaleString(), label: 'Active Tradespeople' },
                { value: platformStats.total_jobs_completed.toLocaleString(), label: 'Completed Jobs' },
                { value: '15+', label: 'Cities Covered' }
              ].map((stat, idx) => (
                <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center">
                  <div className="text-xl font-bold font-montserrat text-[#34D164] mb-1">{stat.value}</div>
                  <div className="text-white/60 text-xs font-lato">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Company Values */}
      <section 
        id="culture" 
        className="py-14 lg:py-16"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.97), rgba(255,255,255,0.97)), 
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 20px 20px, 20px 20px'
        }}
      >
        <div className="container mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold font-montserrat text-[#121E3C] mb-2">Our Values</h2>
              <p className="text-gray-500 font-lato text-sm max-w-lg mx-auto">
                These values guide everything we do and help us build a company culture where everyone can thrive.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {companyValues.map((value, index) => {
                const IconComponent = value.icon;
                return (
                  <div key={index} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg hover:border-[#34D164]/20 transition-all duration-300">
                    <div className="w-10 h-10 bg-[#34D164]/10 rounded-xl flex items-center justify-center mb-4">
                      <IconComponent className="w-5 h-5 text-[#34D164]" />
                    </div>
                    <h3 className="text-base font-semibold font-montserrat text-[#121E3C] mb-2">{value.title}</h3>
                    <p className="text-gray-500 text-xs font-lato">{value.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative py-14 lg:py-16 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/stock/bg15.jpg" 
            alt="" 
            className="w-full h-full object-cover object-top"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-[#121E3C]/90" />
        </div>
        
        <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold font-montserrat text-white mb-2">Why Work With Us?</h2>
              <p className="text-white/60 font-lato text-sm max-w-lg mx-auto">
                We believe in taking care of our team so they can do their best work.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {benefits.map((benefit, index) => {
                const IconComponent = benefit.icon;
                return (
                  <div key={index} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 bg-[#34D164]/20 rounded-xl flex items-center justify-center">
                        <IconComponent className="w-4 h-4 text-[#34D164]" />
                      </div>
                      <h3 className="text-sm font-semibold font-montserrat text-white">{benefit.title}</h3>
                    </div>
                    <ul className="space-y-2">
                      {benefit.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="text-xs text-white/70 font-lato flex items-start">
                          <CheckCircle className="w-3 h-3 mr-2 mt-0.5 text-[#34D164] flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section 
        id="open-positions" 
        className="py-14 lg:py-16"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.97), rgba(255,255,255,0.97)), 
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 20px 20px, 20px 20px'
        }}
      >
        <div className="container mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold font-montserrat text-[#121E3C] mb-2">Open Positions</h2>
              <p className="text-gray-500 font-lato text-sm mb-6 max-w-lg mx-auto">
                Join our growing team and help shape the future of home improvement.
              </p>
              
              {/* Department Filter */}
              <div className="flex flex-wrap justify-center gap-2">
                {departments.map((dept) => (
                  <button
                    key={dept}
                    onClick={() => setSelectedDepartment(dept)}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 ${
                      selectedDepartment === dept
                        ? 'bg-[#34D164] text-white'
                        : 'bg-white border border-gray-200 text-gray-500 hover:border-[#34D164]/50 hover:text-[#34D164]'
                    }`}
                  >
                    {dept === 'all' ? 'All Departments' : dept}
                  </button>
                ))}
              </div>
            </div>
            
            {loading ? (
              <div className="grid md:grid-cols-2 gap-5">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                    <div className="h-5 bg-gray-100 rounded mb-3 w-3/4"></div>
                    <div className="h-3 bg-gray-100 rounded mb-2 w-1/2"></div>
                    <div className="h-16 bg-gray-100 rounded mb-4"></div>
                    <div className="h-8 bg-gray-100 rounded w-24"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-[#121E3C] mb-2">Error Loading Positions</h3>
                <p className="text-gray-400 text-sm mb-6">{error}</p>
                <button 
                  onClick={loadJobPositions}
                  className="bg-[#34D164] hover:bg-[#2ab854] text-white px-5 py-2 rounded-full text-sm font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : filteredPositions.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-5">
                {filteredPositions.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-[#121E3C] mb-2">No positions available</h3>
                <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
                  {selectedDepartment === 'all' 
                    ? "We're always looking for great talent!"
                    : `No positions in ${selectedDepartment} right now.`
                  }
                </p>
                <button 
                  onClick={() => document.getElementById('application-form').scrollIntoView({ behavior: 'smooth' })}
                  className="bg-[#34D164] hover:bg-[#2ab854] text-white px-5 py-2 rounded-full text-sm font-medium transition-colors"
                >
                  Submit General Application
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section 
        id="application-form" 
        className="py-14 lg:py-16 scroll-mt-28"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.97), rgba(255,255,255,0.97)), 
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 20px 20px, 20px 20px'
        }}
      >
        <div className="container mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold font-montserrat text-[#121E3C] mb-2">Apply to Join Our Team</h2>
              <p className="text-gray-500 font-lato text-sm">
                Don't see the perfect role? Submit a general application.
              </p>
            </div>
            
            <form onSubmit={handleApplicationSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-[#121E3C] mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={applicationForm.name}
                    onChange={(e) => setApplicationForm({...applicationForm, name: e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/20 focus:border-[#34D164]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#121E3C] mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    value={applicationForm.email}
                    onChange={(e) => setApplicationForm({...applicationForm, email: e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/20 focus:border-[#34D164]"
                    required
                  />
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-[#121E3C] mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={applicationForm.phone}
                    onChange={(e) => setApplicationForm({...applicationForm, phone: e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/20 focus:border-[#34D164]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#121E3C] mb-1.5">Position of Interest</label>
                  <select
                    value={applicationForm.position}
                    onChange={(e) => setApplicationForm({...applicationForm, position: e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/20 focus:border-[#34D164]"
                  >
                    <option value="">Select a position</option>
                    <option value="General Application">General Application</option>
                    {openPositions.map((job) => (
                      <option key={job.id} value={job.title}>{job.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-xs font-medium text-[#121E3C] mb-1.5">Years of Experience</label>
                <select
                  value={applicationForm.experience}
                  onChange={(e) => setApplicationForm({...applicationForm, experience: e.target.value})}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/20 focus:border-[#34D164]"
                >
                  <option value="">Select experience level</option>
                  <option value="0-1 years">0-1 years</option>
                  <option value="1-3 years">1-3 years</option>
                  <option value="3-5 years">3-5 years</option>
                  <option value="5-10 years">5-10 years</option>
                  <option value="10+ years">10+ years</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-xs font-medium text-[#121E3C] mb-1.5">Why do you want to join ServiceHub? *</label>
                <textarea
                  value={applicationForm.message}
                  onChange={(e) => setApplicationForm({...applicationForm, message: e.target.value})}
                  rows="3"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/20 focus:border-[#34D164] resize-none"
                  placeholder="Tell us about your interest..."
                  required
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-xs font-medium text-[#121E3C] mb-1.5">Resume/CV</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,image/*"
                  onChange={(e) => setApplicationForm({...applicationForm, resume: e.target.files?.[0] || null})}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/20 focus:border-[#34D164] file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-gray-100 file:text-gray-600"
                />
                <p className="text-[10px] text-gray-400 mt-1">PDF, DOC, DOCX, or image file (max 5MB)</p>
              </div>
              
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#34D164] hover:bg-[#2ab854] text-white px-6 py-2.5 rounded-full text-sm font-medium transition-colors flex items-center justify-center disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4 mr-2" />
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="relative py-14 lg:py-16 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/stock/bg15.jpg" 
            alt="" 
            className="w-full h-full object-cover object-top"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-[#121E3C]/90" />
        </div>
        
        <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-xl sm:text-2xl font-semibold font-montserrat text-white mb-3">Questions About Working With Us?</h2>
            <p className="text-white/60 font-lato text-sm mb-8">
              Reach out to our People team for any questions about careers at ServiceHub.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4 max-w-lg mx-auto">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-[#34D164]/20 rounded-xl flex items-center justify-center">
                  <Mail className="w-4 h-4 text-[#34D164]" />
                </div>
                <div className="text-left">
                  <div className="text-white/50 text-[10px]">Email Us</div>
                  <a href="mailto:careers@servicehub.co" className="text-white text-xs font-medium hover:text-[#34D164] transition-colors">
                    careers@servicehub.co
                  </a>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-[#34D164]/20 rounded-xl flex items-center justify-center">
                  <Phone className="w-4 h-4 text-[#34D164]" />
                </div>
                <div className="text-left">
                  <div className="text-white/50 text-[10px]">Call Us</div>
                  <a href="tel:+2348141831420" className="text-white text-xs font-medium hover:text-[#34D164] transition-colors">
                    +234 814 183 1420
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default CareersPage;
