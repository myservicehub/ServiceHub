import React from 'react';

const ValidationBanner = ({ message, onJump }) => {
  if (!message) return null;
  return (
    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3" role="alert" aria-live="polite">
      <div className="flex items-start justify-between">
        <p className="text-red-700 text-sm font-lato">{message}</p>
        {onJump && (
          <button type="button" onClick={onJump} className="text-sm text-red-700 underline">
            Jump to first error
          </button>
        )}
      </div>
    </div>
  );
};

export default ValidationBanner;