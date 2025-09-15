import React, { useState, useEffect } from 'react';
import { 
  Briefcase, MapPin, Clock, Users, Heart, TrendingUp, 
  Award, Coffee, Laptop, Globe, Mail, Phone, Send,
  ChevronRight, Star, Building, Target, Zap, Shield,
  ArrowRight, CheckCircle, User, Calendar, AlertCircle
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import careersAPI from '../api/careers';

const CareersPage = () => {
  const [openPositions, setOpenPositions] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [departments, setDepartments] = useState(['all']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
      icon: Laptop,
      title: 'Tech & Tools',
      items: ['Latest MacBook/PC', 'Home office setup', 'Software subscriptions', 'Tech allowance']
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
  }, []);

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
      
      // For general applications, we'll use a placeholder job ID
      // In a real implementation, you might have a specific endpoint for general applications
      const applicationData = {
        name: applicationForm.name,
        email: applicationForm.email,
        phone: applicationForm.phone || undefined,
        experience_level: applicationForm.experience || undefined,
        message: applicationForm.message,
        resume_filename: applicationForm.resume?.name || undefined
      };

      // If a specific position is selected, find that job and apply
      if (applicationForm.position && applicationForm.position !== 'General Application') {
        const selectedJob = openPositions.find(job => job.title === applicationForm.position);
        if (selectedJob) {
          await careersAPI.applyToJob(selectedJob.id, applicationData);
        }
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
      alert('Failed to submit application. Please try again or contact us directly.');
    } finally {
      setSubmitting(false);
    }
  };

  const JobCard = ({ job }) => (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{job.title}</h3>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center">
              <Building className="w-4 h-4 mr-1" />
              {job.department}
            </span>
            <span className="flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              {job.location}
            </span>
            <span className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {job.type}
            </span>
            <span className="flex items-center">
              <User className="w-4 h-4 mr-1" />
              {job.experience}
            </span>
          </div>
        </div>
        <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
          Open
        </span>
      </div>
      
      <p className="text-gray-700 mb-4 line-clamp-3">{job.description}</p>
      
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Key Requirements:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          {job.requirements.slice(0, 3).map((req, index) => (
            <li key={index} className="flex items-start">
              <CheckCircle className="w-3 h-3 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
              {req}
            </li>
          ))}
          {job.requirements.length > 3 && (
            <li className="text-green-600 text-xs">+{job.requirements.length - 3} more requirements</li>
          )}
        </ul>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {job.benefits.slice(0, 3).map((benefit, index) => (
          <span key={index} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded">
            {benefit}
          </span>
        ))}
      </div>
      
      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <span className="text-xs text-gray-500">
          <Calendar className="w-3 h-3 inline mr-1" />
          Posted {new Date(job.posted).toLocaleDateString()}
        </span>
        <button 
          onClick={() => setApplicationForm({...applicationForm, position: job.title})}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
        >
          Apply Now
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-600 to-green-800 text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Join Our Mission to Transform Home Improvement in Nigeria
            </h1>
            <p className="text-xl text-green-100 mb-8 max-w-3xl mx-auto">
              We're building Nigeria's most trusted platform connecting homeowners with skilled tradespeople. 
              Join our team of passionate innovators making home improvement accessible to everyone.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => document.getElementById('open-positions').scrollIntoView({ behavior: 'smooth' })}
                className="bg-white text-green-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center"
              >
                View Open Positions
                <ChevronRight className="w-5 h-5 ml-2" />
              </button>
              <button 
                onClick={() => document.getElementById('culture').scrollIntoView({ behavior: 'smooth' })}
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-green-600 transition-colors"
              >
                Learn About Our Culture
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-green-600 mb-2">50+</div>
                <div className="text-gray-600">Team Members</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600 mb-2">10,000+</div>
                <div className="text-gray-600">Active Tradespeople</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600 mb-2">25,000+</div>
                <div className="text-gray-600">Completed Jobs</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600 mb-2">15+</div>
                <div className="text-gray-600">Cities Covered</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Company Values */}
      <section id="culture" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Values</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                These values guide everything we do and help us build a company culture where everyone can thrive.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {companyValues.map((value, index) => {
                const IconComponent = value.icon;
                return (
                  <div key={index} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                      <IconComponent className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">{value.title}</h3>
                    <p className="text-gray-600">{value.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Work With Us?</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                We believe in taking care of our team so they can do their best work and enjoy a fulfilling career.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => {
                const IconComponent = benefit.icon;
                return (
                  <div key={index} className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                        <IconComponent className="w-5 h-5 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{benefit.title}</h3>
                    </div>
                    <ul className="space-y-2">
                      {benefit.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="text-sm text-gray-600 flex items-start">
                          <Star className="w-3 h-3 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
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
      <section id="open-positions" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Open Positions</h2>
              <p className="text-xl text-gray-600 mb-8">
                Join our growing team and help shape the future of home improvement in Nigeria.
              </p>
              
              {/* Department Filter */}
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {departments.map((dept) => (
                  <button
                    key={dept}
                    onClick={() => setSelectedDepartment(dept)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedDepartment === dept
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {dept === 'all' ? 'All Departments' : dept}
                  </button>
                ))}
              </div>
            </div>
            
            {loading ? (
              <div className="grid md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded mb-4"></div>
                    <div className="h-20 bg-gray-200 rounded mb-4"></div>
                    <div className="flex justify-between">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                      <div className="h-8 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPositions.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {filteredPositions.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No positions available</h3>
                <p className="text-gray-500 mb-6">
                  {selectedDepartment === 'all' 
                    ? 'We don\'t have any open positions at the moment, but we\'re always looking for great talent!'
                    : `No positions available in ${selectedDepartment} department right now.`
                  }
                </p>
                <button 
                  onClick={() => document.getElementById('application-form').scrollIntoView({ behavior: 'smooth' })}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Submit General Application
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section id="application-form" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Apply to Join Our Team</h2>
              <p className="text-xl text-gray-600">
                Don't see the perfect role? Submit a general application and we'll reach out when something fits.
              </p>
            </div>
            
            <form onSubmit={handleApplicationSubmit} className="bg-gray-50 rounded-lg p-8">
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={applicationForm.name}
                    onChange={(e) => setApplicationForm({...applicationForm, name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                  <input
                    type="email"
                    value={applicationForm.email}
                    onChange={(e) => setApplicationForm({...applicationForm, email: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={applicationForm.phone}
                    onChange={(e) => setApplicationForm({...applicationForm, phone: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Position of Interest</label>
                  <select
                    value={applicationForm.position}
                    onChange={(e) => setApplicationForm({...applicationForm, position: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select a position</option>
                    <option value="General Application">General Application</option>
                    {jobPositions.map((job) => (
                      <option key={job.id} value={job.title}>{job.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
                <select
                  value={applicationForm.experience}
                  onChange={(e) => setApplicationForm({...applicationForm, experience: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select experience level</option>
                  <option value="0-1 years">0-1 years</option>
                  <option value="1-3 years">1-3 years</option>
                  <option value="3-5 years">3-5 years</option>
                  <option value="5-10 years">5-10 years</option>
                  <option value="10+ years">10+ years</option>
                </select>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Why do you want to join ServiceHub? *</label>
                <textarea
                  value={applicationForm.message}
                  onChange={(e) => setApplicationForm({...applicationForm, message: e.target.value})}
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Tell us about your interest in ServiceHub and what you'd bring to our team..."
                  required
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Resume/CV</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setApplicationForm({...applicationForm, resume: e.target.files[0]})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <p className="text-sm text-gray-500 mt-1">PDF, DOC, or DOCX files only (max 5MB)</p>
              </div>
              
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
              >
                <Send className="w-5 h-5 mr-2" />
                Submit Application
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Questions About Working With Us?</h2>
            <p className="text-xl text-gray-300 mb-8">
              We'd love to hear from you. Reach out to our People team for any questions about careers at ServiceHub.
            </p>
            
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="flex items-center justify-center">
                <Mail className="w-6 h-6 mr-3 text-green-400" />
                <div className="text-left">
                  <div className="font-semibold">Email Us</div>
                  <a href="mailto:careers@servicehub.co" className="text-green-400 hover:text-green-300">
                    careers@servicehub.co
                  </a>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <Phone className="w-6 h-6 mr-3 text-green-400" />
                <div className="text-left">
                  <div className="font-semibold">Call Us</div>
                  <a href="tel:+234-800-SERVICE" className="text-green-400 hover:text-green-300">
                    +234-800-SERVICE
                  </a>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center space-x-6">
              <a href="#" className="text-gray-400 hover:text-green-400 transition-colors">
                <Globe className="w-6 h-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-green-400 transition-colors">
                <Users className="w-6 h-6" />
              </a>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default CareersPage;