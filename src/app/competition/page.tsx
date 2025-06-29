import { Suspense } from 'react';
import { CompetitionDashboard } from '@/components/competition/competition-dashboard';
import { Leaderboard } from '@/components/competition/leaderboard';
import { ProgressToNextBadge } from '@/components/competition/progress-to-next-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, Target, TrendingUp, Flame, Award, Star, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

// Add mock data for demo
const mockCompetitionData = {
  level: 5,
  experience: 420,
  nextLevelExperience: 500,
  progressToNextLevel: 0.84,
  totalPoints: 2150,
  currentStreak: 7,
  longestStreak: 21,
  achievements: [
    {
      id: '1',
      name: 'First Upload',
      description: 'Upload your first receipt',
      icon: '📄',
      rarity: 'COMMON',
      points: 10,
      requirement: 'FIRST_UPLOAD',
      isCompleted: true,
      progress: 1,
      requirementValue: 1,
      requirementDescription: 'Upload your first receipt',
    },
    {
      id: '2',
      name: 'Upload Streak 3',
      description: 'Upload receipts for 3 consecutive days',
      icon: '🔥',
      rarity: 'COMMON',
      points: 15,
      requirement: 'UPLOAD_STREAK_3',
      isCompleted: true,
      progress: 3,
      requirementValue: 3,
      requirementDescription: 'Upload receipts for 3 consecutive days',
    },
    {
      id: '3',
      name: 'Green Week',
      description: 'Have a week with emissions below 50kg CO₂e',
      icon: '🌱',
      rarity: 'RARE',
      points: 40,
      requirement: 'LOW_EMISSIONS_WEEK',
      isCompleted: false,
      progress: 0,
      requirementValue: 1,
      requirementDescription: 'Have a week with emissions below 50kg CO₂e',
    },
    {
      id: '4',
      name: 'Milestone Master',
      description: 'Reach 1000kg CO₂e total emissions',
      icon: '🏆',
      rarity: 'EPIC',
      points: 100,
      requirement: 'TOTAL_EMISSIONS_1000',
      isCompleted: false,
      progress: 800,
      requirementValue: 1000,
      requirementDescription: 'Track 1000kg CO₂e total emissions',
    },
  ],
  longestStreak: 21,
};

const mockAchievements = mockCompetitionData.achievements;
const mockLevel = mockCompetitionData.level;
const mockExperience = mockCompetitionData.experience;
const mockNextLevelExperience = mockCompetitionData.nextLevelExperience;

// Add mock leaderboard data for demo
const mockLeaderboard = [
  {
    id: '1',
    name: 'Alice',
    level: 7,
    points: 3200,
    avatar: '🦸‍♀️',
    isCurrentUser: false,
  },
  {
    id: '2',
    name: 'Bob',
    level: 6,
    points: 2950,
    avatar: '🧑‍🚀',
    isCurrentUser: true,
  },
  {
    id: '3',
    name: 'Charlie',
    level: 5,
    points: 2150,
    avatar: '🦸‍♂️',
    isCurrentUser: false,
  },
  {
    id: '4',
    name: 'Diana',
    level: 4,
    points: 1800,
    avatar: '🧙‍♀️',
    isCurrentUser: false,
  },
  {
    id: '5',
    name: 'Eve',
    level: 3,
    points: 1200,
    avatar: '🧝‍♀️',
    isCurrentUser: false,
  },
];

