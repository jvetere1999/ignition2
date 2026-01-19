'use client';

import React, { useState } from 'react';
import { Filter, Lock, Globe } from 'lucide-react';

export type PrivacyFilter = 'all' | 'standard' | 'private';

interface PrivacyFilterProps {
  value: PrivacyFilter;
  onChange?: (filter: PrivacyFilter) => void;
  standardCount?: number;
  privateCount?: number;
  showCounts?: boolean;
}

/**
 * Privacy Filter Component
 * Allows filtering content by privacy classification
 */
export const PrivacyFilter: React.FC<PrivacyFilterProps> = ({
  value,
  onChange,
  standardCount = 0,
  privateCount = 0,
  showCounts = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getButtonLabel = () => {
    switch (value) {
      case 'standard':
        return 'Standard Only';
      case 'private':
        return 'Private Only';
      default:
        return 'All Content';
    }
  };

  const handleSelect = (filter: PrivacyFilter) => {
    onChange?.(filter);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:border-gray-400 bg-white"
      >
        <Filter size={16} />
        <span className="text-sm font-medium">{getButtonLabel()}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
          <button
            onClick={() => handleSelect('all')}
            className={`w-full text-left px-4 py-2 text-sm ${
              value === 'all'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Globe className="inline mr-2" size={14} />
            All Content
            {showCounts && <span className="float-right text-gray-500">{standardCount + privateCount}</span>}
          </button>

          <button
            onClick={() => handleSelect('standard')}
            className={`w-full text-left px-4 py-2 text-sm border-t ${
              value === 'standard'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Globe className="inline mr-2" size={14} />
            Standard Only
            {showCounts && <span className="float-right text-gray-500">{standardCount}</span>}
          </button>

          <button
            onClick={() => handleSelect('private')}
            className={`w-full text-left px-4 py-2 text-sm border-t ${
              value === 'private'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Lock className="inline mr-2" size={14} />
            Private Only
            {showCounts && <span className="float-right text-gray-500">{privateCount}</span>}
          </button>
        </div>
      )}
    </div>
  );
};

interface PrivacyBadgeProps {
  mode: 'standard' | 'private';
  size?: 'sm' | 'md';
}

/**
 * Privacy Mode Badge
 * Visual indicator for content privacy classification
 */
export const PrivacyBadge: React.FC<PrivacyBadgeProps> = ({
  mode,
  size = 'sm',
}) => {
  const isPrivate = mode === 'private';
  const sizeClass = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${
          isPrivate
            ? 'bg-red-100 text-red-700'
            : 'bg-gray-100 text-gray-700'
        }
        ${sizeClass}
      `}
      title={
        isPrivate
          ? 'Private: Not logged or analyzed'
          : 'Standard: Normal logging and analytics'
      }
    >
      {isPrivate ? (
        <>
          <Lock size={size === 'sm' ? 12 : 14} />
          Private
        </>
      ) : (
        <>
          <Globe size={size === 'sm' ? 12 : 14} />
          Standard
        </>
      )}
    </span>
  );
};

interface PrivacyHeaderProps {
  filter: PrivacyFilter;
  onFilterChange?: (filter: PrivacyFilter) => void;
  title: string;
  standardCount?: number;
  privateCount?: number;
}

/**
 * Content List Header with Privacy Filter
 * Displays filter controls and privacy mode statistics
 */
export const PrivacyListHeader: React.FC<PrivacyHeaderProps> = ({
  filter,
  onFilterChange,
  title,
  standardCount = 0,
  privateCount = 0,
}) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex items-center gap-3">
        {/* Count indicators */}
        <div className="flex gap-3 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <Globe size={14} className="text-gray-500" />
            {standardCount}
          </span>
          <span className="flex items-center gap-1">
            <Lock size={14} className="text-gray-500" />
            {privateCount}
          </span>
        </div>

        {/* Filter control */}
        <PrivacyFilter
          value={filter}
          onChange={onFilterChange}
          standardCount={standardCount}
          privateCount={privateCount}
          showCounts={true}
        />
      </div>
    </div>
  );
};
