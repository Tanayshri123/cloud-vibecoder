# Cloud Vibecoder

A full-stack application that generates implementation plans for GitHub repositories based on natural language prompts. The project consists of a React Native mobile app and a FastAPI backend.

## Project Structure

```
cloud-vibecoder/
├── backend/           # FastAPI backend server
│   ├── main.py       # Main API server
│   └── .venv/        # Python virtual environment
├── mobile/           # React Native mobile app
│   ├── app/          # App screens and navigation
│   ├── components/   # Reusable UI components
│   ├── constants/    # App constants and themes
│   └── package.json  # Node.js dependencies
└── infra/           # Infrastructure configuration
```

## Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **Expo CLI** (`npm install -g @expo/cli`)
- **Git**

### 1. Backend Setup

Navigate to the backend directory and set up the Python environment:

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On macOS/Linux:
source .venv/bin/activate
# On Windows:
# .venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn pydantic python-multipart

# Run the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at `http://localhost:8000`

### 2. Mobile App Setup

Navigate to the mobile directory and install dependencies:

```bash
cd mobile

# Install dependencies
npm install

# Start the development server
npm start
```

This will open the Expo development tools. You can then:
- Press `i` to open iOS Simulator
- Press `a` to open Android Emulator
- Press `w` to open in web browser
- Scan the QR code with Expo Go app on your physical device

## 📱 Features

- **Smart IP Detection**: Automatically detects your local network IP for seamless backend connection
- **Cross-Platform**: Works on iOS, Android, and Web
- **Real-time Communication**: Mobile app communicates with FastAPI backend
- **Modern UI**: Clean, responsive interface with proper theming

## 🔧 API Endpoints

### POST `/api/plan`

Generates an implementation plan based on repository and prompt.

**Request Body:**
```json
{
  "repo": "https://github.com/username/repository",
  "prompt": "Add dark mode toggle to the settings page"
}
```

**Response:**
```json
{
  "repo": "https://github.com/username/repository",
  "plan": {
    "title": "Plan for 'Add dark mode toggle to the settings page'",
    "summary": "This mock plan outlines how Cloud Vibecoder will implement your request.",
    "steps": [
      "Inspect repository: https://github.com/username/repository",
      "Locate relevant code areas for 'Add dark mode toggle to the settings page'",
      "Draft modification steps",
      "Generate diff and propose PR"
    ]
  }
}
```

## Development

### Backend Development

The backend uses FastAPI with automatic API documentation available at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Mobile Development

The mobile app uses:
- **Expo Router** for navigation
- **TypeScript** for type safety
- **Expo Network** for IP detection
- **React Native** for cross-platform UI

### Network Configuration

The app automatically detects your local IP address for backend communication:
- **iOS Simulator**: Uses `localhost`
- **Android Emulator**: Uses `10.0.2.2`
- **Physical Devices**: Uses detected local network IP
- **Web**: Uses `localhost`

## Troubleshooting

### Backend Issues

1. **Port already in use**: Change the port in the uvicorn command
2. **CORS errors**: The backend is configured to accept requests from any origin
3. **Module not found**: Ensure virtual environment is activated and dependencies are installed

### Mobile App Issues

1. **Network request failed**: 
   - Ensure backend is running
   - Check that both devices are on the same network
   - Verify IP detection in console logs

2. **Expo issues**:
   - Clear Expo cache: `expo start -c`
   - Reset project: `npm run reset-project`

3. **Dependencies issues**:
   - Delete `node_modules` and `package-lock.json`
   - Run `npm install` again

## 📦 Dependencies

### Backend
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `pydantic` - Data validation
- `python-multipart` - Form data handling

### Mobile
- `expo` - Development platform
- `react-native` - Mobile framework
- `expo-router` - Navigation
- `expo-network` - Network utilities
- `typescript` - Type safety

## Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the console logs for error messages
3. Ensure all dependencies are properly installed
4. Verify network connectivity between mobile app and backend