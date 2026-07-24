import os
from datetime import datetime, timezone

import pandas as pd  # type: ignore
import psutil  # type: ignore

from src.config.logging import get_logger

logger = get_logger(__name__)

timing_records: list[dict] = []

_process = psutil.Process(os.getpid())

_process.cpu_percent(interval=None)


def _snapshot_metrics() -> dict:
    """Capture current resource usage for this worker process."""
    with _process.oneshot():
        cpu_percent = _process.cpu_percent(interval=None)  # since last call
        mem_info = _process.memory_info()
        io_counters = _process.io_counters() if hasattr(_process, "io_counters") else None

    # network is process-agnostic in psutil (system-wide), so grab system counters
    net_io = psutil.net_io_counters()

    metrics = {
        "cpu_percent": cpu_percent,
        "rss_mb": mem_info.rss / (1024**2),
        "vms_mb": mem_info.vms / (1024**2),
        "num_threads": _process.num_threads(),
        "sys_net_bytes_sent": net_io.bytes_sent,
        "sys_net_bytes_recv": net_io.bytes_recv,
    }

    if io_counters:
        metrics.update(
            {
                "io_read_mb": io_counters.read_bytes / (1024**2),
                "io_write_mb": io_counters.write_bytes / (1024**2),
            }
        )

    return metrics


def record_timing(event: str, duration_ms: float):
    record = {
        "event": event,
        "flow": event.split(".")[0],
        "duration_ms": duration_ms,
        "worker_pid": os.getpid(),
        "ts": datetime.now(timezone.utc).astimezone().replace(tzinfo=None),
    }
    record.update(_snapshot_metrics())
    timing_records.append(record)


def flush_timings(output_dir: str = "/app/timings"):
    if not timing_records:
        logger.info("no_timing_records_to_flush", worker_pid=os.getpid())
        return

    df = pd.DataFrame(timing_records)
    pid = os.getpid()
    path = f"{output_dir}/timings_worker_{pid}.xlsx"

    with pd.ExcelWriter(path, engine="openpyxl") as writer:
        for flow_name, group in df.groupby("flow"):
            group.drop(columns="flow").sort_values("ts").to_excel(writer, sheet_name=flow_name[:31], index=False)

    logger.info("timings_flushed", worker_pid=pid, path=path, rows=len(df))
