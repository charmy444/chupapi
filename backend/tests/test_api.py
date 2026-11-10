import pandas as pd
import pytest
from fastapi.testclient import TestClient
from app import main

@pytest.fixture
def client(tmp_path,monkeypatch):
    raw=tmp_path/'raw';raw.mkdir()
    pd.DataFrame({'id':[0,1],'route_id':[471,471], 'timestamp':pd.to_datetime(['2025-11-01 11:00','2025-11-01 11:30'])}).to_parquet(raw/'test_solo_track.parquet')
    (raw/'catboost_88.csv').write_bytes(b'id,y_pred\n0,100.25\n1,120.5\n')
    monkeypatch.setattr(main,'TEST',raw/'test_solo_track.parquet')
    monkeypatch.setattr(main,'SOURCE',raw/'catboost_88.csv')
    monkeypatch.setattr(main,'STORE',tmp_path/'processed')
    with TestClient(main.app) as c: yield c

def test_bootstrap_join_download_and_inference_state(client):
    assert client.get('/api/health').json()['status']=='ok'
    assert client.get('/api/model/info').json()['inference_available'] is False
    runs=client.get('/api/predictions').json();assert len(runs)==1
    result=client.get(f"/api/predictions/{runs[0]['id']}/results").json()
    assert [(x['route_id'],x['timestamp'],x['y_pred']) for x in result['rows']]==[('471','2025-11-01T11:00:00',100.25),('471','2025-11-01T11:30:00',120.5)]
    assert client.get(f"/api/predictions/{runs[0]['id']}/download").content==b'id,y_pred\n0,100.25\n1,120.5\n'

def test_import_validates_ids_and_preserves_original_bytes(client):
    original=b'id,y_pred,extra\n1,1.5,unchanged\n0,2,also\n'
    response=client.post('/api/predictions',files={'file':('other.csv',original,'text/csv')})
    assert response.status_code==201
    run=response.json()
    assert client.get(f"/api/predictions/{run['id']}/download").content==original
    assert [r['id'] for r in client.get(f"/api/predictions/{run['id']}/results").json()['rows']]==[1,0]
    bad=client.post('/api/predictions',files={'file':('bad.csv',b'id,y_pred\n0,3\n0,7\n','text/csv')})
    assert bad.status_code==422
    assert len(client.get('/api/predictions').json())==2

def test_unknown_or_unsafe_result_is_not_readable(client):
    assert client.get('/api/predictions/not-a-uuid/download').status_code==404
