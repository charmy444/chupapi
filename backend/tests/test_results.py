from pathlib import Path
import pandas as pd
import pytest
from app.results import load_prediction, ResultError

@pytest.fixture
def mapping(tmp_path):
    path=tmp_path/'test.parquet'
    pd.DataFrame({'id':[10,11,20,21],'route_id':['north','north','south','south'],'timestamp':pd.to_datetime(['2025-11-01 11:00','2025-11-01 11:30']*2)}).to_parquet(path)
    return path

def test_join_is_by_id_and_preserves_input(tmp_path,mapping):
    path=tmp_path/'pred.csv'; original=b'id,y_pred\n21,42\n10,18\n11,20\n20,30\n';path.write_bytes(original)
    result=load_prediction(path,mapping)
    assert [(r['id'],r['route_id'],r['y_pred']) for r in result['rows']]==[(21,'south',42),(10,'north',18),(11,'north',20),(20,'south',30)]
    assert result['timestamps']==['2025-11-01T11:00:00','2025-11-01T11:30:00']
    assert path.read_bytes()==original

@pytest.mark.parametrize('content',[
    'id,y_pred\n10,1\n10,2\n20,3\n21,4\n',
    'id,y_pred\n10,1\n11,2\n20,3\n99,4\n',
    'id,y_pred\n10,1\n11,NaN\n20,3\n21,4\n',
    'id,y_pred\n10,1\n11,-2\n20,3\n21,4\n',
    'id,y_pred\n10,1\n11,2\n20,3\n',
])
def test_reject_invalid_or_incomplete_predictions(tmp_path,mapping,content):
    path=tmp_path/'bad.csv';path.write_text(content)
    with pytest.raises(ResultError):load_prediction(path,mapping)
