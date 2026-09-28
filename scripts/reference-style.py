#!/usr/bin/env python3
import argparse
import json
import math
import os
import statistics
import sys


def fail(message: str, code: int = 1):
    print(message, file=sys.stderr)
    raise SystemExit(code)


def main():
    parser = argparse.ArgumentParser(description="Analyze visual shot rhythm with PySceneDetect.")
    parser.add_argument("--file", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--threshold", type=float, default=27.0)
    parser.add_argument("--min-scene-seconds", type=float, default=0.45)
    args = parser.parse_args()

    if not os.path.isfile(args.file):
        fail(f"Video not found: {args.file}")

    try:
        from scenedetect import open_video, SceneManager
        from scenedetect.detectors import ContentDetector
    except Exception as exc:
        fail(
            "PySceneDetect fehlt. Installiere kostenlos: python3 -m pip install scenedetect[opencv]\n"
            f"Import error: {exc}"
        )

    video = open_video(args.file)
    fps = float(video.frame_rate or 0.0)
    min_frames = max(1, int(round(max(0.05, args.min_scene_seconds) * max(fps, 1.0))))

    manager = SceneManager()
    manager.add_detector(ContentDetector(threshold=args.threshold, min_scene_len=min_frames))
    manager.detect_scenes(video)
    scene_list = manager.get_scene_list(start_in_scene=True)

    scenes = []
    for index, (start, end) in enumerate(scene_list, start=1):
        start_seconds = float(start.get_seconds())
        end_seconds = float(end.get_seconds())
        duration = max(0.0, end_seconds - start_seconds)
        scenes.append(
            {
                "id": f"shot-{index:04d}",
                "index": index,
                "startSeconds": round(start_seconds, 6),
                "endSeconds": round(end_seconds, 6),
                "durationSeconds": round(duration, 6),
                "startFrame": int(start.get_frames()),
                "endFrame": int(end.get_frames()),
                "midpointSeconds": round(start_seconds + duration / 2.0, 6),
            }
        )

    durations = [scene["durationSeconds"] for scene in scenes if scene["durationSeconds"] > 0]
    total_duration = sum(durations)
    cut_count = max(0, len(scenes) - 1)
    cuts_per_minute = (cut_count / total_duration * 60.0) if total_duration > 0 else 0.0

    if durations:
        sorted_durations = sorted(durations)
        p25_index = max(0, min(len(sorted_durations) - 1, math.floor((len(sorted_durations) - 1) * 0.25)))
        p75_index = max(0, min(len(sorted_durations) - 1, math.floor((len(sorted_durations) - 1) * 0.75)))
        stats = {
            "shotCount": len(durations),
            "cutCount": cut_count,
            "totalDetectedSeconds": round(total_duration, 3),
            "cutsPerMinute": round(cuts_per_minute, 3),
            "averageShotSeconds": round(statistics.mean(durations), 3),
            "medianShotSeconds": round(statistics.median(durations), 3),
            "shortestShotSeconds": round(min(durations), 3),
            "longestShotSeconds": round(max(durations), 3),
            "p25ShotSeconds": round(sorted_durations[p25_index], 3),
            "p75ShotSeconds": round(sorted_durations[p75_index], 3),
        }
    else:
        stats = {
            "shotCount": 0,
            "cutCount": 0,
            "totalDetectedSeconds": 0,
            "cutsPerMinute": 0,
            "averageShotSeconds": None,
            "medianShotSeconds": None,
            "shortestShotSeconds": None,
            "longestShotSeconds": None,
            "p25ShotSeconds": None,
            "p75ShotSeconds": None,
        }

    profile = {
        "version": 1,
        "engine": "PySceneDetect ContentDetector",
        "sourceFile": os.path.abspath(args.file),
        "settings": {
            "threshold": args.threshold,
            "minSceneSeconds": args.min_scene_seconds,
            "fps": round(fps, 6) if fps else None,
        },
        "stats": stats,
        "scenes": scenes,
    }

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as handle:
        json.dump(profile, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    print(json.dumps({"output": os.path.abspath(args.output), "shots": len(scenes), "cutsPerMinute": stats["cutsPerMinute"]}))


if __name__ == "__main__":
    main()
