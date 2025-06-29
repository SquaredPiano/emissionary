# 🎮 Gamification System - Emissionary

A comprehensive gamification system that makes carbon footprint tracking engaging and rewarding through achievements, badges, streaks, and leaderboards.

## 🌟 Features

### 🏆 Achievement System
- **10 Unique Badges** across 4 categories
- **4 Rarity Levels**: Common, Rare, Epic, Legendary
- **Real-time Progress Tracking** with visual progress bars
- **Achievement Notifications** when badges are unlocked

### 📈 Level Progression
- **Experience Points (XP)** earned through achievements
- **Level System** with increasing XP requirements
- **Progress Visualization** showing XP to next level
- **Total Points Tracking** for leaderboard rankings

### 🔥 Streak System
- **Upload Streaks** for consecutive days of receipt uploads
- **Longest Streak Tracking** to maintain personal records
- **Streak Maintenance** with daily activity tracking
- **Visual Streak Indicators** in the dashboard

### 🏅 Leaderboard
- **Global Rankings** based on total points and level
- **Top 10 Users** display with avatars and stats
- **Real-time Updates** as users earn achievements
- **Competitive Element** to encourage engagement

### 📊 Progress Tracking
- **Next Achievement Preview** with progress bars
- **Motivational Messages** based on progress percentage
- **Achievement Categories** with completion rates
- **Quick Tips** for earning achievements faster

## 🎯 Achievement Categories

### 📄 Upload Master
- **First Upload** (Common) - Upload your first receipt
- **Getting Started** (Common) - Upload 5 receipts
- **Receipt Collector** (Rare) - Upload 25 receipts
- **Receipt Master** (Epic) - Upload 100 receipts

### 🔥 Streak Champion
- **Week Warrior** (Rare) - Maintain a 7-day upload streak
- **Month Master** (Epic) - Maintain a 30-day upload streak

### 🌱 Eco Warrior
- **Green Week** (Rare) - Have a week with emissions below 50kg CO₂e
- **Eco Champion** (Epic) - Have 5 weeks with emissions below 50kg CO₂e

### 🏆 Milestone Master
- **Carbon Conscious** (Rare) - Track 1000kg CO₂e total emissions
- **Green Pioneer** (Legendary) - Make 50 green choices

## 🚀 Getting Started

### 1. Database Setup
```bash
# Push the gamification schema to your database
npx prisma db push

# Generate Prisma client
npx prisma generate
```

### 2. Initialize Achievements
```bash
# Run the gamification setup script
node scripts/setup-gamification.js
```

### 3. Start the Application
```bash
# Start the development server
pnpm dev
```

### 4. Access Gamification Features
- **Main Dashboard**: `/dashboard` - Includes gamification section
- **Gamification Hub**: `/gamification` - Dedicated gamification page
- **Achievements**: Automatically tracked and displayed

## 🎮 How It Works

### Achievement Tracking
The system automatically tracks user progress for:
- **Receipt Uploads**: Counts total uploads and daily streaks
- **Emissions Data**: Monitors weekly and total emissions
- **User Activity**: Tracks engagement and consistency

### Real-time Updates
- **Achievement Notifications**: Pop-up modals when badges are earned
- **Progress Updates**: Live progress bars and status indicators
- **Leaderboard Refresh**: Automatic updates as users progress

### Integration Points
- **Receipt Upload**: Automatically triggers streak updates and achievement checks
- **Dashboard**: Displays current level, achievements, and progress
- **Analytics**: Gamification data integrated with emissions tracking

## 🎨 UI Components

### GamificationDashboard
- **Level Display**: Shows current level and XP progress
- **Achievement Grid**: Displays earned and in-progress achievements
- **Streak Information**: Current and longest streak tracking
- **Progress Indicators**: Visual progress bars for next achievements

### Leaderboard
- **User Rankings**: Top users with avatars and stats
- **Rank Badges**: Gold, silver, bronze indicators for top 3
- **Real-time Data**: Live updates from database

### ProgressToNextBadge
- **Achievement Preview**: Shows next achievable badge
- **Progress Visualization**: Animated progress bars
- **Motivational Messages**: Encouraging feedback based on progress
- **Quick Tips**: Helpful suggestions for earning achievements

## 🔧 Technical Implementation

