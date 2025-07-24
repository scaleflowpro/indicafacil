import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  padding = 'md' 
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div className={`
      bg-white rounded-2xl shadow-lg border border-gray-100 transition-all duration-200 hover:shadow-xl
      ${paddingClasses[padding]}
      ${className}
    `.trim()}>
      {children}
    </div>
  );
};

export default Card;