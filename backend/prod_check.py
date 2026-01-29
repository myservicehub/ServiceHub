import requests
urls=[
 'https://my-servicehub.vercel.app/api/jobs?page=1&limit=10',
 'https://my-servicehub.vercel.app/api/jobs/search?limit=10',
 'https://my-servicehub.vercel.app/api/jobs/for-tradesperson?limit=10&skip=0'
]
for u in urls:
    try:
        r=requests.get(u,timeout=10)
        print(u, r.status_code, len(r.content))
    except Exception as e:
        print(u, 'ERROR', e)
