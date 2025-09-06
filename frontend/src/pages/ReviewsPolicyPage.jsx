import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
      <section className="py-12 bg-gradient-to-r from-blue-50 to-green-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText size={32} style={{color: '#2F8140'}} />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
              Reviews & Ratings Policy
            </h1>
            <p className="text-xl text-gray-600 font-lato">
              Building trust through transparent and fair review practices
            </p>
          </div>
        </div>
      </section>

      {/* Policy Highlights */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold font-montserrat text-center mb-8" style={{color: '#121E3C'}}>
              Our Review System Principles
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {policyHighlights.map((highlight, index) => (
                <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <highlight.icon size={24} style={{color: '#2F8140'}} />
                    </div>
                    <h3 className="font-semibold font-montserrat mb-2" style={{color: '#121E3C'}}>
                      {highlight.title}
                    </h3>
                    <p className="text-sm text-gray-600 font-lato">
                      {highlight.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Policy Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Introduction */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold font-montserrat flex items-center" style={{color: '#121E3C'}}>
                  <MessageCircle className="mr-3" size={28} style={{color: '#2F8140'}} />
                  Introduction
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-lg max-w-none">
                <p className="text-gray-700 font-lato text-lg leading-relaxed">
                  At ServiceHub, we believe that <strong>trust and transparency</strong> are the foundation of a reliable service marketplace. Reviews and ratings allow homeowners to make informed choices and help skilled tradespeople showcase their professionalism.
                </p>
              </CardContent>
            </Card>

            {/* Review Guidelines for Homeowners */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold font-montserrat flex items-center" style={{color: '#121E3C'}}>
                  <Users className="mr-3" size={28} style={{color: '#2F8140'}} />
                  Review Guidelines for Homeowners
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-gray-700 font-lato text-lg leading-relaxed">
                  We encourage homeowners to submit reviews to build a reliable foundation for future users when looking to hire a tradesperson - in turn, reviews are a great way to help reliable tradespeople win more work.
                </p>

                {/* When Can Homeowners Leave a Review */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold font-montserrat mb-4" style={{color: '#121E3C'}}>
                    When Can Homeowners Leave a Review?
                  </h3>
                  <p className="text-gray-700 font-lato mb-4">
                    You may leave a review for any tradesperson you have hired via ServiceHub, provided that:
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start space-x-3">
                      <CheckCircle size={20} className="text-green-500 mt-1" />
                      <span className="text-gray-700 font-lato">The work has started, or</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle size={20} className="text-green-500 mt-1" />
                      <span className="text-gray-700 font-lato">You have paid a deposit or part-payment.</span>
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 font-lato">
                      <strong>Note:</strong> If you have not reached this stage but need to report a negative experience, please use our Contact Support form.
                    </p>
                  </div>
                </div>

                {/* What to Include */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold font-montserrat mb-4" style={{color: '#121E3C'}}>
                    What to Include in a Review
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <Star size={18} className="text-green-500 mt-1" />
                      <span className="text-gray-700 font-lato">A star rating (1–5)</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Star size={18} className="text-green-500 mt-1" />
                      <span className="text-gray-700 font-lato">Feedback on the work completed</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Star size={18} className="text-green-500 mt-1" />
                      <span className="text-gray-700 font-lato">Professionalism and communication of the tradesperson</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Star size={18} className="text-green-500 mt-1" />
                      <span className="text-gray-700 font-lato">Constructive comments that help others make informed decisions</span>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-white border border-green-300 rounded-lg">
                    <h4 className="font-semibold font-montserrat mb-3 text-green-800">Reviews must:</h4>
                    <ul className="space-y-2">
                      <li className="flex items-start space-x-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full mt-2"></span>
                        <span className="text-gray-700 font-lato">Be limited to 1000 characters</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full mt-2"></span>
                        <span className="text-gray-700 font-lato">Be respectful and free from offensive or abusive language</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full mt-2"></span>
                        <span className="text-gray-700 font-lato">Avoid false or misleading statements</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full mt-2"></span>
                        <span className="text-gray-700 font-lato">Not be influenced by incentives. If you are offered money or discounts in exchange for a review, please report it immediately</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* What Not to Include */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold font-montserrat mb-4" style={{color: '#121E3C'}}>
                    What Not to Include in a Review
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle size={18} className="text-red-500 mt-1" />
                      <span className="text-gray-700 font-lato">False, inaccurate, or misleading statements</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <AlertTriangle size={18} className="text-red-500 mt-1" />
                      <span className="text-gray-700 font-lato">Personal or private information (phone numbers, addresses, full names)</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <AlertTriangle size={18} className="text-red-500 mt-1" />
                      <span className="text-gray-700 font-lato">Offensive, vulgar, racist, or derogatory language</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <AlertTriangle size={18} className="text-red-500 mt-1" />
                      <span className="text-gray-700 font-lato">Links, ads, or promotional content</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Review Removal Policy */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold font-montserrat flex items-center" style={{color: '#121E3C'}}>
                  <Shield className="mr-3" size={28} style={{color: '#2F8140'}} />
                  When Will ServiceHub Remove a Review?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 font-lato text-lg leading-relaxed">
                  We publish all genuine reviews that follow this policy. However, reviews may be removed if:
                </p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <span className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      </span>
                      <span className="text-gray-700 font-lato">No work has started and no payment was made</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      </span>
                      <span className="text-gray-700 font-lato">The review does not relate to an authentic job on ServiceHub</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      </span>
                      <span className="text-gray-700 font-lato">It contains personal/private information</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      </span>
                      <span className="text-gray-700 font-lato">It is offensive, hateful, or illegal</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <span className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      </span>
                      <span className="text-gray-700 font-lato">It is proven to be fake, incentivized, or misleading</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      </span>
                      <span className="text-gray-700 font-lato">It violates ServiceHub's Terms & Conditions</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      </span>
                      <span className="text-gray-700 font-lato">The homeowner requests removal</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      </span>
                      <span className="text-gray-700 font-lato">A valid legal or court order is received</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Review Management */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold font-montserrat flex items-center" style={{color: '#121E3C'}}>
                  <FileText className="mr-3" size={28} style={{color: '#2F8140'}} />
                  Review Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold font-montserrat mb-4" style={{color: '#121E3C'}}>
                    Can a Review Be Edited or Deleted?
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <CheckCircle size={20} className="text-green-500 mt-1" />
                      <span className="text-gray-700 font-lato">Homeowners can edit reviews directly in their ServiceHub account</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle size={20} className="text-green-500 mt-1" />
                      <span className="text-gray-700 font-lato">To delete a review, you must contact ServiceHub Support</span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold font-montserrat mb-4" style={{color: '#121E3C'}}>
                    How ServiceHub Processes Reviews
                  </h3>
                  <div className="space-y-4">
                    <p className="text-gray-700 font-lato">Reviews can only be submitted if:</p>
                    <ol className="space-y-2 pl-4">
                      <li className="flex items-start space-x-3">
                        <span className="text-green-600 font-bold">1.</span>
                        <span className="text-gray-700 font-lato">They are linked to a job posted and hired through ServiceHub</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <span className="text-green-600 font-bold">2.</span>
                        <span className="text-gray-700 font-lato">The tradesperson was hired via our platform</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <span className="text-green-600 font-bold">3.</span>
                        <span className="text-gray-700 font-lato">The homeowner is logged into their ServiceHub account</span>
                      </li>
                    </ol>
                    
                    <div className="mt-6 space-y-2 text-gray-700 font-lato">
                      <p>• Negative reviews are investigated but not removed unless they breach this policy</p>
                      <p>• Tradespeople may request up to 5 verified reviews from external clients (outside ServiceHub). These require invoice proof before publication</p>
                      <p>• We monitor for false, fake, or misleading reviews and may suspend accounts involved</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Guidelines for Tradespeople */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold font-montserrat flex items-center" style={{color: '#121E3C'}}>
                  <Users className="mr-3" size={28} style={{color: '#2F8140'}} />
                  Review Guidelines for Tradespeople
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-gray-700 font-lato text-lg leading-relaxed">
                  Tradespeople are encouraged to respond to reviews. Responses help build trust with future customers.
                </p>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold font-montserrat mb-4" style={{color: '#121E3C'}}>
                    When responding, tradespeople must:
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <CheckCircle size={18} className="text-purple-500 mt-1" />
                      <span className="text-gray-700 font-lato">Remain professional, factual, and constructive</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle size={18} className="text-purple-500 mt-1" />
                      <span className="text-gray-700 font-lato">Avoid accusatory or offensive language</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle size={18} className="text-purple-500 mt-1" />
                      <span className="text-gray-700 font-lato">Not reveal personal details of homeowners</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle size={18} className="text-purple-500 mt-1" />
                      <span className="text-gray-700 font-lato">Not threaten, intimidate, or retaliate</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle size={18} className="text-purple-500 mt-1" />
                      <span className="text-gray-700 font-lato">Not post promotional links or material</span>
                    </div>
                  </div>
                  
                  <p className="mt-4 text-sm text-purple-800 font-lato">
                    ServiceHub reserves the right to remove any response that breaches these rules.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Disputes and Conclusion */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl font-bold font-montserrat flex items-center" style={{color: '#121E3C'}}>
                    <Scale className="mr-3" size={24} style={{color: '#2F8140'}} />
                    Disputes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 font-lato leading-relaxed">
                    If either party disputes a review or response, they should contact ServiceHub Support. We will review and decide fairly based on our Terms & Conditions and this policy.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl font-bold font-montserrat flex items-center" style={{color: '#121E3C'}}>
                    <Clock className="mr-3" size={24} style={{color: '#2F8140'}} />
                    Policy Purpose
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 font-lato leading-relaxed">
                    This Reviews Policy protects the integrity of feedback on ServiceHub. By following these rules, we ensure fairness, accountability, and trust for homeowners and tradespeople alike.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Effective Date */}
            <Card className="border-0 shadow-lg bg-gradient-to-r from-green-50 to-blue-50">
              <CardContent className="p-8 text-center">
                <h3 className="text-2xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
                  Policy Effective Date
                </h3>
                <p className="text-xl font-lato text-gray-700">
                  <strong>Effective from 1 January 2026</strong>
                </p>
                <p className="text-sm font-lato text-gray-600 mt-2">
                  This policy may be updated from time to time. Users will be notified of significant changes.
                </p>
              </CardContent>
            </Card>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ReviewsPolicyPage;