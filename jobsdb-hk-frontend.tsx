import React, { useState, useEffect } from 'react';
import { Search, MapPin, DollarSign, Globe, Briefcase, Users, TrendingUp, Building, Clock, Filter, ChevronDown, ChevronUp, Languages, GraduationCap, Home, Train } from 'lucide-react';

// Type definitions
interface Salary {
  min: number;
  max: number;
  currency: string;
}

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  salary: Salary;
  posted_date: string;
  tech_stack: string[];
  years_experience: number;
  languages: string[];
  work_permit_required: boolean;
  visa_sponsorship: boolean;
  benefits: string[];
  industry: string;
  summary: string;
}

interface StatsOverview {
  total_jobs: number;
  total_companies: number;
  avg_salary_min: number;
  avg_salary_max: number;
  visa_sponsored_jobs: number;
  pr_required_jobs: number;
}

interface TechCount {
  technology: string;
  job_count: number;
}

interface DistrictCount {
  district: string;
  job_count: number;
}

interface Stats {
  overview: StatsOverview;
  topTechnologies: TechCount[];
  districtDistribution: DistrictCount[];
}

interface TrendingSkill {
  technology: string;
  current_count: number;
  growth_percentage: number;
}

interface Filters {
  search: string;
  techStack: string[];
  minSalary: string;
  maxSalary: string;
  district: string;
  languages: string[];
  industry: string;
  workPermit: string;
  benefits: string[];
}

// Hong Kong specific data
const HK_DISTRICTS = [
  'Central', 'Admiralty', 'Wan Chai', 'Causeway Bay', 'Tsim Sha Tsui',
  'Mong Kok', 'Kwun Tong', 'Quarry Bay', 'Tai Koo', 'Sha Tin',
  'Tuen Mun', 'Yuen Long', 'Science Park', 'Cyberport'
];

const HK_INDUSTRIES = [
  'Banking & Finance', 'Insurance', 'Real Estate', 'Technology',
  'Retail', 'Logistics', 'Healthcare', 'Education', 'Government'
];

const HK_BENEFITS = [
  'MPF', 'Medical Insurance', 'Dental Coverage', 'Performance Bonus',
  'Annual Leave', 'Education Allowance', 'Housing Allowance', 'Gym Membership'
];

const LANGUAGES = ['English', 'Cantonese', 'Mandarin', 'Japanese', 'Korean'];

