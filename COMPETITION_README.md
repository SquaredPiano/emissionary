# 🏆 Competition & Achievements System

The Competition & Achievements system is the **standout feature** of our carbon emissions tracking platform, designed to gamify the user experience and drive engagement through badges, streaks, and competitive elements.

## 🎯 Overview

This system transforms carbon footprint tracking from a mundane task into an engaging, competitive experience where users:

- **Earn badges** for various achievements
- **Track streaks** for consistent behavior
- **Compete** on leaderboards
- **Level up** through experience points
- **Progress** towards environmental goals

## 🏅 Badge Categories

### 📄 Upload Master
- **First Upload** (Common) - Upload your first receipt
- **Upload Streak 3** (Common) - Upload receipts for 3 consecutive days
- **Upload Streak 7** (Rare) - Upload receipts for 7 consecutive days
- **Upload Streak 30** (Epic) - Upload receipts for 30 consecutive days
- **Receipt Collector 10** (Common) - Upload 10 receipts total
- **Receipt Collector 50** (Rare) - Upload 50 receipts total
- **Receipt Collector 100** (Epic) - Upload 100 receipts total

### 🌱 Green Pioneer
- **Low Emissions Week** (Common) - Have a week with emissions below 50kg CO₂e
- **Green Weeks 5** (Rare) - Have 5 weeks with emissions below 50kg CO₂e
- **Green Weeks 10** (Epic) - Have 10 weeks with emissions below 50kg CO₂e
- **Green Choice 10** (Common) - Make 10 low-emission food choices
- **Green Choice 50** (Rare) - Make 50 low-emission food choices

### 🏆 Milestone Master
- **Carbon Tracker 1000** (Rare) - Track 1000kg CO₂e total emissions
- **Perfect Week** (Epic) - Have a perfect green week
- **Early Adopter** (Legendary) - Be an early adopter of carbon tracking

## 🚀 Getting Started

### 1. Database Setup
```bash
# Push the competition schema to your database
npx prisma db push

# Generate Prisma client
npx prisma generate
```

### 2. Initialize Competition System
```bash
# Run the competition setup script
node scripts/setup-competition.js
```

### 3. Start the Application
```bash
# Start the development server
pnpm dev
```

### 4. Access Competition Features
- **Main Dashboard**: `/dashboard` - Includes competition widget
- **Competition Hub**: `/competition` - Dedicated competition page
- **Badges**: Automatically tracked and displayed
- **Leaderboard**: Real-time rankings

## 🎮 How It Works

### Experience Points (XP) System
- **Base XP**: 10 points per receipt upload
- **Green Choice Bonus**: +5 XP for low-emission receipts (< 5kg CO₂e)
- **Green Week Bonus**: +10 XP for weeks under 50kg CO₂e
- **Badge Rewards**: Varies by badge rarity (10-500 XP)
- **Level Up Bonus**: +50 XP for reaching new levels

### Level Progression
- **Level 1**: 0-99 XP
- **Level 2**: 100-199 XP
- **Level 3**: 200-299 XP
- And so on...

### Streak Tracking
- **Upload Streaks**: Consecutive days of receipt uploads
- **Green Choice Streaks**: Consecutive low-emission choices
- **Longest Streak**: Best historical performance

### Achievement Tracking
The system automatically tracks user progress for:
- **Receipt Uploads**: Counts total uploads and daily streaks
- **Emissions Data**: Monitors weekly and total emissions
- **Green Choices**: Tracks low-emission food selections
- **User Activity**: Tracks engagement and consistency

## 🎨 UI Components

### CompetitionDashboard
- **Level Display**: Shows current level and XP progress
- **Achievement Grid**: Displays earned and in-progress badges
- **Streak Information**: Current and longest streak tracking
- **Progress Indicators**: Visual progress bars for next achievements

### Leaderboard
- **Top Users**: Ranked by total points, level, and streaks
- **User Profiles**: Avatars, names, and stats
- **Ranking Badges**: Gold, silver, bronze for top 3
- **Animated Entries**: Smooth animations for engagement

### ProgressToNextBadge
- **Level Progress**: Visual XP bar and level information
- **Next Achievement**: Shows progress towards next badge
- **Motivational Messages**: Dynamic encouragement based on progress
- **Achievement Stats**: Completion rates and statistics

### CompetitionWidget
- **Dashboard Integration**: Compact competition overview
- **Quick Stats**: Level, points, streak, badges
- **Recent Achievements**: Latest earned badges
- **Call to Action**: Direct link to full competition page

## 🔧 Technical Implementation

### Database Schema
```sql
-- User competition fields
ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN experience INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN total_points INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN current_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN longest_streak INTEGER DEFAULT 0;
-- ... and more

-- Badges table
CREATE TABLE badges (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  rarity badge_rarity NOT NULL,
  points INTEGER DEFAULT 10,
  requirement badge_requirement NOT NULL
);

-- User achievements table
CREATE TABLE user_achievements (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  badge_id TEXT REFERENCES badges(id),
  progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE
);
```

### API Endpoints
- `GET /api/competition` - Get user competition data
- `POST /api/competition` - Process competition actions
- `GET /api/competition/leaderboard` - Get leaderboard data

### Service Layer
- `CompetitionService` - Core business logic
- Achievement tracking and progress calculation
- XP and level management
- Streak calculations
- Leaderboard generation

## 🎯 Features

### Real-time Updates
- **Achievement Notifications**: Pop-up modals when badges are earned
- **Progress Updates**: Live progress bars and status indicators
- **Leaderboard Refresh**: Automatic updates as users progress
- **Level Up Celebrations**: Special animations for level progression

### Integration Points
- **Receipt Upload**: Automatically triggers streak updates and achievement checks
- **Dashboard**: Displays current level, achievements, and progress
- **Analytics**: Competition data integrated with emissions tracking

### Responsive Design
- **Mobile Optimized**: Works seamlessly on all devices
- **Dark Mode Support**: Consistent with app theme
- **Accessibility**: Screen reader friendly and keyboard navigable

## 🎉 Success Metrics

### Engagement Metrics
- **Daily Active Users**: Users uploading receipts daily
- **Achievement Completion Rate**: Percentage of users earning badges
- **Streak Retention**: Users maintaining upload streaks
- **Leaderboard Participation**: Users checking rankings

### Impact Metrics
- **Carbon Reduction**: Correlation between competition and emissions reduction
- **User Retention**: Long-term engagement through gamification
- **Feature Adoption**: Usage of competition features
- **User Satisfaction**: Feedback on competition experience

## 🛠️ Troubleshooting

### Common Issues
1. **Badges Not Updating**: Check database connection and API endpoints
2. **Streaks Not Counting**: Verify date calculations and timezone settings
3. **Leaderboard Not Loading**: Ensure proper authentication and data access
4. **Progress Bars Not Animating**: Check CSS animations and JavaScript errors

### Debug Steps
1. Check browser console for JavaScript errors
2. Verify API responses in Network tab
3. Check database for achievement data
4. Validate user authentication status

## 📚 Resources

### Documentation
- [Prisma Schema Documentation](https://www.prisma.io/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Framer Motion Animations](https://www.framer.com/motion/)

### Related Files
- `src/lib/services/competition.ts` - Core competition service
- `src/components/competition/` - UI components
- `src/app/api/competition/` - API endpoints
- `prisma/schema.prisma` - Database schema
- `scripts/setup-competition.js` - Setup script

---

🏆 **Ready to compete and earn badges while saving the planet!** 🌱 