import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';
import { policiesAPI } from '../api/wallet';

const SectionBar = ({ children }) => (
  <div className="rounded-md bg-green-600 text-white px-4 py-2 font-semibold mb-3">{children}</div>
);

const SubSectionBar = ({ children, id }) => (
  <div id={id} className="rounded-md bg-green-100 text-green-900 px-4 py-2 font-semibold mb-3">{children}</div>
);

const PrivacyPage = () => {
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
    if (/^(PART\s+[A-Z]+:)/.test(t)) return true;
    if (/^([AB]\d+\.)/.test(t)) return true;
    if (/^(\d+(?:\.\d+)*)\.?\s/.test(t)) return true;
    if (t === t.toUpperCase() && t.replace(/[^A-Za-z]/g, '').length >= 4) return true;
    if (isTitleCaseHeading(t)) return true;
    return false;
  };
  const isSubHeading = (line) => {
    const t = line.trim();
    return /^(PART\s+[A-Z]+:)/.test(t) || /^([AB]\d+\.)/.test(t);
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
        parts.push(<a key={`lnk-${m.index}`} href={match} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700 underline">{match}</a>);
      } else {
        parts.push(<a key={`ml-${m.index}`} href={`mailto:${match}`} className="text-green-600 hover:text-green-700 underline">{match}</a>);
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
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
        out.push(
          (isSubHeading(line)
            ? <SubSectionBar key={`sh-${i}`}>{line}</SubSectionBar>
            : <SectionBar key={`h-${i}`}>{line}</SectionBar>)
        );
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
          <ul key={`ul-${i}`} className="list-disc list-inside text-gray-700 space-y-2 mb-4">
            {items.map((it, idx) => (<li key={idx}>{renderInline(it)}</li>))}
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
          <ol key={`ol-${i}`} className="list-decimal list-inside text-gray-700 space-y-2 mb-4">
            {items.map((it, idx) => (<li key={idx}>{renderInline(it)}</li>))}
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
      out.push(<p key={`p-${i}`} className="text-gray-700 mb-4">{renderInline(para.join(' '))}</p>);
    }
    return out;
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await policiesAPI.getPolicyByType('privacy_policy');
        const data = res?.policy || res;
        if (isMounted) {
          setPolicy(data || null);
        }
      } catch (e) {
        if (isMounted) {
          setError(e?.response?.data?.detail || 'Unable to load policy content');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const effective = policy?.effective_date ? new Date(policy.effective_date) : null;
  const updated = policy?.updated_at ? new Date(policy.updated_at) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{policy?.title || 'Privacy Policy'}</h1>
          <div className="text-sm text-gray-600 mb-6">
            {effective && <span className="mr-4">Effective: {effective.toLocaleDateString()}</span>}
            {updated && <span>Last updated: {updated.toLocaleDateString()}</span>}
          </div>
          {loading ? (
            <div className="text-gray-700">Loading policy…</div>
          ) : error ? (
            <div className="text-red-600">
              {error}. Please see our{' '}
              <Link to="/cookie-policy" className="text-green-600 hover:text-green-700 underline">Cookie Policy</Link>
              {' '}and{' '}
              <Link to="/contact" className="text-green-600 hover:text-green-700 underline">Contact page</Link>.
            </div>
          ) : (
            <div>
              {renderPolicyContent(policy?.content || '')}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PrivacyPage;