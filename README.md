# Emissionary

Emissionary is an app to detect your carbon emissions from your receipts. It uses data from your receipt to find your carbon emissions and compares your grocery carbon emissions with the average household.

## Features

- User authentication handled by [Clerk](https://clerk.com/)
- Database management with [Prisma](https://prisma.io/) and PostgreSQL
- Modern UI built with [Next.js](https://nextjs.org/), [React](https://reactjs.org/), and [Tailwind CSS](https://tailwindcss.com/)
- Beautiful and responsive design with dark mode support
- Protected routes with automatic redirects

## Getting Started

### Prerequisites

- Node.js 20 or higher
- pnpm package manager
- PostgreSQL database

### Quick Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd emissionary
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up authentication and database:
```bash
pnpm setup-auth
```

4. Follow the setup instructions in the terminal and in `AUTHENTICATION_SETUP.md`

5. Run the development server:
```bash
pnpm dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Manual Setup

If you prefer to set up manually, see `AUTHENTICATION_SETUP.md` for detailed instructions.

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/)
- **Authentication**: [Clerk](https://clerk.com/)
- **Database**: [Prisma](https://prisma.io/) + PostgreSQL
- **Package Manager**: [pnpm](https://pnpm.io/)

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   └── webhooks/      # Clerk webhooks
│   ├── dashboard/         # Protected dashboard pages
│   ├── sign-in/           # Sign-in page
│   ├── sign-up/           # Sign-up page
│   └── page.tsx           # Home page (redirects to dashboard if authenticated)
├── components/            # React components
│   ├── authentication/    # Auth-related components
│   ├── dashboard/         # Dashboard components
│   ├── gradients/         # Gradient components
│   ├── home/              # Home page components
│   ├── shared/            # Shared components
│   └── ui/                # UI components
├── lib/                   # Utility libraries
│   ├── auth.ts           # Authentication utilities
│   └── prisma.ts         # Prisma client
├── styles/                # CSS styles
└── utils/                 # Utility functions
prisma/
├── schema.prisma         # Database schema
└── migrations/           # Database migrations
```

## Authentication Flow

1. **Public Routes**: `/`, `/sign-in`, `/sign-up`, `/api/webhooks/*`
2. **Protected Routes**: All other routes require authentication
3. **User Sync**: Clerk webhooks automatically sync user data to your database
4. **Redirects**: 
   - Authenticated users visiting `/` → redirected to `/dashboard`
   - Unauthenticated users accessing protected routes → redirected to `/sign-in`

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm setup-auth` - Set up authentication environment
- `pnpm db:push` - Push database schema changes
- `pnpm db:generate` - Generate Prisma client
- `pnpm db:studio` - Open Prisma Studio

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting: `pnpm test`
5. Submit a pull request

## License

This project is licensed under the MIT License.
