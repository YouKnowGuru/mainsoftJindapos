import { useEffect, useState } from 'react';
import { Download, RotateCcw, X, RefreshCw } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export function UpdateBanner() {
  const { updateInfo, setUpdateInfo, showNotification } = useAppStore();
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const api = window.electronSecureAPI;
    if (!api?.update) return;

    // Listen for update events from main process
    const cleanup = api.update.onUpdateEvent((event, data) => {
      switch (event) {
        case 'update:available':
          setUpdateInfo({
            available: true,
            downloaded: false,
            version: data?.version,
            notes: data?.notes,
          });
          showNotification(`Update v${data?.version} available`, 'info');
          break;
        case 'update:downloaded':
          setUpdateInfo({
            available: true,
            downloaded: true,
            version: data?.version,
            notes: data?.notes,
          });
          showNotification(`Update v${data?.version} ready to install`, 'success');
          break;
        case 'update:checking':
          // Silent — no UI needed
          break;
        case 'update:progress':
          setUpdateInfo((prev) => ({
            ...prev,
            available: true,
            downloaded: false,
            progress: data?.percent,
          }));
          break;
        case 'update:error':
          showNotification(data?.message || 'Update failed', 'error');
          setUpdateInfo(null);
          break;
      }
    });

    // Check current state on mount
    api.update.getUpdateState().then((result) => {
      if (result?.success && result.data) {
        const state = result.data;
        if (state.available || state.downloaded) {
          setUpdateInfo({
            available: state.available,
            downloaded: state.downloaded,
            version: state.version,
            notes: state.notes,
            progress: state.progress,
          });
        }
      }
    });

    return cleanup;
  }, [setUpdateInfo, showNotification]);

  const handleInstall = async () => {
    if (!updateInfo?.downloaded) return;
    setInstalling(true);
    try {
      const result = await window.electronSecureAPI.update.installUpdate();
      if (!result?.success) {
        showNotification(result?.message || 'Failed to install update', 'error');
        setInstalling(false);
      }
      // If success, app will quit and restart — no need to reset state
    } catch {
      showNotification('Failed to install update', 'error');
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  // Don't show if no update or dismissed
  if (!updateInfo?.available || dismissed) return null;

  const isDownloaded = updateInfo.downloaded;
  const isDownloading = !isDownloaded && updateInfo.progress !== undefined;

  return (
    <div className="relative z-50">
      <div className={`${isDownloaded ? 'bg-emerald-600' : 'bg-blue-600'} text-white px-4 py-2.5 flex items-center justify-between gap-4`}>
        <div className="flex items-center gap-3 min-w-0">
          {isDownloaded ? (
            <RotateCcw className="w-4 h-4 shrink-0" />
          ) : isDownloading ? (
            <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
          ) : (
            <Download className="w-4 h-4 shrink-0 animate-bounce" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">
              {isDownloaded
                ? `Update v${updateInfo.version} ready to install`
                : isDownloading
                  ? `Downloading update v${updateInfo.version}... ${Math.round(updateInfo.progress || 0)}%`
                  : `Update v${updateInfo.version} available`
              }
            </p>
            {updateInfo.notes && (
              <p className="text-xs opacity-80 truncate">{updateInfo.notes}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isDownloaded && (
            <button
              onClick={handleInstall}
              disabled={installing}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              {installing ? 'Installing...' : 'Restart Now'}
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar for downloading */}
      {isDownloading && (
        <div className="h-0.5 bg-white/20">
          <div
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${updateInfo.progress || 0}%` }}
          />
        </div>
      )}
    </div>
  );
}
