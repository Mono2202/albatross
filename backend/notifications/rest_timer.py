import time
import threading
from backend.logger import get_logger

logger = get_logger(__name__)

_active_timers = {}
_timers_lock = threading.Lock()


def _timer_worker(timer_id, duration, pushover, cancel_event):
    try:
        if cancel_event.wait(duration):
            logger.info(f"Rest timer {timer_id} was cancelled")
            return
        if pushover:
            pushover.send_message(
                message="Rest time is up — time for your next set! 💪",
                title="Workout Timer"
            )
            logger.info(f"Rest timer {timer_id} fired after {duration}s")
    except Exception as e:
        logger.error(f"Rest timer {timer_id} failed: {e}")
    finally:
        with _timers_lock:
            _active_timers.pop(timer_id, None)


def start_rest_timer(timer_id, duration, pushover):
    with _timers_lock:
        if timer_id in _active_timers:
            _active_timers[timer_id]['event'].set()
            _active_timers.pop(timer_id, None)

    cancel_event = threading.Event()
    thread = threading.Thread(
        target=_timer_worker,
        args=(timer_id, duration, pushover, cancel_event),
        daemon=True
    )
    with _timers_lock:
        _active_timers[timer_id] = {'thread': thread, 'event': cancel_event}
    thread.start()
    logger.info(f"Started rest timer {timer_id} for {duration}s")


def cancel_rest_timer(timer_id):
    with _timers_lock:
        timer_info = _active_timers.pop(timer_id, None)
    if timer_info:
        timer_info['event'].set()
        logger.info(f"Cancelled rest timer {timer_id}")

