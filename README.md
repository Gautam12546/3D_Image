# 🎨 3D Image - AI-Powered 2D to 3D Image Transformation 

A full-stack AI-powered web application that transforms 2D images into interactive 3D models using deep learning (GLPN), computer vision (Open3D), and the MERN stack. Built with production-quality features including real-time processing, JWT authentication, and cloud deployment.

## 🚀 Live Demo

- **Frontend:** [https://3-d-image-chi.vercel.app](https://3-d-image-chi.vercel.app)
- **Backend:** [https://threed-image-8qse.onrender.com](https://threed-image-8qse.onrender.com)
- **API Health:** [https://threed-image-8qse.onrender.com/api/health](https://threed-image-8qse.onrender.com/api/health)

## ✨ Features

### Core Features ✓
| Feature | Description |
|---------|-------------|
| **AI Depth Estimation** | GLPN neural network (PyTorch) for monocular depth mapping |
| **Point Cloud Generation** | 500,000+ raw 3D points from 2D images |
| **3D Mesh Creation** | Poisson surface reconstruction with 30,000+ triangles |
| **Interactive 3D Viewer** | Three.js & React Three Fiber with orbit controls |
| **User Authentication** | JWT-based secure login/registration with bcrypt |
| **Multi-format Export** | Download 3D models as PLY, OBJ, or JSON |
| **Share Models** | Public view pages with shareable links |
| **Dashboard Analytics** | Charts and statistics for conversion history |

### Resilience Features ✓
- **Auto-retry Logic:** Frontend automatically retries failed API calls
- **Graceful Fallback:** High quality → Medium quality → Point cloud only
- **Loading States:** Real-time progress tracker during conversion
- **Error Handling:** User-friendly error messages with retry options
- **Rate Limiting:** API protection with skip for status checks
- **Auto Cleanup:** Temporary files removed after 1 hour
- **Idempotent Conversion:** Prevents duplicate processing of same image

### Additional Features ✓
- ✅ Drag & drop image upload (JPG, PNG, WEBP, BMP, TIFF)
- ✅ Real-time conversion progress with step indicators
- ✅ Mesh and Point Cloud toggle views
- ✅ Auto-rotate and grid toggle in 3D viewer
- ✅ Responsive design for mobile/desktop
- ✅ Toast notifications for success/error feedback
- ✅ Conversion history with grid/list views
- ✅ Public/private visibility toggle for models

## 🛠️ Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI library with hooks and functional components |
| Vite | Fast build tool and development server |
| Tailwind CSS | Utility-first CSS framework for styling |
| Framer Motion | Smooth animations and transitions |
| Three.js | 3D graphics rendering engine |
| React Three Fiber | React renderer for Three.js |
| React Three Drei | Utility components for Three.js |
| Recharts | Interactive charts and analytics |
| Axios | HTTP client with interceptors |
| React Router DOM | Client-side routing |
| React Hot Toast | Toast notifications |
| React Icons | Icon library |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | JavaScript runtime |
| Express | Web framework for REST API |
| MongoDB Atlas | Cloud NoSQL database |
| Mongoose | ODM for data modeling |
| JWT | JSON Web Token authentication |
| Bcrypt | Password hashing |
| Multer | Multipart file upload handling |
| Helmet | Security headers |
| Express Rate Limit | API rate limiting |
| CORS | Cross-origin resource sharing |

### AI/ML Pipeline
| Technology | Purpose |
|------------|---------|
| Python 3.11 | Machine learning runtime |
| PyTorch 2.0 | Deep learning framework |
| Transformers | Hugging Face GLPN model |
| Open3D 0.18 | 3D point cloud and mesh processing |
| NumPy | Numerical computing |
| Pillow | Image processing |
| Matplotlib | Depth map visualization |

## 📁 Project Structure
```plaintext
📦 3D_Image
│
├── 📂 backend/                              # Backend - Node.js + Express + Python
│   ├── 📂 middleware/
│   │   ├── 📄 auth.js                        # JWT authentication middleware
│   │   └── 📄 upload.js                      # Multer file upload configuration
│   │
│   ├── 📂 models/
│   │   ├── 📄 Conversion.js                   # Conversion schema with modelData
│   │   └── 📄 User.js                         # User schema with bcrypt hashing
│   │
│   ├── 📂 routes/
│   │   ├── 📄 auth.js                         # Register, Login, Profile endpoints
│   │   ├── 📄 convert.js                      # Upload, Start, Status, Model, Download
│   │   └── 📄 user.js                         # User profile and dashboard endpoints
│   │
│   ├── 📂 python/                             # Python AI/ML pipeline
│   │   ├── 📄 depth_estimator.py              # GLPN depth estimation + Open3D mesh
│   │   └── 📄 requirements.txt                # Python dependencies
│   │
│   ├── 📂 uploads/                            # Temporary uploaded images (auto-created)
│   ├── 📂 outputs/                            # Generated 3D models (auto-created)
│   ├── 📂 temp/                               # Temporary processing files
│   │
│   ├── 📄 .env                                # Environment variables (not in git)
│   ├── 📄 .env.example                        # Example environment variables
│   ├── 📄 server.js                           # Express server entry point
│   ├── 📄 package.json                        # Node.js dependencies
│   └── 📄 nodemon.json                        # Nodemon watch configuration
│
├── 📂 frontend/                              # Frontend - React + Vite + Tailwind
│   ├── 📂 public/
│   │   └── 📄 favicon.svg                     # App favicon
│   │
│   ├── 📂 src/
│   │   ├── 📂 components/
│   │   │   ├── 📂 auth/
│   │   │   │   ├── 📄 Login.jsx               # Login form with remember me
│   │   │   │   ├── 📄 Register.jsx            # Registration with password strength
│   │   │   │   └── 📄 ProtectedRoute.jsx      # Route guard for authenticated users
│   │   │   │
│   │   │   ├── 📂 layout/
│   │   │   │   ├── 📄 Navbar.jsx              # Responsive navigation with user menu
│   │   │   │   ├── 📄 Footer.jsx              # Footer with links and newsletter
│   │   │   │   └── 📄 Layout.jsx              # Page layout wrapper
│   │   │   │
│   │   │   ├── 📂 home/
│   │   │   │   ├── 📄 HeroSection.jsx         # Animated landing with Three.js background
│   │   │   │   ├── 📄 FeaturesSection.jsx      # Feature cards grid
│   │   │   │   ├── 📄 HowItWorks.jsx           # Step-by-step guide
│   │   │   │   └── 📄 Testimonials.jsx         # Animated testimonials carousel
│   │   │   │
│   │   │   ├── 📂 converter/
│   │   │   │   ├── 📄 ImageUploader.jsx        # Drag & drop with progress bar
│   │   │   │   ├── 📄 ConversionProgress.jsx   # Real-time step progress
│   │   │   │   └── 📄 ThreeDViewer.jsx         # Interactive 3D model viewer
│   │   │   │
│   │   │   └── 📂 dashboard/
│   │   │       ├── 📄 Dashboard.jsx            # Stats, charts, and analytics
│   │   │       └── 📄 ConversionHistory.jsx    # Grid/list view with filters
│   │   │
│   │   ├── 📂 pages/
│   │   │   ├── 📄 HomePage.jsx                 # Landing page
│   │   │   ├── 📄 ConverterPage.jsx            # Main converter interface
│   │   │   ├── 📄 DashboardPage.jsx            # User dashboard
│   │   │   ├── 📄 LoginPage.jsx                # Login page
│   │   │   ├── 📄 RegisterPage.jsx             # Registration page
│   │   │   └── 📄 ViewPage.jsx                 # Public 3D model viewer
│   │   │
│   │   ├── 📂 context/
│   │   │   └── 📄 AuthContext.jsx              # Global auth state management
│   │   │
│   │   ├── 📂 utils/
│   │   │   └── 📄 api.js                       # Axios config with interceptors
│   │   │
│   │   ├── 📄 App.jsx                          # Root component with routing
│   │   ├── 📄 App.css                          # App-specific styles
│   │   ├── 📄 main.jsx                         # Application entry point
│   │   └── 📄 index.css                        # Global Tailwind styles
│   │
│   ├── 📄 .env.development                     # Dev environment variables
│   ├── 📄 .env.production                      # Prod environment variables
│   ├── 📄 index.html
│   ├── 📄 package.json
│   ├── 📄 vite.config.js
│   └── 📄 tailwind.config.js
│
├── 📄 .gitignore                               # Git ignore rules
└── 📄 README.md                                # Project documentation




# Clone the repository
git clone https://github.com/Gautam12546/3D_Image.git
cd 3D_Image

# -------------------------
# Backend Setup
# -------------------------

cd backend

# Install Node.js dependencies
npm install

# Install Python dependencies
cd python
pip install -r requirements.txt
cd ..

# Create environment file
cp .env.example .env

# Update .env with your configuration:
#   MONGODB_URI=your_mongodb_connection_string
#   JWT_SECRET=your_secret_key
#   PYTHON_PATH=python

# Start backend development server
npm run dev


# -------------------------
# Frontend Setup
# -------------------------

cd ../frontend

# Install frontend dependencies
npm install

# Create environment file
cp .env.example .env

# Update VITE_API_URL if needed
# Default: http://localhost:5000

# Start frontend development server
npm run dev


# -------------------------
# Access the Application
# -------------------------
# Frontend: http://localhost:5173
# Backend:  http://localhost:5000/api
# Health:   http://localhost:5000/api/health
