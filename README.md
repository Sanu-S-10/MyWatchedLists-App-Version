# MyWatchedList 🎬

A full-stack web application for tracking and managing your watched movies, TV series, anime, and animations. Keep track of what you've watched, rate your favorites, and explore new content with integrated TMDB data.

🌐 **Live Demo:** [https://my-watched-lists.vercel.app](https://my-watched-lists.vercel.app)

> **Note:** This project was vibe coded - built with creativity, flow, and passion! 🚀

## ✨ Features

- **📊 Dashboard** - Visual analytics and statistics of your watch history
- **🤖 AI Filter** - AI-powered intelligent semantic search for your content
- **🌍 Country Filters** - Discover and filter content by country of origin
- **📺 Series Tracking** - Advanced tracking for watched episodes and seasons inside series details
- **🎭 Multi-Content Support** - Track movies, TV series, anime, and animations
- **⭐ Favorites System** - Mark and filter your favorite content
- **🔍 Smart Search** - Search and discover content using The Movie Database (TMDB) API
- **📝 Watch History** - Complete log of everything you've watched
- **⚡ Real-time Updates** - Instant updates across your watch list
- **🎨 Dark/Light Theme** - Toggle between dark and light modes
- **🔐 User Authentication** - Secure JWT-based authentication
- **📱 Responsive Design** - Works seamlessly on desktop and mobile devices
- **📈 Rating System** - Rate your watched content with star ratings
- **🔔 Toast Notifications** - Get feedback on all your actions

## 🛠️ Technologies Used

### Frontend
- **React 18** - Modern React with hooks
- **Vite** - Lightning-fast build tool and dev server
- **React Router DOM** - Client-side routing
- **Axios** - HTTP client for API requests
- **Recharts** - Beautiful charts and data visualization
- **Lucide React** - Clean and modern icon library
- **CSS3** - Custom styling with modern CSS

### Backend
- **Node.js** - JavaScript runtime
- **Express 5** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **Google Generative AI** - AI-powered intelligent semantic search
- **JWT (jsonwebtoken)** - Secure authentication tokens
- **bcryptjs** - Password hashing
- **Helmet & Rate Limit** - API security and rate limiting middleware
- **dotenv** - Environment variable management
- **CORS** - Cross-Origin Resource Sharing

### Additional Tools
- **Nodemon** - Auto-restart during development
- **csv-parser** - CSV data parsing

## 🗣️ Languages

- **JavaScript (ES6+)** - Primary language for both frontend and backend
- **JSX** - React component syntax
- **CSS3** - Styling
- **JSON** - Data interchange

## 🔑 API Integration

This application uses the **TMDB API** and **Google Gemini API**:

### TMDB API (The Movie Database)
Fetches movie and TV show information, including:
- Movie/TV show details, posters, and images
- Ratings, reviews, and recommendations
- Cast and crew information

**Get Your TMDB API Key:**
1. Visit [The Movie Database](https://www.themoviedb.org/)
2. Create a free account and request an API key from Settings → API
3. Add it to your `.env` file as `VITE_TMDB_API_KEY`

### Google Gemini API
Powers the intelligent AI Filter for semantic search across your watched list.

**Get Your Gemini API Key:**
1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Access a project to get an API key
3. Add it to your `.env` file as `GEMINI_API_KEY`

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MyWatchedList
   ```

2. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Backend Environment Variables
   MONGO_URI=your_mongodb_connection_string_here
   PORT=5000
   JWT_SECRET=your_jwt_secret_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   CORS_ORIGIN=http://localhost:5173
   
   # Frontend Environment Variables
   VITE_TMDB_API_KEY=your_tmdb_api_key_here
   ```

3. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

4. **Run the application**
   
   Open two terminal windows:
   
   **Terminal 1 - Backend:**
   ```bash
   cd backend
   npm run dev
   ```
   
   **Terminal 2 - Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

5. **Access the application**
   
   Open your browser and navigate to `http://localhost:5173`

## 📁 Project Structure

```
MyWatchedList/
├── .env                        # Environment variables (root level)
├── backend/
│   ├── config/                 # Database configuration
│   ├── controllers/            # Request handlers
│   ├── middleware/             # Auth & Rate Limiting middleware
│   ├── models/                 # Mongoose models
│   ├── routes/                 # API routes
│   ├── utils/                  # Utility functions
│   └── server.js               # Express server
├── mobile/                     # Android Mobile Application (React Native / Expo)
│   ├── app.json                # Expo config & Android package (com.mywatchedlists.app)
│   ├── eas.json                # EAS Build configuration for installable APKs
│   ├── android/                # Native Gradle project & local.properties
│   ├── assets/                 # Icons, splash screens, adaptive icons
│   ├── src/
│   │   ├── app/                # Expo Router screens (Tabs, Media, Person, AI Filter)
│   │   ├── components/         # Mobile components (common, media, lists)
│   │   ├── config/             # Config, LAN IP resolution, TMDB base URLs
│   │   ├── constants/          # Dark cinematic theme & typography
│   │   ├── context/            # Auth, Toast, and Watch History contexts
│   │   └── services/           # API client, SecureStore, and domain services
│   └── README.md               # Detailed mobile setup & APK build guide
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable React components
│   │   │   ├── Layout/         # Layout components (Sidebar, Nav)
│   │   │   └── UI/             # UI components (Button, Input, etc.)
│   │   ├── context/            # React Context (Auth, Theme, Toast)
│   │   ├── pages/              # Page components
│   │   │   ├── AIFilter/       # AI semantic search feature
│   │   │   ├── Auth/           # Login & Register
│   │   │   ├── ContentList/    # Media list views
│   │   │   ├── Dashboard/      # Analytics dashboard
│   │   │   ├── Home/           # Landing page
│   │   │   ├── Search/         # Search page
│   │   │   ├── Settings/       # User settings
│   │   │   └── Watch/          # Watch history
│   │   ├── App.jsx             # Main app component
│   │   └── main.jsx            # Entry point
│   └── vite.config.js          # Vite configuration
└── README.md                   # You are here!
```

## 📱 Android Mobile App Quickstart

The project includes a genuine Android application in the `mobile/` directory:

1. **Start Backend**: `npm run dev:backend`
2. **Start Mobile App**: `npm run mobile`
3. **Build Android APK**:
   ```bash
   cd mobile/android
   .\gradlew.bat assembleDebug
   ```
   APK output: `mobile/android/app/build/outputs/apk/debug/app-debug.apk`
   See [`mobile/README.md`](mobile/README.md) for complete details.

## 🎯 Usage

1. **Register/Login** - Create an account or login to access your watch list
2. **Search Content** - Use the search feature to find movies, shows, or anime
3. **Add to List** - Add content to your watched list with ratings and notes
4. **Track Progress** - Mark episodes or movies as watched
5. **View Dashboard** - See your watch statistics and trends
6. **Manage Favorites** - Star your favorite content for quick access
7. **Customize Settings** - Update your profile and preferences

## 🌈 Vibe Coded

This project was created with a vibe coding approach - focusing on:
- 🎨 Creative problem-solving
- 🔥 Flow state development
- 💡 Learning by building
- 🚀 Rapid iteration
- ❤️ Passion for the craft

## 📝 License

This project is open source and available for personal and educational use.

## 🤝 Contributing

Feel free to fork this project and make it your own! Contributions, issues, and feature requests are welcome.

---

**Happy Watching! 🍿**
