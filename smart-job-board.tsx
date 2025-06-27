import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Briefcase, Calendar, Globe, Shield, GraduationCap, Code, MapPin, DollarSign, X, ChevronDown, ChevronUp, Building, Clock, Users } from 'lucide-react';

// Type definitions
interface SalaryRange {
  min: number;
  max: number;
}

interface JobAnnotations {
  techStack: string[];
  yearsOfExperience: number | null;
  visaSponsorship: boolean | null;
  securityClearance: boolean;
  education: string[];
  salary: SalaryRange | null;
  location: string;
  summary: string;
}

interface Job {
  id: number;
  company: string;
  title: string;
  description: string;
  postedDate: string;
  annotations: JobAnnotations;
}

interface Filters {
  techStack: string[];
  minExperience: string;
  maxExperience: string;
  visaSponsorship: string;
  securityClearance: string;
  education: string[];
  location: string;
  minSalary: string;
}

// Job annotation extraction functions
const extractTechStack = (description: string): string[] => {
  const techKeywords = [
    'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue', 'Node.js', 'Python', 
    'Java', 'C++', 'C#', '.NET', 'Ruby', 'Rails', 'PHP', 'Laravel', 'Django',
    'Flask', 'Spring', 'Express', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'GraphQL', 'REST API',
    'Machine Learning', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas',
    'Swift', 'Kotlin', 'React Native', 'Flutter', 'Go', 'Rust', 'Scala',
    'Elasticsearch', 'Kafka', 'RabbitMQ', 'Jenkins', 'Git', 'CI/CD'
  ];
  
  const found: string[] = [];
  const lowerDesc = description.toLowerCase();
  
  techKeywords.forEach(tech => {
    if (lowerDesc.includes(tech.toLowerCase())) {
      found.push(tech);
    }
  });
  
  return [...new Set(found)];
};

const extractYearsOfExperience = (description: string): number | null => {
  const patterns = [
    /(\d+)\+?\s*years?\s*(?:of\s*)?experience/i,
    /(\d+)\+?\s*years?\s*(?:of\s*)?professional/i,
    /(\d+)\+?\s*years?\s*in/i,
    /minimum\s*(\d+)\s*years?/i,
    /at\s*least\s*(\d+)\s*years?/i
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  
  return null;
};

const checkVisaSponsorship = (description: string): boolean | null => {
  const positivePatterns = [
    /visa\s*sponsorship\s*(?:is\s*)?available/i,
    /willing\s*to\s*sponsor/i,
    /we\s*sponsor/i,
    /sponsorship\s*provided/i,
    /h1b\s*sponsorship/i
  ];
  
  const negativePatterns = [
    /no\s*visa\s*sponsorship/i,
    /unable\s*to\s*sponsor/i,
    /cannot\s*sponsor/i,
    /not\s*able\s*to\s*sponsor/i,
    /must\s*be\s*authorized/i,
    /must\s*have\s*work\s*authorization/i
  ];
  
  for (const pattern of negativePatterns) {
    if (pattern.test(description)) return false;
  }
  
  for (const pattern of positivePatterns) {
    if (pattern.test(description)) return true;
  }
  
  return null;
};

const checkSecurityClearance = (description: string): boolean => {
  const patterns = [
    /security\s*clearance\s*(?:is\s*)?required/i,
    /must\s*have\s*(?:active\s*)?security\s*clearance/i,
    /secret\s*clearance/i,
    /top\s*secret/i,
    /ts\/sci/i,
    /clearance\s*required/i
  ];
  
  return patterns.some(pattern => pattern.test(description));
};

const extractEducation = (description: string): string[] => {
  const requirements: string[] = [];
  const patterns: Record<string, RegExp> = {
    "Bachelor's": /bachelor'?s?\s*(?:degree|of)?/i,
    "Master's": /master'?s?\s*(?:degree|of)?/i,
    "PhD": /ph\.?d|doctorate/i,
    "Computer Science": /computer\s*science|cs\s*degree/i,
    "Engineering": /engineering\s*degree/i,
    "Mathematics": /mathematics|math\s*degree/i
  };
  
  Object.entries(patterns).forEach(([level, pattern]) => {
    if (pattern.test(description)) {
      requirements.push(level);
    }
  });
  
  return requirements;
};

const extractSalaryRange = (description: string): SalaryRange | null => {
  const patterns = [
    /\$(\d{1,3},?\d{3})\s*-\s*\$(\d{1,3},?\d{3})/,
    /\$(\d{1,3}k)\s*-\s*\$(\d{1,3}k)/i,
    /(\d{1,3},?\d{3})\s*-\s*(\d{1,3},?\d{3})\s*(?:per\s*year|annually)/i
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      let min = match[1].replace(/[k,]/gi, '');
      let max = match[2].replace(/[k,]/gi, '');
      
      if (match[1].toLowerCase().includes('k')) min = (parseInt(min) * 1000).toString();
      if (match[2].toLowerCase().includes('k')) max = (parseInt(max) * 1000).toString();
      
      return {
        min: parseInt(min),
        max: parseInt(max)
      };
    }
  }
  
  return null;
};

const extractLocation = (description: string): string => {
  if (/remote|work\s*from\s*home|distributed|anywhere/i.test(description)) {
    return 'Remote';
  }
  if (/hybrid/i.test(description)) {
    return 'Hybrid';
  }
  return 'On-site';
};

const summarizeResponsibilities = (description: string): string => {
  const keywords = [
    'design', 'develop', 'implement', 'maintain', 'lead', 'collaborate',
    'architect', 'build', 'deploy', 'optimize', 'review', 'mentor',
    'analyze', 'test', 'debug', 'document', 'integrate', 'scale'
  ];
  
  const sentences = description.split(/[.!?]+/);
  const relevant = sentences.filter(s => 
    keywords.some(k => s.toLowerCase().includes(k))
  ).slice(0, 3);
  
  return relevant.join('. ').trim() || description.slice(0, 200) + '...';
};

// Mock job data generator
const generateMockJobs = (): Job[] => {
  const companies = ['TechCorp', 'DataSoft', 'CloudScale', 'AI Innovations', 'DevOps Pro', 'StartupXYZ'];
  const titles = [
    'Senior Frontend Engineer',
    'Full Stack Developer',
    'Backend Engineer',
    'DevOps Engineer',
    'Data Scientist',
    'Machine Learning Engineer',
    'Software Architect',
    'Platform Engineer'
  ];
  
  const descriptions = [
    `We are looking for a Senior Frontend Engineer with 5+ years of experience in React, TypeScript, and modern web development. 
    You will be responsible for building scalable web applications, implementing new features, and mentoring junior developers. 
    Must have a Bachelor's degree in Computer Science or related field. Experience with AWS and Docker is a plus. 
    Salary range: $120k - $160k. Visa sponsorship available. Remote work possible.`,
    
    `Join our team as a Full Stack Developer! Required: 3+ years experience with Node.js, React, and PostgreSQL. 
    You'll design and develop RESTful APIs, implement frontend features, and optimize database performance. 
    Master's degree preferred. Must be authorized to work in the US. No visa sponsorship. 
    Competitive salary: $100,000 - $140,000. Hybrid work environment.`,
    
    `Backend Engineer position requiring expertise in Python, Django, and microservices architecture. 
    Minimum 4 years of professional experience. You'll architect scalable systems, implement CI/CD pipelines, and collaborate with cross-functional teams. 
    Security clearance required. On-site position. Bachelor's degree required. 
    Compensation: $130k - $170k plus equity.`,
    
    `We need a DevOps Engineer with strong experience in Kubernetes, Terraform, and AWS. 
    5+ years experience required. Responsibilities include maintaining infrastructure, implementing monitoring solutions, and automating deployments. 
    PhD in Computer Science preferred. H1B sponsorship provided. 
    Salary: $140,000 - $180,000. Remote-first company.`,
    
    `Data Scientist role focusing on machine learning and predictive analytics. 
    Required: 3+ years with Python, TensorFlow, and Pandas. You'll build ML models, analyze large datasets, and present insights to stakeholders. 
    Master's degree in Mathematics or Statistics required. Must have work authorization. 
    $110k - $150k salary range. Hybrid work available.`,
    
    `Machine Learning Engineer position for our AI team. Need 6+ years experience with PyTorch, Scikit-learn, and distributed computing. 
    You'll develop cutting-edge ML algorithms, deploy models to production, and optimize performance. 
    Secret clearance required. PhD preferred. No remote work. 
    Compensation: $150,000 - $200,000 plus benefits.`
  ];
  
  return Array.from({ length: 20 }, (_, i) => {
    const desc = descriptions[i % descriptions.length];
    const company = companies[i % companies.length];
    const title = titles[i % titles.length];
    
    return {
      id: i + 1,
      company,
      title,
      description: desc,
      postedDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      annotations: {
        techStack: extractTechStack(desc),
        yearsOfExperience: extractYearsOfExperience(desc),
        visaSponsorship: checkVisaSponsorship(desc),
        securityClearance: checkSecurityClearance(desc),
        education: extractEducation(desc),
        salary: extractSalaryRange(desc),
        location: extractLocation(desc),
        summary: summarizeResponsibilities(desc)
      }
    };
  });
};

// Main component
const JobBoard: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Filters>({
    techStack: [],
    minExperience: '',
    maxExperience: '',
    visaSponsorship: '',
    securityClearance: '',
    education: [],
    location: '',
    minSalary: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedJob, setExpandedJob] = useState<number | null>(null);

  useEffect(() => {
    // Simulate fetching jobs
    setJobs(generateMockJobs());
  }, []);

  // Get unique tech stack items for filter
  const allTechStack = useMemo(() => {
    const tech = new Set<string>();
    jobs.forEach(job => {
      job.annotations.techStack.forEach(t => tech.add(t));
    });
    return Array.from(tech).sort();
  }, [jobs]);

  // Apply filters
  useEffect(() => {
    let filtered = jobs;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Tech stack filter
    if (filters.techStack.length > 0) {
      filtered = filtered.filter(job =>
        filters.techStack.every(tech => 
          job.annotations.techStack.includes(tech)
        )
      );
    }

    // Experience filter
    if (filters.minExperience && filters.minExperience !== '') {
      filtered = filtered.filter(job =>
        job.annotations.yearsOfExperience !== null &&
        job.annotations.yearsOfExperience >= parseInt(filters.minExperience)
      );
    }
    if (filters.maxExperience && filters.maxExperience !== '') {
      filtered = filtered.filter(job =>
        job.annotations.yearsOfExperience !== null &&
        job.annotations.yearsOfExperience <= parseInt(filters.maxExperience)
      );
    }

    // Visa sponsorship filter
    if (filters.visaSponsorship !== '') {
      const wantsVisa = filters.visaSponsorship === 'yes';
      filtered = filtered.filter(job =>
        job.annotations.visaSponsorship === wantsVisa
      );
    }

    // Security clearance filter
    if (filters.securityClearance !== '') {
      const wantsClearance = filters.securityClearance === 'yes';
      filtered = filtered.filter(job =>
        job.annotations.securityClearance === wantsClearance
      );
    }

    // Education filter
    if (filters.education.length > 0) {
      filtered = filtered.filter(job =>
        filters.education.some(edu => 
          job.annotations.education.includes(edu)
        )
      );
    }

    // Location filter
    if (filters.location) {
      filtered = filtered.filter(job =>
        job.annotations.location === filters.location
      );
    }

    // Salary filter
    if (filters.minSalary && filters.minSalary !== '') {
      const minSal = parseInt(filters.minSalary) * 1000; // Convert from k to actual
      filtered = filtered.filter(job =>
        job.annotations.salary && job.annotations.salary.min >= minSal
      );
    }

    setFilteredJobs(filtered);
  }, [jobs, searchTerm, filters]);

  const toggleTechFilter = (tech: string) => {
    setFilters(prev => ({
      ...prev,
      techStack: prev.techStack.includes(tech)
        ? prev.techStack.filter(t => t !== tech)
        : [...prev.techStack, tech]
    }));
  };

  const toggleEducationFilter = (edu: string) => {
    setFilters(prev => ({
      ...prev,
      education: prev.education.includes(edu)
        ? prev.education.filter(e => e !== edu)
        : [...prev.education, edu]
    }));
  };

  const clearFilters = () => {
    setFilters({
      techStack: [],
      minExperience: '',
      maxExperience: '',
      visaSponsorship: '',
      securityClearance: '',
      education: [],
      location: '',
      minSalary: ''
    });
    setSearchTerm('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Smart Job Board</h1>
          <p className="text-gray-600">Auto-annotated job listings with smart filtering</p>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs, companies, or keywords..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              <Filter className="h-5 w-5" />
              Filters
              {Object.values(filters).flat().filter(v => v !== '').length > 0 && (
                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  {Object.values(filters).flat().filter(v => v !== '').length}
                </span>
              )}
            </button>
            {Object.values(filters).flat().filter(v => v !== '').length > 0 && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="border-t pt-4 space-y-4">
              {/* Tech Stack Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tech Stack
                </label>
                <div className="flex flex-wrap gap-2">
                  {allTechStack.map(tech => (
                    <button
                      key={tech}
                      onClick={() => toggleTechFilter(tech)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        filters.techStack.includes(tech)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {tech}
                    </button>
                  ))}
                </div>
              </div>

              {/* Experience Filter */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Experience (years)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={filters.minExperience}
                    onChange={(e) => setFilters(prev => ({ ...prev, minExperience: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Experience (years)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={filters.maxExperience}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxExperience: e.target.value }))}
                  />
                </div>
              </div>

              {/* Other Filters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visa Sponsorship
                  </label>
                  <select
                    className="w-full px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={filters.visaSponsorship}
                    onChange={(e) => setFilters(prev => ({ ...prev, visaSponsorship: e.target.value }))}
                  >
                    <option value="">Any</option>
                    <option value="yes">Available</option>
                    <option value="no">Not Available</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Security Clearance
                  </label>
                  <select
                    className="w-full px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={filters.securityClearance}
                    onChange={(e) => setFilters(prev => ({ ...prev, securityClearance: e.target.value }))}
                  >
                    <option value="">Any</option>
                    <option value="yes">Required</option>
                    <option value="no">Not Required</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <select
                    className="w-full px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={filters.location}
                    onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                  >
                    <option value="">Any</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Salary ($k)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    className="w-full px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={filters.minSalary}
                    onChange={(e) => setFilters(prev => ({ ...prev, minSalary: e.target.value }))}
                    placeholder="e.g., 100"
                  />
                </div>
              </div>

              {/* Education Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Education
                </label>
                <div className="flex flex-wrap gap-2">
                  {["Bachelor's", "Master's", "PhD", "Computer Science", "Engineering", "Mathematics"].map(edu => (
                    <button
                      key={edu}
                      onClick={() => toggleEducationFilter(edu)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        filters.education.includes(edu)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {edu}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-4 text-gray-600">
          Showing {filteredJobs.length} of {jobs.length} jobs
        </div>

        {/* Job Listings */}
        <div className="space-y-4">
          {filteredJobs.map(job => (
            <div key={job.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Job Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-1">{job.title}</h2>
                    <div className="flex items-center gap-4 text-gray-600">
                      <span className="flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        {job.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.annotations.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(job.postedDate).toLocaleDateString()}
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

                {/* Quick Annotations */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {job.annotations.yearsOfExperience && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      <Calendar className="h-3 w-3" />
                      {job.annotations.yearsOfExperience}+ years
                    </span>
                  )}
                  {job.annotations.salary && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      <DollarSign className="h-3 w-3" />
                      ${(job.annotations.salary.min / 1000)}k - ${(job.annotations.salary.max / 1000)}k
                    </span>
                  )}
                  {job.annotations.visaSponsorship === true && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                      <Globe className="h-3 w-3" />
                      Visa Sponsorship
                    </span>
                  )}
                  {job.annotations.visaSponsorship === false && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                      <Globe className="h-3 w-3" />
                      No Sponsorship
                    </span>
                  )}
                  {job.annotations.securityClearance && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                      <Shield className="h-3 w-3" />
                      Clearance Required
                    </span>
                  )}
                  {job.annotations.education.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                      <GraduationCap className="h-3 w-3" />
                      {job.annotations.education[0]}
                    </span>
                  )}
                </div>

                {/* Tech Stack */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Code className="h-4 w-4 text-gray-500" />
                    {job.annotations.techStack.map(tech => (
                      <span key={tech} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <p className="text-gray-600 text-sm">
                  {job.annotations.summary}
                </p>

                {/* Expanded Details */}
                {expandedJob === job.id && (
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="font-semibold text-gray-900 mb-2">Full Description</h3>
                    <p className="text-gray-600 text-sm whitespace-pre-line">{job.description}</p>
                    
                    {job.annotations.education.length > 1 && (
                      <div className="mt-4">
                        <h4 className="font-medium text-gray-900 mb-1">Education Requirements</h4>
                        <ul className="list-disc list-inside text-gray-600 text-sm">
                          {job.annotations.education.map(edu => (
                            <li key={edu}>{edu}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredJobs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No jobs found matching your criteria.</p>
            <button
              onClick={clearFilters}
              className="mt-4 text-blue-500 hover:text-blue-600"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobBoard;