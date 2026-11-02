'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type Auth } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BrandLogo from './brand-logo';
import { authErrorMessage, firebaseAuth, googleLogin } from '@/lib/firebase-client';

const FirebaseLogin = () => {
  const router = useRouter();
  const [auth, setAuth] = useState<Auth | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void firebaseAuth().then(instance => {
      if (!active) return;
      setAuth(instance);
      unsubscribe = onAuthStateChanged(instance, user => {
        if (user) router.replace('/practice/');
        else setChecking(false);
      }, () => { setChecking(false); setError('無法確認登入狀態，請重新整理後重試。'); });
    }).catch(() => {
      if (active) { setChecking(false); setError('Google 登入尚待網站擁有者完成 Firebase 設定。你可以先使用訪客模式練習。'); }
    });
    return () => { active = false; unsubscribe?.(); };
  }, [router]);
  const login = async () => {
    if (!auth || busy) return;
    setBusy(true); setError('');
    try { await googleLogin(auth); router.replace('/practice/'); }
    catch (error) { setError(authErrorMessage(error)); }
    finally { setBusy(false); }
  };
  return <main className="login-shell"><section className="login-card">
    <BrandLogo/>
    <h1>準備初等統計考試，從這裡開始。</h1><p className="subtext">歷屆試題與學習紀錄，保存你的每一次練習。</p>
    {error && <p role="alert" className="notice">{error}</p>}
    <button className="btn primary google-button" onClick={login} disabled={checking || !auth || busy}>{checking ? '正在確認登入設定…' : busy ? '正在登入…' : '以 Google 帳戶登入'}</button>
    <Link className="btn ghost" href="/demo/">先以訪客模式練習 →</Link>
    <p className="login-footnote">Google 登入只要求基本帳戶資訊。登入後，錯題、收藏、筆記與學習紀錄會在你的電腦和手機間同步；訪客模式僅在本機保存。</p>
  </section></main>;
};
export default FirebaseLogin;
