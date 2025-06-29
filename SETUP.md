# Emissionary Setup Guide

This guide will help you set up the Emissionary project with all necessary services and configurations.

## Prerequisites

- Node.js 20+ 
- Python 3.8+ (for OCR service)
- pnpm (recommended) or npm
- Git

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd emissionary
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your actual values
   ```

4. **Set up database**
   ```bash
   pnpm db:generate
   pnpm db:push
   ```

5. **Start the OCR service**
   ```bash
   pnpm ocr:install
   pnpm ocr:start
   ```

6. **Start the development server**
   ```bash
   pnpm dev
   ```

## Environment Variables

Create a `.env.local` file with the following variables:

### Database (Supabase)
```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

### Clerk Authentication
```env
CLERK_PUBLISHABLE_KEY="pk_test_[YOUR-PUBLISHABLE-KEY]"
CLERK_SECRET_KEY="sk_test_[YOUR-SECRET-KEY]"
CLERK_WEBHOOK_SECRET="whsec_[YOUR-WEBHOOK-SECRET]"
```

### UploadThing File Upload
```env
UPLOADTHING_SECRET="sk_live_[YOUR-UPLOADTHING-SECRET]"
UPLOADTHING_APP_ID="[YOUR-UPLOADTHING-APP-ID]"
```

### OCR Service
```env
OCR_SERVICE_URL="http://localhost:8000"
```

### AI Services
```env
GROQ_API_KEY="your_key_here"
OPENAI_API_KEY="[YOUR-OPENAI-API-KEY]"
```

### Environment
```env
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
LOG_LEVEL="info"
```

## Service Setup

### 1. Supabase Database

1. Create a new Supabase project
2. Get your database URL and service role key
3. Run the database migrations:
   ```bash
   pnpm db:push
   ```

### 2. Clerk Authentication

1. Create a Clerk account and application
2. Configure your application settings
3. Set up webhooks for user synchronization
4. Add your Clerk keys to `.env.local`

### 3. UploadThing

1. Create an UploadThing account
2. Create a new application
3. Get your API keys
4. Add them to `.env.local`

### 4. OCR Service

The OCR service is a Python microservice that processes receipt images.

1. Navigate to the OCR service directory:
   ```bash
   cd ocr-service
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the service:
   ```bash
   python start.py
   ```

The OCR service will be available at `http://localhost:8000`.

## Available Scripts

### Development
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint errors

### Database
- `pnpm db:generate` - Generate Prisma client
- `pnpm db:push` - Push schema to database
- `pnpm db:migrate` - Run database migrations
- `pnpm db:studio` - Open Prisma Studio
- `pnpm db:seed` - Seed database

### OCR Service
- `pnpm ocr:install` - Install OCR service dependencies
- `pnpm ocr:start` - Start OCR service
- `pnpm ocr:dev` - Start OCR service in development mode
- `pnpm ocr:test` - Test OCR service
- `pnpm ocr:health` - Check OCR service health

### Testing
- `pnpm test` - Run tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage

## Project Structure

```
emissionary/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── api/               # API routes
│   │   ├── dashboard/         # Dashboard pages
│   │   ├── upload/           # Upload pages
│   │   └── ...
│   ├── components/            # React components
│   │   ├── ui/               # UI components
│   │   ├── dashboard/        # Dashboard components
│   │   └── ...
│   ├── lib/                  # Utility libraries
│   │   ├── actions/          # Server actions
│   │   ├── services/         # Business logic
│   │   └── ...
│   └── ...
├── ocr-service/              # Python OCR microservice
├── prisma/                   # Database schema
├── public/                   # Static assets
└── ...
```

## API Endpoints

### Authentication
- `POST /api/webhooks/clerk` - Clerk webhook handler
- `POST /api/users/sync` - User synchronization

### Receipt Processing
- `POST /api/uploadthing` - File upload
- `POST /api/ocr` - OCR processing
- `POST /api/calculate-emissions` - Emissions calculation

### Data Management
- `GET /api/users/profile` - Get user profile
- `GET /api/receipts` - Get user receipts
- `POST /api/receipts` - Create receipt
- `PUT /api/receipts/[id]` - Update receipt
- `DELETE /api/receipts/[id]` - Delete receipt

## Troubleshooting

### Common Issues

1. **Database connection errors**
   - Check your `DATABASE_URL` and `DIRECT_URL`
   - Ensure Supabase is running and accessible
   - Run `pnpm db:generate` to regenerate Prisma client

2. **OCR service not responding**
   - Check if the OCR service is running on port 8000
   - Verify `OCR_SERVICE_URL` in `.env.local`
   - Check OCR service logs for errors

3. **File upload issues**
   - Verify UploadThing configuration
   - Check file size limits
   - Ensure proper file types are being uploaded

4. **Authentication errors**
   - Verify Clerk configuration
   - Check webhook endpoints
   - Ensure proper environment variables

### Logs

- Application logs: Check the console output
- OCR service logs: Check `ocr-service/ocr_service.log`
- Database logs: Check Supabase dashboard

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set up environment variables in Vercel dashboard
3. Deploy the application

### OCR Service Deployment

The OCR service can be deployed to:
- Railway
- Render
- Fly.io
- Heroku

Update the `OCR_SERVICE_URL` environment variable to point to your deployed service.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs
3. Create an issue in the repository 