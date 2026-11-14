const audioKey = 'opening-track';

export function localOpeningAudio(file?: File | null): Promise<File | undefined> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('anaes-opening-audio', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('clips');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('clips', file === undefined ? 'readonly' : 'readwrite');
      const store = transaction.objectStore('clips');
      const operation = file === undefined ? store.get(audioKey) : file ? store.put(file, audioKey) : store.delete(audioKey);
      transaction.oncomplete = () => {
        db.close();
        resolve(file === undefined ? operation.result : undefined);
      };
      transaction.onabort = () => {
        db.close();
        reject(transaction.error);
      };
    };
  });
}
