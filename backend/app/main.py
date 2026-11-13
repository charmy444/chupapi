from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
import json, os, shutil, uuid, urllib.request, urllib.error
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from .results import ResultError, load_prediction

ROOT = Path(__file__).resolve().parents[2]
DATA = Path(os.environ.get('FORECAST_DATA_DIR', ROOT / 'data'))
TEST = DATA / 'raw/test_solo_track.parquet'
SOURCE = DATA / 'raw/best_score.csv'
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
        try: import_file(SOURCE,SOURCE.name,'Прогноз отгрузок')
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


class AssistantRequest(BaseModel):
    run_id: str
    question: str = Field(min_length=1, max_length=2000)
    timestamp: str
    route_id: str | None = None
    route_ids: list[str] | None = Field(default=None, max_length=1000)
    history: list[dict[str, str]] = Field(default_factory=list, max_length=8)

@app.post('/api/assistant')
def assistant(body: AssistantRequest):
    key=os.environ.get('POLZA_API_KEY','').strip()
    if not key: raise HTTPException(503,'Добавьте POLZA_API_KEY в .env и перезапустите приложение')
    get_meta(body.run_id)
    try: result=load_prediction(STORE/f'{body.run_id}.csv',TEST)
    except ResultError as exc: raise HTTPException(503,str(exc)) from exc
    if body.timestamp not in result['timestamps']: raise HTTPException(422,'Неизвестное время прогноза')
    try: earlier=(datetime.fromisoformat(body.timestamp)-timedelta(hours=2)).isoformat(timespec='seconds')
    except ValueError as exc: raise HTTPException(422,'Некорректное время') from exc
    if earlier not in result['timestamps']: earlier=None
    scope=set(body.route_ids) if body.route_ids is not None else None
    by_route={}
    for row in result['rows']:
        if scope is not None and row['route_id'] not in scope: continue
        by_route.setdefault(row['route_id'],{})[row['timestamp']]=row['y_pred']
    if not by_route: return {'answer':'Для этого склада нет привязанных прогнозов направлений.','route_ids':[]}
    context=[]
    for route_id,values in by_route.items():
        current=values.get(body.timestamp)
        if current is None: continue
        past=values.get(earlier) if earlier else None
        context.append([route_id,round(current),round(past) if past is not None else None,round(sum(values.values())/len(values)),round(max(values.values())),max(values,key=values.get)[11:16]])
    system=('Ты ИИ помощник диспетчера. Отвечай по-русски кратко и только на основе данных. '
      'Значения — прогноз товаров за час; соседние интервалы перекрываются, их нельзя суммировать. '
      'Нет фактических рейсов, GPS, истории до прогноза и подтверждённых аномалий. '
      'Связь направлений со складами демонстрационная, не выдавай её за фактическую. '
      'Если нет данных, прямо скажи об этом. Для выделения маршрутов верни JSON: '
      '{"answer":"текст", "route_ids":["id"]}. Указывай только ID из данных, максимум 5.')
    payload=json.dumps({'model':os.environ.get('POLZA_MODEL','deepseek/deepseek-v4.1-flash-1017'),'messages':[
      {'role':'system','content':system},
      *[{'role':m['role'],'content':m['content'][:2000]} for m in body.history if m.get('role') in ('user','assistant') and isinstance(m.get('content'),str)],
      {'role':'user','content':json.dumps({'question':body.question,'selected_time':body.timestamp,'two_hours_before':earlier,'selected_route':body.route_id,'forecast_columns':['id','current','two_hours_ago','mean','peak','peak_time'],'forecast':context},ensure_ascii=False,separators=(',',':'))}
    ],'response_format':{'type':'json_object'},'reasoning':{'enabled':False},'temperature':0.2,'max_tokens':1200},ensure_ascii=False).encode()
    req=urllib.request.Request('https://polza.ai/api/v1/chat/completions',data=payload,headers={'Authorization':f'Bearer {key}','Content-Type':'application/json'},method='POST')
    try:
        with urllib.request.urlopen(req,timeout=45) as response: raw=json.load(response)
        content=json.loads(raw['choices'][0]['message']['content']);answer=content['answer']
        if not isinstance(answer,str) or not answer.strip(): raise ValueError('empty answer')
        ids=content.get('route_ids',[])
        ids=list(dict.fromkeys(str(x) for x in ids if str(x) in by_route))[:5] if isinstance(ids,list) else []
        return {'answer':answer,'route_ids':ids}
    except urllib.error.HTTPError as exc:
        if exc.code in (401,403): message='Polza не приняла ключ. Проверьте POLZA_API_KEY и перезапустите приложение'
        elif exc.code==402: message='Недостаточно средств на балансе Polza'
        elif exc.code==429: message='Polza ограничила число запросов. Попробуйте позже'
        else: message='Polza временно не отвечает. Попробуйте ещё раз'
        raise HTTPException(502,message) from exc
    except (urllib.error.URLError,TimeoutError,ValueError,KeyError,IndexError,TypeError) as exc:
        raise HTTPException(502,'Не удалось получить ответ. Проверьте соединение с Polza') from exc
