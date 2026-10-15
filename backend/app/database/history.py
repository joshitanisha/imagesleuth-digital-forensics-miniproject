import sqlite3
from pathlib import Path
from typing import Any

# Store the database in the project root.
PROJECT_ROOT = Path(__file__).resolve().parents[3]
DATABASE_PATH = PROJECT_ROOT / "imagesleuth.db"


def get_connection() -> sqlite3.Connection:
    """Create a connection to the ImageSleuth SQLite database."""
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA busy_timeout = 10000")
    return connection


def initialize_database() -> None:
    """Create the analysis history table if it does not exist."""
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS analysis_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                file_size INTEGER NOT NULL DEFAULT 0,
                sha256 TEXT NOT NULL DEFAULT '',
                image_format TEXT,
                width INTEGER NOT NULL DEFAULT 0,
                height INTEGER NOT NULL DEFAULT 0,
                analysis_type TEXT NOT NULL DEFAULT 'metadata',
                status TEXT NOT NULL DEFAULT 'completed',
                results_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL DEFAULT (
                    strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
                )
            )
            """
        )

        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_history_created_at
            ON analysis_history(created_at DESC)
            """
        )


def save_analysis(
    *,
    filename: str,
    file_size: int = 0,
    sha256: str = "",
    image_format: str | None = None,
    width: int = 0,
    height: int = 0,
    analysis_type: str = "metadata",
    status: str = "completed",
    results_json: str = "{}",
) -> dict[str, Any]:
    """Save a completed analysis and return its database record."""
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO analysis_history (
                filename,
                file_size,
                sha256,
                image_format,
                width,
                height,
                analysis_type,
                status,
                results_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                filename,
                max(0, file_size),
                sha256,
                image_format,
                max(0, width),
                max(0, height),
                analysis_type,
                status,
                results_json,
            ),
        )

        record_id = cursor.lastrowid

        row = connection.execute(
            """
            SELECT *
            FROM analysis_history
            WHERE id = ?
            """,
            (record_id,),
        ).fetchone()

        return dict(row)


def get_analysis_history(
    limit: int = 50,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """Return analysis records, newest first."""
    limit = max(1, min(limit, 100))
    offset = max(0, offset)

    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT
                id,
                filename,
                file_size,
                sha256,
                image_format,
                width,
                height,
                analysis_type,
                status,
                created_at
            FROM analysis_history
            ORDER BY id DESC
            LIMIT ? OFFSET ?
            """,
            (limit, offset),
        ).fetchall()

        return [dict(row) for row in rows]


def get_analysis_by_id(
    record_id: int,
) -> dict[str, Any] | None:
    """Retrieve one history record, including its stored results."""
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM analysis_history
            WHERE id = ?
            """,
            (record_id,),
        ).fetchone()

        return dict(row) if row else None


def delete_analysis(record_id: int) -> bool:
    """Delete one history record. Return whether it existed."""
    with get_connection() as connection:
        cursor = connection.execute(
            """
            DELETE FROM analysis_history
            WHERE id = ?
            """,
            (record_id,),
        )

        return cursor.rowcount > 0