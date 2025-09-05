# serviceHub Clone - Backend Contracts

## API Contracts

### 1. Job Management APIs

#### POST /api/jobs
Create a new job posting
```json
Request:
{
  "title": "Kitchen renovation needed",
  "description": "Looking for a skilled professional to renovate my kitchen...",
  "category": "Carpentry & Joinery",
  "location": "London",
  "postcode": "SW1A 1AA",
  "budget_min": 5000,
  "budget_max": 10000,
  "timeline": "2-4 weeks",
  "homeowner_name": "John Smith",
  "homeowner_email": "john@email.com",
  "homeowner_phone": "07123456789"
}

Response:
{
  "id": "job_123",
  "status": "active",
  "created_at": "2025-01-07T10:00:00Z",
  "expires_at": "2025-02-07T10:00:00Z"
}
```

#### GET /api/jobs
Get jobs (with filters)
```json
Query Params: ?category=plumbing&location=london&page=1&limit=10

Response:
{
  "jobs": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 245,
    "pages": 25
  }
}
```

#### GET /api/jobs/:id
Get single job details

### 2. Tradesperson Management APIs

#### POST /api/tradespeople
Register a new tradesperson
```json
Request:
{
  "name": "Mike Johnson",
  "email": "mike@plumber.com",
  "phone": "07987654321",
  "trade_categories": ["Plumbing", "Heating"],
  "location": "Manchester",
  "postcode": "M1 1AA",
  "experience_years": 15,
  "company_name": "Johnson Plumbing Ltd",
  "description": "Professional plumber with 15 years experience...",
  "certifications": ["Gas Safe", "City & Guilds"]
}
```

#### GET /api/tradespeople
Search tradespeople
```json
Query Params: ?category=plumbing&location=manchester&radius=10

Response:
{
  "tradespeople": [...],
  "total": 156
}
```

#### GET /api/tradespeople/:id
Get tradesperson profile with reviews

### 3. Quote Management APIs

#### POST /api/quotes
Submit a quote for a job
```json
Request:
{
  "job_id": "job_123",
  "tradesperson_id": "tp_456",
  "price": 7500,
  "message": "I'd be happy to help with your kitchen renovation...",
  "estimated_duration": "3 weeks",
  "start_date": "2025-01-15"
}
```

#### GET /api/jobs/:job_id/quotes
Get all quotes for a job

### 4. Review Management APIs

#### POST /api/reviews
Submit a review
```json
Request:
{
  "job_id": "job_123",
  "tradesperson_id": "tp_456",
  "rating": 5,
  "title": "Excellent kitchen renovation",
  "comment": "Professional work, completed on time...",
  "homeowner_name": "John Smith"
}
```

#### GET /api/reviews
Get reviews (with filters)

### 5. Statistics APIs

#### GET /api/stats
Get platform statistics
```json
Response:
{
  "total_tradespeople": 251959,
  "total_categories": 40,
  "total_reviews": 2630834,
  "average_rating": 4.8
}
```

## Mock Data Replacement Plan

### Currently Mocked in /app/frontend/src/mock/data.js:

1. **stats** → Replace with `/api/stats`
2. **popularTrades** → Replace with `/api/categories` 
3. **customerReviews** → Replace with `/api/reviews?limit=4&featured=true`
4. **howItWorksSteps** → Keep as static content
5. **tradespeopleBeenefits** → Keep as static content
6. **appFeatures** → Keep as static content
7. **footerSections** → Keep as static content

## Backend Implementation Plan

### 1. Database Models (MongoDB)

#### Job Model
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  category: String,
  location: String,
  postcode: String,
  budget_min: Number,
  budget_max: Number,
  timeline: String,
  homeowner: {
    name: String,
    email: String,
    phone: String
  },
  status: String, // 'active', 'completed', 'cancelled'
  created_at: Date,
  updated_at: Date,
  expires_at: Date
}
```

#### Tradesperson Model
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  phone: String,
  trade_categories: [String],
  location: String,
  postcode: String,
  experience_years: Number,
  company_name: String,
  description: String,
  certifications: [String],
  profile_image: String,
  average_rating: Number,
  total_reviews: Number,
  total_jobs: Number,
  verified: Boolean,
  created_at: Date,
  updated_at: Date
}
```

#### Quote Model
```javascript
{
  _id: ObjectId,
  job_id: ObjectId,
  tradesperson_id: ObjectId,
  price: Number,
  message: String,
  estimated_duration: String,
  start_date: Date,
  status: String, // 'pending', 'accepted', 'rejected'
  created_at: Date,
  updated_at: Date
}
```

#### Review Model
```javascript
{
  _id: ObjectId,
  job_id: ObjectId,
  tradesperson_id: ObjectId,
  rating: Number,
  title: String,
  comment: String,
  homeowner_name: String,
  location: String,
  featured: Boolean,
  created_at: Date,
  updated_at: Date
}
```

### 2. Business Logic

- **Job Posting**: Validate job data, auto-expire after 30 days
- **Search**: Location-based search with radius, category filtering
- **Quotes**: Only verified tradespeople can quote, max 5 quotes per job
- **Reviews**: Only after job completion, one review per job
- **Statistics**: Real-time calculation of platform stats

### 3. Seed Data

- Create 50+ sample tradespeople across different categories
- Generate 100+ sample jobs in various stages
- Create realistic reviews with UK locations
- Populate all major trade categories

## Frontend Integration Plan

### 1. API Integration Points

- **HomePage.jsx**: Load real stats from `/api/stats`
- **HeroSection.jsx**: Submit search to `/api/jobs/search`
- **PopularTrades.jsx**: Load categories from `/api/categories`
- **ReviewsSection.jsx**: Load featured reviews from `/api/reviews`

### 2. New Pages to Add

- Job posting form (`/post-job`)
- Job search results (`/jobs`)
- Job details page (`/jobs/:id`)
- Tradesperson registration (`/join`)
- Tradesperson profiles (`/tradespeople/:id`)
- Search results (`/search`)

### 3. State Management

- Add React Context for jobs, search, user state
- Implement loading states and error handling
- Add form validation and submission handling

## Success Criteria

1. ✅ Job posting workflow works end-to-end
2. ✅ Tradesperson registration and profiles functional
3. ✅ Search and filtering works with real data
4. ✅ Quote system allows tradespeople to respond to jobs
5. ✅ Review system generates authentic feedback
6. ✅ Real-time statistics reflect actual platform usage
7. ✅ All forms validate and handle errors gracefully
8. ✅ Responsive design maintained across all new pages