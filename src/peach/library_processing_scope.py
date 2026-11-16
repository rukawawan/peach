"""馆藏处理按媒体库身份限制目录、估算与资产集合。"""
import json
import sqlite3
from contextlib import closing

from .media_identity import catalog, project
from .media_libraries import predicate
from .user_messages import UserValueError


def scoped_config(config, library_id):
    if library_id is None:
        return config
    libraries, roots = catalog(config)
    if not isinstance(library_id, str) or library_id not in libraries:
        raise UserValueError('errors.libraryProcessingScope.libraryGone')
    chosen = {key: value for key, value in roots.items() if value['library_id'] == library_id}
    if not chosen:
        raise UserValueError('errors.libraryProcessingScope.noDirectories')
    return project(config, {library_id: libraries[library_id]}, chosen)


def scoped_assets(config, db_path, library_id, asset_ids=None):
    if library_id is None:
        return asset_ids
    clause, values = predicate(config, library_id)
    query = "SELECT a.id FROM asset a WHERE a.medium='video' AND a.disposal IS NULL AND " + clause
    if asset_ids is not None:
        query += ' AND a.id IN (SELECT value FROM json_each(?))'
        values.append(json.dumps(asset_ids))
    with closing(sqlite3.connect(db_path, timeout=30)) as connection:
        return [row[0] for row in connection.execute(query + ' ORDER BY a.id', values)]
