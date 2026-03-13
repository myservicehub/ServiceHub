import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';
import { policiesAPI } from '../api/wallet';
import { Cookie, Calendar, Clock, ChevronRight, FileText } from 'lucide-react';

const SectionBar = ({ children }) => (
  <div className="flex items-center gap-3 mt-8 mb-4 pb-3 border-b-2 border-[#34D164]">
    <div className="w-8 h-8 rounded-lg bg-[#34D164]/10 flex items-center justify-center">
      <FileText size={16} className="text-[#34D164]" />
    </div>
    <h2 className="text-lg font-bold text-[#121E3C]">{children}</h2>
  </div>
);

const SubSectionBar = ({ children, id }) => (
  <div id={id} className="flex items-center gap-2 mt-6 mb-3">
    <ChevronRight size={16} className="text-[#34D164]" />
    <h3 className="text-base font-semibold text-[#121E3C]">{children}</h3>
  </div>
);

const CookiePolicyPage = () => {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isTitleCaseHeading = (line) => {
    const w = line.trim().split(/\s+/);
    if (w.length < 2 || w.length > 12) return false;
    let titleCaseCount = 0;
    for (const token of w) {
      const cleaned = token.replace(/[^A-Za-z]/g, '');
      if (!cleaned) continue;
      if (/^[A-Z][a-z]+$/.test(cleaned)) titleCaseCount++;
    }
    return titleCaseCount >= Math.ceil(w.length * 0.6);
  };
  const isHeading = (line) => {
    const t = line.trim();
    if (/^(\d+(?:\.\d+)*)\.?\s/.test(t)) return true;
    if (t === t.toUpperCase() && t.replace(/[^A-Za-z]/g, '').length >= 4) return true;
    if (isTitleCaseHeading(t)) return true;
    return false;
  };
  const isListLine = (line) => /^[-*•]\s+/.test(line);
  const isNumListLine = (line) => /^\s*\d+[\).]\s+/.test(line);
  const renderInline = (text) => {
    const parts = [];
    const regex = /(https?:\/\/[^\s]+)|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
    let lastIndex = 0;
    let m;
    while ((m = regex.exec(text)) !== null) {
      if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
      const match = m[0];
      if (match.startsWith('http')) {
        parts.push(<a key={`lnk-${m.index}`} href={match} target="_blank" rel="noopener noreferrer" className="text-[#34D164] hover:text-[#2ab854] underline decoration-[#34D164]/30 hover:decoration-[#34D164]">{match}</a>);
      } else {
        parts.push(<a key={`ml-${m.index}`} href={`mailto:${match}`} className="text-[#34D164] hover:text-[#2ab854] underline decoration-[#34D164]/30 hover:decoration-[#34D164]">{match}</a>);
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) parts.push(text.length ? text.slice(lastIndex) : '');
    return parts;
  };
  const renderPolicyContent = (text) => {
    const lines = (text || '').split(/\r?\n/);
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const raw = lines[i];
      const line = raw.trim();
      if (!line) { i++; continue; }
      if (isHeading(line)) {
        out.push(<SectionBar key={`h-${i}`}>{line}</SectionBar>);
        i++;
        continue;
      }
      if (isListLine(line)) {
        const items = [];
        while (i < lines.length && isListLine(lines[i].trim())) {
          items.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
          i++;
        }
        out.push(
          <ul key={`ul-${i}`} className="space-y-2 mb-5 ml-4">
            {items.map((it, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-600 text-sm leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34D164] mt-2 shrink-0" />
                <span>{renderInline(it)}</span>
              </li>
            ))}
          </ul>
        );
        continue;
      }
      if (isNumListLine(line)) {
        const items = [];
        while (i < lines.length && isNumListLine(lines[i].trim())) {
          items.push(lines[i].trim().replace(/^\s*\d+[\).]\s+/, ''));
          i++;
        }
        out.push(
          <ol key={`ol-${i}`} className="space-y-2 mb-5 ml-4">
            {items.map((it, idx) => (
              <li key={idx} className="flex items-start gap-3 text-gray-600 text-sm leading-relaxed">
                <span className="w-6 h-6 rounded-full bg-[#34D164]/10 text-[#34D164] text-xs font-semibold flex items-center justify-center shrink-0">{idx + 1}</span>
                <span className="pt-0.5">{renderInline(it)}</span>
              </li>
            ))}
          </ol>
        );
        continue;
      }
      const para = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (!t || isHeading(t) || isListLine(t) || isNumListLine(t)) break;
        para.push(lines[i]);
        i++;
      }
      out.push(<p key={`p-${i}`} className="text-gray-600 text-sm leading-relaxed mb-4">{renderInline(para.join(' '))}</p>);
    }
    return out;
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await policiesAPI.getPolicyByType('cookie_policy');
        const data = res?.policy || res;
        if (isMounted) setPolicy(data || null);
      } catch (e) {
        if (isMounted) setError(e?.response?.data?.detail || 'Unable to load cookie policy');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const effective = policy?.effective_date ? new Date(policy.effective_date) : null;
  const updated = policy?.updated_at ? new Date(policy.updated_at) : null;

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-[#121E3C] pt-28 sm:pt-32 lg:pt-36 pb-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#34D164] flex items-center justify-center mx-auto mb-6">
              <Cookie size={32} className="text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {policy?.title || 'Cookie Policy'}
            </h1>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Learn how we use cookies and similar technologies to enhance your experience on ServiceHub.
            </p>
            {(effective || updated) && (
              <div className="flex items-center justify-center gap-6 mt-6">
                {effective && (
                  <div className="flex items-center gap-2 text-white/50 text-sm">
                    <Calendar size={14} />
                    <span>Effective: {effective.toLocaleDateString()}</span>
                  </div>
                )}
                {updated && (
                  <div className="flex items-center gap-2 text-white/50 text-sm">
                    <Clock size={14} />
                    <span>Updated: {updated.toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-3 border-[#34D164] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                    <Cookie size={24} className="text-red-500" />
                  </div>
                  <p className="text-gray-600 mb-4">{error}</p>
                  <p className="text-sm text-gray-500">
                    See our{' '}
                    <Link to="/privacy-policy" className="text-[#34D164] hover:underline">Privacy Policy</Link>.
                  </p>
                </div>
              ) : (
                <div className="prose-sm max-w-none">
                  {renderPolicyContent(policy?.content || '')}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Related Links */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold text-[#121E3C] text-center mb-6">Related Policies</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to="/privacy-policy" className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-[#34D164]/10 flex items-center justify-center">
                  <FileText size={18} className="text-[#34D164]" />
                </div>
                <div>
                  <p className="font-medium text-[#121E3C] group-hover:text-[#34D164] transition-colors">Privacy Policy</p>
                  <p className="text-xs text-gray-500">How we handle your data</p>
                </div>
              </Link>
              <Link to="/terms" className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-[#34D164]/10 flex items-center justify-center">
                  <FileText size={18} className="text-[#34D164]" />
                </div>
                <div>
                  <p className="font-medium text-[#121E3C] group-hover:text-[#34D164] transition-colors">Terms of Service</p>
                  <p className="text-xs text-gray-500">Usage terms & conditions</p>
                </div>
              </Link>
              <Link to="/contact" className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-[#34D164]/10 flex items-center justify-center">
                  <FileText size={18} className="text-[#34D164]" />
                </div>
                <div>
                  <p className="font-medium text-[#121E3C] group-hover:text-[#34D164] transition-colors">Contact Us</p>
                  <p className="text-xs text-gray-500">Get in touch</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CookiePolicyPage;