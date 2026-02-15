/**
 * Firebase初期化設定
 * 環境変数から設定を読み込み、シングルトンでアプリを初期化する
 * APIキーが未設定の場合は初期化をスキップする（ローカル開発時のフォールバック）
 */

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// APIキーが存在する場合のみ初期化
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;

if (firebaseConfig.apiKey) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    storage = getStorage(app);
}

async function getCurrentAuthToken(forceRefresh = false): Promise<string> {
    if (!auth) return "";

    try {
        await auth.authStateReady();
        const currentUser = auth.currentUser;
        if (!currentUser) return "";
        return await currentUser.getIdToken(forceRefresh);
    } catch (error) {
        console.warn("Failed to get Firebase auth token:", error);
        return "";
    }
}

export { app, auth, storage, getCurrentAuthToken };
