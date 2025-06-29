import { Suspense } from 'react';
import { GamificationDashboard } from '@/components/gamification/gamification-dashboard';
import { Leaderboard } from '@/components/gamification/leaderboard';
import { ProgressToNextBadge } from '@/components/gamification/progress-to-next-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, Target, TrendingUp } from 'lucide-react';

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

export default function GamificationPage() {
  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto px-4 pb-12">
      {/* Page Header */}
      <div className="text-center py-8">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Trophy className="h-12 w-12 text-yellow-500" />
          <h1 className="text-4xl font-bold text-black dark:text-yellow-400">Gamification Hub</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Track your progress, earn achievements, and compete with others on your journey to reduce carbon emissions
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Gamification Dashboard */}
        <div className="lg:col-span-2 space-y-8">
          <Suspense fallback={<LoadingScreen />}>
            <GamificationDashboard />
          </Suspense>
        </div>

        {/* Right Column - Progress and Leaderboard */}
        <div className="space-y-8">
          {/* Progress to Next Badge */}
          <Suspense fallback={<LoadingScreen />}>
            <ProgressToNextBadge 
              achievements={[]} // This will be populated by the component
              currentLevel={1}
              experience={0}
              nextLevelExperience={100}
            />
          </Suspense>

          {/* Leaderboard */}
          <Suspense fallback={<LoadingScreen />}>
            <Leaderboard limit={5} />
          </Suspense>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span>Quick Stats</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Users</span>
                  <span className="font-semibold">1,234</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Achievements Earned</span>
                  <span className="font-semibold">5,678</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total CO₂ Saved</span>
                  <span className="font-semibold">12.5 tons</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Streaks</span>
                  <span className="font-semibold">892</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-blue-500" />
                <span>How It Works</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Upload Receipts</p>
                    <p className="text-muted-foreground">Earn XP and maintain streaks by uploading daily</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Track Emissions</p>
                    <p className="text-muted-foreground">Monitor your carbon footprint and earn green badges</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Earn Achievements</p>
                    <p className="text-muted-foreground">Complete challenges and unlock rare badges</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <p className="font-medium">Compete & Share</p>
                    <p className="text-muted-foreground">Climb the leaderboard and inspire others</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Achievement Categories */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-center mb-8 text-black dark:text-yellow-400">Achievement Categories</h2>
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
              <h3 className="font-semibold mb-2">Eco Warrior</h3>
              <p className="text-sm text-muted-foreground">Reduce emissions and earn green badges</p>
            </CardContent>
          </Card>
          
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="font-semibold mb-2">Milestone Master</h3>
              <p className="text-sm text-muted-foreground">Reach significant milestones and achievements</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center py-12">
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-0">
          <CardContent className="pt-8">
            <div className="text-4xl mb-4">🌱</div>
            <h3 className="text-2xl font-bold mb-4">Ready to Start Your Journey?</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join thousands of users tracking their carbon footprint and earning achievements. 
              Every receipt upload brings you closer to your next badge!
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
    </div>
  );
} 