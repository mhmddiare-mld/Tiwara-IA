
import React from 'react';

interface FeatureCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, children }) => {
  return (
    <div className="bg-gray-800/50 rounded-2xl shadow-lg ring-1 ring-white/10 backdrop-blur-md">
      <div className="p-6 border-b border-gray-700">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <p className="mt-1 text-gray-400">{description}</p>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};
