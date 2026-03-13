import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { 
  Shield, 
  Star, 
  CheckCircle, 
  AlertTriangle, 
  MessageCircle, 
  FileText,
  Users,
  Clock,
  Scale
} from 'lucide-react';

const ReviewsPolicyPage = () => {
  const policyHighlights = [
    {
      icon: Star,
      title: "Fair Rating System",
      description: "1-5 star ratings with authentic feedback from verified users"
    },
    {
      icon: Shield,
      title: "Verified Reviews Only",
      description: "Reviews only from genuine job completions on our platform"
    },
    {
      icon: Users,
      title: "Mutual Respect",
      description: "Professional guidelines for both homeowners and tradespeople"
    },
    {
      icon: Scale,
      title: "Fair Dispute Resolution",
      description: "Balanced approach to handling review disputes"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-28 lg:pt-32 pb-14 lg:pb-16 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/stock/bg9.jpg" 
            alt="" 
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#121E3C]/90 via-[#121E3C]/85 to-[#121E3C]/90" />
        </div>
        
        <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <FileText size={24} className="text-[#34D164]" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-montserrat text-white mb-3">
              Reviews & Ratings Policy
            </h1>
            <p className="text-white/70 font-lato text-sm max-w-lg mx-auto">
              Building trust through transparent and fair review practices
            </p>
          </div>
        </div>
      </section>

      {/* Policy Highlights */}
      <section className="relative py-10 overflow-hidden">
        <div className="absolute inset-0 bg-[#121E3C]" />
        
        <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-base font-semibold font-montserrat text-white text-center mb-6">
              Our Review System Principles
            </h2>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {policyHighlights.map((highlight, index) => (
                <div key={index} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-center hover:bg-white/10 transition-all duration-300">
                  <div className="w-10 h-10 bg-[#34D164]/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <highlight.icon size={18} className="text-[#34D164]" />
                  </div>
                  <h3 className="text-sm font-semibold font-montserrat text-white mb-1">
                    {highlight.title}
                  </h3>
                  <p className="text-[10px] text-white/60 font-lato">
                    {highlight.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Policy Content */}
      <section 
        className="py-12 lg:py-14"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.97), rgba(255,255,255,0.97)), 
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 20px 20px, 20px 20px'
        }}
      >
        <div className="container mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-3xl mx-auto space-y-6">
            
            {/* Introduction */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#34D164]/10 rounded-xl flex items-center justify-center">
                  <MessageCircle size={18} className="text-[#34D164]" />
                </div>
                <h2 className="text-lg font-semibold font-montserrat text-[#121E3C]">Introduction</h2>
              </div>
              <p className="text-gray-600 font-lato text-sm sm:text-base leading-relaxed">
                At ServiceHub, we believe that <strong className="text-[#121E3C]">trust and transparency</strong> are the foundation of a reliable service marketplace. Reviews and ratings allow homeowners to make informed choices and help skilled tradespeople showcase their professionalism.
              </p>
            </div>

            {/* Review Guidelines for Homeowners */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#34D164]/10 rounded-xl flex items-center justify-center">
                  <Users size={18} className="text-[#34D164]" />
                </div>
                <h2 className="text-lg font-semibold font-montserrat text-[#121E3C]">Review Guidelines for Homeowners</h2>
              </div>
              
              <p className="text-gray-600 font-lato text-sm sm:text-base leading-relaxed mb-5">
                We encourage homeowners to submit reviews to build a reliable foundation for future users when looking to hire a tradesperson.
              </p>

              {/* When Can Homeowners Leave a Review */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-5 mb-4">
                <h3 className="text-sm font-semibold font-montserrat text-[#121E3C] mb-3">
                  When Can Homeowners Leave a Review?
                </h3>
                <p className="text-gray-600 font-lato text-sm mb-3">
                  You may leave a review for any tradesperson you have hired via ServiceHub, provided that:
                </p>
                <div className="space-y-2">
                  {['The work has started', 'You have paid a deposit or part-payment'].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle size={14} className="text-[#34D164] mt-0.5 shrink-0" />
                      <span className="text-gray-600 font-lato text-sm sm:text-base">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <p className="text-xs text-amber-700 font-lato">
                    <strong>Note:</strong> If you have not reached this stage but need to report a negative experience, please use our Contact Support form.
                  </p>
                </div>
              </div>

              {/* What to Include */}
              <div className="bg-[#34D164]/5 border border-[#34D164]/10 rounded-xl px-4 py-5 mb-4">
                <h3 className="text-sm font-semibold font-montserrat text-[#121E3C] mb-3">
                  What to Include in a Review
                </h3>
                <div className="space-y-2 mb-4">
                  {[
                    'A star rating (1–5)',
                    'Feedback on the work completed',
                    'Professionalism and communication of the tradesperson',
                    'Constructive comments that help others make informed decisions'
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Star size={12} className="text-[#34D164] mt-0.5 shrink-0" />
                      <span className="text-gray-600 font-lato text-sm sm:text-base">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-white border border-[#34D164]/20 rounded-lg">
                  <h4 className="text-xs font-semibold font-montserrat text-[#34D164] mb-2">Reviews must:</h4>
                  <ul className="space-y-1.5">
                    {[
                      'Be limited to 1000 characters',
                      'Be respectful and free from offensive or abusive language',
                      'Avoid false or misleading statements',
                      'Not be influenced by incentives'
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-[#34D164] rounded-full mt-1.5 shrink-0"></span>
                        <span className="text-gray-600 font-lato text-sm sm:text-base">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* What Not to Include */}
              <div className="bg-red-50/50 border border-red-100 rounded-xl px-4 py-5">
                <h3 className="text-sm font-semibold font-montserrat text-[#121E3C] mb-3">
                  What Not to Include in a Review
                </h3>
                <div className="space-y-2">
                  {[
                    'False, inaccurate, or misleading statements',
                    'Personal or private information (phone numbers, addresses, full names)',
                    'Offensive, vulgar, racist, or derogatory language',
                    'Links, ads, or promotional content'
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <AlertTriangle size={12} className="text-red-400 mt-0.5 shrink-0" />
                      <span className="text-gray-600 font-lato text-sm sm:text-base">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Review Removal Policy */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#34D164]/10 rounded-xl flex items-center justify-center">
                  <Shield size={18} className="text-[#34D164]" />
                </div>
                <h2 className="text-lg font-semibold font-montserrat text-[#121E3C]">When Will ServiceHub Remove a Review?</h2>
              </div>
              
              <p className="text-gray-600 font-lato text-sm sm:text-base mb-4">
                We publish all genuine reviews that follow this policy. However, reviews may be removed if:
              </p>
              
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  'No work has started and no payment was made',
                  'The review does not relate to an authentic job',
                  'It contains personal/private information',
                  'It is offensive, hateful, or illegal',
                  'It is proven to be fake or misleading',
                  'It violates ServiceHub\'s Terms & Conditions',
                  'The homeowner requests removal',
                  'A valid legal or court order is received'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-red-50 rounded-full flex items-center justify-center mt-0.5 shrink-0">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                    </span>
                    <span className="text-gray-600 font-lato text-sm sm:text-base">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Review Management */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#34D164]/10 rounded-xl flex items-center justify-center">
                  <FileText size={18} className="text-[#34D164]" />
                </div>
                <h2 className="text-lg font-semibold font-montserrat text-[#121E3C]">Review Management</h2>
              </div>
              
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-5 mb-4">
                <h3 className="text-sm font-semibold font-montserrat text-[#121E3C] mb-3">
                  Can a Review Be Edited or Deleted?
                </h3>
                <div className="space-y-2">
                  {[
                    'Homeowners can edit reviews directly in their ServiceHub account',
                    'To delete a review, you must contact ServiceHub Support'
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle size={14} className="text-[#34D164] mt-0.5 shrink-0" />
                      <span className="text-gray-600 font-lato text-sm sm:text-base">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#34D164]/5 border border-[#34D164]/10 rounded-xl px-4 py-5">
                <h3 className="text-sm font-semibold font-montserrat text-[#121E3C] mb-3">
                  How ServiceHub Processes Reviews
                </h3>
                <p className="text-gray-600 font-lato text-sm mb-3">Reviews can only be submitted if:</p>
                <ol className="space-y-2 mb-4">
                  {[
                    'They are linked to a job posted and hired through ServiceHub',
                    'The tradesperson was hired via our platform',
                    'The homeowner is logged into their ServiceHub account'
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[#34D164] font-bold text-xs">{idx + 1}.</span>
                      <span className="text-gray-600 font-lato text-sm sm:text-base">{item}</span>
                    </li>
                  ))}
                </ol>
                
                <div className="space-y-1.5 text-gray-500 font-lato text-xs">
                  <p>• Negative reviews are investigated but not removed unless they breach this policy</p>
                  <p>• Tradespeople may request up to 5 verified reviews from external clients</p>
                  <p>• We monitor for false or misleading reviews and may suspend accounts involved</p>
                </div>
              </div>
            </div>

            {/* Guidelines for Tradespeople */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#34D164]/10 rounded-xl flex items-center justify-center">
                  <Users size={18} className="text-[#34D164]" />
                </div>
                <h2 className="text-lg font-semibold font-montserrat text-[#121E3C]">Review Guidelines for Tradespeople</h2>
              </div>
              
              <p className="text-gray-600 font-lato text-sm mb-4">
                Tradespeople are encouraged to respond to reviews. Responses help build trust with future customers.
              </p>

              <div className="bg-purple-50/50 border border-purple-100 rounded-xl px-4 py-5">
                <h3 className="text-sm font-semibold font-montserrat text-[#121E3C] mb-3">
                  When responding, tradespeople must:
                </h3>
                <div className="space-y-2">
                  {[
                    'Remain professional, factual, and constructive',
                    'Avoid accusatory or offensive language',
                    'Not reveal personal details of homeowners',
                    'Not threaten, intimidate, or retaliate',
                    'Not post promotional links or material'
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle size={12} className="text-purple-400 mt-0.5 shrink-0" />
                      <span className="text-gray-600 font-lato text-sm sm:text-base">{item}</span>
                    </div>
                  ))}
                </div>
                
                <p className="mt-4 text-[10px] text-purple-600 font-lato">
                  ServiceHub reserves the right to remove any response that breaches these rules.
                </p>
              </div>
            </div>

            {/* Disputes and Policy Purpose */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-[#34D164]/10 rounded-lg flex items-center justify-center">
                    <Scale size={14} className="text-[#34D164]" />
                  </div>
                  <h3 className="text-sm font-semibold font-montserrat text-[#121E3C]">Disputes</h3>
                </div>
                <p className="text-gray-600 font-lato text-xs leading-relaxed">
                  If either party disputes a review or response, they should contact ServiceHub Support. We will review and decide fairly based on our Terms & Conditions.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-[#34D164]/10 rounded-lg flex items-center justify-center">
                    <Clock size={14} className="text-[#34D164]" />
                  </div>
                  <h3 className="text-sm font-semibold font-montserrat text-[#121E3C]">Policy Purpose</h3>
                </div>
                <p className="text-gray-600 font-lato text-xs leading-relaxed">
                  This Reviews Policy protects the integrity of feedback on ServiceHub, ensuring fairness, accountability, and trust for all users.
                </p>
              </div>
            </div>

            {/* Effective Date */}
            <div className="bg-[#121E3C] rounded-2xl p-6 text-center">
              <h3 className="text-base font-semibold font-montserrat text-white mb-2">
                Policy Effective Date
              </h3>
              <p className="text-[#34D164] font-lato text-sm font-medium">
                Effective from 1 January 2026
              </p>
              <p className="text-white/50 font-lato text-xs mt-2">
                This policy may be updated from time to time. Users will be notified of significant changes.
              </p>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ReviewsPolicyPage;
