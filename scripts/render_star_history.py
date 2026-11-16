"""按 GitHub 逐日 Star 记录生成 README 用的浅色与深色累计 Star 图。

数据取自 `stargazers/history`：每周一条，`days` 是周日起的逐日新增。横轴从第一个
Star 当天开始，到生成时刻为止；当前周里尚未到来的日子不画点。
"""
from __future__ import annotations

import argparse
from datetime import UTC, datetime, timedelta
import json
import math
import os
from pathlib import Path
import subprocess
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from peach.interface_text import dev as t  # noqa: E402

WIDTH, HEIGHT = 900, 508
LEFT, RIGHT, TOP, BOTTOM = 56, 872, 90, 456
DAY = timedelta(days=1)
#: 刻度对齐的周日，与 GitHub 的周起点一致。
SUNDAY = datetime(1970, 1, 4, tzinfo=UTC)

PEACH = {"l1": "#ffded4", "l2": "#ffb099", "l3": "#f68168", "l4": "#df533b"}
THEMES = {
    "light": {"text": "#1f2328", "muted": "#59636e", "axis": "#d1d9e0", "accent": "#e3b341"},
    "dark": {"text": "#e6edf3", "muted": "#9198a1", "axis": "#3d444d", "accent": "#e3b341"},
}


def fetch_history(repository: str) -> list[dict]:
    result = subprocess.run(
        ["gh", "api", "--paginate", "--slurp", f"repos/{repository}/stargazers/history?per_page=100"],
        capture_output=True, text=True, encoding="utf-8", timeout=120)
    if result.returncode:
        raise RuntimeError(t("render_star_history.fetchFailed", error=result.stderr.strip()))
    return [week for page in json.loads(result.stdout) for week in page]


def daily_points(weeks: list[dict], as_of: datetime) -> list[tuple[datetime, int]]:
    """返回 (时刻, 累计 Star) 序列：第一个 Star 当天零点为 0，此后每天收盘一个点，末点是 as_of。"""
    days: list[tuple[datetime, int]] = []
    for week in sorted(weeks, key=lambda item: item["week"]):
        start = datetime.fromtimestamp(week["week"], UTC)
        if len(week["days"]) != 7:
            raise ValueError(t("render_star_history.weekNotSevenDays", week=f"{start:%Y-%m-%d}"))
        days += [(start + index * DAY, count) for index, count in enumerate(week["days"])
                 if start + index * DAY <= as_of]
    first = next((index for index, (_, count) in enumerate(days) if count), None)
    if first is None:
        raise ValueError(t("render_star_history.empty"))
    points, total = [(days[first][0], 0)], 0
    for day, count in days[first:]:
        total += count
        points.append((min(day + DAY, as_of), total))
    return points


def monotone_path(points: list[tuple[float, float]]) -> str:
    """单调三次插值（Fritsch–Carlson，与 d3 `curveMonotoneX` 相同），累计值不会画出回落或越过下一点。"""
    if len(points) < 2:
        x, y = points[0]
        return f"M{x:.2f},{y:.2f}"
    xs, ys = zip(*points)
    gaps = [xs[i + 1] - xs[i] for i in range(len(xs) - 1)]
    secants = [(ys[i + 1] - ys[i]) / gaps[i] if gaps[i] else 0.0 for i in range(len(gaps))]
    tangents = [0.0] * len(points)
    for i in range(1, len(points) - 1):
        before, after = secants[i - 1], secants[i]
        if before * after > 0:
            middle = (before * gaps[i] + after * gaps[i - 1]) / (gaps[i - 1] + gaps[i])
            tangents[i] = math.copysign(2 * min(abs(before), abs(after), 0.5 * abs(middle)), before)
    tangents[0] = (3 * secants[0] - tangents[1]) / 2 if len(points) > 2 else secants[0]
    tangents[-1] = (3 * secants[-1] - tangents[-2]) / 2 if len(points) > 2 else secants[-1]
    path = [f"M{xs[0]:.2f},{ys[0]:.2f}"]
    for i, gap in enumerate(gaps):
        step = gap / 3
        path.append(f"C{xs[i] + step:.2f},{ys[i] + step * tangents[i]:.2f},"
                    f"{xs[i + 1] - step:.2f},{ys[i + 1] - step * tangents[i + 1]:.2f},"
                    f"{xs[i + 1]:.2f},{ys[i + 1]:.2f}")
    return "".join(path)


