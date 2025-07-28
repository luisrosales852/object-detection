# Object Detection System

A comprehensive object detection application with FastAPI backend and Next.js frontend, featuring interactive coordinate visualization and advanced export capabilities.

## 🚀 Features

### Backend (FastAPI)
- **YOLO11 object detection** with 80+ object classes
- **Smart object grouping** (vehicles, animals, food, etc.)
- **Fallback detection** (show all objects if requested not found)
- **Configurable confidence thresholds**
- **RESTful API** with automatic documentation
- **Docker support** with health checks

### Frontend (Next.js)
- **Interactive bounding box visualization**
- **Multiple coordinate formats** (pixels, percentage, normalized)
- **Real-time hover tooltips** and click interactions
- **Ruler tool** for distance measurements
- **Recent searches history**
- **Advanced export options** (JSON, CSV, annotated images)
- **Dark mode support**
- **Responsive design**

## 📦 Quick Start with Docker

### Prerequisites
- Docker and Docker Compose
- At least 4GB of available RAM
- 2GB of free disk space

### 1. Clone and Setup
```bash
git clone <repository-url>
cd object_detection_page

# Copy environment files
cp .env.example .env
cp .env.frontend.example .env.frontend

# Create necessary directories
mkdir -p models temp
```

### 2. Start Services
```bash
# Start both frontend and backend
docker-compose up -d

# Or for production with nginx
docker-compose --profile production up -d
```

### 3. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🛠️ Development Setup

### Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Set environment variables
export CORS_ORIGINS="http://localhost:3000"
export MODEL_PATH="yolo11l.pt"

# Run backend
python main.py
```

### Frontend Setup
```bash
# Install Node.js dependencies
npm install

# Set environment variables
export NEXT_PUBLIC_API_URL="http://localhost:8000"

# Run frontend
npm run dev
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
HOST=0.0.0.0                                    # Server host
PORT=8000                                       # Server port
CORS_ORIGINS=http://localhost:3000             # Allowed origins
MODEL_PATH=yolo11l.pt                          # YOLO model path
TEMP_DIR=./temp                                # Temporary files directory
LOG_LEVEL=INFO                                 # Logging level
```

#### Frontend (.env.frontend)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000      # Backend API URL
NODE_ENV=production                            # Node environment
```

## 📖 API Documentation

### Core Endpoints

#### POST /detect
Upload image and detect objects with advanced filtering options.

**Request:**
```bash
curl -X POST "http://localhost:8000/detect" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@image.jpg" \
  -F "objects=car,person,dog" \
  -F "confidence=0.5" \
  -F "include_similar=true" \
  -F "fallback_to_all=true"
```

**Response:**
```json
{
  "detections": [
    {
      "id": 0,
      "class_name": "car",
      "confidence": 0.92,
      "matched_request": true,
      "bbox": {"x1": 100, "y1": 200, "x2": 300, "y2": 400},
      "vertices": {
        "top_left": {"x": 100, "y": 200},
        "top_right": {"x": 300, "y": 200},
        "bottom_left": {"x": 100, "y": 400},
        "bottom_right": {"x": 300, "y": 400}
      },
      "center_point": {"x": 200, "y": 300},
      "dimensions": {"width": 200, "height": 200},
      "area": 40000
    }
  ],
  "used_fallback": false,
  "fallback_message": null,
  "image_dimensions": {"width": 1920, "height": 1080},
  "total_objects_found": 5,
  "matching_objects_found": 1,
  "annotated_image_base64": "..."
}
```

#### GET /available_classes
Get all 80+ detectable object classes and smart categories.

#### GET /health
System health check with model status.

## 🎯 Coordinate System

### Coordinate Formats
- **Pixels**: Standard pixel coordinates from top-left (0,0)
- **Percentage**: Coordinates as percentage of image dimensions
- **Normalized**: Coordinates in 0-1 range (ML framework compatible)

### Bounding Box Structure
- **Vertices**: Four corner points (top-left, top-right, bottom-left, bottom-right)
- **Center Point**: Calculated geometric center
- **Dimensions**: Width and height in selected format
- **Area**: Total bounding box area

### Interactive Features
- **Hover Detection**: Real-time tooltips with object information
- **Click Selection**: Detailed coordinate popup with copy functionality
- **Ruler Tool**: Distance measurement between any two points
- **Format Toggle**: Switch between coordinate formats instantly

## 📊 Export Options

### Image Export
- **Annotated Images**: Download images with bounding boxes and labels
- **High Quality**: Original resolution with professional annotations

### Data Export
- **JSON Format**: Complete detection data with metadata
- **CSV Format**: Spreadsheet-compatible coordinate data
- **Copy Coordinates**: Individual coordinate copying for development

## 🎨 Object Categories

The system supports intelligent object grouping:

- **Vehicles**: car, truck, bus, motorcycle, bicycle
- **Animals**: cat, dog, horse, sheep, cow, elephant, bear, zebra, giraffe
- **Food**: banana, apple, sandwich, orange, pizza, donut, cake
- **Electronics**: tv, laptop, mouse, remote, keyboard, cell phone
- **Sports**: sports ball, baseball bat, skateboard, surfboard, tennis racket
- **Kitchen**: bottle, wine glass, cup, fork, knife, spoon, bowl
- **Furniture**: chair, couch, bed, dining table

## 🚀 Deployment

### Production with Docker
```bash
# Build and deploy
docker-compose --profile production up -d

# Monitor logs
docker-compose logs -f

# Scale services
docker-compose up -d --scale backend=2
```

### Manual Deployment
```bash
# Backend
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker

# Frontend
npm run build
npm start
```

## 🔍 Monitoring

### Health Checks
- Backend: `GET /health`
- Frontend: Built-in Next.js health monitoring
- Docker: Automated container health checks

### Logging
- Structured JSON logging
- Configurable log levels
- Request/response monitoring
- Error tracking and alerts

## 🛡️ Security

### Production Security
- CORS configuration
- Rate limiting via nginx
- File type validation
- Request size limits
- Security headers

### Best Practices
- Environment variable management
- Secure model storage
- Temporary file cleanup
- Input validation and sanitization

## 🧪 Testing

### API Testing
```bash
# Run backend tests
python -m pytest tests/

# Test with sample images
python test_api.py
```

### Frontend Testing
```bash
# Run frontend tests
npm test

# E2E testing
npm run test:e2e
```

## 📝 Model Information

- **Architecture**: YOLO11 Large
- **Classes**: 80+ object categories
- **Performance**: Real-time detection on CPU/GPU
- **Size**: ~50MB model file
- **Auto-download**: Model downloaded on first run

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Full API docs at `/docs`
- **Issues**: GitHub Issues for bug reports
- **Discussions**: GitHub Discussions for questions

## 🔄 Version History

- **v1.0.0**: Initial release with full feature set
- **Interactive visualization**: Bounding boxes with hover/click
- **Multi-format coordinates**: Pixels, percentage, normalized
- **Export capabilities**: JSON, CSV, images
- **Docker deployment**: Full containerization
