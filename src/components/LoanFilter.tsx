import React, { useState } from 'react';
import { Search, SlidersHorizontal, ArrowUpDown, Grid3X3, List } from 'lucide-react';

export interface LoanFilters {
  search: string;
  amountMin: string;
  amountMax: string;
  interestRateMin: string;
  interestRateMax: string;
  durationMin: string;
  durationMax: string;
  sortBy: 'newest' | 'oldest' | 'amount_high' | 'amount_low' | 'rate_low' | 'rate_high' | 'risk_low' | 'risk_high';
  viewMode: 'grid' | 'list';
}

interface LoanFilterProps {
  filters: LoanFilters;
  onFiltersChange: (filters: LoanFilters) => void;
  onToggleView: () => void;
}

const LoanFilter: React.FC<LoanFilterProps> = ({ filters, onFiltersChange, onToggleView }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFilterChange = (key: keyof LoanFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-4">
      {/* Search Bar and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search loans by borrower address or loan ID..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center space-x-2">
          <ArrowUpDown size={16} className="text-gray-400" />
          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value as LoanFilters['sortBy'])}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount_high">Highest Amount</option>
            <option value="amount_low">Lowest Amount</option>
            <option value="rate_low">Lowest Rate</option>
            <option value="rate_high">Highest Rate</option>
            <option value="risk_low">Lowest Risk</option>
            <option value="risk_high">Highest Risk</option>
          </select>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-gray-700 rounded-lg border border-gray-600">
          <button
            onClick={onToggleView}
            className={`p-2 rounded-l-lg transition-colors ${
              filters.viewMode === 'grid' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Grid3X3 size={16} />
          </button>
          <button
            onClick={onToggleView}
            className={`p-2 rounded-r-lg transition-colors ${
              filters.viewMode === 'list' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <List size={16} />
          </button>
        </div>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg px-3 py-2 text-white transition-colors"
        >
          <SlidersHorizontal size={16} />
          <span>Filters</span>
        </button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-700">
          {/* Amount Range */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Loan Amount (ETH)
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Min"
                step="0.01"
                value={filters.amountMin}
                onChange={(e) => handleFilterChange('amountMin', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
              <input
                type="number"
                placeholder="Max"
                step="0.01"
                value={filters.amountMax}
                onChange={(e) => handleFilterChange('amountMax', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Interest Rate Range */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Interest Rate (%)
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Min"
                step="0.1"
                value={filters.interestRateMin}
                onChange={(e) => handleFilterChange('interestRateMin', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
              <input
                type="number"
                placeholder="Max"
                step="0.1"
                value={filters.interestRateMax}
                onChange={(e) => handleFilterChange('interestRateMax', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Duration Range */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Duration (days)
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.durationMin}
                onChange={(e) => handleFilterChange('durationMin', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.durationMax}
                onChange={(e) => handleFilterChange('durationMax', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Count */}
      {(filters.search || filters.amountMin || filters.amountMax || filters.interestRateMin || 
        filters.interestRateMax || filters.durationMin || filters.durationMax) && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-700">
          <span className="text-sm text-gray-400">
            Active filters applied
          </span>
          <button
            onClick={() => onFiltersChange({
              ...filters,
              search: '',
              amountMin: '',
              amountMax: '',
              interestRateMin: '',
              interestRateMax: '',
              durationMin: '',
              durationMax: ''
            })}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

export default LoanFilter;