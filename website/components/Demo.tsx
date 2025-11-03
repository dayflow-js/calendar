import React from 'react';

/**
 * Demo component for showcasing calendar examples
 */
export const Demo: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '1.5rem',
        marginTop: '1rem',
        marginBottom: '1rem',
        backgroundColor: '#f9fafb',
      }}
    >
      {children}
    </div>
  );
};

export default Demo;
