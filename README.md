# TeamLight - Team Performance Analytics Dashboard

A comprehensive team performance analytics dashboard built with React, TypeScript, and modern web technologies. TeamLight provides insights into team productivity, performance metrics, and workload distribution through interactive visualizations and detailed reporting.

## 🚀 Features

- **Interactive Dashboard**: Real-time performance metrics and KPIs
- **Team Analytics**: Individual and team-level performance insights
- **Data Visualization**: Heatmaps, charts, and performance indicators
- **CSV Data Import**: Upload and analyze project data
- **PDF Reports**: Generate comprehensive performance reports
- **Role-based Access**: Admin and user roles with different permissions
- **Server-side Authentication**: Secure login system
- **Docker Deployment**: Easy deployment with Docker and Docker Compose

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: shadcn/ui, Tailwind CSS
- **Charts**: Recharts
- **Backend**: Express.js, Node.js
- **Authentication**: Server-side with JWT tokens
- **Deployment**: Docker, Docker Compose
- **Data Processing**: Papa Parse (CSV), PDF generation

## 📊 Project Info

**Lovable URL**: https://lovable.dev/projects/1fcbefa1-06c4-448a-be72-5968269a1aa0

## 💻 Development

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose (for containerized development)

### Local Development Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd openinsight-hub

# Install dependencies
npm install

# Start development server (requires both client and server)
npm run dev:full

# Or start them separately:
# Terminal 1: Start the API server
npm run server

# Terminal 2: Start the frontend dev server
npm run dev
```

### Available Scripts

```bash
# Development
npm run dev              # Start frontend dev server
npm run server           # Start API server
npm run dev:full         # Start both client and server

# Building
npm run build            # Build for production
npm run preview          # Preview production build

# Docker
npm run docker:build     # Build Docker image
npm run docker:run       # Run Docker container
npm run docker:compose:up    # Start with Docker Compose
npm run docker:compose:down   # Stop Docker Compose services

# Utilities
npm run lint             # Run ESLint
```

### Development Options

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/1fcbefa1-06c4-448a-be72-5968269a1aa0) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

Clone this repo and work locally. Pushed changes will be reflected in Lovable.

**Use GitHub Codespaces**

- Navigate to the main page of your repository
- Click on the "Code" button (green button) near the top right
- Select the "Codespaces" tab
- Click on "New codespace" to launch a new Codespace environment

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## 🛠️ Architecture

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **shadcn/ui** for modern UI components
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Framer Motion** for animations
- **React Router** for navigation

### Backend
- **Express.js** API server
- **Node.js** runtime
- **CORS** for cross-origin requests
- **dotenv** for environment variables
- **Web Crypto API** for secure authentication

### Data & Analytics
- **Papa Parse** for CSV processing
- **jsPDF** for report generation
- **Custom metrics engine** for performance calculations
- **Z-score analysis** for statistical insights

### Deployment
- **Docker** containerization
- **Docker Compose** for orchestration
- **Multi-stage builds** for optimization
- **Health checks** for monitoring

## 🐳 Deployment

### Quick Start with Docker

The easiest way to deploy TeamLight is using Docker Compose (full-stack):

```bash
# Clone the repository
git clone <your-repo-url>
cd openinsight-hub

# Deploy with Docker Compose (frontend + backend)
docker-compose up -d

# Access the application
# Frontend: http://localhost (port 80)
# Backend API: http://localhost:3001/api
```

### Default Credentials
- **Admin**: `admin` / `Admin124$`
- **User**: `user` / `user`

### Production Deployment

For production deployment, see the comprehensive [**Deployment Guide**](./DEPLOYMENT.md) which includes:

- 🐳 Docker and Docker Compose setup
- 🔧 Environment configuration
- 🔒 Security best practices
- 📊 Monitoring and health checks
- 🛠️ Troubleshooting guide
- 🌐 Reverse proxy setup

### Lovable Deployment

You can also deploy using [Lovable](https://lovable.dev/projects/1fcbefa1-06c4-448a-be72-5968269a1aa0) by clicking Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
