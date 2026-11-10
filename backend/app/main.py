from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
import json, os, shutil, uuid
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from .results import ResultError, load_prediction

ROOT = Path(__file__).resolve().parents[2]
DATA = Path(os.environ.get('FORECAST_DATA_DIR', ROOT / 'data'))
TEST = DATA / 'raw/test_solo_track.parquet'
SOURCE = DATA / 'raw/catboost_88.csv'
STORE = DATA / 'processed/web'
MAX_BYTES = 10 * 1024 * 1024

def meta_path(run_id: str) -> Path:
    try: uuid.UUID(run_id)
    except (ValueError, TypeError): raise HTTPException(404, 'Результат не найден')
    return STORE / f'{run_id}.json'

def get_meta(run_id: str) -> dict:
    path=meta_path(run_id)
    if not path.is_file(): raise HTTPException(404, 'Результат не найден')
    try: return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError): raise HTTPException(500, 'Не удалось прочитать результат')

def import_file(path: Path, filename: str, label: str = 'Импортированный прогноз') -> dict:
    result=load_prediction(path,TEST)
    run_id=str(uuid.uuid4()); dest=STORE/f'{run_id}.csv'
    meta={'id':run_id,'name':filename,'label':label,'created_at':datetime.now(timezone.utc).isoformat(),
          'row_count':result['row_count'],'route_count':result['route_count'],
          'timestamps':result['timestamps'],'status':'completed','source':'csv'}
    shutil.copyfile(path,dest)
    try: (STORE/f'{run_id}.json').write_text(json.dumps(meta,ensure_ascii=False),encoding='utf-8')
    except Exception:
        dest.unlink(missing_ok=True)
        raise
    return meta

@asynccontextmanager
async def lifespan(app: FastAPI):
    STORE.mkdir(parents=True,exist_ok=True)
    app.state.startup_error=None
    if SOURCE.exists() and TEST.exists() and not list(STORE.glob('*.json')):
        try: import_file(SOURCE,SOURCE.name,'CatBoost 88 · исходный прогноз')
        except (ResultError,OSError) as exc: app.state.startup_error=str(exc)
    yield

app=FastAPI(title='Logistics Forecast API', lifespan=lifespan)

@app.get('/api/health')
def health(): return {'status':'ok','mapping_available':TEST.is_file(),'startup_error':app.state.startup_error}

@app.get('/api/model/info')
def model_info(): return {'inference_available':False,'mode':'csv','message':'Запуск модели будет доступен после подключения обученных артефактов и кода инференса'}

@app.get('/api/predictions')
def predictions():
    records=[]
    for path in STORE.glob('*.json'):
        try:
            item=json.loads(path.read_text(encoding='utf-8'))
            if (STORE/f"{item['id']}.csv").is_file(): records.append(item)
        except (OSError,ValueError,KeyError): continue
    return sorted(records,key=lambda x:x.get('created_at',''),reverse=True)

@app.post('/api/predictions',status_code=201)
async def upload(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith('.csv'):
        raise HTTPException(400,'Выберите CSV-файл')
    data=await file.read(MAX_BYTES+1)
    if len(data)>MAX_BYTES: raise HTTPException(413,'Размер файла превышает 10 МБ')
    if not TEST.is_file(): raise HTTPException(503,'Не найден тестовый Parquet для сопоставления id')
    temp=STORE/f'.{uuid.uuid4()}.tmp'
    try:
        temp.write_bytes(data)
        return import_file(temp,Path(file.filename.replace('\\','/')).name)
    except ResultError as exc: raise HTTPException(422,str(exc))
    finally: temp.unlink(missing_ok=True)

@app.get('/api/predictions/{run_id}')
def details(run_id: str): return get_meta(run_id)

@app.get('/api/predictions/{run_id}/results')
def results(run_id: str):
    get_meta(run_id)
    try: return load_prediction(STORE/f'{run_id}.csv',TEST)
    except ResultError as exc: raise HTTPException(422,str(exc))

@app.get('/api/predictions/{run_id}/download')
def download(run_id: str):
    meta=get_meta(run_id); path=STORE/f'{run_id}.csv'
    if not path.is_file(): raise HTTPException(404,'Исходный CSV не найден')
    return FileResponse(path,media_type='text/csv',filename=meta['name'])
