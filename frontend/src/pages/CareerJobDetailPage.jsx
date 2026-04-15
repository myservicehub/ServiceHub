import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  MapPin
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import careersAPI from '../api/careers';

const toArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return [String(value)];
};

const CareerJobDetailPage = () => {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const decodedSlug = decodeURIComponent(slug);
        const response = await careersAPI.getJobBySlug(decodedSlug);
        setJob(response?.job_posting || null);
      } catch (err) {
        console.error('Error loading career detail:', err);
        setError('We could not load this position right now.');
        setJob(null);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      load();
    } else {
      setLoading(false);
      setError('Invalid job link.');
    }
  }, [slug]);

  const createdDate = useMemo(() => {
    if (!job?.created_at) return '';
    return new Date(job.created_at).toLocaleDateString();
  }, [job?.created_at]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-24 sm:pt-28 pb-16">
        <div className="container mx-auto px-6 md:px-8 lg:px-12 max-w-4xl">
          <button
            onClick={() => navigate('/careers')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-[#34D164] transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to careers
          </button>

          {loading && (
            <div className="bg-white border border-gray-100 rounded-2xl p-8 animate-pulse">
              <div className="h-7 bg-gray-100 rounded w-2/3 mb-4"></div>
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-8"></div>
              <div className="h-40 bg-gray-100 rounded"></div>
            </div>
          )}

          {!loading && error && (
            <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
              <h1 className="text-xl font-semibold text-[#121E3C] mb-2">Unable to open this position</h1>
              <p className="text-gray-500 mb-6">{error}</p>
              <button
                onClick={() => navigate('/careers')}
                className="bg-[#34D164] hover:bg-[#2ab854] text-white px-5 py-2 rounded-full text-sm font-medium"
              >
                View all positions
              </button>
            </div>
          )}

          {!loading && !error && job && (
            <article className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <h1 className="text-2xl md:text-3xl font-bold text-[#121E3C]">{job.title}</h1>
                <span className="bg-[#34D164]/10 text-[#34D164] text-xs font-semibold px-3 py-1 rounded-full">
                  Open
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6">
                {job.department && (
                  <span className="inline-flex items-center">
                    <Building className="w-4 h-4 mr-1.5" />
                    {job.department}
                  </span>
                )}
                {job.location && (
                  <span className="inline-flex items-center">
                    <MapPin className="w-4 h-4 mr-1.5" />
                    {job.location}
                  </span>
                )}
                {job.job_type && (
                  <span className="inline-flex items-center">
                    <Briefcase className="w-4 h-4 mr-1.5" />
                    {job.job_type.replace('_', ' ')}
                  </span>
                )}
                {createdDate && (
                  <span className="inline-flex items-center">
                    <Calendar className="w-4 h-4 mr-1.5" />
                    Posted {createdDate}
                  </span>
                )}
                {job.expires_at && (
                  <span className="inline-flex items-center">
                    <Clock className="w-4 h-4 mr-1.5" />
                    Expires {new Date(job.expires_at).toLocaleDateString()}
                  </span>
                )}
              </div>

              <section className="mb-8">
                <h2 className="text-lg font-semibold text-[#121E3C] mb-3">Full role description</h2>
                <p className="text-gray-700 whitespace-pre-line leading-relaxed">{job.description}</p>
              </section>

              {toArray(job.responsibilities).length > 0 && (
                <section className="mb-8">
                  <h2 className="text-lg font-semibold text-[#121E3C] mb-3">Responsibilities</h2>
                  <ul className="space-y-2">
                    {toArray(job.responsibilities).map((item, idx) => (
                      <li key={`responsibility-${idx}`} className="text-gray-700 flex items-start">
                        <CheckCircle className="w-4 h-4 text-[#34D164] mr-2 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {toArray(job.requirements).length > 0 && (
                <section className="mb-8">
                  <h2 className="text-lg font-semibold text-[#121E3C] mb-3">Requirements</h2>
                  <ul className="space-y-2">
                    {toArray(job.requirements).map((item, idx) => (
                      <li key={`requirement-${idx}`} className="text-gray-700 flex items-start">
                        <CheckCircle className="w-4 h-4 text-[#34D164] mr-2 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {toArray(job.benefits).length > 0 && (
                <section className="mb-8">
                  <h2 className="text-lg font-semibold text-[#121E3C] mb-3">Benefits</h2>
                  <ul className="space-y-2">
                    {toArray(job.benefits).map((item, idx) => (
                      <li key={`benefit-${idx}`} className="text-gray-700 flex items-start">
                        <CheckCircle className="w-4 h-4 text-[#34D164] mr-2 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <div className="pt-6 border-t border-gray-100 flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/careers')}
                  className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-5 py-2 rounded-full text-sm font-medium transition-colors"
                >
                  Back to positions
                </button>
                <button
                  onClick={() => navigate(`/careers?position=${encodeURIComponent(job.slug || job.id)}#application-form`)}
                  className="bg-[#34D164] hover:bg-[#2ab854] text-white px-5 py-2 rounded-full text-sm font-medium transition-colors"
                >
                  Apply for this role
                </button>
              </div>
            </article>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CareerJobDetailPage;
