# Emissionary

A carbon emissions tracking application that analyzes grocery receipts using OCR and AI to help users understand their environmental impact.

## Overview

Emissionary is a full-stack web application that processes grocery receipts to calculate carbon emissions. It uses OCR technology to extract items from receipt images, then calculates emissions using a comprehensive food database. The app includes gamification features, competition elements, and detailed analytics to encourage sustainable shopping habits.

## Features

### Core Functionality
- **Receipt Upload & Processing**: Drag-and-drop interface for uploading receipt images
- **OCR Text Extraction**: AI-powered text recognition using PaddleOCR
- **Emissions Calculation**: Carbon footprint analysis using food production data
- **Item Categorization**: Automatic classification of food items by type
- **Data Visualization**: Charts and graphs showing emissions trends and breakdowns

### Gamification & Competition
- **Experience Points**: Earn XP for uploading receipts and making green choices
- **Achievement System**: Badges for milestones like streaks, total uploads, and low emissions
- **Leaderboards**: Compete with other users on emissions reduction
- **Streak Tracking**: Monitor consecutive days of receipt uploads
- **Level Progression**: Level up based on total experience points

### Analytics & Insights
- **Dashboard**: Overview of total emissions, trends, and comparisons
- **Category Breakdown**: See which food types contribute most to your footprint
- **Historical Data**: Track emissions over time with detailed charts
- **Comparison Tools**: Compare your emissions with averages
- **Actionable Tips**: Personalized recommendations for reducing emissions

### User Management
- **Authentication**: Secure login using Clerk
- **User Profiles**: Personal dashboards and progress tracking
- **Receipt History**: Complete history of uploaded receipts
- **Settings Management**: Customize preferences and goals

## Tech Stack

### Frontend
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Component library
- **Framer Motion**: Animations and transitions
- **Recharts**: Data visualization
- **Clerk**: Authentication and user management

### Backend
- **Python FastAPI**: OCR service backend
- **PaddleOCR**: Text extraction from images
- **Groq AI**: Enhanced item parsing and emissions estimation
- **PostgreSQL**: Database (via Supabase)
- **Prisma**: Database ORM

### Infrastructure
- **Supabase**: Database hosting and management
- **UploadThing**: File upload handling
- **Vercel**: Frontend deployment

## Project Structure

```
emissionary/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── dashboard/          # Main dashboard
│   │   ├── upload/            # Receipt upload interface
│   │   ├── competition/       # Gamification features
│   │   ├── history/           # Receipt history
│   │   ├── charts/            # Analytics and visualizations
│   │   └── settings/          # User settings
│   ├── components/            # React components
│   │   ├── dashboard/         # Dashboard-specific components
│   │   ├── upload/            # Upload interface components
│   │   ├── competition/       # Gamification components
│   │   └── ui/                # Reusable UI components
│   ├── lib/                   # Utilities and services
│   │   ├── services/          # Business logic services
│   │   ├── actions/           # Server actions
│   │   └── utils/             # Helper functions
│   └── styles/                # Global styles
├── ocr-service/               # Python OCR microservice
│   ├── app.py                 # FastAPI application
│   ├── main.py                # Service entry point
│   └── requirements.txt       # Python dependencies
├── prisma/                    # Database schema and migrations
└── public/                    # Static assets
```

## Quick Start

### Prerequisites
- Node.js 20+
- Python 3.8+
- PostgreSQL database (Supabase recommended)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd emissionary
pnpm install
```

### 2. Environment Configuration
Create a `.env.local` file:
```env
# Database
DATABASE_URL="your-supabase-database-url"
DIRECT_URL="your-supabase-direct-url"

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your-clerk-publishable-key"
CLERK_SECRET_KEY="your-clerk-secret-key"

# OCR Service
OCR_SERVICE_URL="http://localhost:8000"

# Optional: Enhanced AI features
GROQ_API_KEY="your-groq-api-key"
```

### 3. Database Setup
```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push
```

### 4. OCR Service Setup
```bash
cd ocr-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### 5. Start Development Server
```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the application.

## Database Schema

### Core Tables
- **users**: User profiles, authentication data, and gamification stats
- **receipts**: Receipt metadata (merchant, total, date, emissions)
- **receipt_items**: Individual items from receipts with emissions data
- **badges**: Available achievements and their requirements
- **user_achievements**: User progress towards badges
- **streaks**: Tracking of user streaks (uploads, green choices)

### Key Features
- **Gamification Fields**: Level, experience, points, streaks
- **Emissions Tracking**: Total and per-item carbon emissions
- **Achievement System**: Badge requirements and progress tracking
- **Streak Management**: Multiple streak types with current/longest tracking

## API Endpoints

### Frontend API Routes
- `POST /api/receipts/process` - Process uploaded receipt images
- `GET /api/emissions/stats` - Get user emissions statistics
- `POST /api/competition/leaderboard` - Get competition rankings
- `POST /api/gamification/leaderboard` - Get gamification rankings

### OCR Service Endpoints
- `POST /ocr` - Process receipt images with OCR
- `GET /health` - Service health check
- `POST /upload` - Direct file upload endpoint

## Gamification System

### Experience Points
- **Base Upload**: 10 XP per receipt
- **Green Choice Bonus**: +5 XP for low-emission receipts (< 5kg CO₂e)
- **Green Week Bonus**: +10 XP for weeks under 50kg CO₂e
- **Badge Rewards**: 10-500 XP depending on badge rarity
- **Level Up Bonus**: +50 XP for reaching new levels

### Achievement Categories
- **Upload Milestones**: First upload, upload streaks, total receipts
- **Emissions Goals**: Low emissions weeks, green choices
- **Engagement**: Early adopter, perfect weeks
- **Progress**: Total emissions milestones

### Competition Features
- **Leaderboards**: Ranked by points, level, and streaks
- **Real-time Updates**: Live competition data
- **Achievement Tracking**: Automatic progress monitoring
- **Streak Bonuses**: Rewards for consistent engagement

## Development

### Available Scripts
```bash
# Development
pnpm dev                    # Start Next.js development server
pnpm build                  # Build for production
pnpm start                  # Start production server

# Database
pnpm db:generate           # Generate Prisma client
pnpm db:push               # Push schema changes
pnpm db:studio             # Open Prisma Studio
pnpm db:seed               # Seed database with initial data

# OCR Service
pnpm ocr:install           # Install OCR dependencies
pnpm ocr:start             # Start OCR service
pnpm ocr:health            # Check OCR service health

# Testing
pnpm test                  # Run test suite
pnpm lint                  # Run ESLint
pnpm prettier              # Format code
```

### Code Quality
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting with Next.js configuration
- **Prettier**: Code formatting
- **Husky**: Git hooks for pre-commit checks

## Deployment

### Frontend (Vercel)
1. Connect repository to Vercel
2. Set environment variables
3. Deploy automatically on push

### OCR Service
Deploy to any Python hosting service:
- **Railway**: `railway up`
- **Render**: Web service with Python runtime
- **Docker**: Containerized deployment

### Database
Use Supabase for managed PostgreSQL with:
- Automatic backups
- Row-level security
- Real-time subscriptions
- Built-in authentication integration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Use Prettier for code formatting
- Write meaningful commit messages
- Test changes thoroughly
- Update documentation as needed

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For support or questions, contact the development team or open an issue on GitHub. 