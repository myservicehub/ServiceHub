# ServiceHub Local Deployment Script
# This script builds the backend image locally, pushes it to DigitalOcean Container Registry (DOCR),
# and updates the DigitalOcean App Platform to use the new image.

# Configuration
$REGISTRY_NAME = "servicehub9ja"
$IMAGE_NAME = "servicehub-backend"
$APP_ID = "4bd4b644-c7ab-408c-a3b9-43da23a9054d"
$COMPONENT_NAME = "servicehub-backend"
$TAG = "latest"

# Full image path
$FULL_IMAGE_PATH = "registry.digitalocean.com/$($REGISTRY_NAME)/$($IMAGE_NAME):$($TAG)"

Write-Host "Starting deployment process for $IMAGE_NAME..." -ForegroundColor Cyan

# 1. Login to DigitalOcean Container Registry
Write-Host "Logging into DigitalOcean Container Registry..." -ForegroundColor Yellow
doctl registry login --expiry-seconds 600
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to login to DOCR"; exit $LASTEXITCODE }

# 2. Build the Docker image locally
Write-Host "Building Docker image..." -ForegroundColor Yellow
# Run from the root of the project (GGospelGT)
docker build -t $IMAGE_NAME -f backend/Dockerfile .
if ($LASTEXITCODE -ne 0) { Write-Error "Docker build failed"; exit $LASTEXITCODE }

# 3. Tag the image for DOCR
Write-Host "Tagging image..." -ForegroundColor Yellow
docker tag $IMAGE_NAME $FULL_IMAGE_PATH
if ($LASTEXITCODE -ne 0) { Write-Error "Docker tag failed"; exit $LASTEXITCODE }

# 4. Push the image to DOCR
Write-Host "Pushing image to registry..." -ForegroundColor Yellow
docker push $FULL_IMAGE_PATH
if ($LASTEXITCODE -ne 0) { Write-Error "Docker push failed"; exit $LASTEXITCODE }

# 5. Update DigitalOcean App to use the new image
Write-Host "Updating DigitalOcean App to use the new image..." -ForegroundColor Yellow

# Get current spec
$SPEC_FILE = "current_spec.yaml"
doctl app spec get $APP_ID --format yaml > $SPEC_FILE

# Use python to replace the github source with the image source for the specific component
python update_spec.py --spec-file $SPEC_FILE --component-name $COMPONENT_NAME --image-name $IMAGE_NAME --tag $TAG
if ($LASTEXITCODE -ne 0) { Write-Error "Python script failed"; exit $LASTEXITCODE }

# Update the app with the modified spec
doctl app update $APP_ID --spec $SPEC_FILE
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to update DigitalOcean App"; exit $LASTEXITCODE }

Write-Host "Deployment triggered successfully! Check DigitalOcean dashboard for progress." -ForegroundColor Green
Remove-Item $SPEC_FILE -ErrorAction SilentlyContinue
