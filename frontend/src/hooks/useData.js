/**
 * useData.js
 * ----------
 * Central data hook. Fetches /api/summary once on mount.
 * All views read from this shared state — no prop drilling, no repeated fetches.
 *
 * Returns: { data, loading, error }
 * data shape mirrors competitive_summary.json exactly.
 */
import { useState, useEffect } from "react";

const API_BASE = "/api";

export function useData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/summary`)
      .then((r) => {
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { data, loading, error };
}
