const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

const badges = [
  // Upload Master badges
  {
    name: 'First Upload',
    description: 'Upload your first receipt',
    icon: '📄',
    rarity: 'COMMON',
    points: 10,
    requirement: 'FIRST_UPLOAD'
  },
  {
    name: 'Upload Streak 3',
    description: 'Upload receipts for 3 consecutive days',
    icon: '🔥',
    rarity: 'COMMON',
    points: 15,
    requirement: 'UPLOAD_STREAK_3'
  },
  {
    name: 'Upload Streak 7',
    description: 'Upload receipts for 7 consecutive days',
    icon: '🔥',
    rarity: 'RARE',
    points: 25,
    requirement: 'UPLOAD_STREAK_7'
  },
  {
    name: 'Upload Streak 30',
    description: 'Upload receipts for 30 consecutive days',
    icon: '🔥',
    rarity: 'EPIC',
    points: 100,
    requirement: 'UPLOAD_STREAK_30'
  },
  {
    name: 'Receipt Collector 10',
    description: 'Upload 10 receipts total',
    icon: '📚',
    rarity: 'COMMON',
    points: 20,
    requirement: 'TOTAL_RECEIPTS_10'
  },
  {
    name: 'Receipt Collector 50',
    description: 'Upload 50 receipts total',
    icon: '📚',
    rarity: 'RARE',
    points: 50,
    requirement: 'TOTAL_RECEIPTS_50'
  },
  {
    name: 'Receipt Collector 100',
    description: 'Upload 100 receipts total',
    icon: '📚',
    rarity: 'EPIC',
    points: 150,
    requirement: 'TOTAL_RECEIPTS_100'
  },

  // Green Pioneer badges
  {
    name: 'Low Emissions Week',
    description: 'Have a week with emissions below 50kg CO₂e',
    icon: '🌱',
    rarity: 'COMMON',
    points: 20,
    requirement: 'LOW_EMISSIONS_WEEK'
  },
  {
    name: 'Green Weeks 5',
    description: 'Have 5 weeks with emissions below 50kg CO₂e',
    icon: '🌱',
    rarity: 'RARE',
    points: 75,
    requirement: 'GREEN_WEEKS_5'
  },
  {
    name: 'Green Weeks 10',
    description: 'Have 10 weeks with emissions below 50kg CO₂e',
    icon: '🌱',
    rarity: 'EPIC',
    points: 200,
    requirement: 'GREEN_WEEKS_10'
  },
  {
    name: 'Green Choice 10',
    description: 'Make 10 low-emission food choices',
    icon: '🥗',
    rarity: 'COMMON',
    points: 30,
    requirement: 'GREEN_CHOICES_10'
  },
  {
    name: 'Green Choice 50',
    description: 'Make 50 low-emission food choices',
    icon: '🥗',
    rarity: 'RARE',
    points: 100,
    requirement: 'GREEN_CHOICES_50'
  },

  // Milestone Master badges
  {
    name: 'Carbon Tracker 1000',
    description: 'Track 1000kg CO₂e total emissions',
    icon: '📊',
    rarity: 'RARE',
    points: 80,
    requirement: 'TOTAL_EMISSIONS_1000'
  },
  {
    name: 'Perfect Week',
    description: 'Have a perfect green week',
    icon: '⭐',
    rarity: 'EPIC',
    points: 150,
    requirement: 'PERFECT_WEEK'
  },
  {
    name: 'Early Adopter',
    description: 'Be an early adopter of carbon tracking',
    icon: '🚀',
    rarity: 'LEGENDARY',
    points: 500,
    requirement: 'EARLY_ADOPTER'
  }
];

async function setupCompetition() {
  try {
    console.log('🚀 Setting up Competition & Achievements system...');

    // Check if badges already exist
    const existingBadges = await prisma.badge.findMany();
    
    if (existingBadges.length > 0) {
      console.log(`✅ Found ${existingBadges.length} existing badges`);
      
      // Update existing badges to ensure they match our schema
      for (const badge of badges) {
        await prisma.badge.upsert({
          where: { name: badge.name },
          update: {
            description: badge.description,
            icon: badge.icon,
            rarity: badge.rarity,
            points: badge.points,
            requirement: badge.requirement
          },
          create: badge
        });
      }
      
      console.log('✅ Updated existing badges');
    } else {
      // Create all badges
      console.log('📝 Creating badges...');
      
      for (const badge of badges) {
        await prisma.badge.create({
          data: badge
        });
      }
      
      console.log(`✅ Created ${badges.length} badges`);
    }

    // Initialize user competition data for existing users
    console.log('👥 Initializing user competition data...');
    
    const users = await prisma.user.findMany({
      where: {
        level: null // Users without competition data
      }
    });

    if (users.length > 0) {
      console.log(`Found ${users.length} users to initialize`);
      
      for (const user of users) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            level: 1,
            experience: 0,
            totalPoints: 0,
            currentStreak: 0,
            longestStreak: 0,
            totalReceipts: 0,
            totalEmissions: 0,
            greenChoices: 0,
            weeklyGreenWeeks: 0
          }
        });
      }
      
      console.log('✅ Initialized user competition data');
    } else {
      console.log('✅ All users already have competition data');
    }

    console.log('🎉 Competition & Achievements system setup complete!');
    console.log('');
    console.log('📋 Available badges:');
    badges.forEach((badge, index) => {
      console.log(`${index + 1}. ${badge.icon} ${badge.name} (${badge.rarity}) - ${badge.points} XP`);
    });

  } catch (error) {
    console.error('❌ Error setting up competition system:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
setupCompetition(); 