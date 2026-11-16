"""为已登记中文来源词生成有限简体别名；运行时不做语言转换。"""
from pathlib import Path
import argparse
import json
import re
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / 'src'
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from peach.genre_taxonomy import CONTENT_GENRES, NON_CONTENT_GENRES, normalise_genre
from peach.interface_text import dev as t


def aliases():
    from opencc import OpenCC

    converter = OpenCC('t2s')
    content = {}
    excluded = set()
    for raw, label in CONTENT_GENRES.items():
        if re.search(r'[ぁ-ヿ]', raw):
            continue
        simple = converter.convert(raw)
        if simple == raw:
            continue
        key = normalise_genre(simple)
        if key in content and content[key] != label:
            raise ValueError(t('generate_genre_simplified.aliasConflict', alias=simple))
        content[key] = label
    for raw in NON_CONTENT_GENRES:
        if not re.search(r'[ぁ-ヿ]', raw):
            simple = converter.convert(raw)
            if simple != raw:
                excluded.add(normalise_genre(simple))
    collisions = excluded & content.keys()
    if collisions:
        raise ValueError(t('generate_genre_simplified.contentConflict', aliases=str(sorted(collisions))))
    return dict(sorted(content.items())), sorted(excluded)


def main():
    argparse.ArgumentParser(description=t('generate_genre_simplified.description')).parse_args()
    content, excluded = aliases()
    target = PROJECT_ROOT / 'src/peach/genre_taxonomy.py'
    block = ('# BEGIN GENERATED_SIMPLIFIED_GENRES\nCONTENT_ALIASES = '
             + json.dumps(content, ensure_ascii=False, indent=4)
             + '\nEXCLUDED_ALIASES = frozenset(' + json.dumps(excluded, ensure_ascii=False, indent=4)
             + ')\n# END GENERATED_SIMPLIFIED_GENRES')
    source, count = re.subn(r'# BEGIN GENERATED_SIMPLIFIED_GENRES.*?# END GENERATED_SIMPLIFIED_GENRES',
                           lambda _match: block, target.read_text(encoding='utf-8'), flags=re.S)
    if count != 1:
        raise ValueError(t('generate_genre_simplified.blockMissing'))
    target.write_text(source, encoding='utf-8', newline='\n')
    print(t('generate_genre_simplified.done', content=len(content), excluded=len(excluded)))


if __name__ == '__main__':
    main()
