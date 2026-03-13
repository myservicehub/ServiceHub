with open('html/job-approved.html', 'r') as f:
    html = f.read()

html = html.replace('{{homeownerName}}', 'John Doe')
html = html.replace('{{jobId}}', 'JOB-2025-123')
html = html.replace('{{jobTitle}}', 'Kitchen Renovation')
# ... etc