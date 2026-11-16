"""以账本路径浏览原目录；目录索引不访问媒体挂载。"""
from __future__ import annotations

from hashlib import sha256
from pathlib import PureWindowsPath

from . import media_libraries
from .user_messages import UserValueError


def folder_id(location: str, path: str) -> str:
    key = location + '\0' + str(PureWindowsPath(path)).casefold()
    return sha256(key.encode('utf-8')).hexdigest()[:24]


def within(path: str, directory: str, recursive: bool = True) -> bool:
    parent = PureWindowsPath(path).parent
    root = PureWindowsPath(directory)
    return parent == root or (recursive and root in parent.parents)


def path_predicate(location: str, path: str, recursive: bool = True, alias: str = 'a'):
    """按完整目录组件匹配，目录名中的 SQL 通配符保持字面含义。"""
    prefix = str(PureWindowsPath(path)).rstrip('\\') + '\\'
    normalized = f"replace({alias}.path,'/',char(92))"
    clause = f'({alias}.location=? AND substr({normalized},1,?)=? COLLATE NOCASE'
    params: list = [location, len(prefix), prefix]
    if not recursive:
        clause += f" AND instr(substr({normalized},?),char(92))=0"
        params.append(len(prefix) + 1)
    return clause + ')', params


def directory_index(connection, config, *, locations: str = '', library: str = '') -> dict[str, dict]:
    """列出数据库路径前缀及其已登记目录；同名目录按来源和完整路径保持独立。"""
    allowed = set(locations.split(',')) if locations else set(config.locations)
    declared = [(location, str(PureWindowsPath(root)))
                for location, roots in config.locations.items() if location in allowed for root in roots]
    if library:
        group = next((row for row in media_libraries.libraries(config) if row['id'] == library), None)
        held = {(row['location'], str(PureWindowsPath(row['root']))) for row in group['roots']} if group else set()
        declared = [item for item in declared if item in held]
    result: dict[str, dict] = {}

    def add(location, path, parent, root):
        key = folder_id(location, path)
        if key not in result:
            result[key] = {'id': key, 'location': location, 'path': path,
                           'name': PureWindowsPath(path).name or path, 'parent': parent,
                           'root': root, 'videos': 0, 'files': 0, 'has_children': False}
        return result[key]

    for location, root in declared:
        node = add(location, root, None, folder_id(location, root))
        node.update(media_libraries.media_identity.ownership(config, root))
        node['name'] = getattr(config, 'library_names', {}).get(root) or node['name']
    def chain_for(location, path):
        target = PureWindowsPath(path)
        matches = [(loc, root) for loc, root in declared if loc == location and within(str(target), root)]
        if not matches:
            return None
        _, root = max(matches, key=lambda item: len(PureWindowsPath(item[1]).parts))
        root_key = folder_id(location, root)
        tail = target.parent.relative_to(PureWindowsPath(root)).parts
        chain = [result[root_key]]
        current = PureWindowsPath(root)
        for part in tail:
            current /= part
            chain[-1]['has_children'] = True
            chain.append(add(location, str(current), chain[-1]['id'], root_key))
        return chain

    # 同一目录下的文件走出来的是同一条链。七八万行逐行构造路径对象要好几秒，按目录前缀
    # 记下第一条算出的链，其余文件只累加计数。末段为空或 `.`、没有分隔符、UNC 形态的
    # 前缀不保证同前缀同父目录，逐行照算。
    chains: dict[tuple[str, str], list | None] = {}
    rows = connection.execute(
        "SELECT location,path,medium FROM asset WHERE path IS NOT NULL AND path<>'' "
        "AND COALESCE(disposal,'') NOT IN ('trash','vanished') ORDER BY id")
    for location, path, medium in rows:
        cut = max(path.rfind('\\'), path.rfind('/'))
        prefix = path[:cut]
        group = ((location, prefix) if cut > 0 and path[cut + 1:] not in ('', '.')
                 and prefix[:2].replace('/', '\\') != '\\\\' else None)
        if group is None:
            chain = chain_for(location, path)
        elif group in chains:
            chain = chains[group]
        else:
            chain = chains[group] = chain_for(location, path)
        if chain is None:
            continue
        for node in chain:
            node['files'] += 1
            node['videos'] += medium == 'video'
    return result


def browse(index: dict[str, dict], key: str = '', search: str = '') -> dict:
    selected = index.get(key)
    if key and selected is None:
        raise UserValueError("errors.mediaFolders.folderMissing")
    ancestors = []
    node = selected
    while node:
        ancestors.insert(0, node)
        node = index.get(node['parent'])
    order = lambda row: (row['name'].casefold(), row['location'], row['path'].casefold())
    roots = sorted((row for row in index.values() if row['parent'] is None), key=order)
    children = sorted((row for row in index.values() if row['parent'] == (key or None)), key=order)
    matches = sorted((row for row in index.values() if search.casefold() in row['name'].casefold()), key=order)[:100] if search else []
    return {'roots': roots, 'children': children, 'ancestors': ancestors,
            'selected': selected, 'matches': matches}
