import json
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from app import main

@pytest.fixture
def assistant_client(tmp_path, monkeypatch):
 raw=tmp_path/'raw';raw.mkdir();store=tmp_path/'store'
 pd.DataFrame({'id':[0,1,2,3], 'route_id':['10','10','20','20'], 'timestamp':pd.to_datetime(['2025-11-01 11:00','2025-11-01 13:00','2025-11-01 11:00','2025-11-01 13:00'])}).to_parquet(raw/'test.parquet')
 (raw/'result.csv').write_text('id,y_pred\n0,100\n1,150\n2,900\n3,1000\n')
 monkeypatch.setattr(main,'TEST',raw/'test.parquet');monkeypatch.setattr(main,'SOURCE',raw/'result.csv');monkeypatch.setattr(main,'STORE',store)
 monkeypatch.setenv('POLZA_API_KEY','test-secret')
 with TestClient(main.app) as client: yield client

def test_assistant_scopes_selected_run_and_rejects_unknown_ids(assistant_client,monkeypatch):
 class Response:
  def __enter__(self): return self
  def __exit__(self,*args): pass
  def read(self): return json.dumps({'choices':[{'message':{'content':json.dumps({'answer':'Проверьте 10', 'route_ids':['10','20','bad']})}}]}).encode()
 def fake_open(req,timeout):
  payload=json.loads(req.data);assert payload['reasoning']=={'enabled':False}
  data=json.loads(payload['messages'][-1]['content']);assert all(r[0]=='10' for r in data['forecast'])
  return Response()
 monkeypatch.setattr(main.urllib.request,'urlopen',fake_open)
 run=assistant_client.get('/api/predictions').json()[0]['id']
 r=assistant_client.post('/api/assistant',json={'run_id':run,'question':'Где пик?', 'timestamp':'2025-11-01T13:00:00','route_ids':['10']})
 assert r.status_code==200
 assert r.json()['route_ids']==['10']

def test_assistant_does_not_call_provider_with_empty_scope(assistant_client,monkeypatch):
 monkeypatch.setattr(main.urllib.request,'urlopen',lambda *a,**k:pytest.fail('provider called'))
 run=assistant_client.get('/api/predictions').json()[0]['id']
 r=assistant_client.post('/api/assistant',json={'run_id':run,'question':'Что на складе?', 'timestamp':'2025-11-01T13:00:00','route_ids':[]})
 assert r.status_code==200 and r.json()['route_ids']==[]
