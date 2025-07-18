import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function RedirectToLogin() {
  const router = useRouter();

  useEffect(() => {
    if (router && router.replace) {
      setTimeout(() => {
        router.replace('/login');
      }, 10); // 아주 짧게 delay
    }
  }, []);

  return null;
}
