"""Rebuild bundled illustrative road paths. Never reads or sends prediction data."""
import json
from pathlib import Path
from urllib.request import Request, urlopen

CITIES = [
    ('Москва', [37.5806,55.7601], [37.6344,55.7336]),
    ('Санкт-Петербург', [30.3050,59.9479], [30.3694,59.9236]),
    ('Казань', [49.1052,55.7983], [49.1590,55.7740]),
    ('Екатеринбург', [60.5760,56.8424], [60.6346,56.8251]),
    ('Нижний Новгород', [43.9857,56.3237], [44.0339,56.3069]),
    ('Новосибирск', [82.9108,55.0451], [82.9486,55.0084]),
    ('Самара', [50.0920,53.1932], [50.1602,53.2130]),
    ('Краснодар', [38.9669,45.0447], [39.0239,45.0155]),
    ('Тюмень', [65.5090,57.1581], [65.5760,57.1370]),
    ('Уфа', [55.9443,54.7238], [55.9864,54.7538]),
]
result=[]
for city, start, end in CITIES:
    coords=';'.join(','.join(map(str,p)) for p in (start,end))
    url=f'https://router.project-osrm.org/route/v1/driving/{coords}?overview=full&geometries=geojson&steps=false'
    req=Request(url,headers={'User-Agent':'ShipmentForecastDemo/1.0 (local prototype)'})
    with urlopen(req,timeout=40) as response:
        data=json.load(response)
    if data.get('code')!='Ok': raise ValueError(f'{city}: {data}')
    route=data['routes'][0]
    points=route['geometry']['coordinates']
    result.append({'city':city,'coordinates':points})
    print(city, len(points),'points',route['distance'],'m',flush=True)
Path('frontend/src/routes/cities.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
