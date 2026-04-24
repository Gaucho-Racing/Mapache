from pathlib import Path
import shutil
import subprocess
import tempfile

def remove_files(*file_paths: str) -> None:
    for file_path in file_paths:
        try:
            Path(file_path).unlink(missing_ok=True)
        except OSError:
            pass


def resolve_clip_window(
    timestamps: list[float] | None,
    start: float | None,
    end: float | None,
) -> tuple[float, float]:
    if timestamps is not None:
        if len(timestamps) != 2:
            raise ValueError("t must be provided exactly twice, for example t=1&t=10")
        start, end = timestamps

    if start is None or end is None:
        raise ValueError("provide either start and end, or two t values")

    if start < 0 or end < 0:
        raise ValueError("timestamps must be non-negative")

    if end <= start:
        raise ValueError("end must be greater than start")

    return float(start), float(end)


def build_video_clip(
    url: str,
    timestamps: list[float] | None,
    start: float | None,
    end: float | None,
) -> tuple[str, str]:
    start_seconds, end_seconds = resolve_clip_window(timestamps, start, end)

    if shutil.which("ffmpeg") is None:
        raise FileNotFoundError("ffmpeg is not installed on the server")

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as clipped_file:
        clipped_path = clipped_file.name

    duration_seconds = end_seconds - start_seconds

    ffmpeg_command = [
        "ffmpeg",
        "-y",
        "-ss",
        str(start_seconds),
        "-i",
        url,
        "-t",
        str(duration_seconds),
        "-c",
        "copy",
        "-movflags",
        "+faststart",
        clipped_path,
    ]

    subprocess.run(ffmpeg_command, check=True, capture_output=True)

    filename = f"clip_{start_seconds:g}_{end_seconds:g}.mp4"
    return clipped_path, filename