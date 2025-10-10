import logging
import sys

def setup_logging():
    handler = logging.StreamHandler(sys.stdout)
    # format the logging - Timestamp, Severity of log Level(INFO, WARNING, ERROR, CRITICAL), Name of file/module that produced the log, Message passed in code
    fmt = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s" 
    )
    handler.setFormatter(fmt)

    root = logging.getLogger()
    root.setLevel(logging.INFO)
    # avoid duplicate handlers in reload
    if not any(isinstance(h, logging.StreamHandler) for h in root.handlers):
        root.addHandler(handler)