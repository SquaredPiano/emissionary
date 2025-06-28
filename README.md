# Emissionary - Carbon Emission Tracking App

A full-stack application for tracking carbon emissions from receipts using OCR and AI.

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ 
- Python 3.10+
- pnpm (recommended) or npm
- Homebrew (for macOS)

### 1. Clone and Setup
```bash
git clone <your-repo-url>
cd emissionary
```

### 2. Install Dependencies

#### Frontend (Next.js)
```bash
pnpm install
```

#### Backend (Python OCR Service)
```bash
cd ocr-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Install System Dependencies (macOS)
```bash
brew install tesseract
```

### 4. Start the Services

#### Terminal 1: Python OCR Service
```bash
cd ocr-service
source venv/bin/activate
python start.py
```
**Expected output:** `INFO: Uvicorn running on http://0.0.0.0:8000`

#### Terminal 2: Next.js Frontend
```bash
cd emissionary  # Back to project root
pnpm dev
```
**Expected output:** `Ready - started server on 0.0.0.0:3000`

### 5. Verify Everything is Working

#### Test OCR Service
```bash
curl http://127.0.0.1:8000/health
```
**Expected output:** `{"status":"healthy","service":"OCR-PaddleOCR","groq_configured":true}`

#### Test Next.js API
```bash
curl http://localhost:3000/api/ocr
```
**Expected output:** `{"success":true,"data":{"status":"healthy","service":"OCR-PaddleOCR","timestamp":"..."}}`

