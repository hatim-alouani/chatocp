'use client';
import { useState, useEffect } from 'react';

export default function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const savedUser = localStorage.getItem('user');
        if (!savedUser) {
          setLoading(false);
          return;
        }

        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);

        let apiUrl = process.env.NEXT_PUBLIC_API_URL;

        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          apiUrl = 'http://localhost:3000';
        }

        const endpoint = `${apiUrl}/api/user-report/${parsedUser.user_id}`;
        console.log('Fetching report from:', endpoint);

        const res = await fetch(endpoint);
        const text = await res.text();

        // 🧠 Handle HTML or non-JSON responses gracefully
        if (text.trim().startsWith('<')) {
          console.error('❌ Received HTML instead of JSON:', text.slice(0, 120));
          setLoading(false);
          return;
        }

        const data = JSON.parse(text);
        if (data.ok && data.report?.file_path) {
          parsedUser.report_url = data.report.file_path;
          setUser({ ...parsedUser });
          localStorage.setItem('user', JSON.stringify(parsedUser)); // cache updated user
        } else {
          console.warn('⚠️ No report found for this user:', data);
        }
      } catch (err) {
        console.error('Failed to load user/report:', err);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  return { user, loading };
}
