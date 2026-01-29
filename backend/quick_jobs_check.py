import requests
from datetime import datetime

BASE = 'http://127.0.0.1:8001/api'

def check(path):
    url = BASE + path
    start = datetime.now()
    try:
        r = requests.get(url, timeout=30)
        dur = (datetime.now()-start).total_seconds()*1000
        print(f"GET {path} -> {r.status_code} in {dur:.0f}ms, len={len(r.content)}")
        try:
            print(r.json())
        except Exception:
            pass
    except Exception as e:
        dur = (datetime.now()-start).total_seconds()*1000
        print(f"GET {path} -> ERROR after {dur:.0f}ms: {e}")

if __name__ == '__main__':
    check('/jobs?page=1&limit=10')
    check('/jobs/search?limit=10')
    check('/jobs/for-tradesperson?limit=10&skip=0')
