// jobsdb-api-service.js - API endpoints and scheduling for JobsDB integration

const express = require('express');
const cron = require('node-cron');
const { JobsDBScraper, processJobsDBBatch, saveToDatabase } = require('./jobsdb-scraper');
const Redis = require('redis');
const { Pool } = require('pg');

// Initialize services
const app = express();
const redis = Redis.createClient(process.env.REDIS_URL);
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(express.json());

// Middleware for API key authentication
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
};

// API Routes

// Search jobs with Hong Kong specific filters
app.get('/api/jobs/hk', authenticateApiKey, async (req, res) => {
  try {
    const {
      search,
      techStack,
      minExperience,
      maxExperience,
      minSalary,
      maxSalary,
      district,
      languages,
      industry,
      workPermit,
      benefits,
      page = 1,
      limit = 20
    } = req.query;
    
    // Build query
    let query = `
      SELECT 
        id, source_id, title, company, location, summary,
        posted_date, source_url, tech_stack, years_experience,
        salary_min, salary_max, salary_currency, location_type,
        languages, industry, benefits, district,
        work_permit_required, visa_sponsorship,
        created_at, updated_at
      FROM jobs
      WHERE source = 'JobsDB'
    `;
    
    const queryParams = [];
    let paramCounter = 1;
    
    // Apply filters
    if (search) {
      query += ` AND (
        title ILIKE $${paramCounter} OR 
        company ILIKE $${paramCounter} OR 
        description ILIKE $${paramCounter} OR
        summary ILIKE $${paramCounter}
      )`;
      queryParams.push(`%${search}%`);
      paramCounter++;
    }
    
    if (techStack) {
      const techs = techStack.split(',');
      query += ` AND tech_stack && $${paramCounter}::text[]`;
      queryParams.push(techs);
      paramCounter++;
    }
    
    if (minExperience) {
      query += ` AND years_experience >= $${paramCounter}`;
      queryParams.push(parseInt(minExperience));
      paramCounter++;
    }
    
    if (maxExperience) {
      query += ` AND years_experience <= $${paramCounter}`;
      queryParams.push(parseInt(maxExperience));
      paramCounter++;
    }
    
    if (minSalary) {
      query += ` AND salary_max >= $${paramCounter}`;
      queryParams.push(parseInt(minSalary));
      paramCounter++;
    }
    
    if (maxSalary) {
      query += ` AND salary_min <= $${paramCounter}`;
      queryParams.push(parseInt(maxSalary));
      paramCounter++;
    }
    
    if (district) {
      query += ` AND district = $${paramCounter}`;
      queryParams.push(district);
      paramCounter++;
    }
    
    if (languages) {
      const langs = languages.split(',');
      query += ` AND languages && $${paramCounter}::text[]`;
      queryParams.push(langs);
      paramCounter++;
    }
    
    if (industry) {
      query += ` AND industry = $${paramCounter}`;
      queryParams.push(industry);
      paramCounter++;
    }
    
    if (workPermit === 'pr_required') {
      query += ` AND work_permit_required = true`;
    } else if (workPermit === 'visa_available') {
      query += ` AND visa_sponsorship = true`;
    }
    
    if (benefits) {
      const benefitList = benefits.split(',');
      query += ` AND benefits && $${paramCounter}::text[]`;
      queryParams.push(benefitList);
      paramCounter++;
    }
    
    // Add sorting and pagination
    query += ` ORDER BY posted_date DESC, created_at DESC`;
    query += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    
    // Execute query
    const result = await pgPool.query(query, queryParams);
    
    // Get total count for pagination
    let countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) FROM');
    countQuery = countQuery.replace(/ORDER BY.*$/, '');
    countQuery = countQuery.replace(/LIMIT.*$/, '');
    const countParams = queryParams.slice(0, -2); // Remove limit and offset
    const countResult = await pgPool.query(countQuery, countParams);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Error searching jobs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get job statistics for Hong Kong market
app.get('/api/jobs/hk/stats', authenticateApiKey, async (req, res) => {
  try {
    const cacheKey = 'jobsdb:stats:hk';
    
    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    // Calculate statistics
    const stats = await pgPool.query(`
      WITH job_stats AS (
        SELECT 
          COUNT(*) as total_jobs,
          COUNT(DISTINCT company) as total_companies,
          AVG(salary_min) as avg_salary_min,
          AVG(salary_max) as avg_salary_max,
          COUNT(CASE WHEN visa_sponsorship = true THEN 1 END) as visa_sponsored_jobs,
          COUNT(CASE WHEN work_permit_required = true THEN 1 END) as pr_required_jobs
        FROM jobs
        WHERE source = 'JobsDB'
          AND created_at > NOW() - INTERVAL '30 days'
      ),
      tech_stats AS (
        SELECT 
          unnest(tech_stack) as technology,
          COUNT(*) as job_count
        FROM jobs
        WHERE source = 'JobsDB'
          AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY technology
        ORDER BY job_count DESC
        LIMIT 20
      ),
      district_stats AS (
        SELECT 
          district,
          COUNT(*) as job_count
        FROM jobs
        WHERE source = 'JobsDB'
          AND district IS NOT NULL
          AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY district
        ORDER BY job_count DESC
      ),
      industry_stats AS (
        SELECT 
          industry,
          COUNT(*) as job_count,
          AVG(salary_max) as avg_salary
        FROM jobs
        WHERE source = 'JobsDB'
          AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY industry
        ORDER BY job_count DESC
      ),
      language_stats AS (
        SELECT 
          unnest(languages) as language,
          COUNT(*) as job_count
        FROM jobs
        WHERE source = 'JobsDB'
          AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY language
        ORDER BY job_count DESC
      )
      SELECT 
        json_build_object(
          'overview', (SELECT row_to_json(job_stats) FROM job_stats),
          'topTechnologies', (SELECT json_agg(row_to_json(tech_stats)) FROM tech_stats),
          'districtDistribution', (SELECT json_agg(row_to_json(district_stats)) FROM district_stats),
          'industryBreakdown', (SELECT json_agg(row_to_json(industry_stats)) FROM industry_stats),
          'languageRequirements', (SELECT json_agg(row_to_json(language_stats)) FROM language_stats),
          'lastUpdated', NOW()
        ) as stats
    `);
    
    const result = stats.rows[0].stats;
    
    // Cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(result));
    
    res.json(result);
    
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Trigger manual scraping
app.post('/api/jobs/hk/scrape', authenticateApiKey, async (req, res) => {
  try {
    const { keywords = ['software engineer'], filters = {} } = req.body;
    
    // Check if scraping is already in progress
    const isRunning = await redis.get('jobsdb:scraping:running');
    if (isRunning) {
      return res.status(409).json({ error: 'Scraping already in progress' });
    }
    
    // Set running flag
    await redis.setex('jobsdb:scraping:running', 3600, 'true'); // 1 hour timeout
    
    // Start scraping in background
    res.json({ message: 'Scraping started', keywords });
    
    // Perform scraping
    try {
      const jobs = await processJobsDBBatch(keywords);
      await saveToDatabase(jobs);
      
      // Update stats
      await redis.del('jobsdb:stats:hk');
      
      // Send notification (webhook, email, etc.)
      await notifyScrapingComplete(jobs.length);
      
    } finally {
      await redis.del('jobsdb:scraping:running');
    }
    
  } catch (error) {
    console.error('Error starting scrape:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get scraping status
app.get('/api/jobs/hk/scrape/status', authenticateApiKey, async (req, res) => {
  const isRunning = await redis.get('jobsdb:scraping:running');
  const lastRun = await redis.get('jobsdb:scraping:last_run');
  const lastCount = await redis.get('jobsdb:scraping:last_count');
  
  res.json({
    running: !!isRunning,
    lastRun: lastRun ? new Date(lastRun) : null,
    lastJobCount: lastCount ? parseInt(lastCount) : null
  });
});

// Get trending skills in HK market
app.get('/api/jobs/hk/trending', authenticateApiKey, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const result = await pgPool.query(`
      WITH current_week AS (
        SELECT 
          unnest(tech_stack) as technology,
          COUNT(*) as current_count
        FROM jobs
        WHERE source = 'JobsDB'
          AND created_at > NOW() - INTERVAL '%s days'
        GROUP BY technology
      ),
      previous_week AS (
        SELECT 
          unnest(tech_stack) as technology,
          COUNT(*) as previous_count
        FROM jobs
        WHERE source = 'JobsDB'
          AND created_at > NOW() - INTERVAL '%s days'
          AND created_at <= NOW() - INTERVAL '%s days'
        GROUP BY technology
      )
      SELECT 
        COALESCE(c.technology, p.technology) as technology,
        COALESCE(c.current_count, 0) as current_count,
        COALESCE(p.previous_count, 0) as previous_count,
        CASE 
          WHEN COALESCE(p.previous_count, 0) = 0 THEN 100
          ELSE ROUND(((COALESCE(c.current_count, 0) - COALESCE(p.previous_count, 0))::numeric / p.previous_count) * 100, 2)
        END as growth_percentage
      FROM current_week c
      FULL OUTER JOIN previous_week p ON c.technology = p.technology
      WHERE COALESCE(c.current_count, 0) > 0
      ORDER BY growth_percentage DESC, current_count DESC
      LIMIT 20
    `, [days, days * 2, days]);
    
    res.json({
      trending: result.rows,
      period: `${days} days`
    });
    
  } catch (error) {
    console.error('Error getting trending skills:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Scheduled Jobs

// Main scraping schedule - runs every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('Starting scheduled JobsDB scraping...');
  
  try {
    const isRunning = await redis.get('jobsdb:scraping:running');
    if (isRunning) {
      console.log('Scraping already in progress, skipping...');
      return;
    }
    
    await redis.setex('jobsdb:scraping:running', 3600, 'true');
    
    // Default keywords for Hong Kong market
    const keywords = [
      // Tech roles
      'software engineer', 'frontend developer', 'backend developer',
      'full stack developer', 'mobile developer', 'devops engineer',
      'data scientist', 'data analyst', 'machine learning engineer',
      'cloud architect', 'solution architect', 'technical lead',
      
      // Finance tech roles (important in HK)
      'quantitative developer', 'algo developer', 'trading systems',
      'fintech developer', 'blockchain developer',
      
      // Other IT roles
      'project manager', 'product manager', 'business analyst',
      'UI UX designer', 'QA engineer', 'security engineer',
      'network engineer', 'system administrator', 'DBA'
    ];
    
    const jobs = await processJobsDBBatch(keywords);
    await saveToDatabase(jobs);
    
    // Update cache
    await redis.setex('jobsdb:scraping:last_run', 86400, new Date().toISOString());
    await redis.setex('jobsdb:scraping:last_count', 86400, jobs.length.toString());
    await redis.del('jobsdb:stats:hk'); // Clear stats cache
    
    console.log(`Scheduled scraping completed. Processed ${jobs.length} jobs.`);
    
  } catch (error) {
    console.error('Error in scheduled scraping:', error);
  } finally {
    await redis.del('jobsdb:scraping:running');
  }
});

// Clean up old jobs - runs daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Cleaning up old JobsDB entries...');
  
  try {
    const result = await pgPool.query(`
      DELETE FROM jobs
      WHERE source = 'JobsDB'
        AND created_at < NOW() - INTERVAL '60 days'
        AND (updated_at IS NULL OR updated_at < NOW() - INTERVAL '45 days')
    `);
    
    console.log(`Cleaned up ${result.rowCount} old job entries.`);
    
  } catch (error) {
    console.error('Error cleaning up old jobs:', error);
  }
});

// Update job freshness - runs every hour
cron.schedule('0 * * * *', async () => {
  console.log('Checking job freshness...');
  
  try {
    // Get jobs that haven't been updated in 24 hours
    const staleJobs = await pgPool.query(`
      SELECT source_id, source_url
      FROM jobs
      WHERE source = 'JobsDB'
        AND updated_at < NOW() - INTERVAL '24 hours'
      ORDER BY updated_at ASC
      LIMIT 100
    `);
    
    if (staleJobs.rows.length > 0) {
      const scraper = new JobsDBScraper();
      await scraper.initialize();
      
      for (const job of staleJobs.rows) {
        try {
          const details = await scraper.getJobDetails(job.source_url);
          
          // Check if job still exists
          if (details && Object.keys(details).length > 0) {
            // Update job
            await pgPool.query(`
              UPDATE jobs
              SET updated_at = NOW()
              WHERE source_id = $1 AND source = 'JobsDB'
            `, [job.source_id]);
          } else {
            // Mark as expired
            await pgPool.query(`
              UPDATE jobs
              SET expired = true, updated_at = NOW()
              WHERE source_id = $1 AND source = 'JobsDB'
            `, [job.source_id]);
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`Error updating job ${job.source_id}:`, error);
        }
      }
      
      await scraper.close();
    }
    
  } catch (error) {
    console.error('Error checking job freshness:', error);
  }
});

// Helper functions

async function notifyScrapingComplete(jobCount) {
  // Implement your notification logic here
  // Could be webhook, email, Slack notification, etc.
  console.log(`Scraping completed: ${jobCount} jobs processed`);
  
  if (process.env.SLACK_WEBHOOK_URL) {
    try {
      await axios.post(process.env.SLACK_WEBHOOK_URL, {
        text: `JobsDB scraping completed: ${jobCount} jobs processed`
      });
    } catch (error) {
      console.error('Error sending Slack notification:', error);
    }
  }
}

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`JobsDB API service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await redis.quit();
  await pgPool.end();
  process.exit(0);
});

module.exports = app;