#### Open the Application
- Frontend: [http://localhost:3000](http://localhost:3000)
- OCR API: [http://127.0.0.1:8000](http://127.0.0.1:8000)

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js       │    │   Python OCR    │    │   Supabase      │
│   Frontend      │◄──►│   Service       │    │   Database      │
│   (Port 3000)   │    │   (Port 8000)   │    │   (External)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file in the project root:

```env
# OCR Service
OCR_SERVICE_URL=http://127.0.0.1:8000

# Database (Supabase)
DATABASE_URL=your_supabase_database_url

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret

# Optional: Groq API for enhanced OCR
GROQ_API_KEY=your_groq_api_key
```

## 🐛 Troubleshooting

### OCR Service Won't Start
1. **Port already in use:**
   ```bash
   lsof -i :8000
   kill -9 <PID>
   ```

2. **Missing dependencies:**
   ```bash
   cd ocr-service
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Tesseract not found:**
   ```bash
   brew install tesseract  # macOS
   # or
   sudo apt-get install tesseract-ocr  # Ubuntu
   ```

### Next.js Can't Connect to OCR Service
1. **Check if OCR service is running:**
   ```bash
   curl http://127.0.0.1:8000/health
   ```

2. **Verify environment variable:**
   ```bash
   echo $OCR_SERVICE_URL
   ```

3. **Restart both services** in the correct order:
   - Start OCR service first
   - Then start Next.js

### Database Issues
1. **Generate Prisma client:**
   ```bash
   pnpm db:generate
   ```

2. **Push schema changes:**
   ```bash
   pnpm db:push
   ```

## 📁 Project Structure

```
emissionary/
├── src/
│   ├── app/                 # Next.js app router
│   ├── components/          # React components
│   └── lib/                # Utilities and services
├── ocr-service/            # Python OCR microservice
├── prisma/                # Database schema
└── public/                # Static assets
```

## 🚀 Deployment

### OCR Service
- Deploy to any Python hosting service (Railway, Render, etc.)
- Set environment variables
- Update `OCR_SERVICE_URL` in Next.js

### Next.js Frontend
- Deploy to Vercel, Netlify, or similar
- Set all environment variables
- Ensure OCR service is accessible

## 📝 API Endpoints

### OCR Service (Python)
- `GET /health` - Health check
- `POST /ocr` - Process receipt image
- `POST /upload` - Upload receipt file

### Next.js API
- `GET /api/ocr` - Health check
- `POST /api/ocr` - Process receipt
- `POST /api/calculate-emissions` - Calculate emissions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## ✨ Features

- **📸 Receipt Upload**: Drag & drop interface for easy receipt upload
- **🔍 OCR Processing**: AI-powered text extraction from receipt images
- **🌍 Carbon Calculations**: Accurate emissions calculations using Canadian government data
- **📊 Data Visualization**: Beautiful charts showing emissions trends and breakdowns
- **🇨🇦 Canadian Focus**: Compare your emissions with Canadian averages
- **🔐 Secure Authentication**: Built-in user management with Clerk
- **📱 Responsive Design**: Works seamlessly on desktop and mobile

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Python 3.8+ (for OCR service)
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

# OpenAI (optional, for enhanced parsing)
OPENAI_API_KEY="your-openai-api-key"
```

### 3. Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push
```

### 4. Start the Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

### 5. OCR Service Setup

```bash
cd ocr-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

The OCR service will be available at [http://localhost:8000](http://localhost:8000).

## 📊 Database Schema

The application uses the following main tables:

- **users**: User profiles and authentication data
- **receipts**: Receipt metadata (merchant, total, date, etc.)
- **receipt_items**: Individual items from receipts
- **emissions_logs**: Carbon footprint calculations and breakdowns

## 🔧 API Endpoints

### OCR Processing
- `POST /api/ocr` - Process receipt images and extract text/items

### Emissions Calculation
- `POST /api/calculate-emissions` - Calculate carbon footprint from items

### Database Operations
- All database operations are handled through Prisma client

## 📈 Emissions Data

The application uses comprehensive emissions factors based on:

- **Canadian Government Data**: Official emissions statistics
- **FAO Database**: Global food production emissions
- **Category-based Calculations**: Detailed breakdown by food type

### Supported Categories

- **Meat & Dairy**: Beef, pork, chicken, milk, cheese, eggs
- **Seafood**: Fish, shrimp, salmon
- **Grains**: Wheat, rice, corn, oats
- **Fruits & Vegetables**: Apples, bananas, tomatoes, potatoes
- **Nuts & Seeds**: Almonds, walnuts, peanuts
- **Beverages**: Coffee, tea, juice
- **Processed Foods**: Bread, pasta, chocolate, cereal
- **Snacks & Condiments**: Cookies, candy, ketchup, oils

## 🎨 UI Components

### Dashboard Features

- **Stats Cards**: Total receipts, emissions, comparison with average
- **Emissions Timeline**: Line chart showing trends over time
- **Category Breakdown**: Pie chart of emissions by food category
- **Comparison Chart**: Bar chart comparing user vs Canadian average
- **Recent Receipts**: List of latest uploads with emissions data

### Upload Flow

1. **Drag & Drop**: Intuitive file upload interface
2. **Image Preview**: Visual confirmation of uploaded receipt
3. **OCR Processing**: Real-time progress indicator
4. **Results Display**: Extracted items with confidence scores
5. **Emissions Calculation**: Automatic carbon footprint computation

## 🚀 Deployment

### Frontend (Vercel)

1. Connect your repository to Vercel
2. Set environment variables
3. Deploy automatically on push

### OCR Service

#### Railway
```bash
cd ocr-service
railway login
railway init
railway up
```

#### Render
1. Create new Web Service
2. Set build command: `pip install -r requirements.txt`
3. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

#### Docker
```bash
cd ocr-service
docker build -t emissionary-ocr .
docker run -p 8000:8000 emissionary-ocr
```

### Database

Use Supabase for easy PostgreSQL hosting with automatic backups and scaling.

## 🔒 Security

- **Authentication**: Clerk handles all user authentication
- **Row Level Security**: Supabase RLS policies protect user data
- **Input Validation**: Zod schemas validate all API inputs
- **CORS**: Properly configured for production environments

## 📱 Mobile Support

The application is fully responsive and optimized for mobile devices:

- Touch-friendly upload interface
- Responsive charts and tables
- Mobile-optimized navigation
- Camera integration for receipt capture

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use Prettier for code formatting
- Write meaningful commit messages
- Test your changes thoroughly
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Canadian Government**: For emissions data and statistics
- **FAO**: For global food emissions factors
- **Clerk**: For authentication infrastructure
- **Supabase**: For database and hosting
- **shadcn/ui**: For beautiful UI components
- **Recharts**: For data visualization

## 📞 Support

For support, email support@emissionary.app or join our Discord community.

---

**Made with ❤️ for a greener future**
