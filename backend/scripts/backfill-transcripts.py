#!/usr/bin/env python3
"""Backfill cost_events from Claude Code transcript files.

Scans ~/.claude/projects/**/*.jsonl for transcript files,
extracts per-session token usage, computes costs using correct
model-specific pricing, and POSTs to the gasometer API.

Pricing (per MTok) from https://platform.claude.com/docs/en/about-claude/pricing:
  Opus 4.5/4.6:   input=$5,  output=$25,  cache_read=$0.50, cache_write=$6.25
  Sonnet 4/4.5/4.6: input=$3,  output=$15,  cache_read=$0.30, cache_write=$3.75
  Haiku 4.5:       input=$1,  output=$5,   cache_read=$0.10, cache_write=$1.25
  Haiku 3.5:       input=$0.80, output=$4, cache_read=$0.08, cache_write=$1.00
  Opus 3/4/4.1:    input=$15, output=$75,  cache_read=$1.50, cache_write=$18.75
"""

import json
import os
import sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.request

API_URL = "https://gasometer-api-production.up.railway.app/api/ingest"
API_KEY = os.environ.get("GASOMETER_API_KEY", "")

# Pricing per million tokens
PRICING = {
    # Opus 4.5 / 4.6
    "claude-opus-4-6": {"input": 5, "output": 25, "cache_read": 0.50, "cache_write": 6.25},
    "claude-opus-4-5-20251001": {"input": 5, "output": 25, "cache_read": 0.50, "cache_write": 6.25},
    # Opus 4 / 4.1 (legacy, higher pricing)
    "claude-opus-4-20250514": {"input": 15, "output": 75, "cache_read": 1.50, "cache_write": 18.75},
    # Sonnet 4 / 4.5 / 4.6
    "claude-sonnet-4-6": {"input": 3, "output": 15, "cache_read": 0.30, "cache_write": 3.75},
    "claude-sonnet-4-5-20241022": {"input": 3, "output": 15, "cache_read": 0.30, "cache_write": 3.75},
    "claude-sonnet-4-20250514": {"input": 3, "output": 15, "cache_read": 0.30, "cache_write": 3.75},
    "claude-3-7-sonnet-20250219": {"input": 3, "output": 15, "cache_read": 0.30, "cache_write": 3.75},
    # Haiku 4.5
    "claude-haiku-4-5-20251001": {"input": 1, "output": 5, "cache_read": 0.10, "cache_write": 1.25},
    # Haiku 3.5
    "claude-3-5-haiku-20241022": {"input": 0.80, "output": 4, "cache_read": 0.08, "cache_write": 1.00},
    # Opus 3 (deprecated)
    "claude-3-opus-20240229": {"input": 15, "output": 75, "cache_read": 1.50, "cache_write": 18.75},
    # Haiku 3
    "claude-3-haiku-20240307": {"input": 0.25, "output": 1.25, "cache_read": 0.03, "cache_write": 0.30},
}

# Fallback: map model name patterns to pricing
def get_pricing(model_id):
    if model_id in PRICING:
        return PRICING[model_id]
    m = model_id.lower()
    if "opus-4-6" in m or "opus-4-5" in m:
        return PRICING["claude-opus-4-6"]
    if "opus-4" in m:
        return PRICING["claude-opus-4-20250514"]
    if "opus" in m:
        return PRICING["claude-3-opus-20240229"]
    if "sonnet" in m:
        return PRICING["claude-sonnet-4-6"]
    if "haiku-4" in m or "haiku-4-5" in m:
        return PRICING["claude-haiku-4-5-20251001"]
    if "haiku-3-5" in m:
        return PRICING["claude-3-5-haiku-20241022"]
    if "haiku" in m:
        return PRICING["claude-3-haiku-20240307"]
    # Default to Opus 4.6 (most common in Claude Code)
    return PRICING["claude-opus-4-6"]


def parse_role_from_path(proj_dir):
    """Extract Gas Town role from the project directory name."""
    name = proj_dir.lower()
    if "mayor" in name or "-gt-mayor" in name:
        return "mayor"
    if "polecat" in name:
        return "polecat"
    if "witness" in name:
        return "witness"
    if "refinery" in name:
        return "refinery"
    if "deacon" in name:
        return "deacon"
    if "crew" in name:
        return "crew"
    return "unknown"


def parse_rig_from_path(proj_dir):
    """Extract rig name from the project directory name."""
    name = proj_dir.lower()
    for rig in ["gasometer", "careers", "doccompare", "longeye", "gastown", "beads"]:
        if rig in name:
            return rig
    return None


def parse_worker_from_path(proj_dir):
    """Extract worker name from polecat path."""
    parts = proj_dir.split("-")
    for i, part in enumerate(parts):
        if part == "polecats" and i + 1 < len(parts):
            return parts[i + 1]
    return None


