"""Validate an actual prediction file and join it to test identities."""
from pathlib import Path
import numpy as np
import pandas as pd

class ResultError(ValueError):
    pass

def load_prediction(csv_path: Path, mapping_path: Path) -> dict:
    try:
        data = pd.read_csv(csv_path, dtype={'id': 'string'})
        mapping = pd.read_parquet(mapping_path, columns=['id', 'route_id', 'timestamp'])
    except Exception as exc:
        raise ResultError('Не удалось прочитать CSV или тестовый Parquet') from exc
    if mapping.empty:
        raise ResultError('Тестовый набор не содержит записей')
    if not {'id', 'y_pred'}.issubset(data.columns):
        raise ResultError('В CSV нужны столбцы id и y_pred')
    try:
        ids = pd.to_numeric(data['id'], errors='raise')
        vals = pd.to_numeric(data['y_pred'], errors='raise')
        if ids.isna().any() or not np.isfinite(ids).all() or (ids % 1 != 0).any():
            raise ValueError('invalid id')
        if vals.isna().any() or not np.isfinite(vals).all() or (vals < 0).any():
            raise ValueError('invalid forecast')
        data['id'] = ids.astype('int64')
        data['y_pred'] = vals.astype('float64')
        mapping['id'] = pd.to_numeric(mapping['id'], errors='raise').astype('int64')
        mapping['timestamp'] = pd.to_datetime(mapping['timestamp'], errors='raise')
    except Exception as exc:
        raise ResultError('Проверьте id и прогнозы: нужны целые id и конечные неотрицательные значения') from exc
    if data['id'].duplicated().any() or mapping['id'].duplicated().any():
        raise ResultError('Обнаружены повторяющиеся id')
    if len(data) != len(mapping) or set(data['id']) != set(mapping['id']):
        raise ResultError('Набор id в CSV должен точно совпадать с тестовым Parquet')
    if mapping[['route_id', 'timestamp']].isna().any().any() or mapping.duplicated(['route_id','timestamp']).any():
        raise ResultError('В тестовых данных есть пропуски или повторяющиеся направление и время')
    joined = data[['id','y_pred']].merge(mapping, on='id', how='left', validate='one_to_one', sort=False)
    joined['route_id'] = joined['route_id'].astype(str)
    joined['timestamp'] = joined['timestamp'].dt.strftime('%Y-%m-%dT%H:%M:%S')
    rows = joined[['id','route_id','timestamp','y_pred']].to_dict(orient='records')
    return {'rows':rows, 'timestamps':sorted(joined['timestamp'].unique().tolist()),
            'row_count':len(rows), 'route_count':int(joined['route_id'].nunique())}
