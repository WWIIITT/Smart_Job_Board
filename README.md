# JobsDB Hong Kong Integration System

A comprehensive job board system that automatically scrapes, annotates, and presents job listings from JobsDB Hong Kong with intelligent filtering and search capabilities.

## 🌟 Features

### Hong Kong Market Specific
- **District-based filtering**: Central, Admiralty, Wan Chai, Kwun Tong, etc.
- **Language requirements**: English, Cantonese, Mandarin, Japanese, Korean
- **Work permit tracking**: PR required, visa sponsorship, work visa accepted
- **HKD salary parsing**: Handles monthly salaries in Hong Kong dollars
- **Industry classification**: Banking & Finance, Insurance, Real Estate, Technology
- **Benefits tracking**: MPF, medical insurance, performance bonus, annual leave

### Automatic Annotation Engine
- **Tech stack extraction**: 50+ technologies including finance-specific (FIX Protocol, Bloomberg)
- **Experience level parsing**: Years of experience requirements
- **Education detection**: Bachelor's, Master's, PhD requirements
- **Salary range extraction**: Min/max salary in HKD
- **Location type**: On-site, hybrid, or remote
- **Responsibilities summarization**: AI-powered summary generation

### Advanced Features
- **Real-time scraping**: Puppeteer-based scraper with anti-detection
- **Smart caching**: Redis-powered caching for performance
- **Trending analysis**: Track growing skills in the HK market
- **Job freshness monitoring**: Automatic expiry detection
- **Batch processing**: Process multiple keywords efficiently
- **API rate limiting**: Respectful scraping with delays

## 🚀 Quick Start

### Prerequisites
```bash
# Required software
- Node.js 16+
- PostgreSQL 13+
- Redis 6+
- Chrome/Chromium (for Puppeteer)
```

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/jobsdb-hk-integration.git
cd jobsdb-hk-integration

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/jobsdb
REDIS_URL=redis://localhost:6379

# API Configuration
API_KEY=your-secret-api-key
PORT=3000

# Notifications (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
EMAIL_NOTIFICATION=admin@example.com

# OpenAI (optional, for enhanced parsing)
OPENAI_API_KEY=sk-your-openai-key
```

### Database Setup
```sql
-- Run the migration
psql -U your_user -d jobsdb -f migrations/001_create_jobs_table.sql
```

```sql
-- migrations/001_create_jobs_table.sql
CREATE TABLE jobs (
  id SERIAL PRIMARY KEY,
  source_id VARCHAR(255) NOT NULL,
  source VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  description TEXT,
  summary TEXT,
  posted_date TIMESTAMP,
  source_url VARCHAR(500),
  
  -- Annotations
  tech_stack TEXT[],
  years_experience INTEGER,
  visa_sponsorship BOOLEAN,
  work_permit_required BOOLEAN,
  education_requirements TEXT[],
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency VARCHAR(10) DEFAULT 'HKD',
  location_type VARCHAR(50),
  
  -- Hong Kong specific
  district VARCHAR(100),
  languages TEXT[],
  industry VARCHAR(100),
  benefits TEXT[],
  
  -- Metadata
  expired BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  UNIQUE(source_id, source)
);

CREATE INDEX idx_jobs_tech_stack ON jobs USING GIN(tech_stack);
CREATE INDEX idx_jobs_languages ON jobs USING GIN(languages);
CREATE INDEX idx_jobs_benefits ON jobs USING GIN(benefits);
CREATE INDEX idx_jobs_district ON jobs(district);
CREATE INDEX idx_jobs_industry ON jobs(industry);
CREATE INDEX idx_jobs_posted_date ON jobs(posted_date DESC);
CREATE INDEX idx_jobs_salary ON jobs(salary_min, salary_max);
```

## 📖 Usage

### Starting the Services

```bash
# Start the API server
npm run start

# Start the scraper in development mode
npm run dev

# Run scraper once
npm run scrape

# Run tests
npm test
```

### API Endpoints

#### Search Jobs
```bash
GET /api/jobs/hk?search=developer&techStack=React,Node.js&minSalary=30000
```

Parameters:
- `search`: Text search across title, company, description
- `techStack`: Comma-separated technologies
- `minExperience`, `maxExperience`: Years of experience
- `minSalary`, `maxSalary`: Monthly salary in HKD
- `district`: Hong Kong district name
- `languages`: Comma-separated languages
- `industry`: Industry classification
- `workPermit`: `pr_required`, `visa_available`, `visa_accepted`
- `benefits`: Comma-separated benefits
- `page`, `limit`: Pagination

#### Get Statistics
```bash
GET /api/jobs/hk/stats
```

Returns market statistics including:
- Total jobs and companies
- Average salaries
- Top technologies
- District distribution
- Industry breakdown
- Language requirements

#### Get Trending Skills
```bash
GET /api/jobs/hk/trending?days=7
```

#### Trigger Manual Scrape
```bash
POST /api/jobs/hk/scrape
Content-Type: application/json

{
  "keywords": ["software engineer", "data analyst"],
  "filters": {
    "salary": "20000-100000",
    "experience": "1-5"
  }
}
```

#### Check Scraping Status
```bash
GET /api/jobs/hk/scrape/status
```

### Frontend Integration

```javascript
// Example: Fetching jobs in React
const fetchJobs = async (filters) => {
  const params = new URLSearchParams({
    search: filters.search || '',
    techStack: filters.techStack.join(','),
    minSalary: filters.minSalary || '',
    district: filters.district || '',
    page: currentPage
  });
  
  const response = await fetch(`/api/jobs/hk?${params}`, {
    headers: {
      'X-API-Key': process.env.REACT_APP_API_KEY
    }
  });
  
  const data = await response.json();
  return data;
};
```

## 🔧 Configuration

### Scraping Schedule
Edit the cron schedules in `jobsdb-api-service.js`:

```javascript
// Default: Every 6 hours
cron.schedule('0 */6 * * *', scrapeJobs);

// Daily cleanup at 2 AM
cron.schedule('0 2 * * *', cleanupOldJobs);

// Hourly freshness check
cron.schedule('0 * * * *', checkJobFreshness);
```

### Keywords Configuration
Customize search keywords for your market:

```javascript
const keywords = [
  // Tech roles
  'software engineer', 'frontend developer',
  
  // Finance tech (important in HK)
  'quantitative developer', 'trading systems',
  
  // Add your keywords
  'your keyword here'
];
```

## 🎯 Best Practices

### Respectful Scraping
1. **Rate Limiting**: 2-second delay between requests
2. **User Agent**: Realistic browser headers
3. **Concurrent Limits**: Max 5 parallel page fetches
4. **Respect robots.txt**: Check JobsDB's scraping policy

### Performance Optimization
1. **Caching**: Redis cache for stats (1-hour TTL)
2. **Database Indexes**: GIN indexes for array searches
3. **Batch Processing**: Process jobs in batches of 100
4. **Connection Pooling**: PostgreSQL connection pool

### Error Handling
```javascript
// Implement retry logic
const scrapeWithRetry = async (url, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await scraper.getJobDetails(url);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 5000 * (i + 1)));
    }
  }
};
```

## 📊 Monitoring

### Health Check Endpoint
```bash
GET /api/health

Response:
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "lastScrape": "2024-01-15T10:30:00Z",
  "jobCount": 1234
}
```

### Metrics to Track
- Scraping success rate
- Average response time
- Jobs processed per hour
- Error rate by type
- Cache hit rate

## 🚨 Troubleshooting

### Common Issues

#### Puppeteer Launch Errors
```bash
# Install required dependencies
sudo apt-get install chromium-browser
sudo apt-get install libx11-xcb1 libxcomposite1 libxdamage1 libxi6 libxtst6 libnss3 libcups2 libxss1 libxrandr2 libasound2 libatk1.0-0 libgtk-3-0
```

#### Database Connection Issues
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U your_user -d jobsdb -c "SELECT 1"
```

#### Redis Connection Issues
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG
```

## 🔒 Security

### API Authentication
- Use strong API keys (min 32 characters)
- Rotate keys regularly
- Implement rate limiting per API key
- Log all API access

### Database Security
- Use parameterized queries (already implemented)
- Encrypt sensitive data at rest
- Regular backups
- Restricted database permissions

## 📈 Scaling Considerations

### Horizontal Scaling
1. **Multiple Scrapers**: Run scrapers on different servers
2. **Load Balancer**: Distribute API requests
3. **Database Replication**: Read replicas for queries
4. **Redis Cluster**: For high-traffic caching

### Performance Tuning
```javascript
// Bulk insert optimization
const bulkInsert = async (jobs) => {
  const values = jobs.map(job => [
    job.source_id,
    job.title,
    // ... other fields
  ]);
  
  await pgPool.query(
    format('INSERT INTO jobs VALUES %L ON CONFLICT DO NOTHING', values)
  );
};
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This tool is for educational purposes. Always respect website terms of service and robots.txt. Consider reaching out to JobsDB for official API access for commercial use.

---

Built with ❤️ for the Hong Kong tech community
