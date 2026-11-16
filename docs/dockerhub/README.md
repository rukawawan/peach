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
| `edge`, `latest` | Both move to the latest complete release; NAS container managers check `latest` for updates |
| Platform | `linux/amd64` and `linux/arm64` in one multi-arch image |
| User | UID/GID `1000` by default; override with `PEACH_UID`/`PEACH_GID` |
| Port | `8900/tcp` |
| `/data` | Settings, database, credentials and image cache; must be persistent |
| `/media` | Your media, mounted read-only by default |

The image includes Peach, the web UI, FFmpeg, FFprobe, OpenSSL and the amane scraping runtime. It runs headless; there is no desktop tray in the container.

## Quick start with Docker Compose

This example targets a Linux host with Docker Engine and Docker Compose. The media folder must already exist and be readable by the configured UID/GID. If you use CloudDrive2, finish binding and mounting your cloud drives on the host first.

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
      PEACH_UID: "${PEACH_UID-1000}"
      PEACH_GID: "${PEACH_GID-1000}"
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
PEACH_UID=1000
PEACH_GID=1000
```

Set `PEACH_UID` and `PEACH_GID` to numeric IDs when NAS ownership cannot be changed to 1000. The entrypoint updates ownership of `/data` and the one-click update token volume when needed, then runs Peach as the requested non-root user. It never recursively changes `/media`. Keep these values in the persistent `.env`; changing them later can change ownership under a bind-mounted `/data`. Rootless Docker and `userns-remap` remain subject to the host's ID mapping.

Pull the image:

```console
docker compose pull
```

Start Peach:

```console
docker compose up -d
```

Open `http://127.0.0.1:8900` on the host, or reach it through a private VPN or SSH tunnel. The first-time setup page asks for the media folder inside the container, such as `/media`, and an access password. There is no default password.

## NAS and LAN access

`PEACH_BIND=127.0.0.1` only accepts connections from the host itself. To open Peach from another computer, set `PEACH_BIND` to the NAS's LAN IP, recreate the container and open `http://<NAS LAN IP>:<PEACH_PORT>`. Set an access password first. The image has no multi-user accounts; for public hosting, read the [security policy](https://github.com/peach-mitao/peach/blob/master/SECURITY.md).

`peach token` in the container's terminal shows the token for the userscript and the API; it is not the sign-in password. `docker compose exec` enters the container as root; the `peach` command switches to the configured UID/GID before it runs, so it leaves no root-owned files in `/data`.

For a new NAS installation, `python -m peach.nas_setup --bind <NAS IP> --media <host media directory>` inside the image generates a Compose file with a persistent data volume, read-only media and a stable hostname. The amd64 image includes Intel iHD and Mesa VAAPI drivers. GPU access is optional: use the render node's numeric group, or explicitly select `--prepare-render` for a mode-0600 node; the image entrypoint then hands only the container device to the service group before it drops to the non-root user. `--uid` and `--gid` set `PEACH_UID` and `PEACH_GID`. See the [NAS installation and hardware guide](https://github.com/peach-mitao/peach/blob/master/docs/DOCKER.md) for prerequisites, preserving an existing deployment and verification.

## Updating

Run `docker compose pull` and `docker compose up -d` again. Keep the `peach-data` volume: deleting it removes your settings, database and watch history.

To update from the settings page instead, use the repository's [`compose.yaml`](https://github.com/peach-mitao/peach/blob/master/compose.yaml) and start it with `docker compose --profile watchtower up -d`. It adds an optional Watchtower container that Peach configures itself; the settings page then offers a one-click update when a new image is published. Watchtower mounts the Docker socket, which gives it root-level control of the host; read the [one-click update section](https://github.com/peach-mitao/peach/blob/master/docs/DOCKER.md#一键更新可选-watchtower) before enabling it.

Hardware transcoding, CloudDrive2 networking, path mapping and diagnostics are covered in the [Docker guide](https://github.com/peach-mitao/peach/blob/master/docs/DOCKER.md).

## License

[AGPL-3.0-or-later](https://github.com/peach-mitao/peach/blob/master/LICENSE). Third-party components, including the bundled amane runtime, retain their own licenses. Use of the Peach name and logo follows the [name and logo policy](https://github.com/peach-mitao/peach/blob/master/docs/TRADEMARKS.md).

Manage only media you own or are authorized to use, subject to laws, copyright and source-platform access, age and regional restrictions. Peach does not provide video resources or access to paid content.