def process_transcript(filepath):
    """Parse a single transcript file and return a cost event dict."""
    try:
        total_input = 0
        total_output = 0
        total_cache_read = 0
        total_cache_create = 0
        model = None
        last_timestamp = None

        with open(filepath) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue

                if entry.get("type") == "assistant" and "message" in entry:
                    msg = entry["message"]
                    usage = msg.get("usage", {})
                    if usage:
                        total_input += usage.get("input_tokens", 0)
                        total_output += usage.get("output_tokens", 0)
                        total_cache_read += usage.get("cache_read_input_tokens", 0)
                        total_cache_create += usage.get("cache_creation_input_tokens", 0)
                        if msg.get("model"):
                            model = msg["model"]

                # Track latest timestamp
                ts = entry.get("timestamp")
                if ts and (last_timestamp is None or ts > last_timestamp):
                    last_timestamp = ts

        if total_input + total_output + total_cache_read + total_cache_create == 0:
            return None

        if not model:
            model = "claude-opus-4-6"  # default

        pricing = get_pricing(model)
        cost_usd = (
            total_input * pricing["input"]
            + total_output * pricing["output"]
            + total_cache_read * pricing["cache_read"]
            + total_cache_create * pricing["cache_write"]
        ) / 1_000_000

        # Extract session ID from filename
        session_id = filepath.stem

        # Extract role/rig from parent directory name
        proj_dir = filepath.parent.name
        role = parse_role_from_path(proj_dir)
        rig = parse_rig_from_path(proj_dir)
        worker = parse_worker_from_path(proj_dir)

        if not last_timestamp:
            # Use file mtime as fallback
            mtime = os.path.getmtime(filepath)
            from datetime import datetime, timezone
            last_timestamp = datetime.fromtimestamp(mtime, tz=timezone.utc).isoformat()

        event = {
            "session_id": session_id,
            "role": role,
            "cost_usd": round(cost_usd, 6),
            "input_tokens": total_input,
            "output_tokens": total_output,
            "cache_read_tokens": total_cache_read,
            "cache_create_tokens": total_cache_create,
            "model": model,
            "ended_at": last_timestamp,
        }
        # Only include optional string fields if non-None (Zod rejects null)
        if worker:
            event["worker"] = worker
        if rig:
            event["rig"] = rig
        return event
    except Exception as e:
        print(f"  ERROR parsing {filepath}: {e}", file=sys.stderr)
        return None


def post_event(event):
    """POST a cost event to the gasometer API."""
    data = json.dumps(event).encode()
    req = urllib.request.Request(
        API_URL,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 201
    except Exception as e:
        print(f"  POST failed for {event['session_id']}: {e}", file=sys.stderr)
        return False


def main():
    projects_dir = Path.home() / ".claude" / "projects"
    if not projects_dir.exists():
        print(f"ERROR: {projects_dir} not found")
        sys.exit(1)

    # Find all transcript JSONL files
    transcripts = list(projects_dir.glob("**/*.jsonl"))
    print(f"Found {len(transcripts)} transcript files")

    # Parse all transcripts
    print("Parsing transcripts...")
    events = []
    skipped = 0
    for i, fp in enumerate(transcripts):
        if (i + 1) % 500 == 0:
            print(f"  Parsed {i+1}/{len(transcripts)}...")
        event = process_transcript(fp)
        if event:
            events.append(event)
        else:
            skipped += 1

    print(f"Parsed {len(events)} sessions ({skipped} skipped, no token data)")

    # Summary
    total_cost = sum(e["cost_usd"] for e in events)
    print(f"Total cost: ${total_cost:,.2f}")
    by_role = {}
    for e in events:
        r = e["role"]
        by_role[r] = by_role.get(r, 0) + e["cost_usd"]
    for role, cost in sorted(by_role.items(), key=lambda x: -x[1]):
        print(f"  {role}: ${cost:,.2f}")

    if not API_KEY:
        print("\nNo GASOMETER_API_KEY set. Dry run only.")
        return

    # POST in parallel
    print(f"\nIngesting {len(events)} events...")
    ok = 0
    fail = 0
    with ThreadPoolExecutor(max_workers=15) as pool:
        futures = {pool.submit(post_event, e): e for e in events}
        for i, future in enumerate(as_completed(futures)):
            if future.result():
                ok += 1
            else:
                fail += 1
            if (i + 1) % 200 == 0:
                print(f"  Progress: {i+1}/{len(events)} ({ok} ok, {fail} fail)")

    print(f"\nDone: {ok} ok, {fail} failed")


if __name__ == "__main__":
    main()
