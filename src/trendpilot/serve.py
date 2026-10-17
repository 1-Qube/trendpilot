"""Tiny local API so another UI can call the agent. No pages are served."""

from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from trendpilot.agent import run

HOST = "127.0.0.1"
PORT = 8787


def serve() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"TrendPilot API on http://{HOST}:{PORT}", flush=True)
    print("POST /research  {\"company\": {...}, \"question\": \"optional\"}", flush=True)
    print("GET  /health", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped", flush=True)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path.rstrip("/") == "/health":
            self._json(200, {"ok": True, "service": "trendpilot"})
            return
        self._json(404, {"error": "not found"})

    def do_POST(self) -> None:
        if self.path.rstrip("/") != "/research":
            self._json(404, {"error": "not found"})
            return
        length = int(self.headers.get("Content-Length") or "0")
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            self._json(400, {"error": "body must be JSON"})
            return
        company = body.get("company")
        if not isinstance(company, dict):
            self._json(400, {"error": "company object is required"})
            return
        question = body.get("question") or None
        self.send_response(200)
        self.send_header("Content-Type", "application/x-ndjson; charset=utf-8")
        self.end_headers()
        try:
            for event in run(company, question=question):
                line = json.dumps(event, ensure_ascii=False) + "\n"
                self.wfile.write(line.encode("utf-8"))
                self.wfile.flush()
        except Exception as exc:
            line = json.dumps({"kind": "error", "title": "Agent failed", "detail": str(exc)}) + "\n"
            self.wfile.write(line.encode("utf-8"))

    def log_message(self, fmt: str, *args) -> None:
        print(f"[api] {self.address_string()} {fmt % args}", flush=True)

    def _json(self, status: int, payload: dict) -> None:
        raw = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)