export default function CompetitionPage() {
  return (
    <div className="relative flex flex-col gap-8 w-full max-w-7xl mx-auto px-4 pb-12">
      {/* Back to Dashboard Button */}
      <div className="fixed left-4 top-4 z-50">
        <Button
          variant="ghost"
          size="lg"
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-background/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700 shadow-md backdrop-blur text-green-600 dark:text-green-300 hover:bg-green-100/80 dark:hover:bg-green-900/40 transition-all"
          asChild
        >
          <a href="/dashboard">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-semibold">Back to Dashboard</span>
          </a>
        </Button>
      </div>

      {/* Page Header */}
      <div className="text-center py-8">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Trophy className="h-12 w-12 text-yellow-500" />
          <h1 className="text-4xl font-bold text-black dark:text-yellow-400">Competition Hub</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Track your progress, earn badges, and compete with others on your journey to reduce carbon emissions
        </p>
      </div>

      {/* Section 1: Focused Competition */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Competition Dashboard */}
        <div className="md:col-span-2 space-y-8">
          <Suspense fallback={<LoadingScreen />}>
            <CompetitionDashboard initialData={mockCompetitionData} />
          </Suspense>
        </div>
        {/* Achievements & Level Progress */}
        <div className="space-y-6">
          <Suspense fallback={<LoadingScreen />}>
            <ProgressToNextBadge 
              achievements={mockAchievements}
              currentLevel={mockLevel}
              experience={mockExperience}
              nextLevelExperience={mockNextLevelExperience}
            />
          </Suspense>
        </div>
      </div>

      {/* Section 2: Leaderboard */}
      <div className="w-full mt-8">
        <h2 className="text-2xl font-bold text-black dark:text-yellow-400 mb-4">Leaderboard</h2>
        <Leaderboard leaderboard={mockLeaderboard} />
      </div>

      {/* Section 3: Info, How-To, Badges, Call to Action */}
      <div className="mt-12">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-blue-500" />
              <span>How It Works & Badge Categories</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* How It Works */}
            <div className="mb-8">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                  <div>
                    <p className="font-medium">Upload Receipts</p>
                    <p className="text-muted-foreground">Start tracking your carbon footprint</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                  <div>
                    <p className="font-medium">Earn Experience</p>
                    <p className="text-muted-foreground">Gain XP for every upload and green choice</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
                  <div>
                    <p className="font-medium">Unlock Badges</p>
                    <p className="text-muted-foreground">Complete achievements and earn badges</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</div>
                  <div>
                    <p className="font-medium">Compete & Share</p>
                    <p className="text-muted-foreground">Climb the leaderboard and inspire others</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Badge Categories */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-center mb-8 text-black dark:text-yellow-400">Badge Categories</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="text-center hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="text-4xl mb-4">📄</div>
                    <h3 className="font-semibold mb-2">Upload Master</h3>
                    <p className="text-sm text-muted-foreground">Earn badges for consistent receipt uploads</p>
                  </CardContent>
                </Card>
                <Card className="text-center hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="text-4xl mb-4">🔥</div>
                    <h3 className="font-semibold mb-2">Streak Champion</h3>
                    <p className="text-sm text-muted-foreground">Maintain daily streaks and earn rewards</p>
                  </CardContent>
                </Card>
                <Card className="text-center hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="text-4xl mb-4">🌱</div>
                    <h3 className="font-semibold mb-2">Green Pioneer</h3>
                    <p className="text-sm text-muted-foreground">Make eco-friendly choices and earn green badges</p>
                  </CardContent>
                </Card>
                <Card className="text-center hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="text-4xl mb-4">🏆</div>
                    <h3 className="font-semibold mb-2">Milestone Master</h3>
                    <p className="text-sm text-muted-foreground">Reach significant milestones in your journey</p>
                  </CardContent>
                </Card>
              </div>
            </div>
            {/* Call to Action */}
            <div className="text-center py-8">
              <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-0">
                <CardContent className="pt-8">
                  <div className="text-4xl mb-4">🌱</div>
                  <h3 className="text-2xl font-bold mb-4">Ready to Start Your Journey?</h3>
                  <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                    Join thousands of users tracking their carbon footprint and earning badges. 
                    Every receipt upload brings you closer to your next achievement!
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a 
                      href="/upload" 
                      className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                      Upload Receipt
                    </a>
                    <a 
                      href="/dashboard" 
                      className="inline-flex items-center justify-center px-6 py-3 border border-input bg-background rounded-lg font-medium hover:bg-accent transition-colors"
                    >
                      View Dashboard
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 