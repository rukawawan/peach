<p align="center"><img src="https://raw.githubusercontent.com/peach-mitao/peach/master/resources/peach-logo-128.png" alt="Peach" width="88"></p>

# Peach

A local-first video metadata scraper and media manager, packaged for self-hosting on a VPS or NAS.

[Website](https://peach.video) · [Live demo](https://demo.peach.video) · [Source and full README](https://github.com/peach-mitao/peach) · [Docker guide (Chinese)](https://github.com/peach-mitao/peach/blob/master/docs/DOCKER.md) · [Releases](https://github.com/peach-mitao/peach/releases) · [Issues](https://github.com/peach-mitao/peach/issues) · [简体中文](https://github.com/peach-mitao/peach/blob/master/README.zh-CN.md)

[![Video library with search, filters and posters](https://peach.video/assets/screenshots/home-wide-20261025-2-1280.webp)](https://demo.peach.video)

Movie demo data; see [asset credits and licenses](https://peach.video/en/credits/). More screenshots are in the [GitHub README](https://github.com/peach-mitao/peach#screenshots).

## Features

- **Metadata scraping**: recognize video codes, read NFO files and fill titles, performers, studios and covers from multiple sources while keeping your edits.
- **Local and cloud libraries**: browse mounted folders, SMB shares and CloudDrive2 cloud mounts in one library. Scanning is read-only and media stays where it is.
- **Playback and history**: stream in the browser with subtitles, playback speed, resume and timeline previews.
- **Follows and discovery**: track performer and creator updates, discover titles and manage a want list.
- **Library management**: manage tags, duplicates, versions and parts; metadata and watch history stay in your data volume.
- **Any device**: manage and watch from a desktop, tablet or phone browser.

## Image and tags

| Item | Value |
| --- | --- |
| Image | `longmeidao/peach`; the same image is also published as `ghcr.io/peach-mitao/peach` |
| Version tags | One per release, built from the release commit |
| `edge` | Moves to the latest complete release |
| Platform | `linux/amd64`; ARM NAS is not yet verified |
| User | UID/GID `1000`, non-root |
| Port | `8900/tcp` |
| `/data` | Settings, database, credentials and image cache; must be persistent |
| `/media` | Your media, mounted read-only by default |

The image includes Peach, the web UI, FFmpeg, FFprobe, OpenSSL and the amane scraping runtime. It runs headless; there is no desktop tray in the container.

## Quick start with Docker Compose

This example targets a Linux host with Docker Engine and Docker Compose. The media folder must already exist and be readable by UID 1000. If you use CloudDrive2, finish binding and mounting your cloud drives on the host first.

Save this as `compose.yaml` in an empty folder:

```yaml
services:
  peach:
    image: longmeidao/peach:${PEACH_VERSION:-edge}
    init: true
    restart: unless-stopped
    stop_grace_period: 75s
    environment:
      PEACH_IMAGE_TAG: ${PEACH_VERSION:-edge}
    labels:
      com.centurylinklabs.watchtower.enable: "true"
    ports:
      - "${PEACH_BIND:-127.0.0.1}:${PEACH_PORT:-8900}:8900"
    volumes:
      - peach-data:/data
      - peach-update:/update
      - type: bind
        source: ${PEACH_MEDIA_ROOT:?Set PEACH_MEDIA_ROOT in .env to an existing media folder}
        target: /media
        read_only: true
        bind:
          propagation: rslave
          create_host_path: false

volumes:
  peach-data:
  peach-update:
```

Save `.env` next to it and replace the path with the absolute media path on your host:

```dotenv
PEACH_MEDIA_ROOT=/absolute/path/to/media
PEACH_BIND=127.0.0.1
PEACH_PORT=8900
```

Pull the image:

```console
docker compose pull
```

Start Peach:

```console
docker compose up -d
```

Show the first sign-in token. It is private, so run this in your own terminal only:

```console
docker compose exec peach peach token
```

Open `http://127.0.0.1:8900` on the host, or reach it through a private VPN or SSH tunnel. Sign in, set an access password, then add a media folder inside the container, such as `/media`, on the settings page.

## NAS and LAN access

`PEACH_BIND=127.0.0.1` only accepts connections from the host itself. To open Peach from another computer, set `PEACH_BIND` to the NAS's LAN IP, recreate the container and open `http://<NAS LAN IP>:<PEACH_PORT>`. Set an access password first. The image has no multi-user accounts; for public hosting, read the [security policy](https://github.com/peach-mitao/peach/blob/master/SECURITY.md).

On NAS container UIs, run `peach token` in the Peach container's terminal to get the sign-in token.

## Updating

Run `docker compose pull` and `docker compose up -d` again. Keep the `peach-data` volume: deleting it removes your settings, database and watch history.

To update from the settings page instead, use the repository's [`compose.yaml`](https://github.com/peach-mitao/peach/blob/master/compose.yaml) and start it with `docker compose --profile watchtower up -d`. It adds an optional Watchtower container that Peach configures itself; the settings page then offers a one-click update when a new image is published. Watchtower mounts the Docker socket, which gives it root-level control of the host; read the [one-click update section](https://github.com/peach-mitao/peach/blob/master/docs/DOCKER.md#一键更新可选-watchtower) before enabling it.

Hardware transcoding, CloudDrive2 networking, path mapping and diagnostics are covered in the [Docker guide](https://github.com/peach-mitao/peach/blob/master/docs/DOCKER.md).

## License

[AGPL-3.0-or-later](https://github.com/peach-mitao/peach/blob/master/LICENSE). Third-party components, including the bundled amane runtime, retain their own licenses. Use of the Peach name and logo follows the [name and logo policy](https://github.com/peach-mitao/peach/blob/master/docs/TRADEMARKS.md).

Manage only media you own or are authorized to use, subject to laws, copyright and source-platform access, age and regional restrictions. Peach does not provide video resources or access to paid content.
