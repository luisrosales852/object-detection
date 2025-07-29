# Render Deployment Guide

## Issues Fixed

### 1. CORS Configuration
- **Problem**: CORS origins were hardcoded to `localhost:3000`
- **Fix**: Made CORS more permissive with `*` default for production
- **Environment Variable**: `CORS_ORIGINS` (defaults to `*` for all origins)

### 2. Error Handling & Debugging
- **Problem**: Errors were not properly surfaced, making debugging difficult
- **Fix**: Added comprehensive logging and error reporting
- **Added**: Detailed stack traces and step-by-step logging

### 3. Model Loading Issues
- **Problem**: Model loading failures weren't handled gracefully
- **Fix**: Improved initialization with proper error handling and fallbacks
- **Added**: Model verification and compatibility checks

### 4. Memory Management
- **Problem**: Large base64 images could cause memory issues
- **Fix**: Added response size limits and garbage collection
- **Environment Variable**: `MAX_RESPONSE_SIZE` (defaults to 10MB)

### 5. Response Format Issues
- **Problem**: Responses might be too large or malformed
- **Fix**: Added proper JSON response headers and size management

## Files Modified

1. **main.md** (FastAPI backend)
   - Improved CORS configuration
   - Added comprehensive error handling
   - Better logging throughout
   - Response size management
   - Graceful startup error handling

2. **detector.md** (YOLO detector)
   - Enhanced model loading with validation
   - Better error handling in detection pipeline
   - Memory management improvements
   - More detailed logging

3. **New Files Created**:
   - `test_render.py` - API testing script
   - `start.py` - Startup verification script
   - `requirements-test.txt` - Test dependencies
   - `RENDER_DEPLOYMENT.md` - This guide

## Environment Variables for Render

Set these in your Render service environment:

```bash
# Required
PORT=8000                              # Port for the service
HOST=0.0.0.0                          # Host binding

# CORS Configuration  
CORS_ORIGINS=*                         # Allow all origins (or specify your frontend URL)

# Model Configuration
MODEL_PATH=yolo11n.pt                  # YOLO model file
TEST_MODEL_ON_STARTUP=false            # Skip slow model test on startup

# Performance Settings
MAX_RESPONSE_SIZE=10485760             # 10MB response limit
TEMP_DIR=/tmp                          # Temporary file directory

# Optional Debugging
RENDER=true                            # Flag to indicate Render environment
```

## Deployment Steps

### 1. Commit Your Changes
```bash
git add .
git commit -m "Fix CORS and error handling for Render deployment"
git push
```

### 2. Set Environment Variables in Render
- Go to your Render service dashboard
- Navigate to Environment tab
- Add the environment variables listed above

### 3. Deploy
- Trigger a new deployment
- Monitor the logs for startup messages

### 4. Test the Deployment

After deployment, test your API:

```bash
# Test locally first
python test_render.py http://localhost:8000

# Test your Render URL
python test_render.py https://your-render-url.onrender.com
```

## Debugging Commands

### Check Health Endpoint
```bash
curl https://your-render-url.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "detector_loaded": true,
  "detector_error": null,
  "message": "Object Detection API is running",
  "model_path": "yolo11n.pt",
  "cors_origins": ["*"],
  "environment": "true"
}
```

### Check Available Classes
```bash
curl https://your-render-url.onrender.com/available_classes
```

### Test Detection
```bash
curl -X POST https://your-render-url.onrender.com/detect \
  -F "file=@/path/to/your/image.jpg" \
  -F "objects=person,car,dog" \
  -F "confidence=0.3" \
  -F "include_similar=true" \
  -F "fallback_to_all=true"
```

## Frontend Configuration

Make sure your frontend has the correct API URL:

### For Development
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### For Production
```bash
NEXT_PUBLIC_API_URL=https://your-render-backend-url.onrender.com
```

## Common Issues & Solutions

### 1. "Failed to fetch" Error
- **Cause**: CORS or network issues
- **Solution**: Check CORS_ORIGINS environment variable
- **Debug**: Check browser network tab for specific error

### 2. "0 objects detected" when objects should be found
- **Cause**: Model loading or processing errors
- **Solution**: Check Render logs for model loading errors
- **Debug**: Use `/health` endpoint to verify detector status

### 3. Response timeout
- **Cause**: Large images or slow processing
- **Solution**: Reduce image size or increase timeout
- **Debug**: Check processing time in logs

### 4. Memory errors
- **Cause**: Large images or insufficient memory
- **Solution**: Use smaller images or upgrade Render plan
- **Debug**: Monitor memory usage in Render metrics

## Log Monitoring

Watch your Render logs for:
- ✅ `Model loaded successfully!`
- ✅ `YOLO detector initialized successfully`
- ✅ `Detection completed successfully:`
- ❌ `Failed to initialize YOLO detector:`
- ❌ `Detection processing error:`

## Performance Tips

1. **Use smaller images** for faster processing
2. **Set appropriate confidence thresholds** (0.3-0.7)
3. **Enable fallback** to show all objects if specific ones aren't found
4. **Monitor memory usage** and upgrade if needed

## Need Help?

If you're still having issues:
1. Check the Render logs for specific error messages
2. Test the API endpoints individually using the test script
3. Verify all environment variables are set correctly
4. Check if the frontend is using the correct API URL