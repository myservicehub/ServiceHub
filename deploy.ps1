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

Write-Host "🚀 Starting deployment process for $IMAGE_NAME..." -ForegroundColor Cyan

# 1. Login to DigitalOcean Container Registry
Write-Host "🔑 Logging into DigitalOcean Container Registry..." -ForegroundColor Yellow
doctl registry login --expiry-seconds 600
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to login to DOCR"; exit $LASTEXITCODE }

# 2. Build the Docker image locally
Write-Host "🏗️ Building Docker image..." -ForegroundColor Yellow
# Run from the root of the project (GGospelGT)
docker build -t $IMAGE_NAME -f backend/Dockerfile .
if ($LASTEXITCODE -ne 0) { Write-Error "Docker build failed"; exit $LASTEXITCODE }

# 3. Tag the image for DOCR
Write-Host "🏷️ Tagging image..." -ForegroundColor Yellow
docker tag $IMAGE_NAME $FULL_IMAGE_PATH
if ($LASTEXITCODE -ne 0) { Write-Error "Docker tag failed"; exit $LASTEXITCODE }

# 4. Push the image to DOCR
Write-Host "⬆️ Pushing image to registry..." -ForegroundColor Yellow
docker push $FULL_IMAGE_PATH
if ($LASTEXITCODE -ne 0) { Write-Error "Docker push failed"; exit $LASTEXITCODE }

# 5. Update DigitalOcean App to use the new image
Write-Host "🔄 Updating DigitalOcean App to use the new image..." -ForegroundColor Yellow

# Get current spec
$SPEC_FILE = "current_spec.yaml"
doctl app spec get $APP_ID --format yaml > $SPEC_FILE

# Use python to replace the github source with the image source for the specific component
$PY_FILE = "update_spec.py"
$PY_TEMPLATE = @'
import yaml
import sys

spec_file = '{0}'
component_name = '{1}'
image_name = '{2}'
tag = '{3}'

with open(spec_file, 'r') as f:
    spec = yaml.safe_load(f)

found = False
for service in spec.get('services', []):
    if service.get('name') == component_name:
        # Remove github source if it exists
        if 'github' in service:
            del service['github']
        # Add image source
        service['image'] = {{
            'registry_type': 'DOCR',
            'repository': image_name,
            'tag': tag
        }}
        found = True
        print(f"Updated component {{component_name}} to use image {{image_name}}:{{tag}}")

if not found:
    print(f"Error: Component {component_name} not found in spec")
    sys.exit(1)

with open(spec_file, 'w') as f:
    yaml.dump(spec, f, default_flow_style=False)
'@

$PY_CONTENT = $PY_TEMPLATE -f $SPEC_FILE, $COMPONENT_NAME, $IMAGE_NAME, $TAG
$PY_CONTENT | Out-File -FilePath $PY_FILE -Encoding utf8
python $PY_FILE
if ($LASTEXITCODE -ne 0) { Write-Error "Python script failed"; Remove-Item $PY_FILE; exit $LASTEXITCODE }
Remove-Item $PY_FILE

# Update the app with the modified spec
doctl app update $APP_ID --spec $SPEC_FILE
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to update DigitalOcean App"; exit $LASTEXITCODE }

Write-Host "✅ Deployment triggered successfully! Check DigitalOcean dashboard for progress." -ForegroundColor Green
Remove-Item $SPEC_FILE -ErrorAction SilentlyContinue
