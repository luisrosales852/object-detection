# Railway Deployment Guide - YOLO Large Model

## What Changed for Railway + YOLO Large

### 1. **Upgraded to YOLO Large Model**
- **Changed**: `yolo11n.pt` → `yolo11l.pt` (nano to large)
- **Benefits**: Much higher accuracy, better detection of small objects
- **Trade-off**: Uses more memory and CPU but Railway handles it well

### 2. **Railway-Specific Optimizations**
- **Memory Management**: Added psutil monitoring and memory cleanup
- **CPU Optimization**: Configured PyTorch for Railway's CPU/GPU
- **File Handling**: Optimized for Railway's `/tmp` directory
- **Logging**: Enhanced logging for Railway's log system

### 3. **Performance Improvements**
- **Image Resizing**: Auto-resize large images to prevent memory issues
- **GPU Support**: Automatic GPU detection and FP16 optimization
- **Response Size**: Increased limits for larger annotated images
- **Confidence Threshold**: Lowered to 0.25 for better detection with Large model

## Files Updated

1. **`requierements.md`** - Added Railway-optimized dependencies
2. **`detector.md`** - Upgraded to YOLO Large with Railway optimizations
3. **`main.md`** - Enhanced FastAPI for Railway deployment

## Railway Deployment Steps

### 1. Create Railway Project

1. Go to [Railway.app](https://railway.app)
2. Sign up/Login with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository

### 2. Configure Environment Variables

In your Railway project dashboard, go to **Variables** and add:

```bash
# Required Variables
PORT=8000
HOST=0.0.0.0

# Model Configuration
MODEL_PATH=yolo11l.pt
RAILWAY_ENVIRONMENT=production

# CORS (set to your frontend URL)
CORS_ORIGINS=https://object-detection-tan-one.vercel.app

# Performance Settings
MAX_WORKERS=1
MAX_IMAGE_SIZE=20971520
MAX_RESPONSE_SIZE=52428800
TEMP_DIR=/tmp

# Optional Optimizations
OMP_NUM_THREADS=4
TEST_MODEL_ON_STARTUP=false
```

### 3. Configure Railway Service

Create a `railway.toml` file in your project root:

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "python main.md"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[settings]
generateDomain = true
```

### 4. Set Up Nixpacks (Railway's build system)

Create a `nixpacks.toml` file:

```toml
[phases.setup]
nixPkgs = ["python310", "gcc", "pkg-config"]

[phases.install]
cmds = [
    "pip install -r requierements.md",
    "pip install gunicorn"
]

[phases.build]
cmds = ["echo 'Build complete'"]

[start]
cmd = "gunicorn main:app -w 1 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:$PORT --timeout 300 --keep-alive 5 --max-requests 1000"
```

### 5. Deploy

1. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Add Railway deployment with YOLO Large"
   git push
   ```

2. **Railway will automatically deploy** when you push to your main branch

3. **Monitor the build logs** in Railway dashboard

### 6. Test Your Deployment

After deployment, you'll get a Railway URL like: `https://your-project-name.railway.app`

Test the endpoints:

```bash
# Health check
curl https://your-project-name.railway.app/health

# Available classes
curl https://your-project-name.railway.app/available_classes

# System stats
curl https://your-project-name.railway.app/stats
```

## Railway Resource Requirements

### Recommended Plan
- **Pro Plan** ($20/month) - Required for YOLO Large
- **8GB RAM minimum** - Large model needs significant memory
- **4+ vCPUs** - For optimal performance

### Memory Usage
- **YOLO Large Model**: ~2-3GB
- **Image Processing**: 500MB-1GB per request
- **Total Recommended**: 8GB+ RAM

## Environment Variables Explained

| Variable | Default | Description |
|----------|---------|-------------|
| `MODEL_PATH` | `yolo11l.pt` | YOLO model file (Large) |
| `CORS_ORIGINS` | `*` | Your frontend URL for CORS |
| `MAX_IMAGE_SIZE` | `20971520` | Max upload size (20MB) |
| `MAX_RESPONSE_SIZE` | `52428800` | Max response size (50MB) |
| `MAX_WORKERS` | `1` | Gunicorn workers (keep at 1) |
| `OMP_NUM_THREADS` | `4` | CPU thread optimization |

## Frontend Configuration

Update your Vercel frontend environment variables:

```bash
# In Vercel dashboard
NEXT_PUBLIC_API_URL=https://your-project-name.railway.app
```

## Railway vs Render Differences

| Feature | Railway | Render |
|---------|---------|--------|
| **Memory** | Up to 32GB | Up to 4GB (free) |
| **Pricing** | $20/month | $7/month |
| **GPU Support** | Yes | No |
| **Build Speed** | Faster | Slower |
| **YOLO Large** | ✅ Recommended | ❌ Not enough memory |

## Monitoring & Debugging

### 1. Railway Logs
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and select project
railway login
railway link

# View logs
railway logs
```

### 2. Health Monitoring
Check these endpoints regularly:
- `/health` - Service status
- `/stats` - Memory/CPU usage
- `/available_classes` - Model status

### 3. Memory Monitoring
The API includes built-in memory monitoring:
```json
{
  "memory": {
    "total_gb": 8.0,
    "available_gb": 5.2,
    "used_gb": 2.8,
    "percent": 35.0
  },
  "cpu": {
    "percent": 45.2,
    "count": 4
  }
}
```

## Performance Optimization Tips

### 1. Image Size
- **Recommended**: 1920px max dimension
- **Auto-resize**: Built-in for larger images
- **Formats**: JPG, PNG (JPG preferred for speed)

### 2. Confidence Threshold
- **Default**: 0.25 (optimized for Large model)
- **High Accuracy**: 0.4-0.6
- **More Detections**: 0.1-0.3

### 3. Memory Management
- **Single Worker**: Prevents memory conflicts
- **Auto Cleanup**: Built-in garbage collection
- **GPU Memory**: Automatic FP16 optimization

## Troubleshooting

### Common Issues

**1. Out of Memory**
```bash
# Solution: Upgrade to Pro plan or reduce image sizes
# Check memory usage at /stats endpoint
```

**2. Model Loading Timeout**
```bash
# Solution: Set TEST_MODEL_ON_STARTUP=false
# Model loads on first request instead
```

**3. Large Response Times**
```bash
# Solution: Images > 1920px are auto-resized
# Use JPG format for faster processing
```

**4. CORS Issues**
```bash
# Solution: Set CORS_ORIGINS to your exact frontend URL
CORS_ORIGINS=https://object-detection-tan-one.vercel.app
```

## Success Indicators

✅ **Successful Deployment:**
- Health endpoint returns `"detector_loaded": true`
- Model type shows `"YOLO11 Large"`
- Memory usage < 80%
- Response times < 10 seconds

## Support

If you encounter issues:

1. **Check Railway logs** for error messages
2. **Monitor `/stats`** endpoint for resource usage
3. **Test `/health`** endpoint for service status
4. **Verify environment variables** are set correctly

The YOLO Large model will provide significantly better detection accuracy compared to the nano model, making it worth the upgrade to Railway's Pro plan!