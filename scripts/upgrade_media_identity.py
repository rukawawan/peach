"""显式升级媒体库与存储根目录的配置身份；默认仅预演，不读取账本。"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from peach.interface_text import dev as t
from peach import media_libraries, settings_file


def main():
    parser = argparse.ArgumentParser(description=t("upgrade_media_identity.description"))
    parser.add_argument("--data-root", type=Path, required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    config = settings_file.load_config(environ={"PEACH_DATA_ROOT": str(args.data_root.resolve())})
    prepared = settings_file.upgrade_media_identity(config, apply=args.apply)
    print(json.dumps({"applied": args.apply, "already_upgraded": bool(config.storage_roots),
                      "libraries": [{"id": row["id"], "folders": len(row["roots"])}
                                    for row in media_libraries.libraries(prepared)]}, indent=2))


if __name__ == "__main__":
    main()
