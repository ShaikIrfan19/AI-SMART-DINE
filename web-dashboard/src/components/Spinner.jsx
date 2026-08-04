import React from 'react';

export default function Spinner({ size = 'md', fullPage = false }) {
  const spinner = (
    <div className={`spinner spinner-${size}`}>
      <div className="spinner-ring"></div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="spinner-overlay">
        {spinner}
        <p className="spinner-text">Loading...</p>
      </div>
    );
  }

  return spinner;
}
