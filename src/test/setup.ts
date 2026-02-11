/**
 * Vitestセットアップファイル
 * Testing Libraryのカスタムマッチャーを読み込む
 */
import '@testing-library/jest-dom/vitest';

/**
 * IndexedDBのポリフィル
 * すべてのテストでIndexedDBが利用可能になる
 */
import 'fake-indexeddb/auto';

/**
 * LocalStorageのモック
 * マイグレーションテスト用に必要
 */
class LocalStorageMock {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

global.localStorage = new LocalStorageMock() as Storage;
