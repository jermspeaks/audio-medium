import { forwardRef, useRef, useCallback, useEffect, useState } from 'react';
import AudioPlayerLib, { RHAP_UI } from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import { updateEpisodeHistory } from '../../api/episodes';

const PLAYBACK_SPEEDS = [1, 1.15, 1.25, 1.5, 1.75, 2, 2.5, 3];

function PlaybackSpeedControl({ getAudio }) {
  const [rate, setRate] = useState(1);

  useEffect(() => {
    const audio = getAudio?.();
    if (audio) {
      audio.playbackRate = rate;
    }
  }, [getAudio, rate]);

  const handleChange = (e) => {
    const value = Number(e.target.value);
    setRate(value);
    const audio = getAudio?.();
    if (audio) {
      audio.playbackRate = value;
    }
  };

  return (
    <span className="rhap_playback-speed">
      <select
        aria-label="Playback speed"
        value={rate}
        onChange={handleChange}
        className="rhap_playback-speed-select"
      >
        {PLAYBACK_SPEEDS.map((s) => (
          <option key={s} value={s}>
            {s}x
          </option>
        ))}
      </select>
    </span>
  );
}

const SYNC_INTERVAL_MS = 5000;
const COMPLETION_THRESHOLD = 0.95; // 95% = completed
const PLAYING_STATUS = { NOT_PLAYED: 1, IN_PROGRESS: 2, COMPLETED: 3 };

function useDebouncedSync(uuid, getPayload, deps) {
  const timeoutRef = useRef(null);
  const lastSyncedRef = useRef(0);

  const sync = useCallback(() => {
    if (!uuid) return;
    const payload = getPayload();
    if (payload == null) return;
    const now = Date.now();
    if (now - lastSyncedRef.current < 1000) return; // min 1s between syncs
    lastSyncedRef.current = now;
    updateEpisodeHistory(uuid, payload).catch(() => {});
  }, [uuid, getPayload]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const scheduleSync = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      sync();
    }, SYNC_INTERVAL_MS);
  }, [sync]);

  return { sync, scheduleSync };
}

const AudioPlayer = forwardRef(function AudioPlayer({ episode, history, onHistoryUpdated }, ref) {
  const uuid = episode?.uuid;
  const src = episode?.file_url;
  const duration = episode?.duration != null ? Number(episode.duration) : 0;
  const initialTime = history?.played_up_to != null ? Number(history.played_up_to) : 0;
  const playerRef = useRef(null);
  const setRef = useCallback(
    (el) => {
      playerRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    },
    [ref]
  );
  const currentTimeRef = useRef(initialTime);
  const hasSetInitialTimeRef = useRef(false);

  const getPayload = useCallback(() => {
    const current = currentTimeRef.current;
    if (current <= 0 && duration <= 0) return null;
    let playingStatus = history?.playing_status ?? PLAYING_STATUS.NOT_PLAYED;
    if (duration > 0 && current >= duration * COMPLETION_THRESHOLD) {
      playingStatus = PLAYING_STATUS.COMPLETED;
    }
    return {
      played_up_to: current,
      duration: duration || undefined,
      playing_status: playingStatus,
    };
  }, [duration, history?.playing_status]);

  const { sync, scheduleSync } = useDebouncedSync(uuid, getPayload);

  // Set initial playback position when metadata is loaded (library uses onLoadedMetaData)
  const handleLoadedMetaData = useCallback(
    (e) => {
      const audio = e.target;
      if (audio && initialTime > 0 && !hasSetInitialTimeRef.current) {
        hasSetInitialTimeRef.current = true;
        audio.currentTime = initialTime;
        currentTimeRef.current = initialTime;
      }
    },
    [initialTime]
  );

  const handleCanPlay = useCallback(
    (e) => {
      const audio = e.target;
      if (audio && initialTime > 0 && !hasSetInitialTimeRef.current) {
        hasSetInitialTimeRef.current = true;
        audio.currentTime = initialTime;
        currentTimeRef.current = initialTime;
      }
    },
    [initialTime]
  );

  const handleListen = useCallback(
    (e) => {
      const audio = e.target;
      if (audio) {
        currentTimeRef.current = audio.currentTime;
        scheduleSync();
      }
    },
    [scheduleSync]
  );

  const handleSeeked = useCallback(
    (e) => {
      const audio = e.target;
      if (audio) {
        currentTimeRef.current = audio.currentTime;
        sync();
      }
    },
    [sync]
  );

  const handlePlay = useCallback(() => {
    // Mark as in progress when user starts playing
    if (uuid && (history?.playing_status ?? PLAYING_STATUS.NOT_PLAYED) !== PLAYING_STATUS.COMPLETED) {
      updateEpisodeHistory(uuid, {
        played_up_to: currentTimeRef.current,
        duration: duration || undefined,
        playing_status: PLAYING_STATUS.IN_PROGRESS,
      })
        .then((data) => onHistoryUpdated?.(data))
        .catch(() => {});
    }
  }, [uuid, duration, history?.playing_status, onHistoryUpdated]);

  const handlePause = useCallback(() => {
    sync();
    onHistoryUpdated?.();
  }, [sync, onHistoryUpdated]);

  const handleEnded = useCallback(() => {
    if (duration > 0) {
      currentTimeRef.current = duration;
      sync();
    }
    onHistoryUpdated?.();
  }, [duration, sync, onHistoryUpdated]);

  // Sync on unmount
  useEffect(() => {
    return () => {
      if (uuid) sync();
    };
  }, [uuid, sync]);

  if (!src) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-muted-foreground text-sm">
        No audio link available for this episode.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 [&_.rhap_container]:bg-transparent [&_.rhap_container]:shadow-none [&_.rhap_main-controls-button]:text-foreground [&_.rhap_progress-bar]:bg-muted [&_.rhap_progress-filled]:bg-primary [&_.rhap_time]:text-muted-foreground">
      <AudioPlayerLib
        ref={setRef}
        src={src}
        onLoadedMetaData={handleLoadedMetaData}
        onCanPlay={handleCanPlay}
        onListen={handleListen}
        onSeeked={handleSeeked}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        listenInterval={1000}
        showSkipControls={false}
        autoPlayAfterSrcChange={false}
        progressJumpSteps={{ backward: 30000, forward: 30000 }}
        customAdditionalControls={[
          RHAP_UI.LOOP,
          <PlaybackSpeedControl getAudio={() => playerRef.current?.audio?.current} key="speed" />,
        ]}
      />
    </div>
  );
});

export default AudioPlayer;