const JobsDBHongKong: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [trending, setTrending] = useState<TrendingSkill[]>([]);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    techStack: [],
    minSalary: '',
    maxSalary: '',
    district: '',
    languages: [],
    industry: '',
    workPermit: '',
    benefits: []
  });
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [expandedJob, setExpandedJob] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Mock API calls (replace with actual API endpoints)
  const fetchJobs = async (): Promise<void> => {
    setLoading(true);
    try {
      // In production, replace with actual API call:
      // const response = await fetch('/api/jobs/hk?' + new URLSearchParams(filters));
      // const data = await response.json();
      
      // Mock data for demonstration
      const mockJobs = generateMockHKJobs();
      setJobs(mockJobs);
      setTotalPages(5);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (): Promise<void> => {
    try {
      // Mock stats data
      setStats({
        overview: {
          total_jobs: 1234,
          total_companies: 456,
          avg_salary_min: 25000,
          avg_salary_max: 45000,
          visa_sponsored_jobs: 234,
          pr_required_jobs: 890
        },
        topTechnologies: [
          { technology: 'Java', job_count: 234 },
          { technology: 'Python', job_count: 189 },
          { technology: 'React', job_count: 156 },
          { technology: '.NET', job_count: 134 },
          { technology: 'Oracle', job_count: 98 }
        ],
        districtDistribution: [
          { district: 'Central', job_count: 345 },
          { district: 'Kwun Tong', job_count: 234 },
          { district: 'Quarry Bay', job_count: 123 }
        ]
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchTrending = async (): Promise<void> => {
    try {
      // Mock trending data
      setTrending([
        { technology: 'React Native', current_count: 45, growth_percentage: 125 },
        { technology: 'Kubernetes', current_count: 67, growth_percentage: 89 },
        { technology: 'TypeScript', current_count: 123, growth_percentage: 67 },
        { technology: 'Go', current_count: 34, growth_percentage: 45 }
      ]);
    } catch (error) {
      console.error('Error fetching trending:', error);
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchStats();
    fetchTrending();
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [filters, currentPage]);

  // Generate mock Hong Kong specific jobs
  function generateMockHKJobs(): Job[] {
    const companies = [
      'HSBC', 'Standard Chartered', 'Bank of China', 'Cathay Pacific',
      'Swire Properties', 'CLP Holdings', 'MTR Corporation', 'PCCW'
    ];
    
    const titles = [
      'Senior Java Developer', 'Full Stack Engineer', 'DevOps Engineer',
      'Data Analyst', 'Quantitative Developer', 'Mobile Developer',
      'Cloud Architect', 'Business Analyst'
    ];
    
    return Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      title: titles[i % titles.length],
      company: companies[i % companies.length],
      location: HK_DISTRICTS[i % HK_DISTRICTS.length],
      salary: {
        min: 20000 + (i * 5000),
        max: 40000 + (i * 5000),
        currency: 'HKD'
      },
      posted_date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      tech_stack: ['Java', 'Spring', 'Oracle', 'React'].slice(0, 3),
      years_experience: 3 + (i % 5),
      languages: ['English', i % 2 === 0 ? 'Cantonese' : 'Mandarin'],
      work_permit_required: i % 3 === 0,
      visa_sponsorship: i % 4 === 0,
      benefits: ['MPF', 'Medical Insurance', 'Performance Bonus'].slice(0, 2 + (i % 2)),
      industry: HK_INDUSTRIES[i % HK_INDUSTRIES.length],
      summary: 'Responsible for developing and maintaining enterprise applications...'
    }));
  }

  const formatSalary = (salary: Salary | null): string => {
    if (!salary) return 'Negotiable';
    return `HK$${(salary.min / 1000).toFixed(0)}k - ${(salary.max / 1000).toFixed(0)}k`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const days = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">JobsDB Hong Kong</h1>
              <p className="text-gray-600">Smart job search with automatic annotation</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-600">Data from: hk.jobsdb.com</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full">
                Live
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Jobs</p>
                  <p className="text-2xl font-bold">{stats.overview.total_jobs}</p>
                </div>
                <Briefcase className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Avg. Salary</p>
                  <p className="text-2xl font-bold">
                    HK${Math.round((stats.overview.avg_salary_min + stats.overview.avg_salary_max) / 2 / 1000)}k
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Visa Sponsorship</p>
                  <p className="text-2xl font-bold">{stats.overview.visa_sponsored_jobs}</p>
                </div>
                <Globe className="h-8 w-8 text-purple-500" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">PR Required</p>
                  <p className="text-2xl font-bold">{stats.overview.pr_required_jobs}</p>
                </div>
                <Users className="h-8 w-8 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Trending Skills */}
          {trending.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Trending Skills This Week
              </h3>
              <div className="flex flex-wrap gap-2">
                {trending.map(skill => (
                  <span
                    key={skill.technology}
                    className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm flex items-center gap-1"
                  >
                    {skill.technology}
                    <span className="text-xs font-semibold">
                      +{skill.growth_percentage}%
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs, companies, or skills..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              <Filter className="h-5 w-5" />
              Filters
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="border-t pt-4 space-y-4">
              {/* Salary Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Salary (HKD)
                </label>
                <div className="flex gap-4">
                  <input
                    type="number"
                    placeholder="Min"
                    className="flex-1 px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={filters.minSalary}
                    onChange={(e) => setFilters(prev => ({ ...prev, minSalary: e.target.value }))}
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    className="flex-1 px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={filters.maxSalary}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxSalary: e.target.value }))}
                  />
                </div>
              </div>

              {/* District */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  District
                </label>
                <select
                  className="w-full px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filters.district}
                  onChange={(e) => setFilters(prev => ({ ...prev, district: e.target.value }))}
                >
                  <option value="">All Districts</option>
                  {HK_DISTRICTS.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              </div>

              {/* Languages */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Languages className="inline h-4 w-4 mr-1" />
                  Language Requirements
                </label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang}
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          languages: prev.languages.includes(lang)
                            ? prev.languages.filter(l => l !== lang)
                            : [...prev.languages, lang]
                        }));
                      }}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        filters.languages.includes(lang)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Industry */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building className="inline h-4 w-4 mr-1" />
                  Industry
                </label>
                <select
                  className="w-full px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filters.industry}
                  onChange={(e) => setFilters(prev => ({ ...prev, industry: e.target.value }))}
                >
                  <option value="">All Industries</option>
                  {HK_INDUSTRIES.map(industry => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
              </div>

              {/* Work Permit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Authorization
                </label>
                <select
                  className="w-full px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filters.workPermit}
                  onChange={(e) => setFilters(prev => ({ ...prev, workPermit: e.target.value }))}
                >
                  <option value="">Any</option>
                  <option value="pr_required">PR/HKID Required</option>
                  <option value="visa_available">Visa Sponsorship Available</option>
                  <option value="visa_accepted">Work Visa Accepted</option>
                </select>
              </div>

              {/* Benefits */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Benefits
                </label>
                <div className="flex flex-wrap gap-2">
                  {HK_BENEFITS.map(benefit => (
                    <button
                      key={benefit}
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          benefits: prev.benefits.includes(benefit)
                            ? prev.benefits.filter(b => b !== benefit)
                            : [...prev.benefits, benefit]
                        }));
                      }}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        filters.benefits.includes(benefit)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {benefit}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Job Listings */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-600">Loading jobs...</p>
            </div>
          ) : (
            jobs.map(job => (
              <div key={job.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="p-6">
                  {/* Job Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-900 mb-1">{job.title}</h2>
                      <div className="flex items-center gap-4 text-gray-600">
                        <span className="flex items-center gap-1">
                          <Building className="h-4 w-4" />
                          {job.company}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDate(job.posted_date)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {expandedJob === job.id ? <ChevronUp /> : <ChevronDown />}
                    </button>
                  </div>

                  {/* Key Info Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      <DollarSign className="h-3 w-3" />
                      {formatSalary(job.salary)}
                    </span>
                    
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      <Clock className="h-3 w-3" />
                      {job.years_experience}+ years
                    </span>
                    
                    {job.languages.map(lang => (
                      <span key={lang} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                        <Languages className="h-3 w-3" />
                        {lang}
                      </span>
                    ))}
                    
                    {job.work_permit_required && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                        <Users className="h-3 w-3" />
                        PR Required
                      </span>
                    )}
                    
                    {job.visa_sponsorship && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                        <Globe className="h-3 w-3" />
                        Visa Sponsorship
                      </span>
                    )}
                  </div>

                  {/* Tech Stack */}
                  <div className="mb-4 flex flex-wrap gap-2">
                    {job.tech_stack.map(tech => (
                      <span key={tech} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                        {tech}
                      </span>
                    ))}
                  </div>

                  {/* Summary */}
                  <p className="text-gray-600 text-sm mb-2">{job.summary}</p>

                  {/* Industry and Benefits */}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {job.industry}
                    </span>
                    {job.benefits.length > 0 && (
                      <span>Benefits: {job.benefits.join(', ')}</span>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {expandedJob === job.id && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Requirements</h4>
                          <ul className="list-disc list-inside text-gray-600 space-y-1">
                            <li>{job.years_experience}+ years of experience</li>
                            <li>Proficiency in {job.tech_stack.join(', ')}</li>
                            <li>{job.languages.join(' and ')} required</li>
                            {job.work_permit_required && <li>Must be Hong Kong permanent resident</li>}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Benefits Package</h4>
                          <ul className="list-disc list-inside text-gray-600 space-y-1">
                            {job.benefits.map(benefit => (
                              <li key={benefit}>{benefit}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="mt-4">
                        <a
                          href={`https://hk.jobsdb.com/hk/en/job/${job.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          View on JobsDB
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8 mb-8">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobsDBHongKong;