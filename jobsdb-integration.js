// jobsdb-scraper.js - Complete JobsDB Hong Kong Integration

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { createWorker } = require('tesseract.js');

// JobsDB Hong Kong specific configuration
const JOBSDB_CONFIG = {
  baseUrl: 'https://hk.jobsdb.com',
  searchUrl: 'https://hk.jobsdb.com/hk/search-jobs',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9,zh-TW;q=0.8,zh;q=0.7',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
  }
};

// Hong Kong specific tech keywords (including local preferences)
const HK_TECH_KEYWORDS = [
  // International tech
  'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue', 'Node.js', 'Python',
  'Java', 'Spring', 'C++', 'C#', '.NET', 'PHP', 'Laravel', 'Django',
  // HK market preferences
  'Oracle', 'SAP', 'Salesforce', 'SharePoint', 'Power BI', 'Tableau',
  'COBOL', 'AS400', 'Mainframe', // Banking legacy systems
  'FIX Protocol', 'Bloomberg', 'Reuters', // Financial tech
  'Cantonese', 'Mandarin', 'Putonghua' // Language requirements
];

// Hong Kong specific patterns
const HK_PATTERNS = {
  salary: [
    /HK\$?\s*(\d{1,3},?\d{3})\s*-\s*HK\$?\s*(\d{1,3},?\d{3})/i,
    /\$(\d{1,3}k)\s*-\s*\$(\d{1,3}k)/i,
    /(\d{2,3})k\s*-\s*(\d{2,3})k\s*(?:HKD|HK\$)/i,
    /月薪\s*[：:]\s*\$?(\d{1,3},?\d{3})\s*-\s*\$?(\d{1,3},?\d{3})/i
  ],
  workPermit: [
    /must\s*be\s*(?:a\s*)?hong\s*kong\s*permanent\s*resident/i,
    /HKID\s*holder/i,
    /valid\s*work\s*visa/i,
    /employment\s*visa\s*sponsorship/i,
    /香港永久居民/i,
    /持有香港身份證/i
  ],
  location: {
    districts: [
      'Central', 'Admiralty', 'Wan Chai', 'Causeway Bay', 'Tsim Sha Tsui',
      'Mong Kok', 'Kwun Tong', 'Quarry Bay', 'Tai Koo', 'Sha Tin',
      'Tuen Mun', 'Yuen Long', 'Science Park', 'Cyberport'
    ],
    mtr: [
      'Island Line', 'Tsuen Wan Line', 'Kwun Tong Line', 'Tseung Kwan O Line',
      'East Rail Line', 'West Rail Line'
    ]
  }
};

// Enhanced annotation functions for Hong Kong market
function extractHKSpecificInfo(description) {
  const annotations = {};
  
  // Extract Hong Kong salary (considering HKD)
  annotations.salary = extractHKSalary(description);
  
  // Work permit requirements
  annotations.workPermitRequired = checkWorkPermitRequirements(description);
  
  // Location details (specific HK districts)
  annotations.location = extractHKLocation(description);
  
  // Language requirements
  annotations.languages = extractLanguageRequirements(description);
  
  // Industry classification (HK has strong finance/banking sector)
  annotations.industry = classifyHKIndustry(description);
  
  // Benefits (MPF, medical, bonus structure common in HK)
  annotations.benefits = extractHKBenefits(description);
  
  return annotations;
}

function extractHKSalary(description) {
  for (const pattern of HK_PATTERNS.salary) {
    const match = description.match(pattern);
    if (match) {
      let min = match[1].replace(/[k,]/gi, '');
      let max = match[2].replace(/[k,]/gi, '');
      
      // Handle 'k' notation
      if (match[0].toLowerCase().includes('k')) {
        min = parseInt(min) * 1000;
        max = parseInt(max) * 1000;
      } else {
        min = parseInt(min.replace(/,/g, ''));
        max = parseInt(max.replace(/,/g, ''));
      }
      
      return {
        min,
        max,
        currency: 'HKD'
      };
    }
  }
  return null;
}

function checkWorkPermitRequirements(description) {
  const requirements = {
    permanentResidentRequired: false,
    visaSponsorshipAvailable: false,
    workVisaAccepted: false
  };
  
  // Check for permanent resident requirement
  if (/permanent\s*resident|HKID|香港永久居民/i.test(description)) {
    requirements.permanentResidentRequired = true;
  }
  
  // Check for visa sponsorship
  if (/visa\s*sponsorship\s*(?:is\s*)?available|sponsor\s*work\s*visa/i.test(description)) {
    requirements.visaSponsorshipAvailable = true;
  }
  
  // Check if work visa holders accepted
  if (/valid\s*work\s*visa\s*accepted|employment\s*visa\s*holders/i.test(description)) {
    requirements.workVisaAccepted = true;
  }
  
  return requirements;
}

function extractHKLocation(description) {
  const location = {
    district: null,
    mtrLine: null,
    workFromHome: false,
    hybrid: false
  };
  
  // Check districts
  for (const district of HK_PATTERNS.location.districts) {
    if (new RegExp(district, 'i').test(description)) {
      location.district = district;
      break;
    }
  }
  
  // Check MTR lines
  for (const line of HK_PATTERNS.location.mtr) {
    if (new RegExp(line, 'i').test(description)) {
      location.mtrLine = line;
      break;
    }
  }
  
  // Work arrangement
  if (/work\s*from\s*home|remote\s*work|在家工作/i.test(description)) {
    location.workFromHome = true;
  }
  if (/hybrid\s*(?:work|arrangement)|混合辦公/i.test(description)) {
    location.hybrid = true;
  }
  
  return location;
}

function extractLanguageRequirements(description) {
  const languages = [];
  const languagePatterns = {
    'English': /(?:fluent|proficient|good|excellent)\s*(?:in\s*)?english|english\s*(?:fluency|proficiency)/i,
    'Cantonese': /cantonese|廣東話|粵語/i,
    'Mandarin': /mandarin|putonghua|普通話|國語/i,
    'Japanese': /japanese|日語|日文/i,
    'Korean': /korean|韓語|韓文/i
  };
  
  Object.entries(languagePatterns).forEach(([lang, pattern]) => {
    if (pattern.test(description)) {
      languages.push(lang);
    }
  });
  
  return languages;
}

function classifyHKIndustry(description) {
  const industries = {
    'Banking & Finance': /bank|financial|investment|trading|hedge\s*fund|private\s*equity|wealth\s*management/i,
    'Insurance': /insurance|takaful|actuary|underwriting/i,
    'Real Estate': /property|real\s*estate|construction|architectural/i,
    'Retail': /retail|shopping|mall|luxury|fashion/i,
    'Logistics': /logistics|shipping|freight|supply\s*chain|warehouse/i,
    'Technology': /fintech|software|IT|technology|digital|cyber/i,
    'Healthcare': /hospital|medical|clinic|pharmaceutical|healthcare/i,
    'Education': /university|school|education|teaching|academy/i,
    'Government': /government|civil\s*service|public\s*sector/i
  };
  
  for (const [industry, pattern] of Object.entries(industries)) {
    if (pattern.test(description)) {
      return industry;
    }
  }
  
  return 'Other';
}

function extractHKBenefits(description) {
  const benefits = [];
  const benefitPatterns = {
    'MPF': /MPF|mandatory\s*provident\s*fund|強積金/i,
    'Medical Insurance': /medical\s*insurance|health\s*insurance|醫療保險/i,
    'Dental Coverage': /dental|牙科/i,
    'Performance Bonus': /performance\s*bonus|discretionary\s*bonus|花紅/i,
    'Annual Leave': /annual\s*leave|AL|年假/i,
    'Education Allowance': /education\s*allowance|study\s*leave/i,
    'Housing Allowance': /housing\s*allowance|accommodation/i,
    'Gym Membership': /gym|fitness|健身/i
  };
  
  Object.entries(benefitPatterns).forEach(([benefit, pattern]) => {
    if (pattern.test(description)) {
      benefits.push(benefit);
    }
  });
  
  return benefits;
}

// Main scraper class
class JobsDBScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }
  
  async initialize() {
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--user-agent=' + JOBSDB_CONFIG.headers['User-Agent']
      ]
    });
    this.page = await this.browser.newPage();
    await this.page.setExtraHTTPHeaders(JOBSDB_CONFIG.headers);
    
    // Set viewport to desktop size
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    // Bypass bot detection
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });
  }
  
  async searchJobs(keyword, filters = {}) {
    const searchParams = new URLSearchParams();
    
    // Build search URL
    let searchUrl = `${JOBSDB_CONFIG.searchUrl}/${encodeURIComponent(keyword)}`;
    
    // Add filters
    if (filters.salary) {
      searchParams.append('sal', filters.salary);
    }
    if (filters.experience) {
      searchParams.append('exp', filters.experience);
    }
    if (filters.jobType) {
      searchParams.append('jobtype', filters.jobType);
    }
    
    const finalUrl = searchParams.toString() 
      ? `${searchUrl}?${searchParams.toString()}`
      : searchUrl;
    
    await this.page.goto(finalUrl, { waitUntil: 'networkidle2' });
    
    // Wait for job listings to load
    await this.page.waitForSelector('[data-automation="job-card"]', { timeout: 10000 })
      .catch(() => console.log('No job cards found'));
    
    return await this.extractJobListings();
  }
  
  async extractJobListings() {
    const jobs = await this.page.evaluate(() => {
      const jobCards = document.querySelectorAll('[data-automation="job-card"]');
      const jobList = [];
      
      jobCards.forEach(card => {
        const job = {};
        
        // Extract basic info
        const titleElement = card.querySelector('[data-automation="job-title"]');
        const companyElement = card.querySelector('[data-automation="company-name"]');
        const locationElement = card.querySelector('[data-automation="job-location"]');
        const salaryElement = card.querySelector('[data-automation="job-salary"]');
        
        if (titleElement) job.title = titleElement.textContent.trim();
        if (companyElement) job.company = companyElement.textContent.trim();
        if (locationElement) job.location = locationElement.textContent.trim();
        if (salaryElement) job.salary = salaryElement.textContent.trim();
        
        // Get job URL
        const linkElement = card.querySelector('a[href*="/job/"]');
        if (linkElement) {
          job.url = linkElement.href;
          job.jobId = linkElement.href.match(/job\/(\d+)/)?.[1];
        }
        
        // Extract posted date
        const dateElement = card.querySelector('[data-automation="job-posted-date"]');
        if (dateElement) job.postedDate = dateElement.textContent.trim();
        
        // Extract brief description if available
        const descElement = card.querySelector('[data-automation="job-description"]');
        if (descElement) job.briefDescription = descElement.textContent.trim();
        
        jobList.push(job);
      });
      
      return jobList;
    });
    
    // Enhance each job with detailed information
    const detailedJobs = [];
    for (const job of jobs) {
      if (job.url) {
        const details = await this.getJobDetails(job.url);
        detailedJobs.push({ ...job, ...details });
      }
    }
    
    return detailedJobs;
  }
  
  async getJobDetails(jobUrl) {
    const detailPage = await this.browser.newPage();
    await detailPage.setExtraHTTPHeaders(JOBSDB_CONFIG.headers);
    
    try {
      await detailPage.goto(jobUrl, { waitUntil: 'networkidle2' });
      
      // Wait for job description to load
      await detailPage.waitForSelector('[data-automation="job-detail-description"]', { timeout: 10000 });
      
      const details = await detailPage.evaluate(() => {
        const data = {};
        
        // Full job description
        const descElement = document.querySelector('[data-automation="job-detail-description"]');
        if (descElement) data.fullDescription = descElement.textContent.trim();
        
        // Job highlights
        const highlights = [];
        document.querySelectorAll('[data-automation="job-highlight"]').forEach(h => {
          highlights.push(h.textContent.trim());
        });
        data.highlights = highlights;
        
        // Requirements
        const requirements = [];
        const reqSection = document.querySelector('[data-automation="job-requirements"]');
        if (reqSection) {
          reqSection.querySelectorAll('li').forEach(req => {
            requirements.push(req.textContent.trim());
          });
        }
        data.requirements = requirements;
        
        // Benefits
        const benefits = [];
        document.querySelectorAll('[data-automation="job-benefit"]').forEach(b => {
          benefits.push(b.textContent.trim());
        });
        data.benefits = benefits;
        
        // Additional info
        const additionalInfo = {};
        document.querySelectorAll('[data-automation="job-info-item"]').forEach(item => {
          const label = item.querySelector('[data-automation="job-info-label"]')?.textContent.trim();
          const value = item.querySelector('[data-automation="job-info-value"]')?.textContent.trim();
          if (label && value) {
            additionalInfo[label] = value;
          }
        });
        data.additionalInfo = additionalInfo;
        
        return data;
      });
      
      // Apply Hong Kong specific annotations
      const hkAnnotations = extractHKSpecificInfo(details.fullDescription || '');
      
      // Apply general annotations
      const generalAnnotations = {
        techStack: extractTechStack(details.fullDescription || ''),
        yearsOfExperience: extractYearsOfExperience(details.fullDescription || ''),
        education: extractEducation(details.fullDescription || ''),
        summary: summarizeResponsibilities(details.fullDescription || '')
      };
      
      return {
        ...details,
        annotations: {
          ...generalAnnotations,
          ...hkAnnotations
        }
      };
      
    } catch (error) {
      console.error(`Error fetching job details for ${jobUrl}:`, error);
      return {};
    } finally {
      await detailPage.close();
    }
  }
  
  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Batch processing function
async function processJobsDBBatch(keywords = ['software engineer', 'data analyst', 'product manager']) {
  const scraper = new JobsDBScraper();
  const allJobs = [];
  
  try {
    await scraper.initialize();
    
    for (const keyword of keywords) {
      console.log(`Scraping jobs for keyword: ${keyword}`);
      
      const jobs = await scraper.searchJobs(keyword, {
        salary: '20000-100000', // HKD monthly
        experience: '1-5' // years
      });
      
      // Add source metadata
      const jobsWithMeta = jobs.map(job => ({
        ...job,
        source: 'JobsDB',
        market: 'Hong Kong',
        scrapedAt: new Date().toISOString(),
        searchKeyword: keyword
      }));
      
      allJobs.push(...jobsWithMeta);
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
  } finally {
    await scraper.close();
  }
  
  return allJobs;
}

// Database integration
async function saveToDatabase(jobs) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    for (const job of jobs) {
      const query = `
        INSERT INTO jobs (
          source_id, title, company, location, description,
          posted_date, source_url, source,
          tech_stack, years_experience, visa_sponsorship,
          security_clearance, education_requirements,
          salary_min, salary_max, salary_currency,
          location_type, summary,
          work_permit_required, languages, industry,
          benefits, district, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        ON CONFLICT (source_id, source) DO UPDATE
        SET updated_at = CURRENT_TIMESTAMP
      `;
      
      const values = [
        job.jobId,
        job.title,
        job.company,
        job.location,
        job.annotations?.fullDescription || job.briefDescription,
        job.postedDate,
        job.url,
        job.source,
        job.annotations?.techStack || [],
        job.annotations?.yearsOfExperience,
        job.annotations?.workPermitRequired?.visaSponsorshipAvailable,
        false, // no security clearance in HK
        job.annotations?.education || [],
        job.annotations?.salary?.min,
        job.annotations?.salary?.max,
        job.annotations?.salary?.currency || 'HKD',
        job.annotations?.location?.hybrid ? 'Hybrid' : 'On-site',
        job.annotations?.summary,
        job.annotations?.workPermitRequired?.permanentResidentRequired,
        job.annotations?.languages || [],
        job.annotations?.industry,
        job.annotations?.benefits || [],
        job.annotations?.location?.district,
        new Date()
      ];
      
      await client.query(query, values);
    }
    
    await client.query('COMMIT');
    console.log(`Saved ${jobs.length} jobs to database`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving to database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Export functions for use in other modules
module.exports = {
  JobsDBScraper,
  processJobsDBBatch,
  saveToDatabase,
  extractHKSpecificInfo,
  HK_TECH_KEYWORDS,
  HK_PATTERNS
};

// Standalone execution
if (require.main === module) {
  (async () => {
    try {
      const jobs = await processJobsDBBatch([
        'software engineer',
        'data analyst',
        'product manager',
        'devops engineer',
        'frontend developer',
        'backend developer',
        'full stack developer',
        'mobile developer',
        'data scientist',
        'machine learning engineer'
      ]);
      
      console.log(`Scraped ${jobs.length} total jobs`);
      
      // Save to database if configured
      if (process.env.DATABASE_URL) {
        await saveToDatabase(jobs);
      } else {
        // Save to JSON file for testing
        const fs = require('fs');
        fs.writeFileSync(
          `jobsdb-jobs-${new Date().toISOString().split('T')[0]}.json`,
          JSON.stringify(jobs, null, 2)
        );
        console.log('Jobs saved to JSON file');
      }
      
    } catch (error) {
      console.error('Error in main execution:', error);
    }
  })();
}