### Database Schema
```sql
-- User gamification fields
ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN experience INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN current_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN longest_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN total_points INTEGER DEFAULT 0;

-- Achievements table
CREATE TABLE achievements (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT NOT NULL,
    rarity TEXT NOT NULL,
    points INTEGER DEFAULT 10,
    requirement TEXT NOT NULL,
    requirement_value INTEGER NOT NULL
);

-- User achievements tracking
CREATE TABLE user_achievements (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    achievement_id TEXT REFERENCES achievements(id),
    earned_at TIMESTAMP DEFAULT NOW(),
    progress INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE
);

-- Streak tracking
CREATE TABLE user_streaks (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    type TEXT NOT NULL,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date TIMESTAMP
);
```

### API Endpoints
- `GET /api/gamification` - Get user gamification data
- `POST /api/gamification` - Update streaks and process achievements
- `GET /api/gamification/leaderboard` - Get leaderboard data

### Service Layer
- **GamificationService**: Core business logic for achievements and streaks
- **Achievement Processing**: Automatic achievement checking and awarding
- **Streak Management**: Daily streak tracking and updates
- **Progress Calculation**: Real-time progress computation

## 🎯 Achievement Requirements

### Upload Count Achievements
- **First Upload**: 1 receipt
- **Getting Started**: 5 receipts
- **Receipt Collector**: 25 receipts
- **Receipt Master**: 100 receipts

### Streak Achievements
- **Week Warrior**: 7 consecutive days
- **Month Master**: 30 consecutive days

### Emissions Achievements
- **Green Week**: 1 week below 50kg CO₂e
- **Eco Champion**: 5 weeks below 50kg CO₂e
- **Carbon Conscious**: 1000kg CO₂e total tracked

### Social Achievements
- **Green Pioneer**: 50 green choices (mock implementation)

## 🎨 Visual Design

### Color Scheme
- **Common**: Gray (#6B7280)
- **Rare**: Blue (#3B82F6)
- **Epic**: Purple (#8B5CF6)
- **Legendary**: Yellow (#EAB308)

### Animations
- **Progress Bars**: Smooth animations with color transitions
- **Achievement Unlocks**: Scale and fade animations
- **Leaderboard**: Staggered entrance animations
- **Streak Indicators**: Pulsing flame animations

### Responsive Design
- **Mobile-First**: Optimized for all screen sizes
- **Touch-Friendly**: Large touch targets for mobile
- **Adaptive Layout**: Grid systems that work on all devices

## 🚀 Future Enhancements

### Planned Features
- **Seasonal Events**: Time-limited achievement challenges
- **Social Features**: Share achievements on social media
- **Team Challenges**: Group-based emission reduction goals
- **Custom Badges**: User-created achievement categories
- **Achievement Trading**: Exchange duplicate achievements
- **Advanced Analytics**: Detailed progress insights

### Technical Improvements
- **Real-time Updates**: WebSocket integration for live updates
- **Offline Support**: Achievement tracking without internet
- **Performance Optimization**: Caching and lazy loading
- **Analytics Integration**: Detailed user behavior tracking

## 🎉 Success Metrics

### Engagement Metrics
- **Daily Active Users**: Users uploading receipts daily
- **Achievement Completion Rate**: Percentage of users earning badges
- **Streak Retention**: Users maintaining upload streaks
- **Leaderboard Participation**: Users checking rankings

### Impact Metrics
- **Carbon Reduction**: Correlation between gamification and emissions reduction
- **User Retention**: Long-term engagement through gamification
- **Feature Adoption**: Usage of gamification features
- **User Satisfaction**: Feedback on gamification experience

## 🛠️ Troubleshooting

### Common Issues
1. **Achievements Not Updating**: Check database connection and API endpoints
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
- `src/lib/services/gamification.ts` - Core gamification service
- `src/components/gamification/` - UI components
- `src/app/api/gamification/` - API endpoints
- `prisma/schema.prisma` - Database schema
- `scripts/setup-gamification.js` - Setup script

---

🎮 **Ready to gamify your carbon footprint tracking!** 🌱🏆

The gamification system transforms the mundane task of tracking receipts into an engaging, rewarding experience that encourages sustainable behavior through achievements, competition, and progress visualization. 