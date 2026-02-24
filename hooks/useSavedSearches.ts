"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface SearchParams {
  type: string;
  keyword: string;
  theme: string;
  value: string;
}

interface ScrapedItem {
  title: string;
  url: string;
  description: string;
  status: string;
  theme: string;
  value: string;
  date: string;
}

interface SavedSearch {
  id: string;
  searchParams: SearchParams;
  results: ScrapedItem[];
  totalScraped: number;
  createdAt: Timestamp | null;
}

export function useSavedSearches() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "searches"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SavedSearch[];
        setSearches(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Firestore listener error:", err);
        setError("Failed to load saved searches");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { searches, loading, error };
}