def value_ticks(top: int) -> list[int]:
    raw = top / 4
    magnitude = 10 ** math.floor(math.log10(raw)) if raw >= 1 else 1
    step = next(magnitude * factor for factor in (1, 2, 2.5, 5, 10) if magnitude * factor >= raw)
    return [int(step * index) for index in range(int(top // step) + 1)]


def compact(value: int) -> str:
    if value < 1000:
        return str(value)
    return f"{value / 1000:.1f}".removesuffix(".0") + "k"


def date_ticks(start: datetime, end: datetime) -> list[datetime]:
    """从周日起按 1、2 周或 4 周的倍数取刻度，最多 7 个。"""
    span = (end - start) / DAY
    step = next(days for days in (1, 2, 7, 14, 28, 56, 112, 182, 364) if span / days <= 7)
    offset = math.ceil((start - SUNDAY) / DAY / step) * step
    tick, ticks = SUNDAY + offset * DAY, []
    while tick <= end:
        ticks.append(tick)
        tick += step * DAY
    return ticks


def render(points: list[tuple[datetime, int]], repository: str, theme: str) -> str:
    colors = THEMES[theme]
    start, end = points[0][0], points[-1][0]
    total = points[-1][1]
    span = (end - start).total_seconds() or 1
    top = max(total, 1)

    def x_of(moment: datetime) -> float:
        return LEFT + (RIGHT - LEFT) * (moment - start).total_seconds() / span

    def y_of(value: float) -> float:
        return BOTTOM - (BOTTOM - TOP) * value / top

    screen = [(x_of(moment), y_of(value)) for moment, value in points]
    line = monotone_path(screen)
    area = f"{line}L{screen[-1][0]:.2f},{BOTTOM}L{screen[0][0]:.2f},{BOTTOM}Z"
    grid = "".join(
        f'<line x1="{LEFT}" x2="{RIGHT}" y1="{y_of(tick):.2f}" y2="{y_of(tick):.2f}" class="axis"/>'
        f'<text x="{LEFT - 6}" y="{y_of(tick) + 3:.2f}" class="muted" font-size="10" text-anchor="end">'
        f"{compact(tick)}</text>"
        for tick in value_ticks(top))
    label = "%b %d" if (end - start) < 365 * DAY else "%b %Y"
    dates = "".join(
        f'<text x="{x_of(tick):.2f}" y="{BOTTOM + 16}" class="muted" font-size="10" text-anchor="middle">'
        f"{tick:{label}}</text>"
        for tick in date_ticks(start, end))
    stroke = 'class="ink" stroke-linecap="round" stroke-linejoin="round"'
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" '
        f'viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-labelledby="title desc">'
        f'<title id="title">{repository}</title>'
        f'<desc id="desc">Daily cumulative stars for {repository}: {total:,} recorded from '
        f'{start:%Y-%m-%d} to {end:%Y-%m-%d}.</desc>'
        "<style>svg{font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;}"
        f".text{{fill:{colors['text']};}}.muted{{fill:{colors['muted']};}}"
        f".accent{{fill:{colors['accent']};}}.axis{{stroke:{colors['axis']};}}"
        f".ink{{fill:none;stroke:{PEACH['l4']};}}.stop{{stop-color:{PEACH['l4']};}}</style>"
        "<defs>"
        f'<filter id="halo" filterUnits="userSpaceOnUse" x="{LEFT - 12}" y="{TOP - 12}" '
        f'width="{RIGHT - LEFT + 24}" height="{BOTTOM - TOP + 24}"><feGaussianBlur stdDeviation="3"/></filter>'
        '<linearGradient id="stream" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" class="stop" stop-opacity="0.55"/>'
        '<stop offset="0.6" class="stop" stop-opacity="0.18"/>'
        '<stop offset="1" class="stop" stop-opacity="0.02"/></linearGradient>'
        "</defs>"
        f'<text x="16" y="26" class="text" font-size="14" font-weight="600">{repository}</text>'
        '<text x="16" y="42" class="muted" font-size="11">daily, since the first star</text>'
        f'<text x="{WIDTH - 16}" y="26" class="text" font-size="13" text-anchor="end">'
        f'<tspan class="accent">★</tspan> {total:,}</text>'
        f'<rect x="16" y="54" width="10" height="10" fill="{PEACH["l4"]}"/>'
        '<text x="32" y="62" class="muted" font-size="10">Recorded stars</text>'
        f"{grid}"
        f'<line x1="{LEFT}" x2="{LEFT}" y1="{TOP}" y2="{BOTTOM}" class="axis"/>'
        f"{dates}"
        f'<path d="{area}" fill="url(#stream)"/>'
        f'<g filter="url(#halo)" opacity="0.55"><path d="{line}" {stroke} stroke-width="8"/></g>'
        f'<g opacity="0.2"><path d="{line}" {stroke} stroke-width="6"/></g>'
        f'<path d="{line}" {stroke} stroke-width="2"/>'
        "</svg>\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=t("render_star_history.description"))
    parser.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY"))
    parser.add_argument("--history-file", type=Path, help=t("render_star_history.historyFileHelp"))
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    if not args.repo:
        parser.error(t("render_star_history.repoMissing"))
    weeks = (json.loads(args.history_file.read_text(encoding="utf-8")) if args.history_file
             else fetch_history(args.repo))
    points = daily_points(weeks, datetime.now(UTC))
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for theme in THEMES:
        target = args.output_dir / f"star-history-{theme}.svg"
        target.write_text(render(points, args.repo, theme), encoding="utf-8", newline="\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
