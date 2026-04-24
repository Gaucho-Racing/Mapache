import subprocess

from fastapi import APIRouter, BackgroundTasks, Query
from fastapi.responses import FileResponse, JSONResponse
from typing import Annotated

from query.service.video import build_video_clip, remove_files

router = APIRouter()

@router.get("/video")
def clip_video(
    url: Annotated[str, Query(description="Source MP4 URL")],
    t: Annotated[list[float] | None, Query(alias="t")] = None,
    start: Annotated[float | None, Query(description="Clip start time in seconds")] = None,
    end: Annotated[float | None, Query(description="Clip end time in seconds")] = None,
):
    try:
        clipped_path, filename = build_video_clip(url=url, timestamps=t, start=start, end=end)

        background_tasks = BackgroundTasks()
        background_tasks.add_task(remove_files, clipped_path)

        return FileResponse(
            path=clipped_path,
            media_type="video/mp4",
            headers={"Content-Disposition": f'inline; filename="{filename}"'},
            background=background_tasks,
        )
    except ValueError as error:
        return JSONResponse(
            status_code=400,
            content={
                "message": str(error),
            },
        )
    except FileNotFoundError as error:
        return JSONResponse(
            status_code=500,
            content={
                "message": str(error),
            },
        )
    except subprocess.CalledProcessError as error:
        return JSONResponse(
            status_code=500,
            content={
                "message": "ffmpeg failed to clip the video",
                "details": error.stderr.decode("utf-8", errors="ignore") if error.stderr else "",
            },
        )
    except Exception as error:
        return JSONResponse(
            status_code=500,
            content={
                "message": str(error),
            },
        )
