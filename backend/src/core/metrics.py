import os
from datetime import datetime, timezone

import pandas as pd  # type: ignore

from src.config.logging import get_logger

logger = get_logger(__name__)

timing_records: list[dict] = []

def record_timing(event: str, duration_ms: float):
    timing_records.append({
        "event": event,
        "flow": event.split(".")[0],
        "duration_ms": duration_ms,
        "worker_pid": os.getpid(),
        "ts": datetime.now(timezone.utc).replace(tzinfo=None),
    })

def flush_timings(output_dir: str = "/app/timings"):
    if not timing_records:
        logger.info("no_timing_records_to_flush", worker_pid=os.getpid())
        return

    df = pd.DataFrame(timing_records)
    pid = os.getpid()
    path = f"{output_dir}/timings_worker_{pid}.xlsx"

    with pd.ExcelWriter(path, engine="openpyxl") as writer:
        for flow_name, group in df.groupby("flow"):
            group.drop(columns="flow").sort_values("ts").to_excel(
                writer, sheet_name=flow_name[:31], index=False
            )

    logger.info("timings_flushed", worker_pid=pid, path=path, rows=len(df))
