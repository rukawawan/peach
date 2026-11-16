"""从同一作品的 JavDB 详情页快照与匿名接口资料生成类别 id 到详情页原词的对照。

输入是 JSON Lines，每行一部作品：`type`（接口作品类型）、`api`（接口类别 `[{id, name}]`，原样顺序）、
`html`（详情页 `?locale=zh` 的类别原词，原样顺序）。两边顺序相同，接口里同一类别可能重复。

1. 去重后长度相等的作品逐位对齐；同一个 (类型, id) 对到两个原词时整项排除，交人核对。
2. 接口多出几项、其余逐位对得上的作品，多出的那几项算「详情页不显示」的证据；至少两部作品为证、
   从没对到过原词的才收进 `HIDDEN`。
3. 去掉 `HIDDEN` 后长度相等的作品再对齐一轮，补上只在这些作品里出现的类别。
"""
from pathlib import Path
import argparse
import json
import re
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / 'src'
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from peach.interface_text import dev as t
from peach.javdb_genres import genre_key

#: 一个类别至少在这么多部作品里多出来，才认作详情页不显示。
HIDDEN_EVIDENCE = 2


def _keys(row):
    """接口类别的键，去重保序。"""
    keys = []
    for tag in row.get('api') or []:
        key = genre_key(row.get('type'), tag.get('id') if isinstance(tag, dict) else None)
        if key and key not in keys:
            keys.append(key)
    return keys


def _words(row):
    return [str(word).strip() for word in row.get('html') or [] if str(word).strip()]


def _pair(seen, keys, words):
    for key, word in zip(keys, words):
        seen.setdefault(key, set()).add(word)


def align(rows):
    """返回 (对照, 详情页不显示的类别, 冲突, 没参与对齐的作品数)。"""
    seen: dict[str, set[str]] = {}
    longer = []
    for row in rows:
        keys, words = _keys(row), _words(row)
        if keys and len(keys) == len(words):
            _pair(seen, keys, words)
        elif words and len(keys) > len(words):
            longer.append((keys, words))
    known = {key: next(iter(words)) for key, words in seen.items() if len(words) == 1}
    votes: dict[str, int] = {}
    for keys, words in longer:
        extra = [key for key in keys if key not in seen]
        if extra and [known.get(key) for key in keys if key in seen] == words:
            for key in extra:
                votes[key] = votes.get(key, 0) + 1
    hidden = sorted((key for key, count in votes.items() if count >= HIDDEN_EVIDENCE), key=_order)
    skipped = len(rows) - sum(1 for row in rows if _keys(row) and len(_keys(row)) == len(_words(row)))
    for keys, words in longer:
        shown = [key for key in keys if key not in hidden]
        if len(shown) == len(words):
            _pair(seen, shown, words)
            skipped -= 1
    table = {key: next(iter(words)) for key, words in seen.items() if len(words) == 1}
    conflicts = {key: sorted(words) for key, words in seen.items() if len(words) > 1}
    return dict(sorted(table.items(), key=lambda item: _order(item[0]))), hidden, conflicts, skipped


def _order(key):
    kind, _, number = key.partition(':')
    return int(kind), int(number) if number.isdigit() else 0, number


def main():
    parser = argparse.ArgumentParser(description=t('generate_javdb_genres.description'))
    parser.add_argument('aligned', nargs='+', type=Path, help=t('generate_javdb_genres.alignedHelp'))
    args = parser.parse_args()
    rows = [json.loads(line) for path in args.aligned
            for line in path.read_text(encoding='utf-8').splitlines() if line.strip()]
    table, hidden, conflicts, skipped = align(rows)
    target = PROJECT_ROOT / 'src/peach/javdb_genres.py'
    block = ('# BEGIN GENERATED_JAVDB_GENRES\nGENRES = '
             + json.dumps(table, ensure_ascii=False, indent=4)
             + '\nHIDDEN = frozenset(' + json.dumps(hidden, ensure_ascii=False, indent=4)
             + ')\n# END GENERATED_JAVDB_GENRES')
    source, count = re.subn(r'# BEGIN GENERATED_JAVDB_GENRES.*?# END GENERATED_JAVDB_GENRES',
                            lambda _match: block, target.read_text(encoding='utf-8'), flags=re.S)
    if count != 1:
        raise ValueError(t('generate_javdb_genres.blockMissing'))
    target.write_text(source, encoding='utf-8', newline='\n')
    print(t('generate_javdb_genres.done', table=len(table), hidden=len(hidden), conflicts=len(conflicts),
            skipped=skipped))
    for key, words in conflicts.items():
        print(t('generate_javdb_genres.conflict', key=key, words=words))


if __name__ == '__main__':
    main()
